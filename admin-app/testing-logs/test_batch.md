# Module 5: Batch Preparation Screen

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [ ] 1. Kiểm tra tải dữ liệu tổng hợp chuẩn bị hàng (lọc các đơn đang trong quá trình chuẩn bị).
- [ ] 2. Kiểm tra ô nhập giới hạn khối lượng tối đa (Max KG):
  - Bàn phím số thập phân (`decimal-pad`) hoạt động chuẩn xác trên cả iOS và Android.
  - Kiểm tra điều kiện đầu vào (validate): không cho phép giá trị <= 0 hoặc ký tự không hợp lệ.
- [ ] 3. Kiểm tra các bộ lọc:
  - Chọn sản phẩm cụ thể để gom đơn.
  - Lọc theo địa điểm / phương thức vận chuyển.
- [ ] 4. Kiểm tra chức năng sao chép danh sách soạn hàng:
  - Nút Copy hoạt động sử dụng thư viện `expo-clipboard` (chạy không đồng bộ).
  - Định dạng chuỗi văn bản copy gửi qua Zalo/Telegram hiển thị rõ ràng, đẹp mắt.
  - Hiển thị Toast thông báo khi sao chép thành công.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi
*(Tiến độ kiểm thử sẽ được cập nhật tại đây khi tiến hành chạy test)*
