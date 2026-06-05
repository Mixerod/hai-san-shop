# Phase 21 — Critical Bug Fixes

## Danh sách lỗi cần fix

### 1. `app/login.tsx:42` — Email so sánh phân biệt hoa/thường
**Vấn đề:** `data.user?.email !== ADMIN_EMAIL` — nếu Supabase lưu email khác case sẽ không đăng nhập được.
**Fix:**
```tsx
if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
```

---

### 2. `app/broadcast.tsx:175` — Date format thiếu năm
**Vấn đề:** `toLocaleDateString('vi-VN', { day, month, hour, minute })` — không có `year`, hai thông báo khác năm trông giống nhau.
**Fix:** Thêm `year: 'numeric'` vào options:
```tsx
{new Date(notif.created_at).toLocaleDateString('vi-VN', {
  year: 'numeric', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit',
})}
```

---

### 3. `app/(tabs)/dashboard.tsx` — Tablet grid không hoạt động
**Vấn đề:** `gridTablet` style chỉ tăng `gap` lên 16 nhưng không đổi `flexBasis`. StatCard luôn có `flexBasis: '45%'` → luôn 2 cột dù trên tablet.
**Fix:** Truyền `isTablet` vào StatCard để đổi flexBasis:
```tsx
// StatCardProps thêm isTablet?: boolean
// statStyles.card: xoá flexBasis (không hardcode)
// Trong StatCard wrapper:
<View style={[statStyles.card, { borderColor: color + '33' }, isTablet && { flexBasis: '28%' }]}>
```
Và trong grid render thêm prop:
```tsx
<StatCard ... isTablet={isTablet} />
```

---

### 4. `app/(tabs)/chat.tsx:101` — fetchMessages lỗi không hiện ra user
**Vấn đề:** `if (error || !data) return;` trong `fetchMessages` không set `chatError`.
**Fix:**
```tsx
if (error || !data) {
  setChatError('Không thể tải tin nhắn.');
  return;
}
setChatError(null);
```

---

### 5. `app/(tabs)/batch.tsx:76` — `as any[]` cast không an toàn
**Vấn đề:** `for (const order of orders as any[])` mất type safety.
**Fix:** Định nghĩa inline type:
```tsx
type BatchOrder = {
  id: string;
  total_amount: number;
  note: string | null;
  status: string;
  profiles: { full_name: string | null; phone: string | null; address: string | null } | null;
  order_items: Array<{
    quantity: number;
    price_at_time: number;
    products: { name: string | null; unit: string | null; price: number } | null;
  }>;
};
for (const order of orders as BatchOrder[]) {
```

---

## Commit message
```
fix(phase-21): critical bug fixes — email case, date year, tablet grid, chat errors, batch types
```
