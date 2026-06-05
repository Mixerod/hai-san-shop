# Module 3: Orders Screen & Order Detail

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [ ] 1. Kiểm tra tải danh sách đơn hàng từ Supabase (bảng `orders`).
- [ ] 2. Kiểm tra thanh tìm kiếm (Debounce Search):
  - Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc số điện thoại.
  - Đảm bảo debounce hoạt động (chỉ gọi API/filter sau 500ms dừng gõ).
- [ ] 3. Kiểm tra tính năng mở rộng/thu gọn (accordion) của thẻ đơn hàng:
  - Bấm vào thẻ -> mở rộng xem danh sách sản phẩm đã đặt.
  - Bấm lại -> thu gọn.
- [ ] 4. Kiểm tra nút thay đổi trạng thái nhanh (Status Dropdown/Picker):
  - Đổi trạng thái -> gọi Supabase cập nhật trực tiếp.
  - Nhận feedback thông báo Alert thành công/thất bại.
- [ ] 5. Kiểm tra nút "Xem chi tiết" (nếu có):
  - Bấm vào chuyển tiếp tới `/order-detail` với ID chính xác.
  - Trong màn hình chi tiết, hiển thị thông tin đầy đủ và chính xác.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi
*(Tiến độ kiểm thử sẽ được cập nhật tại đây khi tiến hành chạy test)*
