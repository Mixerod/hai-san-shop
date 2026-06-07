# Phase 10 — Tab Badges & Live Counters

## Mục tiêu
Hiển thị live badge count trên tab bar:
- Tab **Đơn hàng**: số đơn có status `pending` (màu đỏ)
- Tab **Chat**: số feedback chưa đọc (không tính admin replies)

Badges cập nhật realtime qua Supabase Realtime subscription.

## Cách hoạt động
1. `store/badges.ts` — Zustand store lưu `pendingOrders` + `unreadChat`
2. `app/_layout.tsx` — Subscribe realtime cho orders + feedbacks; cập nhật store
3. `app/(tabs)/_layout.tsx` — Đọc store, pass vào `tabBarBadge`

## Files thay đổi
- `store/badges.ts` ← mới
- `app/_layout.tsx` ← thêm badge subscription
- `app/(tabs)/_layout.tsx` ← thêm tabBarBadge
- `tsconfig.json` (root) ← exclude admin-app để tránh conflict

## Status: ✅ Done
