# Module 4: Products Management Screen

## 📌 Kế hoạch Kiểm thử & Sửa lỗi
- [x] 1. Kiểm tra hiển thị danh sách sản phẩm theo dạng lưới (Grid) hoặc danh sách (List).
- [x] 2. Kiểm tra bộ lọc danh mục (ScrollView Categories):
  - Đảm bảo không bị che khuất hoặc cắt mất chữ trên các dòng điện thoại.
  - Bấm chọn danh mục lọc danh sách sản phẩm tương ứng.
- [x] 3. Kiểm tra tính năng thêm sản phẩm mới (Add Product Modal):
  - Form nhập thông tin: Tên, giá bán, đơn vị tính, mô tả, danh mục, note...
  - Mô tả dài -> Bàn phím multiline hiển thị đúng số dòng và tự động giãn dòng.
  - Nút Switch bật/tắt trạng thái "Còn hàng/Hết hàng" (In stock).
- [x] 4. Kiểm tra tải ảnh sản phẩm lên Supabase Storage:
  - Bấm chọn ảnh từ thư viện -> Tải lên thành công -> Trả về URL.
  - Hiển thị loading spinner trong khi tải ảnh.
- [x] 5. Kiểm tra sửa thông tin sản phẩm và xóa sản phẩm (đầy đủ các cảnh báo xác nhận trước khi xóa).

---

## 📝 Nhật ký Kiểm thử & Nhật ký Sửa lỗi

### 🛠️ Sửa lỗi rò rỉ bộ nhớ (Memory Leak) khi đóng Modal / Hủy màn hình (Phiên A)
1. **Phân tích lỗi**:
   - Màn hình `products.tsx` chứa các thao tác bất đồng bộ tải danh sách sản phẩm (`fetchProducts`), tải ảnh lên Supabase Storage (`uploadImage`), và thực hiện thêm/sửa sản phẩm (`commitSave`).
   - Nếu quản trị viên nhấn thoát Modal hoặc chuyển sang tab khác trong khi ảnh hoặc dữ liệu sản phẩm đang tải, app sẽ tiếp tục cập nhật state (`setSaving`, `setShowModal`, `setProducts`, `setFetchError`) trên một component không còn active, dẫn đến lỗi cảnh báo Memory Leak trên console.
2. **Khắc phục**:
   - Tích hợp cờ bảo vệ `isMounted` sử dụng `useRef(true)` và hook cleanup `useEffect`.
   - Đặt điều kiện `if (!isMounted.current) return;` trước tất cả các callback cập nhật state bất đồng bộ.
   - Sửa các phương thức `.finally()` để bảo vệ việc gọi `setLoading` và `setRefreshing`.
3. **Kết quả**:
   - Tránh hoàn toàn lỗi crash app ngầm và rò rỉ RAM khi thao tác lưu/thêm sản phẩm nhanh.
   - Kiểm tra compile TypeScript (`npx tsc --noEmit`) thành công.

### 🛠️ Rà soát tương tác phím & khoảng đệm Modal (Phiên C)
1. **Lỗi cấn bàn phím khi nhập ở cuối Modal**:
   - Khi Modal thêm/sửa sản phẩm mở ra, các ô nhập liệu nằm trong ScrollView. Nếu admin cuộn xuống cuối để nhập ghi chú nội bộ hoặc tick switch trạng thái, bàn phím ảo mở ra sẽ che mất các phần này hoặc không cho phép cuộn để xem do thiếu khoảng đệm ở cuối ScrollView.
2. **Khắc phục**:
   - Thêm `paddingBottom: 60` cho style `modalContent` (ScrollView bọc các form nhập liệu trong Modal).
3. **Kết quả**:
   - Admin có thể dễ dàng cuộn lên xuống thoải mái để nhập mọi trường thông tin trong Modal mà không lo bị bàn phím ảo che mất hoặc cản trở tương tác.
   - Biên dịch TypeScript sạch lỗi (`npx tsc --noEmit`).

