# Kế hoạch cải tiến toàn diện — Admin App
# Phases 14–19

## Tổng quan vấn đề từ audit
| Loại | Số lượng | Mức độ ưu tiên |
|------|----------|----------------|
| Memory leak / interval không clean | 3 | HIGH |
| Race condition (async ordering) | 4 | HIGH |
| Stale closure trong hooks | 4 | MEDIUM |
| Null/undefined safety | 4 | MEDIUM |
| Performance (thiếu memo/useMemo) | 6 | MEDIUM |
| Responsive (hardcode pixels) | 4 | MEDIUM |
| Supabase channel conflicts | 2 | MEDIUM |
| TypeScript `any` unsafe | 3 | LOW |
| Silent error (không notify user) | 5 | MEDIUM |

---

## Phase 14 — Order Detail Screen (commit + link)
**Việc cần làm:**
- Commit `app/order-detail.tsx` đã tạo
- Thêm nút "Xem chi tiết" trong `OrderCard` expand view → navigate đến `/order-detail?id=...`
- Sử dụng `useRouter` + `router.push({ pathname: '/order-detail', params: { id } })`

---

## Phase 15 — Debug: Chat Polling Refactor (CRITICAL)
**Vấn đề:**
- `pollRef.current` được set ở 3 nơi khác nhau → intervals chồng chéo
- `openConversation` gọi `startPolling` ngay lập tức trước khi `fetchMessages` xong
- `goBack()` manually clear+restart interval thay vì dùng useEffect cleanup
- Polling có thể trigger requests chồng nhau nếu fetch > 4s

**Fix:**
1. Dùng `view` state để control polling trong 1 useEffect duy nhất (ko manual interval management)
2. Tách polling logic ra `useInterval` hook để dễ control
3. Dùng `AbortController` hoặc `isMounted` flag để tránh setState sau unmount
4. `startPolling` chỉ gọi sau khi `fetchMessages` xong (await)

---

## Phase 16 — Performance Optimization
**Vấn đề:**
- `filteredOrders`, `filtered` (batch/products) compute lại mỗi render
- `OrderCard` re-render mỗi khi parent render
- FlatList không có `removeClippedSubviews`, `maxToRenderPerBatch`
- `setTimeout` scroll hack trong chat có thể fail trên thiết bị chậm

**Fix:**
1. Wrap `filteredOrders` trong `useMemo([orders, search, filterStatus])`
2. Wrap `filtered` trong batch.tsx và products.tsx với `useMemo`
3. `React.memo` cho `OrderCard` và `StatusFilterBar`
4. Thêm FlatList props: `removeClippedSubviews`, `initialNumToRender={10}`, `maxToRenderPerBatch={5}`
5. Replace `setTimeout` scroll với `onContentSizeChange` callback
6. Fix `customers.tsx`: dùng 1 query có join thay vì 2 queries riêng biệt

---

## Phase 17 — Responsive Design
**Vấn đề:**
- `width: '48%'` trong dashboard stat cards cứng
- Không có tablet layout (768px+)
- `maxWidth: 400` trong login không scale
- Không handle landscape orientation

**Fix:**
1. Tạo `hooks/useResponsive.ts` — wrap `useWindowDimensions` + trả về `isTablet`, `isSmallPhone`, `numColumns`
2. Dashboard stat grid: 2 cols on phone, 3 cols on tablet
3. Login form: `maxWidth: Math.min(400, width - 32)` 
4. OrderCard, ProductCard: trên tablet dùng 2-column list
5. Modal trên tablet: không `pageSheet`, dùng centered modal
6. Font size scaling: base * (width / 375) clamped

---

## Phase 18 — TypeScript Safety & Null Safety
**Vấn đề:**
- `as any` trong dashboard.tsx, batch.tsx, products.tsx
- `profiles` join query trả về `unknown` type
- `keyboardType as any` trong products.tsx

**Fix:**
1. Tạo interface `OrderWithRelations` mở rộng `Order` cho dashboard query
2. Xoá `as any` trong batch.tsx — dùng inline type cho order items
3. Fix `FormField` keyboardType type: `import { TextInputProps } from 'react-native'`
4. Fix `customers.tsx` query — dùng typed Supabase query

---

## Phase 19 — Silent Error Handling
**Vấn đề:**
- `chat.tsx`: 5 operations fail silently (fetchConversations, fetchMessages, markAllRead, deleteConversation)
- `batch.tsx`: `fetchBatches` silent fail
- `products.tsx`: upload image error không show đúng

**Fix:**
1. Chat: show inline error banner khi fetch fail
2. Batch: add `fetchError` state + `ErrorView`
3. Products: improve upload error message cụ thể hơn
4. Supabase channel: đổi tên unique hơn để tránh conflict

---

## Phase 20 — Final Polish & Channel Safety
**Vấn đề:**
- Channel 'orders-changes' và 'badge-counts' có thể conflict khi component remount
- Không có error boundary ở root level

**Fix:**
1. Thêm unique suffix vào channel names (dùng `useRef` tạo UUID)
2. Tạo `components/ErrorBoundary.tsx` — React error boundary bọc tab navigator
3. Thêm `ErrorBoundary` vào root layout

---

## Implementation Order
```
14 → 15 → 16 → 17 → 18 → 19 → 20
 ↑        ↑         ↑
commit  critical  responsive
phase14  bugs      design
```

## Status
- [ ] Phase 14 — Order Detail + Link
- [ ] Phase 15 — Chat Polling Refactor
- [ ] Phase 16 — Performance
- [ ] Phase 17 — Responsive Design
- [ ] Phase 18 — TypeScript Safety
- [ ] Phase 19 — Error Handling
- [ ] Phase 20 — Final Polish
