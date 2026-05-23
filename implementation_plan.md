# Admin Page — Dark Dashboard Redesign Plan

Toàn bộ thay đổi chỉ ở **JSX layer** (từ `return (` tới cuối file, dòng 934–2703).  
Logic, state, handlers, Supabase calls ở dòng 1–933 **giữ nguyên 100%**.

---

## Cấu trúc layout mới

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER BAR (h-14, bg-gray-900, border-b gray-800)          │
│  [Logo] [ADMIN badge]   [Đơn hàng · Sản phẩm · Góp ý]  [⬇] │
└─────────────────────────────────────────────────────────────┘
┌────────────────────────────┬────────────────────────────────┐
│  LEFT COLUMN               │  RIGHT SIDEBAR                  │
│  flex-1, overflow-y-auto   │  w-80 xl:w-96, bg-gray-900     │
│                            │  hidden md:flex                 │
│  ─ Stats bar (3 metrics)   │  ─ [Broadcast] collapsible      │
│  ─ Filter toolbar          │  ─ KẾ HOẠCH LÀM HÀNG header    │
│  ─ [Bulk bar] slide-in     │  ─ Prep controls (compact)      │
│  ─ Order cards list        │  ─ Product chips grid           │
│                            │  ─ Order prep cards list        │
│                            │  ─ [Copy] [Print] pinned bottom │
└────────────────────────────┴────────────────────────────────┘
```

---

## Design tokens

| Token | Value |
|---|---|
| Page bg | `bg-gray-950` |
| Sidebar bg | `bg-gray-900` |
| Card bg | `bg-gray-800` |
| Card hover | `bg-gray-750` → `bg-gray-700` |
| Borders | `border-gray-800` / `border-gray-700` |
| Text primary | `text-gray-100` |
| Text secondary | `text-gray-400` |
| Text muted | `text-gray-600` |
| Accent blue | `text-blue-400` / `bg-blue-500/10` |
| Accent emerald | `text-emerald-400` / `bg-emerald-500/10` |
| Accent yellow | `text-yellow-400` / `bg-yellow-500/10` |
| Accent red | `text-red-400` / `bg-red-500/10` |

Status badges adapted for dark:
- `pending` → `bg-yellow-500/10 text-yellow-400 border border-yellow-500/30`
- `confirmed` → `bg-blue-500/10 text-blue-400 border border-blue-500/30`
- `delivering` → `bg-sky-500/10 text-sky-400 border border-sky-500/30`
- `done` → `bg-emerald-500/10 text-emerald-400 border border-emerald-500/30`
- `cancelled` → `bg-red-500/10 text-red-400 border border-red-500/30`

---

## Các section JSX thay đổi

### 1. Root wrapper
```tsx
// CŨ:
<div className="fixed inset-0 z-[60] bg-[#FAFAFA] overflow-hidden ...">

// MỚI:
<div className="fixed inset-0 z-[60] bg-gray-950 text-gray-100 overflow-hidden flex flex-col font-sans antialiased">
```
Toast, Alert modal, Auth gate giữ nguyên nhưng adapt màu dark.

### 2. Header bar
- Cao `h-14`, `bg-gray-900 border-b border-gray-800`
- LEFT: Logo `Hải Sản Sạch` + `ADMIN` badge
- CENTER: Nav tabs `[Đơn hàng · Thêm sản phẩm · Góp ý & Đặt trước]`  
  → Compact pill tabs, không dùng absolute positioning nữa
- RIGHT: Export CSV button + hamburger (mobile)

### 3. Main body (`activeTab === 'orders'`)
Two-column flex row:
```tsx
<div className="flex flex-1 overflow-hidden">
  {/* LEFT */}
  <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
    <div className="p-4 space-y-3 overflow-y-auto flex-1">
      {/* Stats, Filter, Bulk, Orders */}
    </div>
  </div>
  {/* RIGHT */}
  <div className="hidden md:flex w-80 xl:w-96 shrink-0 border-l border-gray-800 bg-gray-900 flex-col overflow-hidden">
    {/* Broadcast + Prep sidebar */}
  </div>
</div>
```

### 4. Stats bar (LEFT, top)
- 3 metric cards trong một `grid grid-cols-3 gap-2`
- Compact: `p-3`, `rounded-xl`, `bg-gray-800 border border-gray-700`
- Icon màu: emerald (revenue), blue (orders), purple (customers)

### 5. Filter toolbar (LEFT)
- Single `flex flex-wrap items-center gap-2` row trong `bg-gray-800/50 rounded-xl p-2`
- Date inputs: dark style `bg-gray-800 border-gray-700 text-gray-200`
- Status select: same dark style
- Column visibility dropdown: dark popup
- Refresh button: `bg-gray-700 hover:bg-gray-600`
- `ml-auto` cho refresh

### 6. Bulk action bar (LEFT, slide-in)
- `{selectedOrderIds.size > 0 && (` → chọn đơn thì hiện
- `fixed bottom-0` trong left column hoặc sticky top
- Dark: `bg-gray-800 border-t border-gray-700`

### 7. Order cards (LEFT, scrollable list)
Mỗi card là một `div` với:
- Header row luôn hiện: `[checkbox] [#ID] [tên] [SĐT] [badge giao] [status badge]`
- Body collapsible: click header để expand/collapse
  - `const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())`
  - **Đây là state MỚI duy nhất cần thêm vào** (state cho collapsible cards)
- Dark card: `bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl`
- Status select: adapted dark

### 8. RIGHT SIDEBAR — Broadcast (collapsible)
- `showGlobalPanel` state đã có, dùng lại
- Collapsed: header bar với `Megaphone` icon + `showGlobalPanel` toggle
- Expanded: form broadcast

### 9. RIGHT SIDEBAR — Prep controls
- Stack dọc, compact
- MAX KG input, lọc SP dropdown, min weight, keyword
- Delivery toggle (3 buttons)

### 10. RIGHT SIDEBAR — Product chips
- `grid grid-cols-2 gap-1.5`  
- Mỗi chip: `bg-gray-700 hover:bg-gray-600 rounded-lg p-2 text-xs`
- Active: `bg-blue-500/20 border border-blue-500/50 text-blue-300`

### 11. RIGHT SIDEBAR — Prep order cards
- Compact cards, single column, scrollable
- Dark: `bg-gray-800 border border-gray-700`

### 12. RIGHT SIDEBAR — Bottom actions (pinned)
- `border-t border-gray-700 p-3 flex gap-2`
- Copy Order Tổng + In Phiếu buttons

### 13. `activeTab === 'products'` và `activeTab === 'feedbacks'`
- Full-width single column trong `flex-1 overflow-y-auto`
- Dark wrapper: `bg-gray-900 rounded-xl border border-gray-800`
- Nội dung JSX bên trong giữ nguyên 100%, chỉ đổi màu container

### 14. Mobile bottom sheet
- `mobileMenuOpen` state đã có  
- Collapsed: floating pill `fixed bottom-4 left-1/2` hiện total KG
- Expanded: `fixed inset-x-0 bottom-0 h-[80vh] bg-gray-900 rounded-t-2xl`
- Toggle: `setMobileMenuOpen(!mobileMenuOpen)`

---

## State mới cần thêm (DUY NHẤT 1 state)

```tsx
const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
```

Dùng để toggle collapse/expand order cards trong left column.

---

## Constraints checklist

- [x] Không đổi tên state variable nào
- [x] Không đổi handler signatures
- [x] Không đổi Supabase queries  
- [x] Không xóa feature nào
- [x] `overflow-x-hidden` trên root + left column
- [x] Toast, Alert, Confirm modals giữ nguyên ở root level
- [x] TypeScript clean — không thêm `any`

---

## Open Questions

> [!IMPORTANT]
> **State mới cho collapsible cards**: Cần thêm `expandedOrders: Set<string>` state. Điều này là cần thiết để implement collapsible order cards. Có phù hợp không?

> [!NOTE]
> **`subTab` state**: State `subTab: 'list' | 'preparation'` sẽ không còn dùng sau redesign (vì preparation luôn hiện ở sidebar). State này sẽ được giữ nguyên trong code nhưng không được sử dụng trong JSX mới — không vi phạm constraint "không xóa feature".

> [!WARNING]  
> **File size**: File hiện tại ~137KB, 2703 dòng. Sau redesign ước tính tương đương. Vì thay toàn bộ JSX (từ dòng 934), cần dùng `write_to_file` với `Overwrite: true` cho phần JSX mới — đây là change lớn nhất từ trước tới nay.
