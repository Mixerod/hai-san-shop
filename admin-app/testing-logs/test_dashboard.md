# Module 2: Dashboard Screen & Responsive Grid

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra hiển thị của 3 ô chỉ số (Thống kê Doanh thu, Đơn hàng, Khách hàng).
- [x] 2. Kiểm tra định dạng tiền tệ Việt Nam (vi-VN) cho ô Doanh thu.
- [x] 3. Kiểm tra tính năng Responsive:
  - Trên màn hình điện thoại (width < 768): 3 thẻ chỉ số hiển thị dạng danh sách dọc (hoặc 1-2 cột tùy tỷ lệ).
  - Trên màn hình máy tính bảng (width >= 768): 3 thẻ chỉ số hiển thị thành hàng ngang (grid 3 cột).
- [x] 4. Kiểm tra nút "Refresh" góc trên bên phải:
  - Khi click -> Trạng thái xoay tròn của Icon hoạt động.
  - Tải lại dữ liệu mới nhất từ Supabase.
- [x] 5. Kiểm tra tính năng lọc biểu đồ hoặc thống kê theo khoảng thời gian (nếu có).
- [x] 6. Kiểm tra xử lý lỗi khi không có kết nối mạng (Network Error) -> hiển thị thông báo thay vì sập màn hình.

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi

### 🛠️ Sửa lỗi cập nhật State sau khi unmounted màn hình Thống kê (Phiên A)
1. **Phân tích lỗi**:
   - Màn hình `dashboard.tsx` liên tục gọi `fetchStats` mỗi khi thay đổi khoảng thời gian lọc dữ liệu (Hôm nay, Tuần này, Tháng này, Tất cả).
   - Nếu admin chuyển tab cực nhanh hoặc thoát app ngay sau khi chọn bộ lọc, tiến trình fetch bất đồng bộ của Supabase hoàn thành sau đó sẽ gọi `setStats`, `setFetchError` và `.finally(() => setLoading(false))`. Điều này gây lỗi runtime cảnh báo cập nhật state cho component unmounted.
2. **Khắc phục**:
   - Bổ sung ref bảo vệ `isMounted` và hook cleanup.
   - Thêm điều kiện chặn `if (!isMounted.current) return;` sau khi nhận kết quả từ Supabase.
   - Bảo vệ hàm `.finally` chỉ cập nhật state khi component còn mount.
3. **Kết quả**:
   - Cải tiến tính ổn định của app khi chuyển đổi nhanh giữa các tab trong bottom bar, không còn rò rỉ RAM hay warning console.
   - Trình kiểm biên dịch TypeScript không phát sinh lỗi nào.
