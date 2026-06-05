# Phase 22 — UX Polish: Dates, Inputs, Feedback

## Danh sách cải tiến UX

### 1. Shared date formatter — `lib/formatDate.ts` (mới)
Tạo helper tập trung để format date nhất quán:
```tsx
// lib/formatDate.ts
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
```
Dùng để thay thế các `toLocaleDateString`/`toLocaleString` rải rác ở:
- `app/broadcast.tsx:175` → `formatDateTime(notif.created_at)`
- `app/customers.tsx:155` → `formatDateTime(item.lastOrderDate)`
- `components/orders/OrderCard.tsx` (dòng format date)

---

### 2. `app/(tabs)/batch.tsx` — Decimal keyboard + validation cho min kg
**Vấn đề:** Ô "Min kg..." không có `keyboardType="decimal-pad"`, user có thể nhập chữ gây `parseFloat` trả NaN.
**Fix:**
```tsx
<TextInput
  style={[s.filterInput, { flex: 1 }]}
  value={minWeight}
  onChangeText={(v) => setMinWeight(v.replace(/[^0-9.]/g, ''))}
  placeholder="Min kg..."
  placeholderTextColor="#4b5563"
  keyboardType="decimal-pad"
/>
```

---

### 3. `app/(tabs)/products.tsx` — Multiline TextInput thiếu numberOfLines
**Vấn đề:** `multiline` không có `numberOfLines` → chiều cao tự do, khác nhau giữa iOS/Android.
**Fix:** Trong `FormField`:
```tsx
<TextInput
  style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
  numberOfLines={multiline ? 4 : undefined}
  ...
/>
```

---

### 4. `app/(tabs)/products.tsx` — Categories ScrollView bị cắt
**Vấn đề:** Horizontal ScrollView thiếu `contentContainerStyle` nên chip cuối cùng bị cắt.
**Fix:**
```tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ marginBottom: 12 }}
  contentContainerStyle={{ paddingRight: 16, gap: 8 }}
>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    ...chips
  </View>
</ScrollView>
```
Hoặc đơn giản hơn: bỏ wrapper `View` và để chips trực tiếp với `contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}`.

---

### 5. `app/order-detail.tsx` — Không có feedback sau khi đổi trạng thái
**Vấn đề:** Sau khi admin tap nút đổi status, không có thông báo thành công/thất bại.
**Fix:** Sau khi update thành công:
```tsx
const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
if (error) {
  Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
} else {
  // Refresh order data
  await fetchOrder();
  // Visual feedback — Toast or brief Alert
  Alert.alert('Đã cập nhật', `Trạng thái: ${STATUS_LABELS[newStatus]}`);
}
```

---

### 6. `app/customers.tsx:155` — Hiển thị đầy đủ date + time
**Vấn đề:** `toLocaleDateString` chỉ hiện ngày, không có giờ.
**Fix:** Dùng `formatDateTime` từ Phase 22.1:
```tsx
Đơn cuối: {formatDateTime(item.lastOrderDate)}
```

---

## Commit message
```
feat(phase-22): UX polish — shared date formatter, decimal input, multiline fix, status feedback
```
