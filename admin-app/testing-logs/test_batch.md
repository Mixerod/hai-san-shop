# Module 5: Batch Preparation Screen

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra tải dữ liệu tổng hợp chuẩn bị hàng (lọc các đơn đang trong quá trình chuẩn bị).
- [x] 2. Kiểm tra ô nhập giới hạn khối lượng tối đa (Max KG):
  - Bàn phím số thập phân (`decimal-pad`) hoạt động chuẩn xác trên cả iOS và Android.
  - Kiểm tra điều kiện đầu vào (validate): không cho phép giá trị <= 0 hoặc ký tự không hợp lệ.
- [x] 3. Kiểm tra các bộ lọc:
  - Chọn sản phẩm cụ thể để gom đơn.
  - Lọc theo địa điểm / phương thức vận chuyển.
- [x] 4. Kiểm tra chức năng sao chép danh sách soạn hàng:
  - Nút Copy hoạt động sử dụng thư viện `expo-clipboard` (chạy không đồng bộ).
  - Định dạng chuỗi văn bản copy gửi qua Zalo/Telegram hiển thị rõ ràng, đẹp mắt.
  - Hiển thị Toast thông báo khi sao chép thành công.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi

### 🛠️ Sửa lỗi cập nhật State sau khi unmounted màn hình Chuẩn bị hàng (Phiên A)
1. **Phân tích lỗi**:
   - Màn hình `batch.tsx` gọi hàm `fetchBatches` để nạp dữ liệu gom đơn khi khởi tạo hoặc khi kéo refresh.
   - Khi mạng phản hồi chậm, nếu người dùng rời khỏi tab "Chuẩn bị", callback bất đồng bộ Supabase hoàn thành sẽ gọi `setBatches`, `setProductSummary`, `setFetchError` và `setLoading(false)` gây Memory Leak.
2. **Khắc phục**:
   - Khai báo ref bảo vệ `isMounted` và hook cleanup.
   - Thêm điều kiện `if (!isMounted.current) return;` trước các lệnh cập nhật state của danh sách và thống kê.
   - Chặn các phương thức `.finally()` nếu component đã unmount.
3. **Kết quả**:
   - App hoạt động tuyệt đối an toàn khi di chuyển qua lại giữa các tab, không bị rò rỉ RAM trên thiết bị.
   - Trình biên dịch TypeScript chạy sạch lỗi không cảnh báo.

### 🛠️ Cải tiến giao diện và Tích hợp Responsive Font (Phiên B)
1. **Responsive Font Sizes**:
   - Tích hợp hook `useResponsive` và helper scale chữ `fs()` vào `batch.tsx`.
   - Scale toàn bộ các Text tags trong màn hình Soạn hàng: Tiêu đề header, ô tìm kiếm/lọc, nút Toggle tổng hợp sản phẩm, các dòng text trong summary box và các card soạn hàng của khách hàng (Tên, SĐT, Cân nặng, Địa chỉ, Ghi chú, Danh sách món và nút Copy Zalo).
2. **Kết quả**:
   - Giao diện được hiển thị hài hòa, cân đối và responsive tốt hơn trên các dòng máy tính bảng (Tablet) hoặc thiết bị có màn hình lớn nhỏ khác nhau.
   - Biên dịch TypeScript sạch lỗi (`npx tsc --noEmit`).
