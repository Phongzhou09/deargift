# DearGift Website Clone

Bản dựng lại 100% website [DearGift](https://deargift.love/templates.php) với đầy đủ giao diện, hình ảnh, tính năng và trải nghiệm tương tác.

---

## 🌟 Tính Năng Hoàn Chỉnh

1. **Kho Mẫu Quà Tặng (52 Templates Hoàn Chỉnh)**:
   - Đầy đủ 52 mẫu quà tặng từ sinh nhật, Valentine, 8/3, 20/10, 19/11, Noel, Tết, đến thiên hà 3D và hoa nở.
   - Toàn bộ hình ảnh, thumbnail, huy hiệu giá ("Miễn phí" / "50.000đ"), số lượt dùng, thời gian tạo ("3 phút tạo"), thẻ tag (#Bó hoa 3D, #19/11...).

2. **Bộ Lọc Đề Mục (Category Filter)**:
   - Lọc nhanh theo 10 dịp: **Tất cả**, **Valentine**, **Sinh nhật**, **Ngày Phụ Nữ**, **Ngày Nhà Giáo**, **Lễ hội**, **Tết**, **Trải nghiệm 3D**, **Tình yêu**, **Mãi xanh**.
   - Cập nhật số lượng tức thì trên thanh kết quả và header thống kê.

3. **Tìm Kiếm Thời Gian Thực (Instant Search)**:
   - Gõ từ khóa tìm kiếm theo tên, mô tả hoặc hashtag mà không cần tải lại trang.

4. **Cửa Sổ Xem Thử (Interactive iPhone Mockup Modal)**:
   - Nhấn **"Xem thử"** trên bất kỳ mẫu nào để mở khung điện thoại iPhone tương tác.
   - Có thể ẩn/hiện Dynamic Island, xoay mở tab mới, đóng nhanh bằng ESC hoặc click ra ngoài.

5. **Trình Thiết Kế Quà Tặng (Gift Studio Builder)**:
   - Truy cập qua nút **"Tạo quà ngay"** (`gift-builder.php` / `gift-builder.html`).
   - Tùy chỉnh tên người nhận, người gửi, chọn ảnh, tải nhạc nền, viết lá thư, bật bó hoa 3D, cài đặt mật mã passcode, ngày đếm yêu thương, tạo mã QR trái tim.
   - Khung xem trước trực tiếp (Live Preview) với chế độ chuyển đổi máy tính (PC), iPad, điện thoại.

6. **Popup Nhận Voucher (Free Voucher Modal)**:
   - Nhấn vào hộp quà bay ở hero banner để mở popup nhận voucher 100%.
   - Trình tạo caption/hook ngẫu nhiên cho video TikTok theo ngày lễ/dịp hiện tại.
   - Nút copy nội dung và copy hashtag với thông báo nổi Toast.

7. **Hiệu Ứng Trái Tim Bay (Hearts Animation)**:
   - Nền canvas trái tim rơi nhẹ nhàng chuẩn nguyên mẫu.

---

## 🚀 Hướng Dẫn Khởi Chạy

### Cách 1: Chạy Server Python (Khuyên dùng)
Chạy lệnh sau tại thư mục dự án:
```powershell
python server.py
```
Sau đó mở trình duyệt và truy cập:
- **Trang chủ kho mẫu**: [http://localhost:8000/templates.php](http://localhost:8000/templates.php) hoặc [http://localhost:8000/](http://localhost:8000/)
- **Trình tạo quà tặng**: [http://localhost:8000/gift-builder.php?id=69](http://localhost:8000/gift-builder.php?id=69)
- **Xem thử trực tiếp**: [http://localhost:8000/demo.php?id=69](http://localhost:8000/demo.php?id=69)

### Cách 2: Mở Trực Tiếp Bằng Trình Duyệt (Không Cần Server)
Bạn có thể nhấp đúp trực tiếp vào file:
- `index.html` (Trang kho mẫu quà tặng hoàn chỉnh)
- `gift-builder.html` (Trình thiết kế quà tặng)
Mọi tính năng lọc, tìm kiếm, xem trước iframe đều hoạt động ngoại tuyến.
