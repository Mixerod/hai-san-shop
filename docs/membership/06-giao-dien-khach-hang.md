# 06 — ĐẶC TẢ GIAO DIỆN KHÁCH HÀNG

> Phần khách nhìn thấy: hạng của mình, tiến độ lên hạng kế, ví voucher, quà đã nhận, và áp voucher khi
> đặt đơn. Đặt trong `/profile` (đã có 2 tab: Hồ sơ / Đơn hàng → thêm tab "Thành viên") và `/checkout`.
> Liên quan: logic `04` mục 7 (tính tiền), dữ liệu `03`.

---

## 1. Trang `/profile` — thêm tab "Hạng thành viên"

`src/app/profile/page.tsx` hiện có `activeTab: 'profile' | 'orders'`. Thêm `'membership'`.

**Khối A — Thẻ hạng hiện tại:**
- Badge màu theo `membership_tiers.color`, tên hạng, icon.
- Số liệu: `lifetime_spend` (định dạng `toLocaleString('vi-VN')` + "đ"), `lifetime_kg` ("kg").
- Danh sách quyền lợi (`perks[]` + giảm %, free ship) của hạng hiện tại.

**Khối B — Thanh tiến độ lên hạng kế:**
- Lấy hạng kế tiếp (sort_order + 1). Tính % tiến độ = `lifetime_spend / next.min_spend` (hoặc kg).
- Hiển thị: "Còn **X đồng** (hoặc **Y kg**) nữa để lên **Khách Vàng**".
- Nếu đã hạng cao nhất: "Bạn đang ở hạng cao nhất 🎉".
- Tái dùng style stepper/progress đã có (profile dùng OrderStepper, checkout dùng thanh kg).

**Khối C — Ví voucher:**
- Danh sách `customer_vouchers` status='active' của user: tên, giá trị, điều kiện (min_order), hạn dùng.
- Voucher `used`/`expired` cho vào mục "Lịch sử" thu gọn.
- CTA "Dùng ngay" → chuyển tới `/products` hoặc `/checkout`.

**Khối D — Quà đã nhận:**
- Danh sách `customer_gifts`: tên quà, trạng thái (granted/delivered), gắn đơn nào.

**Tương tác web↔DB (chỉ ĐỌC, RLS chủ sở hữu):**
```ts
// hạng + tích lũy
supabase.from('profiles')
  .select('tier_code, lifetime_spend, lifetime_kg, tier_updated_at').eq('id', userId).single()
// cấu hình hạng (để hiển thị quyền lợi + ngưỡng hạng kế)
supabase.from('membership_tiers').select('*').order('sort_order')
// ví voucher (join định nghĩa)
supabase.from('customer_vouchers')
  .select('*, voucher_definitions(name,type,value,min_order,max_discount)')
  .eq('user_id', userId).order('issued_at', { ascending:false })
// quà
supabase.from('customer_gifts').select('*, gifts(name,image_url)').eq('user_id', userId)
```
> RLS đã giới hạn `auth.uid() = user_id` nên truy vấn chỉ trả dữ liệu của chính khách. `membership_tiers`
> đọc công khai (is_active).

---

## 2. Hiển thị huy hiệu hạng ở Navbar / header (tùy chọn nhẹ)

- Cạnh tên/avatar trong `Navbar.tsx`, thêm badge hạng nhỏ (đọc `tier_code` 1 lần khi có session).
- Giữ nhẹ: cache trong state, không query lại mỗi render.

---

## 3. Trang `/checkout` — áp voucher & hiển thị giảm giá hạng

`src/app/checkout/page.tsx` hiện tính `total()` ở client và đã có `totalKg`. Bổ sung:

**UI:**
- Nếu user đăng nhập & có hạng giảm %: dòng "Ưu đãi hạng [Vàng] −5%": `-{amount}đ`.
- Mục "Chọn voucher": dropdown/list voucher 'active' đủ điều kiện (`min_order ≤ subtotal`, còn hạn,
  tier_scope hợp lệ). Chọn 1 → hiển thị dòng giảm tương ứng.
- Tổng kết: Tạm tính → Giảm hạng → Giảm voucher → **Thành tiền** (đã ghi trần tổng giảm, ❓CĐ-5).

**Tương tác web↔DB (xem `04` mục 7 — vùng nhạy cảm):**
- Load voucher khả dụng: `customer_vouchers` active của user + join definition để check điều kiện.
- Khi submit đơn: **xác thực & tính lại tiền ở phía tin cậy** (RPC `place_order` đề xuất), rồi:
  - `insert orders (total_amount = final_amount, ...)` (giữ luồng insert hiện có, đổi total).
  - `update customer_vouchers set status='used', used_order_id=, discount_applied=, used_at=now()
     where id=:vid and status='active'` → kiểm tra `rowCount=1` (chống double-spend, `04` mục 7).
  - Nếu update voucher trả 0 dòng (đã bị dùng) → hủy đơn hoặc báo "voucher không còn hợp lệ".

**Lưu ý tương thích:** đừng phá luồng guest checkout hiện tại. Khối voucher/giảm-hạng **chỉ hiện khi
có session**. Guest vẫn đặt đơn như cũ.

---

## 4. Thông báo khi lên hạng / nhận thưởng

- Dự án có bảng `notifications` (Navbar đọc). Khi `process_order_rewards` phát thưởng/lên hạng, có thể
  `insert notifications` cho user → khách thấy "🎉 Bạn đã lên Khách Vàng" / "Bạn nhận 1 voucher 50k".
- Giai đoạn đầu có thể chỉ hiển thị ở `/profile`; thông báo realtime để phase sau.

---

## 5. Trạng thái rỗng & lỗi

- Chưa có hạng/tích lũy: hiển thị "Hãy mua sắm để bắt đầu tích lũy hạng thành viên".
- Lỗi tải: hiện thông báo nhẹ, không vỡ trang (dự án có ErrorBoundary ở admin app; web nên try/catch).
- Voucher hết hạn vẫn hiển thị nhưng disabled + nhãn "Hết hạn".
