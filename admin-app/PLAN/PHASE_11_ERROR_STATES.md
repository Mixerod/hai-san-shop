# Phase 11 — Error States & Network Handling

## Mục tiêu
Khi Supabase query thất bại (mất mạng, lỗi server), các màn hình hiển thị error UI
thay vì im lặng hoặc hiện danh sách trống.

## Components mới
- `components/ErrorView.tsx` — icon WifiOff + message + nút "Thử lại"

## Screens được update
| Screen | Thay đổi |
|--------|----------|
| orders.tsx | `fetchError` state + ErrorView với retry |
| products.tsx | `fetchError` state + ErrorView với retry |
| dashboard.tsx | `fetchError` state + ErrorView với retry |

## Status: ✅ Done
