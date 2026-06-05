# Phân tích & Rà soát Bug Toàn diện (Từ Phổ biến đến Hiếm gặp)

Tập tin này phân tích chuyên sâu các lỗi thường gặp, trung bình đến hiếm gặp khi lập trình ứng dụng React Native / Expo di động kết nối Supabase, đồng thời phân chia lộ trình rà soát thành các phiên làm việc riêng biệt (Sessions).

---

## 🔍 Danh mục Bug tiềm ẩn (Từ phổ biến đến hiếm gặp)

### 1. Nhóm lỗi Phổ biến (Common Mobile Bugs)
* **Bug 1.1: Trạng thái cập nhật State trên Component đã Unmount (State Update on Unmounted Component)**
  - *Mô tả*: Xảy ra khi một component thực hiện API call (ví dụ: query Supabase) rồi bị unmount trước khi API trả về kết quả. Callback cập nhật state sẽ kích hoạt trên component đã hủy, gây cảnh báo rò rỉ bộ nhớ (Memory Leak) và hao hụt tài nguyên.
  - *Các file cần rà soát*: `products.tsx`, `batch.tsx`, `dashboard.tsx`, `customers.tsx`, `broadcast.tsx`.
* **Bug 1.2: Bàn phím che khuất & Tương tác Input bị vô hiệu hóa (Keyboard Interferences)**
  - *Mô tả*: Trên Android, `KeyboardAvoidingView` sử dụng `behavior="height"` hoặc `behavior="padding"` không chuẩn xác sẽ làm méo layout, đẩy TextInputs ra ngoài vùng nhận cảm ứng (hit-slop) khiến admin không bấm được vào ô Email/Mật khẩu hoặc mô tả sản phẩm.
  - *Các file cần rà soát*: `login.tsx`, `chat.tsx`, `products.tsx` (đã chỉnh sửa, cần rà soát lại xem có phát sinh lỗi trên các kích thước màn hình khác không).
* **Bug 1.3: Tràn khung / Che khuất bởi Bottom Tab Bar**
  - *Mô tả*: Danh sách `FlatList` hoặc `ScrollView` cuộn xuống cuối bị thanh Bottom Tab Bar che mất các dòng cuối cùng hoặc nút hành động.
  - *Giải pháp*: Thêm `contentContainerStyle={{ paddingBottom: 100 }}` cho danh sách cuộn.

### 2. Nhóm lỗi Trung bình (Performance & Flow Bugs)
* **Bug 2.1: Double-Click / Spam click gửi yêu cầu trùng lặp (Request Spamming)**
  - *Mô tả*: Khi admin nhấn liên tiếp nút "Cập nhật trạng thái", "Gửi tin nhắn" hoặc "Thêm sản phẩm" trong khi mạng đang tải chậm, app sẽ gửi hàng loạt API request song song gây trùng lặp bản ghi database hoặc lỗi logic.
  - *Các file cần rà soát*: `orders.tsx` (nút cập nhật trạng thái nhanh), `products.tsx` (modal thêm sản phẩm), `broadcast.tsx` (nút gửi thông báo).
* **Bug 2.2: Kích thước chữ (Font Size) không responsive trên màn hình mật độ cao (Screen Density)**
  - *Mô tả*: Không sử dụng hook responsive để scale font size hoặc khoảng cách (margin/padding) khiến chữ bị vỡ hoặc quá nhỏ trên các màn hình có mật độ điểm ảnh (density) lớn (như máy tính bảng).
  - *Các file cần rà soát*: `orders.tsx`, `batch.tsx`, `order-detail.tsx` (chưa tích hợp hook `fs()` cho chữ).

### 3. Nhóm lỗi Hệ thống & Realtime (Supabase & App State Bugs)
* **Bug 3.1: Rò rỉ kết nối Supabase Realtime Channels**
  - *Mô tả*: Đăng ký channel realtime lắng nghe thay đổi DB nhưng không unsubscribe khi component unmount hoặc tạo mới channel liên tục mỗi khi state phụ thuộc thay đổi.
  - *Các file cần rà soát*: `orders.tsx`, `chat.tsx`, `_layout.tsx`.
* **Bug 3.2: Polling mạng chạy ngầm lãng phí Pin & Dữ liệu di động**
  - *Mô tả*: Tác vụ polling tin nhắn chat (`setInterval`) vẫn tiếp tục gửi request mạng khi người dùng thu nhỏ ứng dụng xuống nền (Background).
  - *Giải pháp*: Tích hợp lắng nghe `AppState` để ngắt polling khi app ở trạng thái `background`.

### 4. Nhóm lỗi Hiếm gặp (Rare & Edge Cases)
* **Bug 4.1: Sai lệch múi giờ hiển thị (Timezone Mismatch)**
  - *Mô tả*: Lỗi hiển thị ngày đặt đơn bị lệch 7 tiếng do database lưu giờ UTC còn thiết bị hiển thị không tự động chuyển đổi sang múi giờ Việt Nam (UTC+7).
* **Bug 4.2: AsyncStorage tràn hoặc hỏng cache phiên đăng nhập**
  - *Mô tả*: App bị crash hoặc tự động đăng xuất đột ngột trên một số dòng máy Android cũ khi token Supabase hết hạn mà không tự động refresh được do lỗi đọc/ghi AsyncStorage.

---

## 📅 Lộ trình Phân chia các Phiên làm việc (Sessions Route)

Để tối ưu hóa ngữ cảnh và không gom hết nhiệm vụ vào một session duy nhất, công việc được chia nhỏ thành 4 Phiên:

### 🔹 Phiên A: Khắc phục lỗi rò rỉ bộ nhớ (Memory Leak - Bug 1.1)
* **Mục tiêu**: Tích hợp cơ chế cờ bảo vệ `isMounted` ref cho tất cả các file còn thiếu (`products.tsx`, `batch.tsx`, `dashboard.tsx`, `customers.tsx`, `broadcast.tsx`).
* **Thời gian thực hiện**: *Phiên hiện tại (Session 1)*.

### 🔹 Phiên B: Tối ưu hóa tương tác, Chống Spam nút bấm & Responsive chữ (Bug 2.1 & 2.2)
* **Mục tiêu**:
  - Thêm trạng thái khóa nút (loading/disabled) cho các nút hành động trong `orders.tsx`, `products.tsx`, `broadcast.tsx` khi đang thực hiện API request.
  - Tích hợp hook `useResponsive` và helper scale chữ `fs()` vào `orders.tsx`, `batch.tsx`, `order-detail.tsx`.
* **Thời gian thực hiện**: *Lên lịch thông qua `schedule` cho Session 2*.

### 🔹 Phiên C: Rà soát & Cải tiến Bottom Tab Bar Che Khuất và Bàn Phím (Bug 1.2 & 1.3)
* **Mục tiêu**:
  - Rà soát giao diện các tab và form chi tiết trên nhiều thiết bị giả lập.
  - Đảm bảo các ô nhập liệu trong modal, màn hình con không bị bàn phím che khuất, tự động cuộn view lên.
* **Thời gian thực hiện**: *Lên lịch thông qua `schedule` cho Session 3*.

### 🔹 Phiên D: Rà soát Realtime, App Background States & Timezone (Bug 3.1, 3.2 & 4.1)
* **Mục tiêu**:
  - Đảm bảo realtime channels dọn dẹp sạch sẽ khi remount.
  - Tắt toàn bộ polling khi ứng dụng chạy nền.
  - Chuẩn hóa hiển thị ngày giờ UTC+7.
* **Thời gian thực hiện**: *Lên lịch thông qua `schedule` cho Session 4*.
