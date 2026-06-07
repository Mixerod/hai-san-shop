# 04 — LOGIC NGHIỆP VỤ & IDEMPOTENCY

> File này mô tả **cách hệ thống xử lý** khi đơn hoàn thành, cách thăng hạng, phát voucher/quà, tính
> tiền giảm giá, và quan trọng nhất: **làm sao không phát trùng / không đệ quy / không lag**.
> Liên quan: schema `03`, rủi ro `07`.

---

## 1. Kiến trúc xử lý: chọn nơi đặt logic

Có 3 lựa chọn. Đề xuất **Phương án A** cho giai đoạn đầu (đơn giản, an toàn, không phụ thuộc hạ tầng mới).

| PA | Nơi xử lý | Ưu | Nhược |
|----|-----------|-----|-------|
| **A (đề xuất)** | **Trigger Postgres** `AFTER UPDATE OF status ON orders` khi status → 'done' | Chạy ngay trong DB, không cần service ngoài, atomic | Phải viết SQL cẩn thận chống đệ quy/lag |
| B | **Edge Function** Supabase gọi sau khi admin set 'done' | Tách khỏi DB, dễ log, async | Cần deploy, có thể lệch nếu quên gọi |
| C | **Cron quét định kỳ** đơn done chưa xử lý | Đơn giản, không đệ quy | Trễ (không realtime), vẫn cần cờ idempotency |

> Dù chọn PA nào, **cờ `orders.rewards_processed_at` + unique index ở `03` mục 5 là bắt buộc** để
> idempotent. PA A và C có thể dùng chung function lõi `process_order_rewards(order_id)`.

---

## 2. Hàm lõi `process_order_rewards(p_order_id)` — đặc tả (pseudo + SQL)

Trách nhiệm: với 1 đơn vừa `done`, **một lần duy nhất**: cộng tích lũy → cập nhật hạng → quét reward_rules.

```sql
create or replace function public.process_order_rewards(p_order_id uuid)
returns void
language plpgsql
security definer            -- chạy quyền cao để ghi bảng có RLS; set search_path an toàn
set search_path = public
as $$
declare
  v_user   uuid;
  v_amount bigint;
  v_kg     numeric(10,2);
  v_locked boolean;
  v_old_tier text;
  v_new_tier text;
begin
  -- (a) KHÓA HÀNG ĐƠN + kiểm tra idempotency trong cùng transaction
  select user_id, total_amount
    into v_user, v_amount
  from public.orders
  where id = p_order_id and status = 'done' and rewards_processed_at is null
  for update;                          -- row lock: chặn 2 lần xử lý song song

  if not found then
    return;                            -- đã xử lý rồi / không đủ điều kiện -> thoát êm (idempotent)
  end if;

  if v_user is null then
    -- đơn khách vãng lai: chỉ đánh dấu đã xử lý, không tích lũy
    update public.orders set rewards_processed_at = now() where id = p_order_id;
    return;
  end if;

  -- (b) Tính kg của đơn (xem mục 3)
  v_kg := public.calc_order_kg(p_order_id);

  -- (c) Cộng tích lũy vào profiles (atomic increment) + khóa hàng profile
  select tier_code, tier_locked into v_old_tier, v_locked
  from public.profiles where id = v_user for update;

  update public.profiles
     set lifetime_spend = lifetime_spend + v_amount,
         lifetime_kg    = lifetime_kg + v_kg
   where id = v_user;

  -- (d) Tính hạng mới theo ngưỡng (chỉ khi KHÔNG bị khóa thủ công)
  if not v_locked then
    v_new_tier := public.compute_tier(v_user);
    if v_new_tier is distinct from v_old_tier then
      update public.profiles
         set tier_code = v_new_tier, tier_updated_at = now()
       where id = v_user;
      insert into public.membership_events(user_id, event_type, from_tier, to_tier, actor, ref_order_id)
      values (v_user, 'tier_up', v_old_tier, v_new_tier, 'system', p_order_id);
      -- (tùy chọn) phát voucher tier_up tại đây
    end if;
  end if;

  -- (e) Quét reward_rules áp dụng cho đơn này (mục 4)
  perform public.apply_reward_rules(p_order_id, v_user, v_amount, v_kg);

  -- (f) Đánh dấu đã xử lý XONG (đặt cuối cùng, trong cùng transaction)
  update public.orders set rewards_processed_at = now() where id = p_order_id;
  insert into public.membership_events(user_id, event_type, amount, actor, ref_order_id)
  values (v_user, 'accrual', v_amount, 'system', p_order_id);
end;
$$;
```

**Vì sao idempotent:** điều kiện `rewards_processed_at is null ... for update` ở (a) khiến lần gọi thứ
2 không tìm thấy hàng → thoát; cộng tích lũy nằm sau khóa hàng nên không bị cộng đôi.

---

## 3. Tính kg của đơn — `calc_order_kg`

```sql
create or replace function public.calc_order_kg(p_order_id uuid)
returns numeric language sql stable as $$
  select coalesce(sum(
     oi.quantity * case
        when p.weight_kg is not null then p.weight_kg          -- ưu tiên cột chuẩn (❓CĐ-6)
        when lower(coalesce(p.unit,'')) ~ '(kg|ký|ky)' then 1  -- fallback heuristic = 1kg/đơn vị
        else 0                                                 -- đơn vị không phải kg -> 0
     end
  ), 0)
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = p_order_id;
$$;
```

> Heuristic này khớp logic `checkout/page.tsx` (nhận diện "kg/ký/ky"). Nếu ❓CĐ-6 chốt thêm `weight_kg`
> thì kết quả chuẩn hơn. Đây là điểm dễ sai → ghi rõ ở `07`.

---

## 4. Quét luật thưởng — `apply_reward_rules`

```sql
create or replace function public.apply_reward_rules(
  p_order_id uuid, p_user uuid, p_amount bigint, p_kg numeric)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_spend bigint; v_kg_total numeric;
begin
  select lifetime_spend, lifetime_kg into v_spend, v_kg_total
  from public.profiles where id = p_user;

  for r in
    select * from public.reward_rules
    where is_active
      and (valid_from is null or now() >= valid_from)
      and (valid_to   is null or now() <= valid_to)
  loop
    -- kiểm tra điều kiện
    if (r.condition_type = 'order_amount_gte'      and p_amount   >= r.threshold)
    or (r.condition_type = 'order_kg_gte'          and p_kg       >= r.threshold)
    or (r.condition_type = 'cumulative_spend_gte'  and v_spend    >= r.threshold)
    or (r.condition_type = 'cumulative_kg_gte'     and v_kg_total >= r.threshold)
    then
      -- tier_scope (nếu có) phải chứa hạng hiện tại
      if r.tier_scope is null
         or (select tier_code from public.profiles where id = p_user) = any(r.tier_scope) then

        if r.reward_type = 'voucher' then
          insert into public.customer_vouchers(user_id, voucher_def_id, source,
                 source_order_id, source_rule_id, expires_at)
          select p_user, r.voucher_def_id,
                 case when r.condition_type like 'cumulative%' then 'milestone' else 'milestone' end,
                 case when r.condition_type like 'order%' then p_order_id else null end,
                 r.id,
                 (select valid_to from public.voucher_definitions where id = r.voucher_def_id)
          on conflict do nothing;     -- <== chống trùng nhờ unique index (03 mục 5)

        elsif r.reward_type = 'gift' then
          -- trừ kho có kiểm soát; chỉ phát nếu còn kho
          update public.gifts set stock = stock - 1
          where id = r.gift_id and (stock > 0 or stock = -1);
          if found then
            insert into public.customer_gifts(user_id, gift_id, source,
                   source_order_id, source_rule_id)
            select p_user, r.gift_id, 'milestone',
                   case when r.condition_type like 'order%' then p_order_id else null end, r.id
            on conflict do nothing;
          else
            insert into public.membership_events(user_id, event_type, reason, actor, ref_order_id)
            values (p_user, 'gift_skipped_out_of_stock', r.name, 'system', p_order_id);
          end if;
        end if;
      end if;
    end if;
  end loop;
end;
$$;
```

> `on conflict do nothing` + unique index = nếu reward đã phát cho (rule, order) hoặc (rule, user) thì
> bỏ qua. Đây là chốt chặn idempotency thứ hai (sau cờ `rewards_processed_at`).

---

## 5. Tính hạng — `compute_tier`

```sql
create or replace function public.compute_tier(p_user uuid)
returns text language sql stable as $$
  with me as (select lifetime_spend s, lifetime_kg k from public.profiles where id = p_user)
  select t.code
  from public.membership_tiers t, me
  where t.is_active
    and me.s >= t.min_spend                       -- ✅ ĐÃ CHỐT: xếp hạng theo TIỀN (lifetime)
    and (t.min_kg = 0 or me.k >= t.min_kg)         -- kg chỉ xét khi min_kg>0 (mặc định 0 = bỏ qua;
                                                   -- TRÁNH BUG: min_kg=0 + logic 'or' sẽ luôn đúng)
  order by t.sort_order desc
  limit 1;                            -- hạng cao nhất đủ điều kiện
$$;
```

> Lưu ý ❓CĐ-3: bản này là **lifetime, không tụt hạng**. compute_tier luôn trả hạng cao nhất đủ điều
> kiện theo tích lũy trọn đời nên không tự hạ. Nếu chốt mô hình 12 tháng → cần đổi sang tính spend
> theo cửa sổ thời gian + job hạ hạng (phức tạp hơn, ghi rủi ro ở `07`).

---

## 6. Trigger kích hoạt (PA A) — CHỐNG ĐỆ QUY

```sql
create or replace function public.trg_order_done()
returns trigger language plpgsql as $$
begin
  -- chỉ chạy đúng lúc CHUYỂN sang 'done', và chưa xử lý
  if new.status = 'done' and (old.status is distinct from 'done')
     and new.rewards_processed_at is null then
    perform public.process_order_rewards(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_done on public.orders;
create trigger trg_orders_done
  after update of status on public.orders
  for each row execute function public.trg_order_done();
```

**Chống đệ quy (đọc kỹ — chi tiết `07`):**
- Trigger là `AFTER UPDATE OF status` → `process_order_rewards` có `update orders set rewards_processed_at`
  **không đụng cột `status`**, nên KHÔNG kích hoạt lại trigger này (trigger chỉ nghe `OF status`).
- `process_order_rewards` update `profiles`, KHÔNG có trigger nào trên `profiles` ghi ngược lại `orders`
  → không tạo vòng lặp. **Quy ước:** không bao giờ đặt trigger trên `profiles` mà cập nhật `orders`.
- Phòng xa: có thể thêm guard `if pg_trigger_depth() > 1 then return new; end if;`.

---

## 7. Tính tiền giảm giá khi đặt đơn (vùng nhạy cảm)

Hiện `checkout/page.tsx` gửi `total_amount = total()` (tính ở client từ giá đã sync DB). Khi thêm giảm
giá hạng + voucher:

**Nguyên tắc:** số tiền giảm phải được **xác thực ở phía tin cậy** trước khi lưu đơn, không tin client.

Luồng đề xuất (đặt ở một RPC/Edge Function `place_order` hoặc validate trong trigger BEFORE INSERT):
1. Server đọc `tier_code` của user → `discount_percent` của hạng.
2. Nếu khách chọn voucher: kiểm tra voucher thuộc về user, `status='active'`, chưa hết hạn, đủ `min_order`.
3. Tính: `subtotal` → trừ giảm hạng → trừ voucher (theo `02` ❓CĐ-5: áp hạng trước, voucher sau,
   trần tổng giảm vd 30%) → `final_amount`.
4. Lưu `orders.total_amount = final_amount`; ghi `customer_vouchers.status='used'`, `used_order_id`,
   `discount_applied`. **Đánh dấu used phải atomic** (update ... where status='active' returning) để
   chống dùng 1 voucher cho 2 đơn song song.

> ⚠️ Không trừ voucher ở client rồi tin tưởng. Nếu tạm thời làm ở client (giai đoạn đầu), tối thiểu
> phải có **unique `used_order_id`** + update có điều kiện `where status='active'` để chống double-spend.

---

## 8. Backfill khách cũ (nếu chốt ❓CĐ-9)

Chạy 1 lần sau khi tạo schema, trước go-live:

```sql
-- Tính lại tích lũy từ toàn bộ đơn 'done' đã có, rồi set hạng.
with agg as (
  select user_id,
         sum(total_amount)::bigint as spend,
         sum(public.calc_order_kg(id)) as kg
  from public.orders
  where status = 'done' and user_id is not null
  group by user_id
)
update public.profiles p
set lifetime_spend = a.spend,
    lifetime_kg    = a.kg,
    tier_code      = public.compute_tier(p.id),
    tier_updated_at= now()
from agg a where a.user_id = p.id;
-- Đồng thời set orders.rewards_processed_at = now() cho đơn done cũ để KHÔNG phát thưởng hồi tố:
update public.orders set rewards_processed_at = now()
where status = 'done' and rewards_processed_at is null;
```

> ⚠️ Thứ tự quan trọng: backfill tích lũy & set `rewards_processed_at` cho đơn cũ TRƯỚC khi bật trigger,
> để tránh phát hàng loạt voucher/quà hồi tố cho đơn lịch sử.

---

## 9. MERGE đơn vãng lai vào tài khoản mới (✅ CĐ-9 mở rộng)

Khi khách **đăng ký tài khoản**, gộp các đơn vãng lai (`user_id IS NULL`) có **Tên + SĐT trùng** vào
tài khoản rồi cộng vào tích lũy. Gọi sau khi tạo profile (trong `auth/page.tsx` qua RPC bên dưới).

> ⚠️ Tên/SĐT của đơn nằm trong `orders.note` dạng text ("Tên: ...\nSĐT: ..."), KHÔNG phải cột riêng →
> phải parse + chuẩn hóa. Đây là điểm dễ khớp sai — xem rủi ro `07` mục 6.

```sql
create or replace function public.merge_guest_orders(p_name text, p_phone text)
returns int language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_phone text; v_name text; v_count int;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  v_phone := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');   -- bỏ ký tự không phải số
  v_name  := lower(trim(coalesce(p_name,'')));
  if length(v_phone) < 9 or v_name = '' then return 0; end if;      -- chặn khớp quá lỏng

  with cand as (
    select id from public.orders
    where user_id is null
      and regexp_replace(coalesce(note,''), '\D', '', 'g') like '%'||v_phone||'%'
      and position(v_name in lower(coalesce(note,''))) > 0
  )
  update public.orders o
     set user_id = v_user,
         rewards_processed_at = coalesce(o.rewards_processed_at, now())  -- KHÔNG phát thưởng hồi tố
  from cand where o.id = cand.id;
  get diagnostics v_count = row_count;

  -- set lại tích lũy theo TỔNG TUYỆT ĐỐI (chạy lại an toàn, không nhân đôi) rồi tính lại hạng
  update public.profiles p set
    lifetime_spend = (select coalesce(sum(total_amount),0)::bigint from public.orders
                      where user_id = v_user and status = 'done'),
    lifetime_kg    = (select coalesce(sum(public.calc_order_kg(id)),0) from public.orders
                      where user_id = v_user and status = 'done')
  where p.id = v_user;

  update public.profiles set tier_code = public.compute_tier(v_user), tier_updated_at = now()
  where id = v_user and not tier_locked;

  insert into public.membership_events(user_id, event_type, amount, actor)
  values (v_user, 'merge_guest_orders', v_count, 'system');
  return v_count;
end;
$$;
```

**Lưu ý:**
- Khớp = **Tên VÀ SĐT** (SĐT chuẩn hóa bỏ ký tự lạ, ≥ 9 số; Tên lower+trim). Chặn khớp lỏng để không
  gộp nhầm đơn người khác cùng tên.
- `lifetime_spend/kg` set **tuyệt đối** (không cộng dồn) → idempotent, gọi lại nhiều lần vẫn đúng.
- **Đề xuất UX (xem `06`):** cho khách bấm nút "Gộp đơn cũ của tôi" + xác nhận thay vì tự động ngầm,
  giảm rủi ro khớp sai. Hoặc admin merge tay từ tab Khách hàng (`05`).
