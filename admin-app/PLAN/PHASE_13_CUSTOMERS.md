# Phase 13 — Quản lý Khách hàng

## Mục tiêu
Màn hình xem danh sách khách hàng đã mua hàng, thông tin liên lạc, tổng chi tiêu, số đơn.

## Tính năng
- Danh sách khách hàng từ bảng `profiles` (join với `orders`)
- Thông tin: tên, SĐT, địa chỉ, tổng đơn, tổng tiền đã paid
- Tìm kiếm theo tên hoặc SĐT
- Sắp xếp theo tổng chi tiêu (cao → thấp)
- Mở chi tiết: xem lịch sử đơn hàng của khách

## Supabase Query
```
profiles (id, full_name, phone, address)
  orders (id, total_amount, status, created_at) -- join qua user_id
```

## Navigation
- Thêm tab mới "Khách" vào tab bar (thay tab cuối hoặc thêm mới)
- Hoặc: accessible từ màn hình Dashboard

## Quyết định implement
Thêm vào stack navigation (không phải tab) để tránh tab bar quá nhiều.
Accessible từ Dashboard bằng nút "Xem khách hàng".

## Status: ✅ Done
