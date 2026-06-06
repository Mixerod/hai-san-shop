# 05 — ĐẶC TẢ GIAO DIỆN ADMIN

> Màn admin để **cấu hình chính sách** và **trao thưởng thủ công**. Đặt trong admin web hiện có
> (`src/app/admin/page.tsx`) — thêm tab/section mới, theo style sẵn có của trang.
> Liên quan: dữ liệu `03`, logic `04`. Tương tác web↔DB ghi rõ ở mỗi mục.

---

## 1. Vị trí & điều hướng

Thêm khu vực **"Thành viên & Ưu đãi"** trong `/admin`, gồm các tab con:
1. **Hạng thành viên** (cấu hình `membership_tiers`)
2. **Voucher** (cấu hình `voucher_definitions`)
3. **Quà tặng** (cấu hình `gifts`)
4. **Mốc thưởng** (cấu hình `reward_rules`)
5. **Khách hàng** (xem hạng/tích lũy + trao thủ công + audit)

> Quyền truy cập: chỉ admin. Hiện admin web dùng Supabase auth chung — cần xác định "ai là admin"
> (xem `07` mục phân quyền). Mọi thao tác GHI cấu hình nên đi qua **service role / RPC**, không để
> anon key ghi thẳng bảng config.

---

## 2. Tab "Hạng thành viên"

**Hiển thị:** danh sách hạng (sort theo `sort_order`), mỗi dòng: tên, màu, ngưỡng tiền, ngưỡng kg,
logic (or/and), giảm %, free ship, trạng thái active.

**Thao tác:** Thêm / Sửa / Bật-Tắt / Đổi thứ tự. Form sửa gồm các field khớp cột `membership_tiers`
(`03` mục 2.1): `name, color, min_spend, min_kg, threshold_logic, discount_percent, free_ship, perks[]`.

**Tương tác web↔DB:**
- Đọc: `select * from membership_tiers order by sort_order`.
- Ghi: `update membership_tiers set ... where id=` (qua RPC admin).
- ⚠️ Khi đổi ngưỡng, **không tự động re-rank toàn bộ khách ngay trong request** (gây lag/treo nếu nhiều
  khách). Cung cấp nút **"Áp dụng lại hạng cho tất cả"** chạy job nền (RPC quét theo lô) — xem `07` lag.

**Validate:** `min_spend, min_kg >= 0`; `discount_percent 0–100`; `code` không trùng; ngưỡng các hạng
nên tăng dần theo `sort_order` (cảnh báo nếu lộn xộn).

---

## 3. Tab "Voucher"

**Hiển thị:** danh sách `voucher_definitions`: tên, type, value, min_order, tier_scope, hạn, active,
và **số đã phát / đã dùng** (đếm từ `customer_vouchers`).

**Thao tác:** Thêm/Sửa/Tắt. Form: `name, type(percent|fixed|free_ship), value, max_discount, min_order,
min_kg, tier_scope[], per_user_limit, valid_from, valid_to`.

**Tương tác web↔DB:**
- Thống kê: `select count(*) filter (where status='used') ... from customer_vouchers where voucher_def_id=`.
- ⚠️ Khi **tắt/xóa** một voucher definition đang được tham chiếu bởi `reward_rules` hoặc đã phát cho
  khách: KHÔNG xóa cứng (FK `on delete restrict`/`set null`). Dùng `is_active=false` (soft).

**Validate:** percent ≤ 100; fixed > 0; `valid_from < valid_to`.

---

## 4. Tab "Quà tặng"

**Hiển thị:** danh sách `gifts`: ảnh, tên, mô tả, tồn kho (`stock`, -1 = vô hạn), active, **đã phát**
(đếm `customer_gifts`).

**Thao tác:** Thêm/Sửa/Nhập thêm kho/Tắt. Cảnh báo khi `stock` thấp.

**Tương tác web↔DB:** đọc `gifts`; cập nhật `stock` qua RPC (tránh race khi vừa phát vừa sửa — dùng
`update ... set stock = stock + :delta`, không set giá trị tuyệt đối từ client).

---

## 5. Tab "Mốc thưởng" (reward_rules)

**Hiển thị:** danh sách luật: tên, điều kiện (loại + ngưỡng), phần thưởng (voucher/quà nào), tier_scope,
hạn, active, **số lần đã kích hoạt** (đếm event/grant theo `source_rule_id`).

**Thao tác:** Thêm/Sửa/Tắt. Form: `name, condition_type, threshold, reward_type, voucher_def_id |
gift_id, tier_scope[], valid_from, valid_to`.

**UX gợi ý:** wizard "Khi [điều kiện] thì tặng [phần thưởng]" để admin không cần hiểu cột DB.
Ví dụ mẫu hiển thị sẵn: "Đơn ≥ 5kg → tặng quà X", "Đơn ≥ 2.000.000đ → voucher 50k".

**Validate:** reward_type='voucher' bắt buộc chọn voucher_def; ='gift' bắt buộc chọn gift; threshold > 0.
Cảnh báo nếu tạo luật `cumulative_*` trùng ngưỡng (dễ gây khó hiểu).

---

## 6. Tab "Khách hàng" — xem & TRAO THỦ CÔNG

**Hiển thị:** bảng khách (`profiles`): tên, sđt, hạng hiện tại (badge màu), `lifetime_spend`,
`lifetime_kg`, `tier_locked`, ngày cập nhật. Tìm kiếm theo tên/sđt/email. (Lưu ý admin app RN dùng
bảng `profiles` ở `admin-app/app/customers.tsx` — web admin làm tương tự.)

**Trao thủ công (mỗi thao tác ghi `membership_events` với `actor = admin_id`):**

| Hành động | Tác động DB | Lưu ý |
|-----------|-------------|-------|
| **Đặt hạng thủ công** | `update profiles set tier_code=, tier_locked=true, tier_updated_at=now()` + event `tier_set_manual` | `tier_locked=true` để auto KHÔNG ghi đè (xem `04` mục d). Có nút "Mở khóa" để trả về tự động. |
| **Trao voucher** | `insert customer_vouchers(source='manual', ...)` | Chọn voucher_def; set hạn. |
| **Trao quà** | `insert customer_gifts(source='manual')` + trừ `gifts.stock` | Kiểm tra kho. |
| **Thu hồi voucher** | `update customer_vouchers set status='revoked'` | Chỉ khi còn 'active'. |
| **Điều chỉnh tích lũy** | `update profiles set lifetime_spend/kg=` + event | Hiếm dùng; ghi lý do bắt buộc. |

**Audit log:** panel xem `membership_events` của 1 khách (timeline): ngày, loại sự kiện, từ hạng →
hạng, actor (system/admin), lý do. Đây là bằng chứng khi có khiếu nại.

**Tương tác web↔DB & an toàn:**
- Trao thủ công nên gọi **RPC `admin_grant_*`** (SECURITY DEFINER, kiểm tra caller là admin) thay vì
  insert trực tiếp từ client → tránh lộ quyền ghi bảng nhạy cảm qua anon key.
- Nút "Áp dụng lại hạng cho 1 khách": gọi `compute_tier` + cập nhật (nếu không khóa).

---

## 7. Trạng thái rỗng / lỗi (đừng nuốt lỗi)

- Khi chưa cấu hình hạng nào: hiển thị hướng dẫn + nút "Tạo 4 hạng mặc định" (chạy seed `03` mục 7).
- Mọi thao tác ghi: hiện toast thành công/lỗi rõ ràng (dự án có pattern toast sẵn ở checkout/profile).
- Nếu RPC trả lỗi quyền (RLS): hiển thị thông báo "Bạn không có quyền admin" thay vì lỗi kỹ thuật.
