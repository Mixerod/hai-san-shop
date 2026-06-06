# 08 — KẾ HOẠCH TRIỂN KHAI (chia phase để CODE)

> File này là **nguồn sự thật cho việc code** ở Giai đoạn B. Mỗi mã việc khớp với bảng tiến độ ở
> `README.md` mục 3. Chỉ bắt đầu B sau khi **A9 ✅** (Quyết chốt các "CẦN CHỐT" trong `02`).
>
> Mỗi mã việc dưới đây có: **Mục tiêu · Phụ thuộc · File đụng tới · Định nghĩa "xong" (DoD)**.

---

## Nguyên tắc thực thi từng phase

1. Làm đúng thứ tự phụ thuộc (B1→B2→B3→B4 trước, UI sau).
2. Migration SQL: tạo file trong `supabase/migrations/`, **để Quyết bấm chạy** trên Supabase, không tự
   chạy lên DB production.
3. Sau mỗi mã việc: build/lint xanh → cập nhật `README.md` (trạng thái ✅ + nhật ký) → commit
   (`feat(membership-Bx): ...`).
4. Sau B-cuối: chạy `/code-review` + review bảo mật theo checklist `07` mục 7.

---

## NHÓM 1 — Database (làm trước tiên)

### B1 — Migration bảng cấu hình
- **Mục tiêu:** tạo `membership_tiers`, `voucher_definitions`, `gifts`, `reward_rules` + seed 4 hạng.
- **Phụ thuộc:** A9.
- **File:** `supabase/migrations/<ts>_membership_config.sql` (DDL theo `03` mục 2 + seed mục 7).
- **DoD:** chạy migration không lỗi; `select * from membership_tiers` ra 4 hạng.

### B2 — Migration bảng dữ liệu khách + alter bảng cũ
- **Mục tiêu:** thêm cột `profiles`/`orders`/`products`; tạo `customer_vouchers`, `customer_gifts`,
  `membership_events` + unique index chống trùng.
- **Phụ thuộc:** B1.
- **File:** `supabase/migrations/<ts>_membership_customer.sql` (`03` mục 3, 4, 5).
- **DoD:** cột mới tồn tại; unique index tạo thành công; bảng cũ không đổi dữ liệu hiện có.

### B3 — Function + Trigger (idempotent)
- **Mục tiêu:** `calc_order_kg`, `compute_tier`, `apply_reward_rules`, `process_order_rewards`,
  `trg_order_done` + trigger.
- **Phụ thuộc:** B2.
- **File:** `supabase/migrations/<ts>_membership_logic.sql` (`04` mục 2–6).
- **DoD:** test thủ công: set 1 đơn 'done' → tích lũy cộng đúng, hạng cập nhật, đơn có `rewards_processed_at`;
  gọi lại không nhân đôi (idempotency theo `07` mục 1).

### B4 — RLS policies
- **Mục tiêu:** bật RLS + policy cho mọi bảng mới (đọc công khai cấu hình, chủ-sở-hữu đọc ví, service
  ghi).
- **Phụ thuộc:** B2 (và B3 cho function security definer).
- **File:** `supabase/migrations/<ts>_membership_rls.sql` (`03` mục 6, `07` mục 5).
- **DoD:** khách thường KHÔNG insert được `customer_vouchers`/sửa `membership_tiers`; chỉ đọc ví của mình.

### B3.5 (tùy chọn) — Backfill khách cũ
- **Mục tiêu:** nếu ❓CĐ-9 = có → script tính tích lũy từ đơn `done` cũ + set `rewards_processed_at`.
- **File:** chạy 1 lần (không phải migration thường), theo `04` mục 8.
- **DoD:** khách cũ có hạng đúng; KHÔNG phát voucher/quà hồi tố.

---

## NHÓM 2 — UI Admin (`src/app/admin/page.tsx`)

### B5 — Cấu hình hạng & quyền lợi
- **File hướng dẫn:** `05` mục 2. **Phụ thuộc:** B1, B4.
- **DoD:** CRUD hạng hoạt động qua RPC admin; validate ngưỡng; nút "tạo 4 hạng mặc định".

### B6 — Cấu hình voucher / quà / mốc thưởng
- **File:** `05` mục 3–5. **Phụ thuộc:** B1, B4.
- **DoD:** CRUD `voucher_definitions`, `gifts`, `reward_rules`; soft-delete; thống kê đã phát/đã dùng.

### B7 — Trao thủ công + audit log
- **File:** `05` mục 6. **Phụ thuộc:** B2, B3, B4.
- **DoD:** đặt hạng (khóa/mở khóa), trao/thu voucher, trao quà (trừ kho), xem timeline `membership_events`;
  mọi thao tác ghi event với `actor=admin_id`.

---

## NHÓM 3 — UI Khách

### B8 — Tab "Hạng thành viên" ở `/profile`
- **File:** `06` mục 1. **Phụ thuộc:** B2, B4.
- **DoD:** hiện hạng, thanh tiến độ lên hạng kế, ví voucher, quà; chỉ đọc dữ liệu của chính khách (RLS).

### B9 — Áp voucher tại `/checkout`
- **File:** `06` mục 3, `04` mục 7. **Phụ thuộc:** B2, B3, B4.
- **DoD:** chọn voucher hợp lệ; đánh dấu used atomic (chống double-spend); không phá luồng guest.

### B10 — Tích hợp giảm giá hạng vào tính tiền
- **File:** `04` mục 7, `06` mục 3. **Phụ thuộc:** B9.
- **DoD:** giảm theo hạng + voucher tính ở phía tin cậy, có trần tổng giảm (❓CĐ-5); `orders.total_amount`
  lưu số cuối; hiển thị breakdown cho khách.

---

## NHÓM 4 — Kiểm thử & chốt

### B11 — Test idempotency / race / duplicate
- **File:** `07` mục 1–4. **Phụ thuộc:** B3, B9.
- **DoD:** kịch bản test pass: gọi xử lý nhiều lần không nhân đôi; 2 đơn done song song tổng đúng;
  1 voucher không dùng được 2 lần; kho quà không âm.

### B12 — Soát bảo mật RLS + code review
- **File:** `07` mục 5, 7. **Phụ thuộc:** tất cả B.
- **DoD:** checklist `07` mục 7 tick hết; `/code-review` không còn lỗi CRITICAL/HIGH; khách thường bị
  RLS chặn ghi.

---

## Gợi ý chạy tự động (xem README mục 5)

Khi A9 ✅, có thể khởi động chuỗi B bằng `/loop` với prompt trỏ về bảng tiến độ. Mỗi vòng làm 1 mã việc
theo thứ tự, cập nhật trạng thái, commit, rồi tự sang mã kế. Dừng khi mọi B = ✅ hoặc gặp điều kiện
cần hỏi (xem điều kiện an toàn ở README mục 5).
