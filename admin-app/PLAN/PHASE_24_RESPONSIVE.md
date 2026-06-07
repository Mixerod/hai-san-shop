# Phase 24 — Responsive Design Completion

## Vấn đề còn lại
- Dashboard stat grid nói "3 cột trên tablet" nhưng thực tế không hoạt động (flexBasis không đổi theo isTablet)
- `fs()` function được import trong dashboard nhưng không dùng — font sizes vẫn hardcode
- Login không dùng font scaling

---

## 1. Fix StatCard tablet 3-column grid (dashboard.tsx)

**Vấn đề:** `gridTablet` chỉ đổi gap, không đổi flexBasis của card.

**Fix — Thêm `isTablet` prop vào StatCard:**
```tsx
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  isTablet?: boolean;
}

function StatCard({ icon, label, value, color, isTablet }: StatCardProps) {
  return (
    <View style={[
      statStyles.card,
      { borderColor: color + '33' },
      isTablet ? statStyles.cardTablet : statStyles.cardPhone,
    ]}>
      ...
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexGrow: 1,
    gap: 8,
  },
  cardPhone: { flexBasis: '45%' },
  cardTablet: { flexBasis: '28%' },    // 3 cột trên tablet
  ...
});
```

Và trong render:
```tsx
<StatCard icon={...} label="..." value="..." color="..." isTablet={isTablet} />
```

---

## 2. Dùng `fs()` cho font sizes trong dashboard (dashboard.tsx)

**Hiện tại:** `statStyles.label` hardcode `fontSize: 13`, `statStyles.value` hardcode `fontSize: 18`.

**Fix:**
```tsx
// Trong StatCard, dùng props thay vì statStyles hardcode:
function StatCard({ icon, label, value, color, isTablet, fs: fontScale }: StatCardProps & { fs?: (n: number) => number }) {
```

Hoặc đơn giản hơn, dùng `useResponsive()` bên trong StatCard:
```tsx
function StatCard({ icon, label, value, color, isTablet }: StatCardProps) {
  const { fs } = useResponsive();
  return (
    <View ...>
      <Text style={[statStyles.label, { fontSize: fs(13) }]}>{label}</Text>
      <Text style={[statStyles.value, { color, fontSize: fs(18) }]}>{value}</Text>
    </View>
  );
}
```

---

## 3. Apply `fs()` trong login.tsx

**Hiện tại:** `fontSize: 24` (title), `fontSize: 14` (subtitle), `fontSize: 16` (button text) hardcode.

**Fix:**
```tsx
const { fs } = useResponsive();
// Áp dụng:
// title: fontSize: fs(24)
// subtitle: fontSize: fs(14)
// label: fontSize: fs(13)
// buttonText: fontSize: fs(16)
```

Vì StyleSheet không nhận hooks, phải dùng inline style hoặc tách constant ra ngoài StyleSheet.

---

## 4. Apply `fs()` trong customers.tsx và broadcast.tsx

Tương tự: font sizes header title, card name, sub text nên scale theo device.
Ưu tiên thấp hơn, làm sau dashboard và login.

---

## Commit message
```
feat(phase-24): responsive tablet 3-col grid, fs() font scaling in dashboard and login
```
