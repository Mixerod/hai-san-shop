# Module 3: Orders Screen & Order Detail

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra tải danh sách đơn hàng từ Supabase (bảng `orders`).
- [x] 2. Kiểm tra thanh tìm kiếm (Debounce Search):
  - Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc số điện thoại.
  - Đảm bảo debounce hoạt động (chỉ gọi API/filter sau 500ms dừng gõ).
- [x] 3. Kiểm tra tính năng mở rộng/thu gọn (accordion) của thẻ đơn hàng:
  - Bấm vào thẻ -> mở rộng xem danh sách sản phẩm đã đặt.
  - Bấm lại -> thu gọn.
- [x] 4. Kiểm tra nút thay đổi trạng thái nhanh (Status Dropdown/Picker):
  - Đổi trạng thái -> gọi Supabase cập nhật trực tiếp.
  - Nhận feedback thông báo Alert thành công/thất bại.
- [x] 5. Kiểm tra nút "Xem chi tiết" (nếu có):
  - Bấm vào chuyển tiếp tới `/order-detail` với ID chính xác.
  - Trong màn hình chi tiết, hiển thị thông tin đầy đủ và chính xác.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi

### 🛠️ Cải tiến giao diện và Đọc thông tin ghi chú khách hàng
1. **Phân tích yêu cầu**: 
   * Trực tiếp đọc thông tin Tên & Số điện thoại khách từ Ghi chú (`order.note`), do khách mua hàng vãng lai thường nhập thông tin giao hàng tại ghi chú này (định dạng `Tên: [tên]\nSĐT: [sdt]`).
   * Ẩn bớt độ nổi bật của mã đơn hàng dạng `#31c803` vì không có nhiều ý nghĩa trực quan với quản lý.
   * Hiển thị danh sách sản phẩm và tổng cân nặng (kg) **luôn luôn hiện** (không cần phải nhấn mở rộng thẻ) để admin xem nhanh đơn hàng gồm những gì.

2. **Các sửa đổi đã thực hiện**:
   * Tạo tệp helper `lib/parseCustomer.ts` chứa hàm `parseCustomerInfo` dùng Regex tách tên & SĐT từ ghi chú chính xác.
   * Áp dụng helper này vào cả `OrderCard.tsx` và `order-detail.tsx`.
   * **Thiết kế lại giao diện thẻ đơn hàng (`OrderCard`)**:
     * Tiêu đề hiển thị to và rõ **Tên khách hàng** + **SĐT** + **Ngày giờ đặt**.
     * Ở giữa hiển thị hộp tóm tắt: **Biểu tượng gói hàng 📦** kèm theo danh sách sản phẩm đặt (ví dụ: `Cá bớp (2kg), Tôm sú (1kg)`) và **Cân nặng (kg)** được tô màu nổi bật bên cạnh.
     * Dưới cùng hiển thị **Tổng tiền** to rõ màu xanh dương, **Hình thức thanh toán**, và góc phải là mã đơn hàng `#ID` nhỏ màu mờ.
     * Khi nhấn mở rộng thẻ chỉ hiển thị địa chỉ chi tiết, ghi chú thô, bảng giá từng món và nút cập nhật trạng thái.

3. **Tối ưu hóa Supabase Realtime & Tránh rò rỉ bộ nhớ (Memory Leak)**:
   * **Tách biệt Realtime Subscription**: Trước đó, mỗi khi admin bấm chuyển tab trạng thái lọc (All, Pending, Confirmed...), component lại đăng ký lại (re-subscribe) một Realtime Channel mới có cùng tên, làm ngốn băng thông và có nguy cơ xung đột kết nối. Tôi đã tách subscription chỉ chạy duy nhất **1 lần khi Mount**, còn tab filter chỉ gọi hàm `fetchOrders` bình thường.
   * **Thêm `isMounted` Ref Guard**: Tương tự như Chat, đã cài đặt bộ bảo vệ `isMounted` ref để ngắt toàn bộ lệnh gọi `setState` nếu admin thoát tab hoặc chuyển màn hình nhanh trước khi Supabase phản hồi dữ liệu.

4. **Kiểm thử biên dịch**: Chạy `npx tsc --noEmit` thành công 100% không có lỗi.
