# 🦐 TÍNH NĂNG HẠNG THÀNH VIÊN / HỘI VIÊN MUA SẮM — TRUNG TÂM ĐIỀU PHỐI

> **File này là "bộ não" của cả tính năng.** Bất kỳ agent nào (kể cả Claude trong phiên mới) khi
> bắt đầu làm việc về tính năng hạng thành viên **PHẢI đọc file này TRƯỚC TIÊN**, sau đó mới mở các
> file chi tiết tương ứng. Đây cũng là nơi **ghi nhận tiến độ** — làm xong tới đâu, cập nhật tới đó.

- **Dự án:** `Mixerod/hai-san-shop` (Next.js + React + Supabase/Postgres, admin web tại `/admin`)
- **Thư mục tài liệu:** `docs/membership/`
- **Người yêu cầu:** Quyết (minhquyet08122003@gmail.com)
- **Ngày khởi tạo:** 2026-06-05
- **Trạng thái tổng thể:** 🟢 SPEC ĐÃ CHỐT (A9 ✅, 2026-06-06) — sẵn sàng Giai đoạn B (code)

---

## 1. Tính năng này là gì? (đọc 30 giây)

Thêm hệ thống **hạng thành viên** (vd: Đồng → Bạc → Vàng → Kim Cương) cho khách đã đăng nhập:

1. Khách **tự động được thăng hạng** khi tổng chi tiêu (hoặc tổng số kg đã mua) đạt mốc.
2. Mỗi hạng có **quyền lợi** riêng (giảm giá, free ship, voucher định kỳ, quà...). Quyền lợi này
   **admin cấu hình được** từ giao diện web, không hard-code.
3. Khi một đơn đạt mốc (vd ≥ 5kg hoặc ≥ X đồng) khách có thể **nhận voucher/quà**. Mốc & quà cũng
   **admin tùy chỉnh được**.
4. Admin có thể **trao hạng / trao voucher / trao quà thủ công** (chủ động), song song với cơ chế tự động.

> ⚠️ Tính năng này **chỉ áp dụng cho khách đã đăng nhập** (có `profiles.id`). Đơn của khách vãng lai
> (`orders.user_id = null`) không tích lũy hạng.

---

## 2. Bản đồ tài liệu — agent nào làm việc gì thì đọc file nào

| # | File | Nội dung | Đọc khi bạn cần... |
|---|------|----------|---------------------|
| 00 | `README.md` (file này) | Điều phối, tiến độ, quy ước làm việc | LUÔN đọc đầu tiên |
| 01 | `01-tong-quan.md` | Tầm nhìn, phạm vi, thuật ngữ, sơ đồ luồng | Hiểu bức tranh tổng thể |
| 02 | `02-chinh-sach-hang-thanh-vien.md` | Định nghĩa hạng, mốc, quyền lợi, luật voucher/quà + **các quyết định cần chốt** | Code chính sách / cấu hình hạng |
| 03 | `03-thiet-ke-database.md` | Bảng mới, cột, quan hệ, **toàn bộ lệnh SQL migration** | Tạo/sửa schema, viết migration |
| 04 | `04-logic-nghiep-vu.md` | Tích lũy, tự thăng hạng, trao thủ công, phát voucher/quà, **idempotency** | Code trigger / function / API logic |
| 05 | `05-giao-dien-admin.md` | Đặc tả màn admin (cấu hình hạng, voucher, quà, trao thủ công) | Code UI admin |
| 06 | `06-giao-dien-khach-hang.md` | Đặc tả màn khách (huy hiệu hạng, thanh tiến độ, ví voucher, áp voucher) | Code UI khách |
| 07 | `07-rui-ro-va-edge-cases.md` | Lỗi trùng lặp, lag, đệ quy, race condition, bảo mật RLS | Trước khi viết trigger/SQL bất kỳ |
| 08 | `08-ke-hoach-trien-khai.md` | Chia phase công việc + checklist (nguồn sự thật cho việc CODE) | Bắt đầu code / chọn việc tiếp theo |

> **Quy tắc vàng:** Không sửa code production khi mục 02–04 còn dòng `❓ CẦN CHỐT`. Hỏi Quyết trước.

---

## 3. BẢNG TIẾN ĐỘ (Single Source of Truth) — cập nhật mỗi khi xong một mốc

> Quy ước trạng thái: `⬜ chưa làm` · `🟡 đang làm` · `✅ xong` · `⛔ bị chặn (ghi lý do)`

### Giai đoạn A — Đặc tả (làm trước, KHÔNG code)

| Mã | Việc | Trạng thái | File | Ghi chú |
|----|------|-----------|------|---------|
| A1 | Tổng quan & thuật ngữ | ✅ | 01 | |
| A2 | Chính sách hạng & quyền lợi (bản nháp + open decisions) | ✅ | 02 | Chờ Quyết chốt mục "CẦN CHỐT" |
| A3 | Thiết kế database + SQL | ✅ | 03 | Bản nháp, review trước khi chạy |
| A4 | Logic nghiệp vụ + idempotency | ✅ | 04 | |
| A5 | Đặc tả UI admin | ✅ | 05 | |
| A6 | Đặc tả UI khách | ✅ | 06 | |
| A7 | Rủi ro & edge cases | ✅ | 07 | |
| A8 | Kế hoạch chia phase code | ✅ | 08 | Khung sẵn, chi tiết hóa sau khi A2 được chốt |
| **A9** | **Quyết review & chốt "CẦN CHỐT" trong 02** | ✅ | 02 | Quyết đã chốt 2026-06-06 (xem 02 mục 6) |

### Giai đoạn B — Triển khai code (CHỈ bắt đầu sau khi A9 ✅)

| Mã | Việc | Trạng thái | File hướng dẫn | Ghi chú |
|----|------|-----------|----------------|---------|
| B1 | Migration: bảng config (tiers, vouchers, gifts, reward_rules) | ✅ | `LENH-SQL-...txt` PHẦN 1,8 | Đã chạy trên Supabase 2026-06-06 |
| B2 | Migration: bảng dữ liệu khách (cột profiles, customer_vouchers, customer_gifts, events) | ✅ | `LENH-SQL-...txt` PHẦN 2,3,4 | Đã chạy trên Supabase 2026-06-06 |
| B3 | Migration: function + trigger tích lũy & thăng hạng (idempotent) | ✅ | `LENH-SQL-...txt` PHẦN 5,6 | Đã chạy. Nên test idempotency khi có dữ liệu thật |
| B4 | Migration: RLS policies cho mọi bảng mới | ✅ | `LENH-SQL-...txt` PHẦN 7 | Đã chạy trên Supabase 2026-06-06 |
| B5 | UI admin: cấu hình hạng & quyền lợi | ✅ | 05 | Component MembershipTiersAdmin, tab mới trong /admin. **CẦN chạy `LENH-SQL-B5-ADMIN-RPC-TIERS.txt` trên Supabase** (RPC ghi config) |
| B6 | UI admin: cấu hình voucher / quà / mốc thưởng | ✅ | 05 | Tab con Voucher/Quà/Mốc thưởng trong "Thành viên & Ưu đãi". **CẦN chạy `LENH-SQL-B6-ADMIN-RPC-VOUCHER-GIFT-RULES.txt` trên Supabase** (RPC ghi config) |
| B7 | UI admin: trao hạng/voucher/quà thủ công + audit log | ✅ | 05 | Tab "Khách hàng" trong "Thành viên & Ưu đãi". **CẦN chạy `LENH-SQL-B7-ADMIN-RPC-MANUAL-GRANT-AUDIT.txt` trên Supabase** (RPC trao/đặt hạng/điều chỉnh + đọc khách/ví/audit) |
| B8 | UI khách: huy hiệu hạng + thanh tiến độ ở /profile | ✅ | 06 | Tab "Thành viên" ở /profile. **KHÔNG cần chạy SQL** — đọc trực tiếp qua RLS (profiles owner-read + membership_tiers công khai) |
| B9 | UI khách: ví voucher + áp voucher tại /checkout | ✅ | 06 | Khối C/D ở /profile + chọn/áp voucher ở /checkout. **CẦN chạy `LENH-SQL-B9-CHECKOUT-VOUCHER-RPC.txt` trên Supabase** (RPC `place_order` đặt đơn có voucher) |
| B10 | Tích hợp giảm giá hạng vào tính tiền đơn | ✅ | 04, 06 | Dòng "Ưu đãi hạng −%" ở /checkout, áp hạng trước voucher (trần 30%). **CẦN chạy `LENH-SQL-B10-CHECKOUT-TIER-DISCOUNT-RPC.txt`** (mở rộng `place_order` — đã gồm B9) |
| B11 | Test: idempotency, race, duplicate voucher | ⬜ | 07 | |
| B12 | Soát bảo mật RLS + code review | ⬜ | 07 | |
| B13 | Backfill khách cũ + RPC `merge_guest_orders` (gộp đơn vãng lai khi đăng ký, khớp Tên+SĐT) | ⬜ | 04 (mục 8, 9), 07 | Chạy 1 lần go-live + tích hợp vào `auth/page.tsx` |

> 📌 **Mỗi agent khi hoàn thành một mã việc:** đổi trạng thái ô tương ứng thành ✅, ghi 1 dòng ngày +
> tóm tắt vào `## 6. NHẬT KÝ` phía dưới, rồi commit. Đừng để bảng này lệch với thực tế.

---

## 4. ⚙️ Hướng dẫn tự bật "Auto Accept" (để agent chạy liên tục, ít bị hỏi quyền)

Mục tiêu: khi đang chạy chuỗi việc dài (vd cả Giai đoạn B), agent không phải dừng hỏi quyền mỗi lần
sửa file. **Cách an toàn (khuyến nghị):** dùng allow-list trong `.claude/settings.json` thay vì tắt
toàn bộ kiểm soát.

**Cách 1 — Phím tắt (thủ công, nhanh nhất):** Bấm `Shift + Tab` trong Claude Code để xoay vòng
permission mode → chọn **"accept edits"** (tự duyệt Edit/Write). Bấm lại để tắt.

**Cách 2 — Cấu hình bền vững (khuyến nghị cho chạy tự động):** tạo/sửa `.claude/settings.json` ở gốc
repo. Có thể nhờ skill `update-config` làm hộ ("dùng /update-config để bật acceptEdits + allow các
lệnh supabase/npm"). Mẫu:

```jsonc
// .claude/settings.json  (gốc repo hai-san-shop)
{
  "permissions": {
    "defaultMode": "acceptEdits",          // tự duyệt Edit/Write trên file trong repo
    "allow": [
      "Read", "Edit", "Write", "Grep", "Glob",
      "Bash(npm run *)", "Bash(npx tsc *)", "Bash(git status)", "Bash(git diff *)"
    ]
  }
}
```

> 🔒 **Nguyên tắc:** KHÔNG dùng cờ `--dangerously-skip-permissions`. Không auto-accept các lệnh phá
> hủy (drop table, rm -rf, push --force). Migration SQL chạy trên Supabase **luôn để con người bấm
> chạy** (xem mục lưu ý ở `03`).

---

## 5. ⏭️ Hướng dẫn "Schedule / tự nhảy sang việc tiếp theo"

Mục tiêu: làm xong một mã việc trong bảng tiến độ thì **tự động chuyển sang việc kế tiếp** mà không
cần người gõ lại lệnh.

**Cơ chế khuyến nghị — dùng skill `/loop` (self-paced):**

1. Mở `08-ke-hoach-trien-khai.md` để biết thứ tự việc (B1 → B2 → ...).
2. Chạy lệnh dạng:
   ```
   /loop Đọc docs/membership/README.md mục 3 (Bảng tiến độ). Tìm mã việc B đầu tiên đang ⬜,
   đọc file hướng dẫn của nó, thực hiện trọn vẹn, cập nhật trạng thái thành ✅ + ghi nhật ký mục 6,
   rồi commit. Nếu mọi việc B đã ✅ thì dừng và báo cáo.
   ```
3. `/loop` sẽ tự lặp: mỗi vòng làm 1 mã việc rồi tự gọi lại chính nó cho mã kế tiếp, đến khi hết.

**Khi cần chạy theo lịch thật (cron) thay vì lặp liên tục:** dùng skill `/schedule` để tạo routine
chạy định kỳ với cùng prompt như trên. Dùng cho trường hợp muốn "mỗi sáng tiếp tục một phase".

> ✋ Điều kiện an toàn để được tự nhảy việc: (a) Giai đoạn A9 đã ✅; (b) việc đang làm không yêu cầu
> quyết định nghiệp vụ mới; (c) build/test xanh trước khi đánh ✅. Nếu vướng một trong ba, **dừng và
> hỏi**, đừng nhảy tiếp.

---

## 6. NHẬT KÝ (mỗi dòng = 1 mốc hoàn thành, mới nhất ở trên)

- **2026-06-06** — **B10 ✅**: Tích hợp **giảm giá theo HẠNG** vào tính tiền ở `/checkout`.
  Client (`src/app/checkout/page.tsx`) tải `discount_percent` + tên hạng (đọc `membership_tiers` công
  khai theo `tier_code`); tổng kết thêm dòng **"Ưu đãi hạng [Tên] −X%"** rồi **Giảm voucher** rồi
  **Thành tiền** — **áp hạng TRƯỚC voucher**, trần TỔNG giảm **30%** (CĐ-5). Mở rộng RPC SECURITY
  DEFINER **`place_order`**: đọc lại GIÁ THẬT + `discount_percent` của hạng phía server, voucher giờ là
  tham số **TÙY CHỌN** (`p_voucher_id` null = chỉ giảm hạng). Client định tuyến qua RPC khi khách đăng
  nhập **có giảm hạng HOẶC có voucher**; guest / hội viên hạng 0% & không voucher vẫn đi luồng insert
  cũ (KHÔNG đổi). Quyền lợi free ship theo hạng = ưu đãi vận chuyển (Thủ Đức) → KHÔNG trừ `total_amount`.
  **➡️ CẦN Quyết chạy `docs/membership/LENH-SQL-B10-CHECKOUT-TIER-DISCOUNT-RPC.txt` trên Supabase**
  (file này THAY THẾ `place_order` của B9 — đã gồm cả B9, chỉ cần chạy B10). Build ✅ (TypeScript pass).
  _(by Claude — phiên local)_
- **2026-06-06** — **B9 ✅**: UI khách ví voucher + áp voucher khi thanh toán. **(1)** `/profile`
  (`CustomerMembershipCard.tsx`): thêm **Khối C** (ví voucher — khả dụng nổi bật + lịch sử thu gọn,
  đọc `customer_vouchers` owner-read join `voucher_definitions`) + **Khối D** (quà đã nhận, đọc
  `customer_gifts` join `gifts`). **(2)** `/checkout` (`src/app/checkout/page.tsx`): khối **"Voucher của
  bạn"** CHỈ hiện khi đăng nhập — liệt kê voucher đủ điều kiện (active, chưa hết hạn, loại percent/fixed,
  `min_order ≤ tạm tính`, `tier_scope` hợp lệ); chọn 1 → tổng kết **Tạm tính → Giảm voucher → Thành
  tiền** với **trần tổng giảm 30%** (CĐ-5). Khi submit **CÓ voucher** → gọi **RPC SECURITY DEFINER
  `place_order`**: server đọc lại GIÁ THẬT trong DB, xác thực voucher (sở hữu/active/hạn/min_order/
  tier_scope), tính giảm có trần, tạo order + order_items, **đánh dấu voucher used ATOMIC**
  (`where status='active'` + rowCount=1, chống double-spend — 04 mục 7), ghi 1 event `voucher_used`.
  **KHÔNG phá luồng guest / đơn không voucher** (vẫn insert client như cũ). Voucher `free_ship` không
  trừ tiền hàng ở B9 (ưu đãi vận chuyển) → lọc khỏi danh sách chọn. Giảm giá HẠNG là **B10** — chỉ
  chừa seam (`v_tier_discount = 0`). **➡️ CẦN Quyết chạy
  `docs/membership/LENH-SQL-B9-CHECKOUT-VOUCHER-RPC.txt` trên Supabase** (cấp execute cho `authenticated`)
  thì đường áp voucher mới hoạt động. Build ✅ (TypeScript pass). _(by Claude — phiên local)_
- **2026-06-06** — **B8 ✅**: Thêm tab **"Thành viên"** vào `/profile`
  (`src/app/profile/page.tsx`: mở rộng `activeTab` thêm `'membership'`, đọc `?tab=membership`, nút tab
  thứ 3 icon Crown). Tách UI vào component KHÁCH mới `src/components/membership/CustomerMembershipCard.tsx`
  (theme SÁNG khớp /profile, khác ui.tsx admin tối). Hiển thị **Khối A** (huy hiệu hạng — badge màu theo
  `membership_tiers.color`, tổng chi tiêu `lifetime_spend` + tổng kg `lifetime_kg`, danh sách quyền lợi:
  `discount_percent` / `free_ship` / `perks[]`) + **Khối B** (thanh tiến độ % tới hạng kế theo
  `sort_order` kế tiếp, tính theo **TIỀN** `lifetime_spend / next.min_spend` — CĐ-2 money-only; "Còn X đồng
  nữa để lên [hạng]"; "Bạn đang ở hạng cao nhất 🎉" khi hết hạng). Trạng thái rỗng/loading/lỗi gọn gàng.
  **CHỈ ĐỌC qua RLS**: `profiles` của chính mình (owner-read) + `membership_tiers` công khai (is_active=true);
  KHÔNG ghi, KHÔNG gọi RPC admin_*. **➡️ Quyết định kiến trúc: KHÔNG thêm RPC/không cần file SQL** — 2 query
  RLS trực tiếp là đủ (KISS), nên B8 chạy được ngay với schema B1–B4 đã có. Build ✅ (TypeScript pass).
  _(by Claude — phiên local)_
- **2026-06-06** — **B7 ✅**: Bật tab **"Khách hàng"** trong khu "Thành viên & Ưu đãi"
  (`MembershipAdmin.tsx` bỏ disabled → render `MembershipCustomersAdmin`). Danh sách khách
  **phân trang + tìm kiếm** (tên/SĐT/email) qua RPC `admin_list_customers` (07 mục 3: không
  `select *` toàn bảng). Bấm 1 khách mở **ngăn chi tiết** (`CustomerDetailDrawer.tsx`):
  đặt & **khóa hạng** thủ công, **mở khóa** (trả về tự động + áp lại `compute_tier`), **áp lại
  hạng** cho 1 khách, **trao voucher**, **trao quà** (tự trừ kho an toàn, bỏ qua khi vô hạn),
  **thu hồi voucher** (chỉ khi `active`), **điều chỉnh tích lũy** (bắt buộc lý do, set tuyệt đối
  + áp lại hạng nếu không khóa), xem **ví voucher / quà đã phát** và **timeline audit**
  (`membership_events`). MỌI thao tác GHI đi qua **RPC SECURITY DEFINER** `admin_grant_*` /
  `admin_set_*` / `admin_adjust_*`, tự kiểm `is_membership_admin()`, mỗi thao tác ghi 1 event
  với `actor = email admin` (07 mục 5). KHÔNG `supabase.from(...)` insert/update. Đọc khách +
  ví + audit cũng qua RPC admin. **➡️ CẦN Quyết chạy
  `docs/membership/LENH-SQL-B7-ADMIN-RPC-MANUAL-GRANT-AUDIT.txt` trên Supabase** thì B7 mới
  hoạt động. Build ✅ (TypeScript pass). _(by Claude — phiên local)_
- **2026-06-06** — **B6 ✅**: Thêm 3 tab con cấu hình trong khu "Thành viên & Ưu đãi": **Voucher**
  (`voucher_definitions`), **Quà tặng** (`gifts`, quản kho theo delta + vô hạn + cảnh báo kho thấp),
  **Mốc thưởng** (`reward_rules`, wizard "Khi [điều kiện] → tặng [voucher/quà]"). Bọc tất cả vào
  `src/components/membership/MembershipAdmin.tsx` (thanh tab con; tab "Hạng thành viên" = B5; tab
  "Khách hàng" để disabled chờ B7). `/admin` nay render `MembershipAdmin` thay cho `MembershipTiersAdmin`.
  Mọi GHI đi qua **RPC SECURITY DEFINER** (admin_list/upsert/set_active + adjust/set_unlimited cho kho),
  RPC tự kiểm admin qua `is_membership_admin()` (đã có từ B5). Primitives dùng chung ở
  `src/components/membership/ui.tsx`. **➡️ CẦN Quyết chạy
  `docs/membership/LENH-SQL-B6-ADMIN-RPC-VOUCHER-GIFT-RULES.txt` trên Supabase** thì B6 mới hoạt động.
  Build ✅ (TypeScript pass). _(by Claude — phiên local)_
- **2026-06-06** — **B5 sửa cơ chế ghi (BẢO MẬT)**: phiên local phát hiện bản B5 của routine ghi config
  **trực tiếp qua anon** (`supabase.from('membership_tiers').insert/update`) → sẽ bị **RLS chặn** (B4 chỉ cho
  `service_role` ghi) và gọi `recompute_all_tiers` (RPC chưa tồn tại) → UI build xanh nhưng **không chạy thật**,
  trái thiết kế bảo mật 07 mục 5. Đã chuyển toàn bộ 5 chỗ ghi + đọc của `MembershipTiersAdmin.tsx` sang **RPC
  SECURITY DEFINER** (`admin_list_tiers/upsert_tier/set_tier_active/reorder_tiers/seed_default_tiers` +
  `recompute_all_tiers`), RPC tự kiểm admin = email ở `src/proxy.ts` (`/admin` đã được Next 16 `proxy` gate).
  Quyết định kiến trúc (Quyết uỷ quyền): chọn RPC thay vì service-role API route (1 hop, tối ưu hiệu năng hơn).
  **➡️ CẦN Quyết chạy `docs/membership/LENH-SQL-B5-ADMIN-RPC-TIERS.txt` trên Supabase** thì B5 mới hoạt động.
  Build ✅. _(by Claude — phiên local, lưu ý đã xảy ra trùng việc với routine 09:00)_
- **2026-06-06** — **B5 ✅**: Tạo `src/components/MembershipTiersAdmin.tsx` — quản lý `membership_tiers`: danh sách, thêm/sửa modal, bật/tắt, đổi thứ tự, nút "Áp dụng lại hạng", seed 4 hạng mặc định, validate. Thêm tab "Thành viên" vào `/admin`. Fix tsconfig exclude supabase Deno functions; fix supabase client dùng placeholder khi build. Build ✅. _(by routine)_
- **2026-06-06** — **B1–B4 ✅**: Quyết đã chạy toàn bộ SQL tầng DB trên Supabase. Bảng/function/trigger/RLS
  đã sẵn sàng. Tiếp theo: UI B5→B13 (admin + khách). _(by Claude)_
- **2026-06-06** — **B1–B4 (SQL) soạn xong**: gộp toàn bộ tầng DB vào `LENH-SQL-CAN-CHAY-TREN-SUPABASE.txt`
  (bảng + index + function + trigger + RLS + seed + backfill + merge). Chờ Quyết chạy trên Supabase SQL
  Editor. Tiếp theo: UI B5→B13 sẽ chạy ở session mới qua /schedule. _(by Claude)_
- **2026-06-06** — **A9 ✅**: Quyết chốt 10 quyết định → cập nhật `02/03/04` (ngưỡng 1tr/5tr/10tr,
  money-only + lifetime, free ship khu vực Thủ Đức, merge đơn vãng lai, fix bug min_kg=0 trong
  compute_tier). Sẵn sàng **Giai đoạn B** — bắt đầu B1 (migration config). _(by Claude)_
- **2026-06-05** — Khởi tạo thư mục `docs/membership/` + viết toàn bộ đặc tả Giai đoạn A (01–08).
  Trạng thái: chờ Quyết review & chốt các mục "CẦN CHỐT" trong `02` (mã A9). _(by Claude)_

---

## 7. Cách RESUME khi bạn là agent mới vào (cold start)

1. Đọc xong file này (đặc biệt mục 3 — Bảng tiến độ và mục 6 — Nhật ký).
2. Tìm mã việc 🟡 đang dở; nếu không có, lấy mã ⬜ đầu tiên đúng thứ tự.
3. Mở đúng file hướng dẫn ghi ở cột "File".
4. Làm → cập nhật trạng thái → ghi nhật ký → commit. Không nhảy cóc thứ tự khi có phụ thuộc.
