# Admin App — Master Plan

## Mục tiêu
Xây dựng React Native (Expo) app dành cho admin quản lý Hải Sản Shop.
- Backend: Supabase (dùng chung với web)
- Admin email: `minhquyet08122003@gmail.com`
- Branch: `claude/seafood-admin-app-Gd7JI`
- App nằm tại: `/home/user/hai-san-shop/admin-app/`

## Tech Stack
- **Expo SDK 52** + **Expo Router v4** (file-based routing)
- **React Native 0.76**
- **@supabase/supabase-js ^2** (browser client, AsyncStorage adapter)
- **Zustand 5** (state management)
- **expo-notifications** (push notifications)
- **expo-image-picker** (upload ảnh sản phẩm)

## Supabase Context (dùng chung toàn bộ phases)

### Env vars (copy từ parent project hoặc Supabase dashboard)
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Tables
| Table | Key Columns |
|---|---|
| `orders` | id, user_id, total_amount, status, payment_method, note, created_at |
| `order_items` | id, order_id, product_id, quantity, price_at_time |
| `products` | id, name, description, price, original_price, unit, image_url, in_stock, category, tag, note, created_at |
| `profiles` | id, full_name, phone, address, username, email |
| `feedbacks` | id, title, content, rating, is_read, created_at |
| `notifications` | id, message, type, created_at |
| `admin_push_tokens` | id, token, created_at (**tạo ở Phase 4**) |

### Order statuses
`pending` → `confirmed` → `delivering` → `done` → `paid` / `cancelled`

### Auth
- Supabase email/password auth
- Admin check: `user.email === 'minhquyet08122003@gmail.com'`

## Phụ thuộc giữa các Phase
```
Phase 1 (Setup)
    └─ Phase 2 (Auth)
           ├─ Phase 3 (Orders) ──── Phase 4 (Push Notif)
           ├─ Phase 5 (Dashboard)
           ├─ Phase 6 (Products)
           ├─ Phase 7 (Chat)
           └─ Phase 8 (Batch)
                                    Phase 9 (Broadcast) — sau Phase 6
```

## Status Checklist
- [x] **Phase 1** — Setup & Cấu trúc dự án → `PHASE_1_SETUP.md` ✅
- [x] **Phase 2** — Authentication → `PHASE_2_AUTH.md` ✅
- [x] **Phase 3** — Quản lý Đơn hàng → `PHASE_3_ORDERS.md` ✅
- [x] **Phase 4** — Push Notifications → `PHASE_4_PUSH_NOTIF.md` ✅
- [x] **Phase 5** — Dashboard & Thống kê → `PHASE_5_DASHBOARD.md` ✅
- [x] **Phase 6** — Quản lý Sản phẩm → `PHASE_6_PRODUCTS.md` ✅
- [x] **Phase 7** — Feedbacks & Chat → `PHASE_7_CHAT.md` ✅
- [x] **Phase 8** — Batch Preparation → `PHASE_8_BATCH.md` ✅
- [x] **Phase 9** — Broadcast Notifications → `PHASE_9_BROADCAST.md` ✅

- [x] **Phase 10** — Tab Badges & Live Counters → `PHASE_10_BADGES.md` ✅
- [x] **Phase 11** — Error States & Network Handling → `PHASE_11_ERROR_STATES.md` ✅

## Bug Fixes (session review)
Đã fix các lỗi sau khi review toàn bộ code:
1. **batch.tsx** — `Clipboard` từ `react-native` không còn tồn tại trong RN 0.76. Thay bằng `expo-clipboard` (added dependency) + đổi `setString` → `setStringAsync`.
2. **chat.tsx** — Hex color `#ef444444` (8 chữ số, không hợp lệ) → `#ef4444`.
3. **broadcast.tsx** — Hex color `#ef444466` (8 chữ số, không hợp lệ) → `#ef4444`.
4. **types/index.ts** — `Product.total_sold` không có trong DB schema, đổi thành optional (`total_sold?: number`).

## Cách sử dụng các file .md này
1. Mỗi file `.md` là **self-contained** — agent chỉ cần đọc file đó là đủ thông tin để thực thi
2. Sau khi xong một Phase, **đánh dấu checkbox** trong MASTER_PLAN.md
3. Commit & push lên branch `claude/seafood-admin-app-Gd7JI`
4. Đọc file Phase tiếp theo và bắt đầu thực thi

## Cấu trúc thư mục cuối cùng (admin-app/)
```
admin-app/
├── PLAN/                     ← Các file kế hoạch này
├── app/
│   ├── _layout.tsx           ← Root layout, auth guard
│   ├── login.tsx             ← Màn hình đăng nhập
│   └── (tabs)/
│       ├── _layout.tsx       ← Tab bar navigation
│       ├── orders.tsx        ← Quản lý đơn hàng
│       ├── products.tsx      ← Quản lý sản phẩm
│       ├── chat.tsx          ← Feedbacks & Chat
│       ├── dashboard.tsx     ← Thống kê
│       └── batch.tsx         ← Chuẩn bị hàng
├── components/               ← Shared components
├── lib/
│   └── supabase.ts           ← Supabase client
├── store/
│   └── auth.ts               ← Auth state (Zustand)
├── types/
│   └── index.ts              ← TypeScript types
├── app.json
├── package.json
├── tsconfig.json
└── .env
```
