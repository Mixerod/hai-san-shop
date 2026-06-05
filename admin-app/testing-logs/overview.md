# Kế hoạch Kiểm thử & Sửa lỗi Tương tác (Admin App)

Tập hồ sơ này lưu trữ kế hoạch và tiến độ kiểm tra tương tác giao diện (tất cả các nút, ô nhập liệu, hiệu ứng, bàn phím) và kết nối backend (Supabase auth, DB, realtime) của Hải Sản Admin App.

## 📂 Danh mục Kiểm thử
- **[overview.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/overview.md)**: Tổng quan kế hoạch và trạng thái kiểm thử.
- **[test_auth.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_auth.md)**: Kiểm thử Login, Auth Guard và điều hướng.
- **[test_dashboard.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_dashboard.md)**: Kiểm thử Dashboard, biểu đồ và hiển thị thống kê.
- **[test_orders.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_orders.md)**: Kiểm thử màn hình Đơn hàng & Chi tiết Đơn hàng.
- **[test_products.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_products.md)**: Kiểm thử màn hình Sản phẩm, form thêm/sửa, và tải ảnh.
- **[test_batch.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_batch.md)**: Kiểm thử màn hình Soạn hàng, bộ lọc và copy clipboard.
- **[test_chat.md](file:///D:/MyGitRepos/e-commercewebsite/hai-san-shop/admin-app/testing-logs/test_chat.md)**: Kiểm thử Phản hồi, nhắn tin Chat realtime và Broadcast.

---

## 📌 Bảng Tiến độ Kiểm thử

| Module | Tác vụ chính | Trạng thái | Ghi chú |
|---|---|---|---|
| **Test 1: Auth & Login** | Sửa lỗi kẹt ô nhập liệu, kiểm tra Auth Guard, chuyển màn hình | ✅ Đã kiểm tra & Sửa | Đã sửa KeyboardAvoidingView chặn touch bằng ScrollView + undefined behavior trên Android |
| **Test 2: Dashboard** | Responsive grid, nút Refresh, tải dữ liệu động từ Supabase | ✅ Đã kiểm tra | Thêm `paddingBottom: 100` để cuộn qua thanh tab, responsive grid hoạt động tốt trên cả tablet/phone |
| **Test 3: Orders** | Mở rộng thẻ (collapsible), chuyển trạng thái, Xem chi tiết | ✅ Đã kiểm tra | Thiết kế lại thẻ đẹp mắt, tóm tắt món ăn & cân nặng luôn hiện, thêm `paddingBottom: 100` tránh bị che |
| **Test 4: Products** | Bàn phím multiline, chọn Danh mục, validate, upload ảnh | ✅ Đã kiểm tra & Sửa | Đã sửa KeyboardAvoidingView chặn touch trong Modal trên Android, thêm `paddingBottom: 100` cho list |
| **Test 5: Batch Prep** | Decimal Keyboard, validate kg, copy danh sách soạn hàng | ✅ Đã kiểm tra | Clipboard copy và decimal input ổn định, thêm `paddingBottom: 100` tránh che khuất |
| **Test 6: Chat & Broadcast** | Chat realtime, đánh dấu đã đọc, gửi Broadcast | ✅ Đã kiểm tra & Sửa | Đã sửa KeyboardAvoidingView trong chat chi tiết trên Android, thêm `paddingBottom: 100` tránh che khuất |

---

## 🚀 Kịch bản Tự động Hoạt động
Chúng tôi sẽ tự lên lịch `schedule` với các bước kiểm tra tiếp theo. Sau khi hoàn thành kiểm thử hoặc sửa lỗi của từng module, tiến độ sẽ được cập nhật tự động vào các file `.md` trong thư mục `testing-logs/`.
