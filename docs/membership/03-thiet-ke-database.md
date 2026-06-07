# 03 — THIẾT KẾ DATABASE & SQL MIGRATION

> Postgres (Supabase). Mọi lệnh dưới đây là **bản nháp để review** — chỉ chạy sau khi A9 ✅.
> ⚠️ **Migration luôn để con người bấm chạy trong Supabase SQL Editor**, agent KHÔNG tự chạy lên DB
> production. Lưu file `.sql` vào `supabase/migrations/` theo quy ước có sẵn.
> Liên quan: chính sách `02`, logic/trigger `04`, RLS & rủi ro `07`.

---

## 1. Tổng quan bảng

**Bảng cấu hình (admin sửa):**
- `membership_tiers` — định nghĩa hạng + quyền lợi.
- `voucher_definitions` — mẫu voucher.
- `gifts` — kho quà.
- `reward_rules` — luật "đạt X nhận Y".

**Bảng dữ liệu khách:**
- `profiles` (mở rộng cột) — hạng hiện tại + tích lũy.
- `customer_vouchers` — voucher của từng khách (ví).
- `customer_gifts` — quà đã phát cho khách.
- `membership_events` — nhật ký kiểm toán (audit) mọi thay đổi hạng/thưởng.

**Bảng hiện có (chỉ thêm cột, không phá):**
- `orders` — thêm `rewards_processed_at`.
- `products` — thêm `weight_kg` (nếu chốt ❓CĐ-6).

> Quy ước chung: PK `uuid default gen_random_uuid()`, thời gian `timestamptz default now()`,
> tiền VND lưu `bigint` (đồng, không có phần lẻ), kg lưu `numeric(10,2)`.

---

## 2. DDL — Bảng cấu hình

```sql
-- ============ 2.1 membership_tiers ============
create table if not exists public.membership_tiers (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,          -- 'member' | 'silver' | 'gold' | 'diamond'
  name             text not null,
  sort_order       int  not null default 0,       -- thứ tự bậc (thấp -> cao)
  color            text,                           -- mã màu hiển thị
  min_spend        bigint not null default 0,      -- ngưỡng tổng chi tiêu (đồng)
  min_kg           numeric(10,2) not null default 0,-- ngưỡng tổng kg
  threshold_logic  text not null default 'or'      -- 'or' | 'and' (xem ❓CĐ-2)
                   check (threshold_logic in ('or','and')),
  discount_percent numeric(5,2) not null default 0,-- quyền lợi: giảm %
  free_ship        boolean not null default false,
  perks            jsonb not null default '[]'::jsonb, -- mảng mô tả quyền lợi tự do
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============ 2.2 voucher_definitions ============
create table if not exists public.voucher_definitions (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,                      -- mã (tùy chọn, có thể null nếu cấp riêng)
  name           text not null,
  type           text not null check (type in ('percent','fixed','free_ship')),
  value          numeric(12,2) not null default 0, -- percent: 0-100 ; fixed: số tiền
  max_discount   bigint,                           -- trần tiền giảm cho percent (null = không trần)
  min_order      bigint not null default 0,        -- đơn tối thiểu để áp
  min_kg         numeric(10,2) not null default 0,
  tier_scope     text[],                           -- null = mọi hạng; else danh sách code hạng
  per_user_limit int not null default 1,
  valid_from     timestamptz,
  valid_to       timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ============ 2.3 gifts ============
create table if not exists public.gifts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  stock       int not null default 0,              -- kho quà; -1 = không giới hạn
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ 2.4 reward_rules ============
create table if not exists public.reward_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  condition_type  text not null check (condition_type in
                   ('order_amount_gte','order_kg_gte','cumulative_spend_gte','cumulative_kg_gte')),
  threshold       numeric(14,2) not null,           -- ngưỡng (đồng hoặc kg tùy loại)
  reward_type     text not null check (reward_type in ('voucher','gift')),
  voucher_def_id  uuid references public.voucher_definitions(id) on delete set null,
  gift_id         uuid references public.gifts(id) on delete set null,
  tier_scope      text[],                           -- null = mọi hạng
  is_active       boolean not null default true,
  valid_from      timestamptz,
  valid_to        timestamptz,
  created_at      timestamptz not null default now(),
  -- bảo đảm reward trỏ đúng đối tượng
  check ( (reward_type = 'voucher' and voucher_def_id is not null)
       or (reward_type = 'gift'    and gift_id is not null) )
);
```

---

## 3. DDL — Mở rộng bảng hiện có

```sql
-- ============ 3.1 profiles: thêm cột hạng & tích lũy ============
alter table public.profiles
  add column if not exists tier_code        text    not null default 'member',
  add column if not exists lifetime_spend   bigint  not null default 0,
  add column if not exists lifetime_kg      numeric(10,2) not null default 0,
  add column if not exists tier_updated_at  timestamptz,
  add column if not exists tier_locked      boolean not null default false; -- true = admin khóa, auto KHÔNG đổi

-- (tùy chọn) FK mềm tới membership_tiers.code — dùng code làm khóa logic, không ràng buộc cứng để
-- admin xóa/đổi hạng không làm vỡ profiles. Validate ở tầng ứng dụng.

-- ============ 3.2 orders: cờ idempotency xử lý thưởng ============
alter table public.orders
  add column if not exists rewards_processed_at timestamptz; -- null = chưa xử lý tích lũy/thưởng

-- ============ 3.3 products: khối lượng (nếu chốt ❓CĐ-6) ============
alter table public.products
  add column if not exists weight_kg numeric(10,2); -- kg/đơn vị; null = suy ra từ unit (heuristic)
```

---

## 4. DDL — Bảng dữ liệu khách

```sql
-- ============ 4.1 customer_vouchers (ví voucher của khách) ============
create table if not exists public.customer_vouchers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  voucher_def_id uuid not null references public.voucher_definitions(id) on delete restrict,
  source         text not null check (source in ('signup','tier_up','milestone','manual','periodic')),
  status         text not null default 'active' check (status in ('active','used','expired','revoked')),
  -- truy vết nguồn để chống phát trùng (xem mục 5):
  source_order_id  uuid references public.orders(id) on delete set null,
  source_rule_id   uuid references public.reward_rules(id) on delete set null,
  used_order_id    uuid references public.orders(id) on delete set null,
  discount_applied bigint,                          -- số tiền đã giảm khi dùng (ghi nhận)
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz,
  used_at        timestamptz
);

-- ============ 4.2 customer_gifts (quà đã phát) ============
create table if not exists public.customer_gifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  gift_id      uuid not null references public.gifts(id) on delete restrict,
  source       text not null check (source in ('milestone','manual')),
  source_order_id uuid references public.orders(id) on delete set null,
  source_rule_id  uuid references public.reward_rules(id) on delete set null,
  status       text not null default 'granted' check (status in ('granted','delivered','cancelled')),
  granted_at   timestamptz not null default now()
);

-- ============ 4.3 membership_events (audit log — nguồn sự thật cho mọi thay đổi) ============
create table if not exists public.membership_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null,   -- 'tier_up','tier_down','tier_set_manual','voucher_issued',
                               -- 'gift_granted','accrual','backfill'
  from_tier   text,
  to_tier     text,
  amount      numeric(14,2),    -- số liên quan (vd lifetime_spend mới)
  reason      text,
  actor       text not null default 'system', -- 'system' | admin user_id
  ref_order_id uuid references public.orders(id) on delete set null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
```

---

## 5. Ràng buộc CHỐNG TRÙNG LẶP (unique indexes) — bắt buộc

> Đây là tuyến phòng thủ chính chống "phát voucher/quà 2 lần" dù trigger chạy lại. Xem thêm `07`.

```sql
-- Voucher theo MỐC-ĐƠN: mỗi (rule, order) chỉ 1 voucher
create unique index if not exists uq_cv_rule_order
  on public.customer_vouchers (source_rule_id, source_order_id)
  where source_rule_id is not null and source_order_id is not null;

-- Voucher theo TÍCH-LŨY: mỗi (rule, user) chỉ 1 lần
create unique index if not exists uq_cv_rule_user
  on public.customer_vouchers (source_rule_id, user_id)
  where source_rule_id is not null and source_order_id is null;

-- Quà theo MỐC-ĐƠN: mỗi (rule, order) chỉ 1 quà
create unique index if not exists uq_cg_rule_order
  on public.customer_gifts (source_rule_id, source_order_id)
  where source_rule_id is not null and source_order_id is not null;

-- Quà theo TÍCH-LŨY: mỗi (rule, user) chỉ 1 lần
create unique index if not exists uq_cg_rule_user
  on public.customer_gifts (source_rule_id, user_id)
  where source_rule_id is not null and source_order_id is null;

-- Index tra cứu nhanh ví theo khách
create index if not exists idx_cv_user_status on public.customer_vouchers (user_id, status);
create index if not exists idx_orders_user_status on public.orders (user_id, status);
```

> Logic phát thưởng phải dùng `insert ... on conflict do nothing` dựa trên các unique index này →
> nếu trùng thì bỏ qua, không lỗi, không nhân đôi (chi tiết `04`).

---

## 6. RLS (Row Level Security) — khung chính sách

> Chi tiết & lý do ở `07`. Nguyên tắc: cấu hình chỉ admin ghi; ví khách chỉ chủ đọc; phát thưởng do
> service role / SECURITY DEFINER function thực hiện.

```sql
-- Bật RLS
alter table public.membership_tiers   enable row level security;
alter table public.voucher_definitions enable row level security;
alter table public.gifts               enable row level security;
alter table public.reward_rules        enable row level security;
alter table public.customer_vouchers   enable row level security;
alter table public.customer_gifts      enable row level security;
alter table public.membership_events   enable row level security;

-- Cấu hình: ai cũng ĐỌC được (để khách xem quyền lợi/hạng), chỉ service_role GHI.
create policy cfg_read_tiers   on public.membership_tiers   for select using (is_active = true);
create policy cfg_write_tiers  on public.membership_tiers   for all to service_role using (true) with check (true);
-- (lặp tương tự cho voucher_definitions / gifts / reward_rules)

-- Ví khách: chỉ chủ sở hữu ĐỌC; chỉ service_role GHI (phát/đánh dấu used qua function).
create policy cv_owner_read on public.customer_vouchers
  for select using (auth.uid() = user_id);
create policy cv_service_write on public.customer_vouchers
  for all to service_role using (true) with check (true);

-- membership_events: chủ đọc của mình; service_role ghi.
create policy ev_owner_read on public.membership_events
  for select using (auth.uid() = user_id);
```

> ⚠️ Hiện dự án đã có policy lỏng kiểu `Allow public ...` trên `orders`/`order_items`. **Đừng** sao
> chép kiểu đó cho bảng membership — xem cảnh báo bảo mật ở `07`.

---

## 7. Seed dữ liệu khởi tạo (4 hạng mặc định)

```sql
insert into public.membership_tiers (code, name, sort_order, color, min_spend, min_kg, discount_percent, free_ship, perks)
values
 ('member',  'Thành viên',      0, '#94a3b8',         0,   0, 0, false, '["Tích lũy để lên hạng"]'),
 ('silver',  'Khách Bạc',       1, '#c0c0c0',  1000000, 0, 2, false, '["Giảm 2% mọi đơn"]'),
 ('gold',    'Khách Vàng',      2, '#f59e0b',  5000000, 0, 5, false, '["Giảm 5%","Free ship khu vực Thủ Đức"]'),
 ('diamond', 'Khách Kim Cương', 3, '#06b6d4', 10000000, 0, 8, true,  '["Giảm 8%","Free ship khu vực Thủ Đức","Ưu tiên VIP"]')
on conflict (code) do nothing;
```

---

## 8. Lưu ý vận hành migration

1. Chạy theo thứ tự: (2) bảng config → (3) alter bảng cũ → (4) bảng khách → (5) unique index →
   (6) RLS → (7) seed → trigger/function (ở `04`).
2. Mỗi bước bọc trong transaction nếu chạy thủ công; lỗi thì rollback.
3. Tất cả dùng `if not exists` / `on conflict do nothing` để **chạy lại an toàn** (re-runnable).
4. Sau khi tạo schema, nếu chốt ❓CĐ-9 (backfill) → chạy script tính `lifetime_spend/kg` từ đơn `done`
   cũ (script ở `04` mục Backfill).
