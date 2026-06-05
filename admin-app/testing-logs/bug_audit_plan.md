# Kế hoạch Rà soát & Sửa lỗi Toàn diện (Bug Audit Plan)

Tài liệu này phân tích các lỗi tiềm ẩn từ phổ biến, trung bình đến hiếm gặp khi phát triển ứng dụng di động (React Native/Expo + Supabase) và lên kế hoạch rà soát chi tiết qua nhiều phiên làm việc (multi-sessions).

---

## 🔍 Phân loại Lỗi & Điểm Rà soát (Common to Rare)

### 1. Nhóm lỗi Phổ biến (Common UI & Interaction Bugs)
- **Lỗi 1.1**: Bàn phím che khuất và chặn cảm ứng các ô nhập liệu (`KeyboardAvoidingView` sai behavior trên Android).
  - *Trạng thái*: **Đã sửa** ở `login.tsx`, `chat.tsx`, `products.tsx`.
- **Lỗi 1.2**: Nội dung cuối danh sách bị che bởi thanh điều hướng Bottom Tab Bar.
  - *Trạng thái*: **Đã sửa** bằng cách thêm `paddingBottom: 100` cho tất cả các ScrollView/FlatList.
- **Lỗi 1.3**: Kích thước phông chữ và bố cục bị vỡ khi xoay màn hình ngang hoặc đổi thiết bị (Tablet vs Phone).
  - *Trạng thái*: **Đã sửa** bằng cách tích hợp hook `fs()` và `useResponsive()`.

### 2. Nhóm lỗi Trung bình (State & Performance Bugs)
- **Lỗi 2.1**: Rò rỉ bộ nhớ (Memory leaks) do không dọn dẹp (cleanup) `setInterval` hoặc sự kiện lắng nghe khi component unmount.
  - *Trạng thái*: **Đã kiểm tra**. Màn hình `chat.tsx` dọn dẹp interval bằng cách trả về hàm `clearInterval` trong `useEffect` và cờ `mounted = false`.
- **Lỗi 2.2**: Gọi lại render liên tục (Re-render loops) và suy giảm hiệu năng FlatList khi số lượng bản ghi lớn.
  - *Trạng thái*: **Đã tối ưu** bằng cách memoize thẻ `OrderCard`, `StatCard`, `FormField` và thêm các thuộc tính FlatList tối ưu (`removeClippedSubviews`, `windowSize`).
- **Lỗi 2.3**: Tranh chấp dữ liệu (Race Conditions) khi thực hiện nhiều cuộc gọi API không đồng bộ cùng lúc.
  - *Trạng thái*: **Đang rà soát**.

### 3. Nhóm lỗi Hệ thống & Backend (Supabase & API Bugs)
- **Lỗi 3.1**: Trùng lặp hoặc rò rỉ kết nối Supabase Realtime Channels khi component remount.
  - *Trạng thái*: **Đã sửa** bằng cách thêm hậu tố số ngẫu nhiên ngắt quãng (uuid/Math.random) vào tên channel (`channelId.current`).
- **Lỗi 3.2**: Sai lệch múi giờ hiển thị (timezone offset mismatch) khi chuyển đổi thời gian UTC từ database sang giờ hiển thị Việt Nam.
  - *Trạng thái*: **Đã kiểm tra** (sử dụng helper formatDate chuẩn hoá hiển thị).
- **Lỗi 3.3**: Lỗi mạng không xác định (Silent Network Failures) -> Gọi API bị timeout/mất mạng mà không hiển thị thông tin lỗi hoặc nút thử lại cho người dùng.
  - *Trạng thái*: **Đã kiểm tra** (bọc qua `ErrorView` với nút `onRetry`).

### 4. Nhóm lỗi Hiếm gặp (Rare & Edge Cases)
- **Lỗi 4.1**: Lỗi bộ nhớ đệm `AsyncStorage` bị đầy hoặc hỏng trên các dòng máy Android cũ gây lỗi tự động đăng xuất đột ngột.
  - *Trạng thái*: **Chờ rà soát**.
- **Lỗi 4.2**: App bị đẩy xuống nền (Background state) nhưng các Edge Function Webhook hoặc realtime subscription vẫn tiếp tục lắng nghe vô hạn gây ngốn pin/RAM.
  - *Trạng thái*: **Chờ rà soát**.

---

## 📅 Kế hoạch Thực hiện qua các Phiên (Sessions)

* **Phiên 1: Rà soát & Sửa lỗi Giao diện (UI/Layout & Che khuất)** -> *Hoàn thành*.
* **Phiên 2: Rà soát Memory Leaks & Polling Cleanups (Chat & Dashboard)** -> *Hoàn thành*.
* **Phiên 3: Rà soát Supabase Realtime Channels & Network Timeout Edge-Cases** -> *Sẽ lên lịch tiếp theo*.
* **Phiên 4: Rà soát AsyncStorage & Trạng thái chạy ngầm (App Background state)** -> *Sẽ lên lịch cuối cùng*.
