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
├── server.py               # HTTP Server Python (routing, API, auth, VietQR, Gzip, range streaming)
├── railway.toml            # Cấu hình Railway (App Sleeping / Serverless, healthcheck /health)
├── robots.txt              # Chặn crawler tải media/API gây tốn băng thông Railway
├── templates_data.json     # Danh sách 56 mẫu quà tặng
├── index.html              # Trang chủ
├── templates.php           # Kho mẫu quà tặng
├── gift-builder.php        # Trình thiết kế quà tặng
├── my-gifts.html           # Tổng quan & thư viện quà đã tạo (/my-gifts.php, ?view=all)
├── orders.html             # Quản lý đơn hàng & thanh toán VietQR (/orders.php)
├── transactions.html       # Lịch sử giao dịch đã xác nhận (/transactions.php)
├── support.html            # Trung tâm hỗ trợ & gửi yêu cầu (/support.php)
├── payment.php             # Trang thanh toán VietQR
├── login.html / register.html / settings.php / about.php / contact.php
├── admin.html              # Trang quản trị Admin CMS (/admin)
├── Procfile / nixpacks.toml / render.yaml / requirements.txt / start.sh
```

---

## 🗄️ Cơ Sở Dữ Liệu (SQLite / PostgreSQL)

Hệ thống tự động khởi tạo database qua `app/db.py` (`app/schema.sql` cho SQLite hoặc `app/schema_pg.sql` khi có biến môi trường `DATABASE_URL`):
- `users`: tài khoản khách hàng & quản trị viên (mật khẩu mã hóa PBKDF2-SHA256).
- `gifts`: đơn quà tặng, nội dung thư, ảnh, nhạc, trạng thái thanh toán, liên kết chủ sở hữu.
- `payment_transactions`: lịch sử xác nhận thanh toán (VietQR / Casso / webhook / admin).
- `settings`, `ideas`, `reviews`, `admin_sessions`.

> **Lưu ý khi deploy trên Railway ($5 Credit / Hobby):**
> - Dùng SQLite + gắn 1 Persistent Volume nhỏ (`DB_PATH=/app/data/deargift.db`) thường tiết kiệm hơn nhiều so với bật dịch vụ PostgreSQL riêng chạy 24/7.
> - Nếu dùng PostgreSQL (`DATABASE_URL`), hãy tắt chế độ giữ kết nối thừa để không cản container vào trạng thái ngủ (server mở/đóng kết nối theo từng truy vấn).

---

## ☁️ Tối Ưu Hóa Chi Phí & Tài Nguyên Trên Railway

Cấu hình trong `railway.toml` và `server.py` được tối ưu để giữ mức tiêu thụ nằm gọn trong gói $5 credit:
- **App Sleeping (Serverless)**: `sleepApplication = true` kết hợp không chạy timer nền giữ outbound socket, giúp container tự ngủ khi không có truy cập trong 5–10 phút ($0 RAM/CPU lúc rảnh).
- **Giảm mạnh Egress ($0.05/GB)**: nén Gzip động & tĩnh kèm cache RAM giới hạn 16 MB cho mọi HTML/JSON/CSS/JS/SVG/API (`/`, `/templates.php`, `/demo.php`, `/gift.php`, `/api/templates`...), hỗ trợ `ETag` + `304 Not Modified`, cache trình duyệt 30 ngày `immutable` cho ảnh/font/nhạc/video (`.mp3`, `.m4a`, `.mp4`, `.webp`, `.woff2`), `no-store` cho dữ liệu cá nhân/thanh toán, và `robots.txt` chặn bot cào thư mục media lớn.
- **Giảm RAM & CPU**: stream media HTTP `206 Partial Content` theo chunk 64 KB thay vì nạp cả file MP3/MP4 vào RAM; xử lý đa luồng `daemon_threads = True`; tắt log thừa trên `/health`; thoát êm khi nhận `SIGTERM`.

> Khi kích hoạt thay đổi trên Railway Dashboard -> Service **Settings** -> **Serverless (App Sleeping)**, Railway yêu cầu redeploy (push lên GitHub nhánh `main` sẽ tự động build & deploy miễn phí).

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
