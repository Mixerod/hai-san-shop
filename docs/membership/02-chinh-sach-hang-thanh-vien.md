# 02 — CHÍNH SÁCH HẠNG THÀNH VIÊN & QUYỀN LỢI

> File này định nghĩa **chính sách** (business rules). Toàn bộ con số dưới đây là **bản nháp đề xuất**
> để Quyết chỉnh; khi code, các con số này nằm trong DB (admin sửa), KHÔNG hard-code.
> Liên quan: cấu trúc lưu trữ ở `03`, cách áp dụng ở `04`, màn cấu hình ở `05`.
>
> 🔴 **Phần quan trọng nhất cần bạn đọc: Mục 6 — CÁC QUYẾT ĐỊNH CẦN CHỐT.**

---

## 1. Bậc hạng (✅ ĐÃ CHỐT) — xếp hạng CHỈ theo tổng tiền chi tiêu

| code | Tên hiển thị | Màu | Ngưỡng lên hạng (tổng chi tiêu tích lũy trọn đời) |
|------|--------------|-----|---------------------------------------------------|
| `member` | Thành viên | xám | 0đ (mặc định khi đăng ký) |
| `silver` | Khách Bạc | bạc | ≥ 1.000.000đ |
| `gold` | Khách Vàng | vàng | ≥ 5.000.000đ |
| `diamond` | Khách Kim Cương | cyan | ≥ 10.000.000đ |

> ✅ ĐÃ CHỐT: lên hạng **chỉ theo TIỀN**, mô hình **lifetime** (chỉ lên không xuống). Số kg KHÔNG dùng
> để xếp hạng — chỉ dùng cho mốc thưởng quà theo đơn (vd đơn ≥ 5kg). KHÔNG thêm cột `products.weight_kg`;
> kg tính bằng heuristic đơn vị: hàng `kg/ký` lấy theo `quantity`; `nước mắm` đơn vị `lít` KHÔNG tính vào kg.

## 2. Quyền lợi mỗi hạng (đề xuất)

Quyền lợi lưu dạng cấu hình theo từng tier. Các loại quyền lợi hỗ trợ:

| Quyền lợi | Kiểu dữ liệu | Ý nghĩa |
|-----------|--------------|---------|
| `discount_percent` | số (0–100) | Giảm % mặc định trên mỗi đơn của hạng này |
| `free_ship` | bool | Miễn phí ship (hoặc ngưỡng free ship riêng) |
| `birthday_voucher` | bool/ref | Tặng voucher sinh nhật (giai đoạn sau) |
| `priority_support` | bool | Ưu tiên hỗ trợ / nhãn VIP cho admin thấy |
| `perks_text` | text[] | Danh sách quyền lợi mô tả tự do (hiển thị cho khách) |

Đề xuất giá trị mặc định:

| Hạng | discount_percent | free_ship | Ghi chú quyền lợi mô tả |
|------|------------------|-----------|--------------------------|
| Thành viên | 0% | không | "Tích lũy để lên hạng nhận ưu đãi" |
| Bạc | 2% | không | "Giảm 2% mọi đơn", "Voucher định kỳ" |
| Vàng | 5% | đơn ≥ 5kg free ship | "Giảm 5%", "Free ship đơn lớn", "Quà tháng" |
| Kim Cương | 8% | có | "Giảm 8%", "Free ship", "Quà & ưu tiên VIP" |

> ⚠️ `discount_percent` của hạng và voucher có thể **chồng nhau** → phải định nghĩa quy tắc cộng dồn.
> Đề xuất: **không cộng dồn vô hạn** — áp giảm hạng trước, rồi voucher trên số còn lại; tổng giảm
> không vượt trần (vd 30%). Xem `04` mục "tính tiền" và ❓CĐ-5.

## 3. Voucher — phân loại & luật phát

### 3.1 Loại voucher
| type | value | Mô tả | Ràng buộc |
|------|-------|-------|-----------|
| `percent` | 0–100 | Giảm % trên tổng đơn | `max_discount` (trần tiền giảm), `min_order` |
| `fixed` | số tiền | Giảm số tiền cố định | `min_order` (đơn tối thiểu) |
| `free_ship` | — | Miễn phí vận chuyển | `min_order` hoặc min_kg |

### 3.2 Nguồn phát voucher (source)
- `signup` — tặng khi đăng ký tài khoản (tùy chọn).
- `tier_up` — tặng khi thăng hạng (vd lên Bạc tặng voucher 5%).
- `milestone` — tặng khi đơn đạt mốc (reward_rule), vd đơn ≥ 2.000.000đ tặng voucher 50k.
- `manual` — admin trao tay.
- `periodic` — định kỳ theo hạng (vd mỗi tháng Vàng nhận 1 voucher) — *giai đoạn sau, cần cron*.

### 3.3 Vòng đời voucher
```
issued (active) ──> khách áp tại checkout ──> used (gắn used_order_id)
        │
        └──> quá valid_to mà chưa dùng ──> expired
```
- Mỗi voucher cấp cho khách là **một bản ghi `customer_vouchers` riêng** (không share mã giữa người).
- Có `usage_limit` (số lần dùng, mặc định 1) và `per_user_limit` ở cấp định nghĩa (với voucher công khai).

## 4. Mốc thưởng (reward rules) — "mua đủ X nhận Y"

Mỗi luật gồm: **điều kiện** → **phần thưởng**, có phạm vi áp dụng & chống phát trùng.

| condition_type | Ý nghĩa | Ví dụ |
|----------------|---------|-------|
| `order_amount_gte` | 1 đơn có total ≥ ngưỡng | đơn ≥ 2.000.000đ → voucher 50k |
| `order_kg_gte` | 1 đơn có tổng kg ≥ ngưỡng | đơn ≥ 5kg → quà (1 hộp nước mắm) |
| `cumulative_spend_gte` | tổng tích lũy vượt mốc | đạt 5tr lần đầu → voucher 100k |
| `cumulative_kg_gte` | tổng kg vượt mốc | đạt 50kg lần đầu → quà |

| reward_type | Ý nghĩa |
|-------------|---------|
| `voucher` | Phát 1 voucher (trỏ tới định nghĩa voucher) |
| `gift` | Phát 1 quà (trỏ tới `gifts`), trừ kho |

**Chống phát trùng (rất quan trọng):**
- Luật theo **đơn** (`order_*`): mỗi `(reward_rule_id, order_id)` chỉ phát **1 lần** (unique).
- Luật theo **tích lũy** (`cumulative_*`): mỗi `(reward_rule_id, user_id)` chỉ phát **1 lần** (đạt mốc 1 lần duy nhất).
- Có thể giới hạn `tier_scope` (chỉ áp cho hạng nào) và `is_active`, `valid_from/valid_to`.

## 5. Quà tặng (gifts)

- Quà là **sản phẩm vật lý tặng kèm**, có `stock` (kho). Khi phát quà: trừ `stock`, tạo bản ghi
  `customer_gifts` gắn `order_id`. Nếu hết kho → không phát + ghi event lý do (admin xử lý tay).
- Quà **không quy ra tiền** trong tính toán đơn; chỉ là ghi chú "đơn này kèm quà X" để admin gói hàng.
- Admin có thể trao quà thủ công cho 1 khách bất kỳ.

---

## 6. ✅ CÁC QUYẾT ĐỊNH ĐÃ CHỐT (A9 hoàn tất — 2026-06-06)

| Mã | Quyết định |
|----|------------|
| CĐ-1 | **4 bậc**: Thành viên / Khách Bạc / Khách Vàng / Khách Kim Cương. |
| CĐ-2 | Lên hạng **chỉ theo TIỀN** (không dùng kg để xếp hạng). |
| CĐ-3 | **Lifetime** — giữ hạng vĩnh viễn, chỉ lên không xuống. Không cần job hạ hạng. |
| CĐ-4 | Chỉ đơn `status='done'` mới tính tích lũy. *(mặc định, đã áp dụng)* |
| CĐ-5 | Giảm hạng + voucher **cộng dồn**, áp hạng trước rồi voucher, **trần tổng giảm 30%**. |
| CĐ-6 | **Không** thêm cột `weight_kg`. kg = heuristic đơn vị (kg/ký theo quantity; lít không tính). |
| CĐ-7 | Ngưỡng: **Bạc 1.000.000đ · Vàng 5.000.000đ · Kim Cương 10.000.000đ**. |
| CĐ-8 | "Free ship" = **miễn phí ship khu vực Thủ Đức & lân cận rất gần Thủ Đức**. Xem Ghi chú vận chuyển. |
| CĐ-9 | **Có backfill** khách cũ từ đơn `done` (không phát thưởng hồi tố) + **merge đơn vãng lai** vào tài khoản mới khi đăng ký (khớp Tên + SĐT). |
| CĐ-10 | Voucher định kỳ theo hạng (`periodic`): **để giai đoạn sau** (cần cron). |

### 📦 Ghi chú vận chuyển (quan trọng — ảnh hưởng cách hiểu giá & free ship)
- **Đơn giao đến công ty:** giá sản phẩm **đã bao gồm phí ship** (gộp sẵn). Đây là điểm nhận của shop —
  KHÔNG coi là "quyền lợi free ship".
- **Đơn giao đến địa chỉ cụ thể:** tính **phí ship Viettel Post** theo khoảng cách (báo giá riêng).
- **Quyền lợi free ship của hạng** chỉ áp **khu vực Thủ Đức & rất gần Thủ Đức**. Ngoài khu vực này vẫn
  theo phí Viettel Post. → Cần 1 cấu hình "khu vực free ship" (có thể là text mô tả ở tier hoặc cấu
  hình chung) + admin/shipper xác nhận khi chốt phí.

### 🔗 Yêu cầu MERGE đơn vãng lai (CĐ-9 mở rộng) — tóm tắt
Khi khách **đăng ký tài khoản mới**: tìm đơn `orders.user_id IS NULL` có **Tên + SĐT trùng** tài khoản
→ gán `user_id`, cộng vào tích lũy (không phát thưởng hồi tố), tính lại hạng. So khớp parse từ
`orders.note` (text "Tên/SĐT") → có rủi ro khớp sai. Logic chi tiết: `04` mục 9; rủi ro: `07`.

---

### 🗂️ (Lưu trữ) Câu hỏi gốc trước khi chốt — đã trả lời ở bảng trên

- **❓CĐ-1 — Tên & số bậc hạng.** Giữ 4 bậc (Thành viên/Bạc/Vàng/Kim Cương) hay đổi tên/khác số bậc?
  → _Quyết định: ___________

- **❓CĐ-2 — Logic lên hạng:** đạt **tiền HOẶC kg** (đề xuất) hay bắt buộc **tiền** là chính, kg chỉ phụ?
  → _Quyết định: ___________

- **❓CĐ-3 — Mô hình tích lũy:** **Trọn đời (lifetime)** — lên hạng là giữ vĩnh viễn (đề xuất, đơn giản,
  ít lỗi); hay **theo kỳ 12 tháng** — hết hạn tụt hạng (giữ chân tốt hơn nhưng cần job hạ hạng + phức tạp)?
  → _Quyết định: ___________  *(ảnh hưởng lớn tới `04` và `07`)*

- **❓CĐ-4 — Đơn nào được tính tích lũy:** chỉ `status = 'done'` (đề xuất) hay tính cả từ `confirmed`?
  (Tính sớm → phải xử lý hoàn/hủy phức tạp.)
  → _Quyết định: ___________

- **❓CĐ-5 — Cộng dồn giảm giá:** giảm-theo-hạng + voucher có cộng dồn không, và **trần tổng giảm** là
  bao nhiêu %? (đề xuất: áp hạng trước rồi voucher, trần 30%.)
  → _Quyết định: ___________

- **❓CĐ-6 — Cách tính kg:** dùng heuristic `unit` hiện tại (rủi ro sai) hay thêm cột `products.weight_kg`
  để tính chuẩn? (đề xuất: thêm `weight_kg`, fallback heuristic khi null.)
  → _Quyết định: ___________

- **❓CĐ-7 — Ngưỡng cụ thể:** chốt 4 mốc tiền & kg (Mục 1) — giữ nguyên hay đổi con số?
  → _Quyết định: ___________

- **❓CĐ-8 — Free ship:** "free ship" nghĩa là gì trong vận hành hiện tại (đơn đang thu ship khi nhận
  hàng / Viettel Post báo giá)? Cần định nghĩa rõ để không hứa sai với khách.
  → _Quyết định: ___________

- **❓CĐ-9 — Khách cũ (đã có đơn done trước khi ra mắt):** có **backfill** tính hạng từ lịch sử đơn cũ
  không? (đề xuất: có, chạy 1 lần khi go-live.)
  → _Quyết định: ___________

- **❓CĐ-10 — Voucher định kỳ theo hạng (`periodic`):** làm ngay hay để giai đoạn sau? (cần cron job.)
  → _Quyết định: ___________
