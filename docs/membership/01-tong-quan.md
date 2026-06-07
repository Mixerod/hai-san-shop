# 01 — TỔNG QUAN & THUẬT NGỮ

> Mục tiêu file này: cho bất kỳ ai đọc 5 phút là hiểu **tính năng làm gì, ai dùng, luồng chạy ra sao**.
> Quay về điều phối: `README.md`.

---

## 1. Bối cảnh & mục tiêu

Shop hải sản (`haisanphanthiet.vercel.app`) hiện đã có: sản phẩm, giỏ hàng, checkout, đơn hàng, hồ sơ
khách (`/profile`), admin web (`/admin`). **Chưa có** chương trình khách hàng thân thiết.

Mục tiêu: tăng giữ chân & khuyến khích mua lại bằng **hạng thành viên** + **voucher/quà theo mốc**,
trong đó **admin tự cấu hình mọi chính sách** mà không cần lập trình viên.

## 2. Phạm vi (Scope)

### ✅ Trong phạm vi
- Hệ thống hạng (tier) nhiều bậc, ngưỡng & quyền lợi do admin cấu hình.
- Tự động thăng hạng theo tổng chi tiêu **và/hoặc** tổng kg (đơn đã hoàn thành).
- Voucher: phát tự động khi đạt mốc, phát thủ công bởi admin, khách áp tại checkout.
- Quà tặng vật lý theo mốc (vd ≥ 5kg/đơn) — admin quản lý kho quà & gán vào đơn.
- Trao hạng/voucher/quà **thủ công** bởi admin + nhật ký kiểm toán (audit log).
- Hiển thị cho khách: hạng hiện tại, tiến độ lên hạng kế, ví voucher.

### ❌ Ngoài phạm vi (giai đoạn này)
- Hệ thống tích điểm đổi quà phức tạp (points marketplace) — chỉ chừa chỗ mở rộng.
- Giới thiệu bạn bè (referral), affiliate.
- Khách vãng lai (không đăng nhập) — không tích lũy.
- Thanh toán/giảm giá tự động ở cấp cổng thanh toán bên thứ 3.

## 3. Thuật ngữ (Glossary) — dùng thống nhất trong mọi file

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **Hạng / Tier** | Bậc thành viên (vd Đồng/Bạc/Vàng/Kim Cương). Cấu hình ở bảng `membership_tiers`. |
| **Ngưỡng / Threshold** | Mốc tổng chi tiêu (đồng) hoặc tổng kg để đạt một hạng. |
| **Tổng chi tiêu tích lũy (lifetime_spend)** | Tổng `total_amount` của các đơn **đã hoàn thành** của một khách. |
| **Tổng kg tích lũy (lifetime_kg)** | Tổng số kg hải sản trong các đơn **đã hoàn thành**. |
| **Quyền lợi / Benefit** | Ưu đãi gắn với một hạng (giảm %, free ship, ưu tiên...). |
| **Voucher** | Phiếu giảm giá khách sở hữu và áp vào đơn (percent/fixed/free_ship). |
| **Mốc thưởng / Reward rule** | Luật "đạt điều kiện X → nhận voucher/quà Y" (vd đơn ≥ 5kg → quà). |
| **Quà / Gift** | Sản phẩm tặng vật lý kèm đơn (có kho, không quy ra tiền). |
| **Trao thủ công / Manual grant** | Admin chủ động cấp hạng/voucher/quà cho 1 khách. |
| **Idempotent** | Xử lý lặp lại nhiều lần vẫn ra cùng kết quả, không nhân đôi voucher/điểm. |
| **Đơn "đã hoàn thành"** | `orders.status = 'done'`. Chỉ đơn done mới tính tích lũy (xem `04`). |

## 4. Sơ đồ luồng chính (high-level)

```
Khách đặt đơn ──> orders.status = 'pending'
        │
   (admin xử lý)──> 'confirmed' ──> 'delivering' ──> 'done'  ◀── MỐC KÍCH HOẠT TÍCH LŨY
                                                       │
                          ┌────────────────────────────┴───────────────────────────┐
                          ▼                                                          ▼
          [1] Cộng dồn lifetime_spend & lifetime_kg              [2] Quét reward_rules theo đơn này
                          │                                                          │
                          ▼                                                          ▼
          [3] So ngưỡng → có đủ lên hạng?                        [4] Đủ điều kiện mốc?
                          │ (nếu có & không bị khóa thủ công)                        │ (nếu có)
                          ▼                                                          ▼
          [5] Cập nhật profiles.tier_code + ghi membership_events     [6] Phát voucher/quà (idempotent)
                                                                                     │
                                                                                     ▼
                                                          customer_vouchers / customer_gifts (+ event)
```

Song song, **admin** có thể tác động thủ công bất cứ lúc nào:
```
Admin (UI /admin) ──> Trao hạng / Trao voucher / Trao quà ──> ghi membership_events (actor = admin_id)
Admin (UI /admin) ──> Cấu hình tiers / vouchers / gifts / reward_rules (bảng config)
```

Phía **khách** (`/profile`, `/checkout`):
```
/profile  ──> xem hạng hiện tại + thanh tiến độ lên hạng kế + ví voucher + quà đã nhận
/checkout ──> chọn voucher trong ví ──> hệ thống kiểm tra hợp lệ ──> trừ tiền ──> đánh dấu voucher used
```

## 5. Nguyên tắc thiết kế xuyên suốt (đọc kỹ trước khi code)

1. **Cấu hình > hard-code.** Mọi hạng, ngưỡng, voucher, mốc thưởng đều nằm trong bảng DB, admin sửa
   được. Code chỉ đọc cấu hình, không nhúng con số.
2. **Tích lũy chỉ tính trên đơn `done`.** Tránh cộng đơn rồi bị hủy → phải trừ lại (phức tạp, dễ sai).
3. **Mọi thao tác phát thưởng phải idempotent.** Một đơn chỉ sinh thưởng đúng 1 lần dù trigger chạy lại.
   Xem `04` và `07`.
4. **Không để trigger gây đệ quy.** Trigger trên `orders` không được kích hoạt lại chính nó/ vòng lặp
   qua `profiles`. Xem `07` (mục đệ quy).
5. **Bảo mật RLS mặc định đóng.** Bảng cấu hình chỉ admin ghi; bảng ví voucher khách chỉ chủ sở hữu
   đọc. Xem `03` + `07`.
6. **Giá tiền là vùng nhạy cảm.** Checkout đang sync giá từ DB; khi thêm giảm giá hạng/voucher phải
   tính ở nơi tin cậy (ưu tiên server/DB), không tin client. Xem `04` mục "tính tiền".

## 6. Phụ thuộc dữ liệu hiện có (để không phá vỡ cái đang chạy)

- `profiles` sẽ được **thêm cột** (không đổi cột cũ): `tier_code`, `lifetime_spend`, `lifetime_kg`,
  `tier_updated_at`, `tier_locked` (khóa thủ công). Chi tiết `03`.
- `orders` sẽ được **thêm cột** `rewards_processed_at` (timestamptz, null = chưa xử lý thưởng) để bảo
  đảm idempotency. Không đổi luồng tạo đơn ở `checkout/page.tsx`.
- Cách tính kg: hiện `checkout/page.tsx` nhận diện kg bằng heuristic chuỗi `unit` (chứa "kg"/"ký"...).
  Đề xuất thêm cột `products.weight_kg` để tính chính xác. Đây là **❓ CẦN CHỐT** — xem `02` mục 6.
