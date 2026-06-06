# B12 — SOÁT BẢO MẬT RLS + CODE REVIEW (membership)

> Soát tĩnh ngày 2026-06-06 theo checklist `07` mục 7. Phạm vi: RLS các bảng membership +
> toàn bộ RPC (B5–B10) + client `/checkout`, `/profile`. _(by Claude — phiên local)_
>
> ⚠️ Đây là review TĨNH (đọc code/SQL). Việc CHẠY test thực (idempotency/race/RLS) là **B11**
> — cần dữ liệu thật trên Supabase, Quyết chạy bằng tay theo kịch bản ở `07` mục 1–5.

## 1. Kết quả theo checklist `07` mục 7

| # | Mục | Kết quả | Bằng chứng |
|---|-----|---------|-----------|
| 1 | Mọi bảng mới bật RLS, KHÔNG có `public write` | ✅ PASS | 7 bảng `enable row level security`; cấu hình `for select using (is_active)`, ví/quà/events `for select using (auth.uid()=user_id)`; GHI chỉ `to service_role`. Không có policy ghi cho `anon`/`authenticated`. |
| 2 | Phát thưởng `on conflict do nothing` + unique index | ✅ PASS | `apply_reward_rules` (04 mục 4) + `uq_cv_*`/`uq_cg_*` (03 mục 5) — tầng DB B1–B4. |
| 3 | Trigger `AFTER UPDATE OF status`, không tự kích hoạt / không ghi ngược orders | ✅ PASS | `trg_orders_done` chỉ nghe `OF status`; hàm chỉ ghi `rewards_processed_at`. Không trigger nào trên `profiles`/`customer_*` ghi ngược `orders`. |
| 4 | Tính tiền giảm xác thực phía tin cậy; voucher used cập nhật có điều kiện | ✅ PASS | `place_order` (B9/B10) đọc lại GIÁ THẬT `products.price` + `discount_percent` của hạng phía server; voucher `update ... where status='active'` + `rowCount=1` (chống double-spend). |
| 5 | Thao tác hàng loạt theo lô, có phân trang | ✅ PASS | `admin_list_customers` LIMIT/OFFSET (B7). Không `select *` toàn bảng `profiles` từ client. |
| 6 | Đã test idempotency/race/RLS | ⏳ → **B11** | Review tĩnh đạt; chạy thực thuộc B11. |
| 7 | Không phá luồng guest checkout & đặt đơn hiện có | ✅ PASS | `/checkout` chỉ rẽ qua `place_order` khi `session && (selectedVoucher || tierDiscount>0)`; guest & đơn không ưu đãi giữ nguyên `supabase.from('orders').insert`. |

## 2. Soát phân quyền admin

- `is_membership_admin()` = `auth.email() = 'minhquyet08122003@gmail.com'` (SECURITY DEFINER, stable).
  Khớp `ADMIN_EMAIL` trong `src/proxy.ts` (đã gate `/admin`). MỌI RPC `admin_*` kiểm hàm này ở đầu →
  khách thường gọi trực tiếp cũng bị `raise exception 'forbidden: admin only'`. ✅
- RPC `admin_*` dùng `auth.email()` làm `actor` khi ghi `membership_events` → truy vết đúng người. ✅

## 3. Soát riêng `place_order` (B9/B10 — code mới)

- SECURITY DEFINER + `set search_path = public` → không lỗi search_path/quyền. ✅
- Bắt buộc `auth.uid()` (chặn ẩn danh); chỉ tạo order cho **chính caller** (`user_id = v_user`) → không
  đặt hộ người khác. ✅
- Đọc voucher có `cv.user_id = v_user` → không dùng được voucher của người khác. ✅
- `p_note`/`p_items` truyền qua tham số + `jsonb_to_recordset` (không nối chuỗi) → không SQL injection. ✅
- Trần tổng giảm 30% (CĐ-5) + áp hạng trước voucher — ép phía server, client không bịa được. ✅

## 4. Phát hiện (không chặn merge)

| Mức | Mô tả | Khuyến nghị |
|-----|-------|-------------|
| LOW | `place_order` KHÔNG lọc `products.in_stock` → đặt được hàng đang "hết hàng". **Khớp luồng checkout cũ** (cart vẫn giữ sản phẩm hết hàng) → KHÔNG phải hồi quy. | Nếu muốn siết: thêm `and p.in_stock` vào join (đồng bộ cả luồng cũ). Để lại quyết định vận hành cho Quyết. |
| LOW | Không giới hạn TRÊN cho `quantity` trong `place_order`. | Pre-existing; có thể thêm guard nếu lo spam đơn lớn. |
| NOTE | Luồng guest / đơn KHÔNG ưu đãi vẫn tin client về `price_at_time` & `total_amount`. **Ngoài phạm vi membership** (hành vi sẵn có). | Khi muốn xác thực 100%: chuyển TẤT CẢ đặt đơn qua `place_order` (kể cả không ưu đãi). Cân nhắc ở giai đoạn sau. |

## 5. Kết luận

**KHÔNG có lỗi CRITICAL/HIGH.** Tầng membership tuân thủ thiết kế bảo mật `03`/`07`: khách chỉ ĐỌC qua
RLS, mọi GHI nhạy cảm qua RPC SECURITY DEFINER có kiểm quyền, tính tiền & voucher xác thực phía tin cậy
+ atomic. Các phát hiện đều mức LOW/NOTE, phần lớn là hành vi sẵn có ngoài phạm vi membership. → **B12 PASS.**
Bước còn lại để đóng checklist: chạy test thực **B11** trên Supabase.
