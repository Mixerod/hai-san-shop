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

### 🛠️ Sửa lỗi rò rỉ bộ nhớ (Memory Leak) và cập nhật State khi component đã hủy
1. **Phân tích lỗi**:
   * Khi người dùng rời khỏi màn hình Chat hoặc đóng Modal nhập tin nhắn, các tác vụ bất đồng bộ (như truy vấn Supabase feedbacks, gửi tin phản hồi, đánh dấu đã đọc...) vẫn đang trong quá trình tải.
   * Khi các lệnh gọi API bất đồng bộ này hoàn thành, các hàm cập nhật state (`setChatError`, `setConversations`, `setMessages`, `setSending`...) sẽ được kích hoạt trên một Component không còn tồn tại trong cây DOM (unmounted), dẫn đến lỗi rò rỉ bộ nhớ (Memory Leak) và cảnh báo đỏ từ React.

2. **Cách khắc phục**:
   * Khai báo ref `isMounted = useRef(true)` để theo dõi vòng đời component.
   * Sử dụng `useEffect` để đổi trạng thái `isMounted.current = false` khi component unmount.
   * Đặt các lớp bảo vệ kiểm tra `if (!isMounted.current) return;` trước bất kỳ lệnh gọi `set...` state nào trong các hàm bất đồng bộ.
   * Giờ đây, màn hình Chat hoạt động tuyệt đối an toàn và không còn rủi ro gây hao tổn RAM khi người dùng chuyển tab nhanh.

3. **Kiểm thử biên dịch**: Chạy `npx tsc --noEmit` hoàn thành không lỗi.
