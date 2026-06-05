# Tiến độ nâng cấp Seafood Admin App (Phases 21–25)

## 📌 Tổng quan các Phase
- [x] **Phase 21: Critical Bug Fixes** (Hoàn thành)
- [x] **Phase 22: UX Polish** (Hoàn thành)
- [ ] **Phase 23: Performance Optimization** (Đang thực hiện)
- [ ] **Phase 24: Responsive Layout Polish**
- [ ] **Phase 25: Code Cleanup & Testing**

---

## 📝 Nhật ký tiến độ chi tiết

### ✅ Phase 21: Critical Bug Fixes (Hoàn thành)
- [x] 1. Sửa lỗi so sánh email phân biệt hoa/thường tại `app/login.tsx`
- [x] 2. Thêm năm vào định dạng ngày tháng hiển thị thông báo tại `app/broadcast.tsx`
- [x] 3. Sửa lỗi layout grid trên Tablet không hoạt động tại `app/(tabs)/dashboard.tsx`
- [x] 4. Sửa lỗi không hiển thị thông báo lỗi khi tải tin nhắn thất bại tại `app/(tabs)/chat.tsx`
- [x] 5. Sửa lỗi unsafe cast `as any[]` tại `app/(tabs)/batch.tsx`
- [x] 6. Chạy TypeScript check, commit và push code lên remote branch

### ✅ Phase 22: UX Polish (Hoàn thành)
- [x] 1. Tạo helper shared date formatter tại `lib/formatDate.ts` và áp dụng
- [x] 2. Thêm decimal keyboard và validation cho min kg tại `app/(tabs)/batch.tsx`
- [x] 3. Thêm numberOfLines cho multiline TextInput tại `app/(tabs)/products.tsx`
- [x] 4. Sửa lỗi Categories ScrollView bị cắt tại `app/(tabs)/products.tsx`
- [x] 5. Thêm Alert feedback khi đổi trạng thái đơn hàng thành công/thất bại tại `app/order-detail.tsx`
- [x] 6. Hiển thị đầy đủ date + time cho khách hàng tại `app/customers.tsx:155`
- [x] 7. Chạy TypeScript check, commit và push code lên remote branch

### 🔄 Phase 23: Performance Optimization (Đang thực hiện)
- [x] 1. Memoize FormField component tại `app/(tabs)/products.tsx`
- [x] 2. Memoize StatCard component tại `app/(tabs)/dashboard.tsx`
- [x] 3. Tạo hook `hooks/useDebounce.ts`
- [x] 4. Áp dụng debounce search cho `orders.tsx`, `products.tsx`, `customers.tsx`, `batch.tsx`
- [ ] 5. Tối ưu FlatList (removeClippedSubviews, initialNumToRender, v.v.) tại `batch.tsx` và `customers.tsx`
- [ ] 6. Chạy TypeScript check, commit và push code lên remote branch
