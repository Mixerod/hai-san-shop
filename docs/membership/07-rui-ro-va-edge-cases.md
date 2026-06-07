# 07 — RỦI RO & EDGE CASES (đọc TRƯỚC khi viết trigger/SQL)

> Đây là danh mục lỗi Quyết đặc biệt quan tâm: **trùng lặp, lag, đệ quy**, cộng race condition & bảo
> mật. Mỗi mục nêu: nguy cơ → cách phòng → cách kiểm thử.

---

## 1. 🔁 Lỗi TRÙNG LẶP (phát voucher/quà hoặc cộng tích lũy 2 lần)

**Nguy cơ:**
- Admin bấm 'done' → 'confirmed' → 'done' nhiều lần → trigger chạy nhiều lần.
- Hai request cập nhật status song song.
- Retry mạng / double-click ở UI admin.

**Phòng (3 lớp):**
1. **Cờ idempotency:** `orders.rewards_processed_at` + điều kiện `... and rewards_processed_at is null
   for update` trong `process_order_rewards` (`04` mục 2). Lần 2 không tìm thấy hàng → thoát.
2. **Trigger chỉ bắt chuyển-cạnh:** `new.status='done' and old.status is distinct from 'done'`
   (`04` mục 6) → set 'done' lại lần nữa không kích hoạt.
3. **Unique index phát thưởng:** `uq_cv_rule_order`, `uq_cv_rule_user`, `uq_cg_*` (`03` mục 5) +
   `insert ... on conflict do nothing`. Dù logic gọi 2 lần cũng không tạo 2 bản ghi.

**Kiểm thử:** gọi `process_order_rewards(id)` 3 lần liên tiếp → tích lũy chỉ tăng 1 lần, đúng 1 voucher.
Set status done→pending→done → không phát thêm.

---

## 2. ♾️ Lỗi ĐỆ QUY (trigger tự kích hoạt / vòng lặp giữa bảng)

**Nguy cơ:**
- Trigger trên `orders` cập nhật `orders` → tự gọi lại.
- Trigger trên `orders` cập nhật `profiles`; nếu sau này ai đó thêm trigger trên `profiles` ghi ngược
  `orders` → vòng lặp vô hạn → treo DB.

**Phòng:**
1. Trigger khai báo `AFTER UPDATE **OF status**` → chỉ thức dậy khi cột `status` đổi. Hàm xử lý chỉ
   ghi `rewards_processed_at` (không phải `status`) nên không tự kích hoạt (`04` mục 6).
2. **Quy ước cứng (ghi vào README/PR):** KHÔNG đặt trigger trên `profiles`/`customer_*` mà cập nhật
   ngược `orders`. Mọi xử lý thưởng đi 1 chiều: `orders → profiles/vouchers/gifts`.
3. Phòng xa: `if pg_trigger_depth() > 1 then return new; end if;` ở đầu trigger.
4. Function dùng `security definer set search_path = public` để tránh lỗi search_path & quyền.

**Kiểm thử:** cập nhật 1 đơn done và quan sát không có lời gọi lồng; `pg_trigger_depth()` ≤ 1.
Thử cố ý cập nhật profiles → xác nhận không sinh update orders.

---

## 3. 🐌 Lỗi LAG / TREO (chậm checkout, chậm admin)

**Nguy cơ:**
- Đặt logic nặng vào lúc **tạo đơn** (insert) → khách chờ lâu. (→ Vì vậy xử lý đặt ở lúc **done**, không
  phải insert.)
- Nút admin "Áp dụng lại hạng cho tất cả" quét toàn bộ khách trong 1 request → timeout.
- `calc_order_kg` join order_items×products mỗi lần — chấp nhận được ở mức đơn lẻ, nhưng tránh gọi trong
  vòng lặp lớn.

**Phòng:**
1. Tích lũy/thưởng chạy **AFTER UPDATE status='done'**, không nằm trong đường đặt đơn của khách.
2. Thao tác hàng loạt (re-rank toàn bộ, backfill) chạy **theo lô** (batch, vd 500 user/lần) qua RPC,
   hiển thị tiến độ; hoặc chạy off-peak. Không làm đồng bộ trong click handler.
3. Index: `idx_orders_user_status`, `idx_cv_user_status` (`03` mục 5) cho truy vấn ví/đơn nhanh.
4. Trang admin liệt kê khách: **phân trang** (LIMIT/OFFSET hoặc keyset), không `select *` toàn bảng
   `profiles` (rule chung của dự án: luôn có phân trang).

**Kiểm thử:** đo thời gian set 1 đơn done (< 100ms target). Backfill N khách theo lô không khóa bảng lâu.

---

## 4. 🏁 RACE CONDITION

**Nguy cơ:**
- 2 đơn của cùng khách done gần như đồng thời → cộng tích lũy đè nhau (lost update).
- 1 voucher bị áp cho 2 đơn song song (double-spend).
- Phát quà khi kho = 1 cho 2 đơn cùng lúc → âm kho.

**Phòng:**
1. **Atomic increment:** `update profiles set lifetime_spend = lifetime_spend + :x` (không đọc-rồi-ghi
   ở client). Kèm `SELECT ... FOR UPDATE` hàng profile trong function (`04` mục 2c).
2. **Voucher used có điều kiện:** `update customer_vouchers set status='used' where id=:id and
   status='active'` rồi kiểm tra số dòng = 1 (`04` mục 7). 0 dòng = đã bị dùng → từ chối.
3. **Trừ kho có điều kiện:** `update gifts set stock=stock-1 where id=:id and (stock>0 or stock=-1)`
   rồi `if found` mới phát (`04` mục 4). Không bao giờ âm kho.

**Kiểm thử:** chạy song song 2 lần áp cùng voucher → đúng 1 thành công. 2 đơn done đồng thời → tổng
tích lũy đúng tổng 2 đơn.

---

## 5. 🔐 BẢO MẬT (RLS / phân quyền admin)

**Nguy cơ:**
- Dự án hiện có policy lỏng `Allow public insert/select` trên `orders`/`order_items`. Nếu sao chép kiểu
  đó cho bảng membership → khách có thể tự phát voucher/sửa hạng cho mình.
- Client dùng **anon key** (`src/lib/supabase.ts`). Mọi thứ client ghi được = khách ghi được.
- "Ai là admin?" hiện chưa rõ ràng ở web.

**Phòng:**
1. **Bảng cấu hình & ví:** RLS như `03` mục 6 — khách chỉ ĐỌC; mọi GHI (phát thưởng, set hạng, đánh
   dấu used) qua **RPC SECURITY DEFINER** kiểm tra quyền, hoặc service_role (server-side), KHÔNG để
   anon ghi trực tiếp.
2. **Định nghĩa admin rõ ràng:** vd cột `profiles.is_admin` hoặc bảng `admins(user_id)`; RPC admin
   kiểm `exists(select 1 from admins where user_id = auth.uid())`. **❓ cần xác nhận cơ chế admin hiện
   tại của web** (ghi vào `02` nếu cần quyết định).
3. **Không tin client về tiền:** số tiền giảm tính/checke ở phía tin cậy (`04` mục 7).
4. Không log lộ thông tin nhạy cảm; thông báo lỗi RLS bằng ngôn ngữ thân thiện (đừng lộ SQL).

**Kiểm thử:** đăng nhập 1 khách thường, thử `insert customer_vouchers` / `update membership_tiers` →
phải bị RLS chặn. Thử đọc ví của user khác → 0 dòng.

---

## 6. 🧮 EDGE CASES tính toán & dữ liệu

| Tình huống | Xử lý |
|------------|-------|
| Đơn `done` rồi bị **hủy/hoàn** | Bản thiết kế *lifetime, chỉ cộng* → nếu cho phép hủy đơn done phải có quy trình bù trừ + event `accrual_reversal`. ❓ Làm rõ chính sách hủy đơn done. |
| Khách **chưa có `profiles`** (chỉ auth) | `process_order_rewards` cần profile tồn tại; đảm bảo tạo profile khi đăng ký (auth page đã upsert). Nếu null → skip + log. |
| Đơn `user_id = null` (guest) | Chỉ set `rewards_processed_at`, không tích lũy (`04` mục 2a). |
| `weight_kg` null & unit không phải kg | kg = 0 cho dòng đó (không tính). Tránh đoán sai (`04` mục 3). |
| Số lẻ kg (0.5kg/bước) | `lifetime_kg numeric(10,2)` chịu được; so ngưỡng dùng numeric. |
| Đổi ngưỡng hạng khiến khách "tụt" theo cấu hình mới | `compute_tier` trả hạng theo cấu hình hiện tại; nếu không muốn tụt, `tier_locked` hoặc chính sách "chỉ lên không xuống" (❓CĐ-3). |
| Voucher percent không trần | Bắt buộc `max_discount` cho percent lớn, hoặc trần tổng giảm (❓CĐ-5). |
| Xóa voucher_def đang được ví tham chiếu | Soft-delete (`is_active=false`), FK `on delete restrict`/`set null` (`03`). |
| Nhiều reward_rule cùng kích hoạt 1 đơn | Tất cả luật đủ điều kiện đều phát (mỗi luật idempotent riêng). Admin tự tránh chồng chéo. |
| Backfill chạy 2 lần | Backfill set tích lũy tuyệt đối (không cộng dồn) + set `rewards_processed_at` đơn cũ → chạy lại an toàn (`04` mục 8). |
| **Merge đơn vãng lai khớp SAI** (cùng tên khác người / SĐT gõ nhầm trong `note`) | Khớp bắt buộc **Tên VÀ SĐT đã chuẩn hóa** (SĐT ≥ 9 số, bỏ ký tự lạ); nên để khách/admin **xác nhận trước khi gộp**; ghi `membership_events('merge_guest_orders')` để truy vết & hoàn tác. Set tích lũy tuyệt đối nên gọi lại an toàn (`04` mục 9). |

---

## 7. Checklist bắt buộc trước khi merge code membership (B12)

- [ ] Mọi bảng mới đã bật RLS, không có policy `public write`.
- [ ] Phát thưởng dùng `on conflict do nothing` + unique index đã tạo.
- [ ] Trigger `AFTER UPDATE OF status`, không tự kích hoạt; không có trigger ghi ngược orders.
- [ ] Tính tiền giảm xác thực phía tin cậy; voucher used cập nhật có điều kiện.
- [ ] Thao tác hàng loạt chạy theo lô, có phân trang.
- [ ] Đã test idempotency (gọi 2–3 lần), race (song song), RLS (khách thường bị chặn).
- [ ] Không phá luồng guest checkout & đặt đơn hiện có.
