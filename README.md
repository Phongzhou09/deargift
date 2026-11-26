# DearGift — Nền tảng tạo quà tặng 3D trực tuyến

Website tạo và chia sẻ thiệp / quà tặng tương tác 3D trực tuyến (sinh nhật, Valentine, 8/3, 20/10, 19/11, Giáng Sinh, Trung Thu, Tết, Kỷ niệm), tích hợp trình thiết kế trực quan, thanh toán VietQR / Casso tự động và Admin CMS.

---

## 📁 Cấu Trúc Dự Án

```text
deargift/
├── app/
│   ├── __init__.py
│   ├── db.py               # Lớp truy cập SQLite (WAL mode, PBKDF2-SHA256, migration)
│   └── schema.sql          # Lược đồ bảng users, gifts, settings, ideas, reviews, payment_transactions
├── data/
│   └── deargift.db         # Database SQLite (tự khởi tạo khi chạy server, ignored trên Git)
├── tests/
│   ├── verify_platform.py  # Kiểm thử toàn diện DB, API và toàn bộ 56 mẫu demo
│   └── demo-preview.test.js
├── assets/
│   ├── legacy/             # Tài nguyên ảnh/GIF/CSS/JS gốc của một số mẫu cũ (server tự map)
│   └── ...                 # Hình ảnh, font, nhạc, hiệu ứng dùng chung
├── css/ & js/              # Giao diện & script chính của website
├── demos/                  # 56 trang demo xem trước mẫu quà
├── templates/              # Mã nguồn từng mẫu quà tương tác 3D
├── templates_v3_meta/      # Form cấu hình riêng cho từng mẫu trong Gift Builder
├── uploads/                # Ảnh & nhạc mẫu / tải lên
├── server.py               # HTTP Server Python (routing, API, auth, VietQR, compression)
├── templates_data.json     # Danh sách 56 mẫu quà tặng
├── index.html              # Trang chủ
├── templates.php           # Kho mẫu quà tặng
├── gift-builder.php        # Trình thiết kế quà tặng
├── my-gifts.html           # Quản lý đơn quà khách hàng
├── payment.php             # Trang thanh toán VietQR
├── login.html / register.html / settings.php / about.php / contact.php
├── admin.html              # Trang quản trị Admin CMS (/admin)
├── Procfile / nixpacks.toml / render.yaml / requirements.txt / start.sh
```

---

## 🗄️ Cơ Sở Dữ Liệu (SQLite)

Hệ thống tự động khởi tạo database SQLite tại `data/deargift.db` (hoặc theo biến môi trường `DB_PATH`) qua `app/db.py` & `app/schema.sql`:
- `users`: tài khoản khách hàng & quản trị viên (mật khẩu mã hóa PBKDF2-SHA256).
- `gifts`: đơn quà tặng, nội dung thư, ảnh, nhạc, trạng thái thanh toán, liên kết chủ sở hữu.
- `payment_transactions`: lịch sử xác nhận thanh toán (VietQR / Casso / webhook / admin).
- `settings`, `ideas`, `reviews`, `admin_sessions`.

> **Lưu ý khi deploy trên Railway / Render:** Nên gắn **Persistent Volume** vào `/app/data` (hoặc đặt biến môi trường `DB_PATH=/data/deargift.db`) để dữ liệu khách hàng và file `uploads/` không bị reset khi deploy lại.

---

## 🚀 Chạy Local

```bash
python server.py
```

Truy cập:
- Trang chủ: `http://localhost:8000/`
- Kho mẫu: `http://localhost:8000/templates.php`
- Trình tạo quà: `http://localhost:8000/gift-builder.php?id=69`
- Admin CMS: `http://localhost:8000/admin`
