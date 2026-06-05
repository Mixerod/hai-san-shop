# Module 6: Feedbacks, Chat & Broadcast Notifications

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra danh sách Phản hồi/Chat nhận về từ Supabase (bảng `feedbacks`).
- [x] 2. Kiểm tra tính năng Polling nhắn tin (Chat Polling):
  - Khoảng thời gian tự động tải tin nhắn mới được dọn dẹp (cleanup) sạch sẽ khi người dùng chuyển màn hình.
  - Hủy cuộc hội thoại hoặc goBack không để lại stale interval.
- [x] 3. Kiểm tra tính năng Chat:
  - Bàn phím không che khuất ô nhập tin nhắn ở phía dưới.
  - Nhập tin nhắn và nhấn gửi -> insert dữ liệu vào Supabase -> cập nhật tức thì lên màn hình.
  - Tự động cuộn xuống cuối (scrollToEnd) khi có tin nhắn mới.
- [x] 4. Đánh dấu đã đọc:
  - Khi mở cuộc trò chuyện -> gọi API chuyển `is_read = true` thành công.
- [x] 5. Kiểm tra màn hình phát tin tức (Broadcast):
  - Nhập tiêu đề, nội dung thông báo.
  - Định dạng hiển thị ngày giờ phát thông báo (bao gồm cả năm).
  - Bấm gửi -> gọi Edge Function hoặc lưu bảng thông báo -> Push tin tới Expo.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi
*(Tiến độ kiểm thử sẽ được cập nhật tại đây khi tiến hành chạy test)*
