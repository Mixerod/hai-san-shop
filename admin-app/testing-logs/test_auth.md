# Module 1: Authentication & Screen Layouts (Login Page)

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra khả năng bấm/chạm (tap interaction) vào hai ô nhập liệu Email và Mật khẩu.
- [x] 2. Sửa lỗi `KeyboardAvoidingView` chặn tương tác cảm ứng trên Android/iOS.
- [ ] 3. Kiểm tra tính năng ẩn/hiện mật khẩu (nếu có) và hiển thị placeholder.
- [ ] 4. Kiểm tra nút "Đăng nhập" (trạng thái loading, nút bị disable khi đang chạy API).
- [ ] 5. Kiểm tra kết nối Supabase Auth:
  - Trường hợp nhập sai định dạng email/mật khẩu -> hiển thị Alert cảnh báo đúng.
  - Trường hợp tài khoản không phải là admin -> thông báo từ chối quyền truy cập và tự động đăng xuất.
  - Trường hợp đăng nhập thành công với tài khoản `minhquyet08122003@gmail.com` -> điều hướng tự động về màn hình Orders.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi

### 🔍 Phân tích lỗi chặn cảm ứng (Tác vụ 1 & 2)
* **Hiện tượng**: Giao diện hiển thị bình thường nhưng người dùng không thể chạm vào các ô TextInput hoặc các nút để tương tác.
* **Nguyên nhân**:
  1. Trong `login.tsx`, `KeyboardAvoidingView` đang bọc trực tiếp lớp ngoài cùng với thuộc tính `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.
  2. Thuộc tính `behavior="height"` trên Android thường xuyên làm sai lệch tính toán kích thước chiều cao của View khi bàn phím chưa mở (hoặc khi khởi tạo), thu nhỏ vùng cảm nhận chạm (hit-box) của thẻ card hoặc đẩy nó ra ngoài vùng bấm được, làm cho các nút bấm và ô nhập liệu bị kẹt (không thể focus).
  3. Thiếu lớp bọc `TouchableWithoutFeedback` để tắt bàn phím khi bấm ra ngoài vùng trống.

### 🛠️ Giải pháp khắc phục
1. Tách `KeyboardAvoidingView` làm lớp bao ngoài độc lập với thuộc tính `style={{ flex: 1, width: '100%' }}`.
2. Trên Android, bỏ `behavior` (để `undefined`), để hệ điều hành tự điều khiển thông qua cấu hình `windowSoftInputMode` của Expo. Trên iOS dùng `padding`.
3. Bọc nội dung Login Card vào một `ScrollView` hoặc `TouchableWithoutFeedback` để tăng độ linh hoạt khi hiển thị trên các màn hình có tỉ lệ khác nhau.
