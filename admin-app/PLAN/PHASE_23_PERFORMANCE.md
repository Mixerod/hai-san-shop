# Phase 23 — Performance: Memoization & Search Debounce

## 1. Memoize FormField (products.tsx)
`FormField` được định nghĩa ở file-scope nhưng không có `memo` → re-render không cần thiết khi form state thay đổi dù props FormField không đổi.

**Fix:** Đổi function definition thành:
```tsx
import { memo } from 'react';

const FormField = memo(function FormField({ label, value, onChangeText, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  multiline?: boolean; keyboardType?: TextInputProps['keyboardType'];
}) {
  return (...);
});
```

---

## 2. Memoize StatCard (dashboard.tsx)
`StatCard` nhận primitive props và một ReactNode. Memoize để tránh re-render khi dashboard state thay đổi (period, loading).

**Fix:**
```tsx
import { memo } from 'react';

const StatCard = memo(function StatCard({ icon, label, value, color, isTablet }: StatCardProps) {
  return (...);
});
```

---

## 3. Debounce search inputs
Hiện tại mỗi keystroke trigger `useMemo` recompute. Với danh sách lớn, thêm 300ms debounce giúp smooth hơn.

**Tạo hook `hooks/useDebounce.ts`:**
```tsx
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

**Áp dụng ở:**
- `orders.tsx`: `const debouncedSearch = useDebounce(search);` → dùng trong `useMemo`
- `products.tsx`: tương tự
- `customers.tsx`: tương tự
- `batch.tsx`: tương tự (search + filterProduct)

Không cần debounce `filterStatus` hay `filterDelivery` vì chúng là tap, không keystroke.

---

## 4. FlatList tối ưu cho batch.tsx và customers.tsx
Chưa có `removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`.

**batch.tsx FlatList:**
```tsx
<FlatList
  removeClippedSubviews
  initialNumToRender={8}
  maxToRenderPerBatch={5}
  windowSize={8}
  ...
/>
```

**customers.tsx FlatList:**
```tsx
<FlatList
  removeClippedSubviews
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={10}
  ...
/>
```

---

## Commit message
```
perf(phase-23): memoize FormField+StatCard, debounce search, FlatList optimization
```
