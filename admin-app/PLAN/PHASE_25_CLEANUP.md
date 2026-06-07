# Phase 25 — Code Quality & Cleanup

## 1. Xoá AdminHeader.tsx (dead code)
`components/AdminHeader.tsx` tồn tại nhưng không được import ở bất kỳ đâu trong app.
**Fix:** Xoá file `admin-app/components/AdminHeader.tsx`.
Trước khi xoá, grep toàn bộ để chắc chắn không có import nào.

---

## 2. Fix `lib/notifications.ts` — `(Constants as any)` unsafe
**Vấn đề:** Line 45: `(Constants as any).easConfig?.projectId` — unsafe cast.
**Fix:** Dùng type-safe access:
```tsx
// expo-constants type định nghĩa expoConfig hoặc easConfig tùy SDK version
const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId;
```
Nếu thuộc tính không tồn tại trong type, dùng:
```tsx
const projectId = (Constants as Record<string, unknown> & typeof Constants)
  .easConfig?.projectId as string | undefined
  ?? Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
```
Hoặc đơn giản nhất — vì đây là code nội bộ và SDK khác version:
```tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projectId = (Constants as any).easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
```
Ít nhất add comment giải thích tại sao cần cast.

---

## 3. Xoá `isSmallPhone` không dùng trong dashboard.tsx
**Vấn đề:** `useResponsive()` trả về `isSmallPhone` nhưng dashboard không dùng.
**Fix:** Chỉ destructure những gì dùng:
```tsx
const { isTablet, fs } = useResponsive();
```

---

## 4. `app/(tabs)/chat.tsx` — Null guard cho title
**Vấn đề:** Dù hiếm, title có thể null và `.startsWith()` sẽ crash.
**Fix:** Đã có optional chaining `row.title?.startsWith(ADMIN_PREFIX)` — verify dòng đó dùng `?.` không phải `.`.

---

## 5. Thêm `keyExtractor` warning fix trong FlatList (nếu có)
Check xem có FlatList nào missing `keyExtractor` không — đặc biệt nếu data là string hoặc số.

---

## 6. Consistency: `s` vs `styles` naming
Một số file dùng `const s = StyleSheet.create(...)` (customers, batch, chat), số khác dùng `const styles = ...` (dashboard, orders). Không ảnh hưởng runtime nhưng nên nhất quán.
**Không cần fix ngay** — chỉ note để future refactor.

---

## Commit message
```
chore(phase-25): remove dead AdminHeader, fix notifications Constants cast, cleanup unused imports
```
