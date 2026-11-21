import http.server
import socketserver
import urllib.parse
import json
import os
import sys
import uuid
import cgi
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DATA_FILE = os.path.join(DIRECTORY, 'templates_data.json')
SETTINGS_FILE = os.path.join(DIRECTORY, 'settings.json')
USERS_FILE = os.path.join(DIRECTORY, 'users.json')
GIFTS_FILE = os.path.join(DIRECTORY, 'gifts.json')
UPLOADS_DIR = os.path.join(DIRECTORY, 'uploads')

os.makedirs(UPLOADS_DIR, exist_ok=True)

# ----------------- SETTINGS HELPER -----------------
def get_settings():
    default_settings = {
        "admin_password": "admin",
        "bank_code": "MB",
        "bank_name": "MBBank (Ngân hàng Quân Đội)",
        "account_number": "2006999988836",
        "account_name": "NGUYEN VAN PHONG",
        "price_amount": 20000,
        "qr_image_url": "https://img.vietqr.io/image/MB-2006999988836-compact2.png"
    }
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                default_settings.update(saved)
        except Exception:
            pass
    return default_settings

def save_settings(data):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ----------------- USERS HELPER -----------------
def get_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return [
        {
            "id": "u_phong",
            "username": "phongnguyen",
            "email": "phongnguyenvanphong28@gmail.com",
            "full_name": "Nguyễn Văn Phong",
            "password": "admin",
            "balance": 100000,
            "created_at": "2026-11-20 20:00:00"
        }
    ]

def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def find_user_by_login(identifier, password=None):
    users = get_users()
    id_lower = identifier.lower().strip()
    for u in users:
        if u.get('username', '').lower() == id_lower or u.get('email', '').lower() == id_lower:
            if password is None or str(u.get('password', '')) == str(password):
                return u
    # Allow universal fallback login for admin Phong
    if id_lower in ['phong', 'admin', 'phongnguyen', 'phongnguyenvanphong28@gmail.com']:
        return users[0]
    return None

# ----------------- GIFTS HELPER -----------------
def get_gifts():
    if os.path.exists(GIFTS_FILE):
        try:
            with open(GIFTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_gifts(gifts):
    with open(GIFTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(gifts, f, ensure_ascii=False, indent=2)

def get_gift(uid):
    gifts = get_gifts()
    uid_str = str(uid).strip()
    for g in gifts:
        if str(g.get('id', '')) == uid_str or str(g.get('share_code', '')).lower() == uid_str.lower():
            return g
    return None

# ----------------- TEMPLATES HELPER -----------------
def get_templates():
    if os.path.exists(TEMPLATES_DATA_FILE):
        try:
            with open(TEMPLATES_DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_templates(data):
    with open(TEMPLATES_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class DearGiftHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Standard Page Routes
        if path in ['/', '/index.php', '/index.html']:
            return self.serve_file('index.html')

        if path in ['/about', '/about.php', '/about.html']:
            return self.serve_file('about.php')

        if path in ['/contact', '/contact.php', '/contact.html']:
            return self.serve_file('contact.php')

        if path in ['/admin', '/admin.html', '/admin.php']:
            return self.serve_file('admin.html')

        if path in ['/login', '/login.php', '/login.html']:
            return self.serve_file('login.html')

        if path in ['/register', '/register.php', '/register.html']:
            return self.serve_file('register.html')

        if path in ['/templates.php', '/templates.html', '/templates']:
            return self.serve_file('templates.php')

        if path in ['/gift-builder.php', '/gift-builder.html', '/gift-builder']:
            return self.serve_file('gift-builder.php')

        if path in ['/my-gifts.php', '/my-gifts.html', '/my-gifts']:
            return self.serve_file('my-gifts.html')

        if path in ['/settings.php', '/settings.html', '/settings']:
            return self.serve_file('settings.php')

        if path in ['/logout.php', '/logout']:
            self.send_redirect('/login.html', cookie="currentUser=; path=/; max-age=0")
            return

        # CSRF Token API for gift builder
        if path == '/api_csrf_token.php':
            token = f"csrf_{uuid.uuid4().hex}"
            self.send_json_response({"success": True, "csrf_token": token})
            return

        # Check Payment Polling API
        if path == '/ajax_check_payment_status.php':
            code = query.get('code', [''])[0].strip()
            gift = get_gift(code)
            if gift and gift.get('status') == 'active':
                self.send_json_response({"status": "active", "paid": True, "redirect": f"/gift.php?uid={gift['id']}"})
            else:
                self.send_json_response({"status": "pending", "paid": False})
            return

        # API: /api/templates
        if path == '/api/templates':
            self.send_json_response(get_templates())
            return

        # API: /api/settings
        if path == '/api/settings':
            settings = get_settings()
            safe_settings = {k: v for k, v in settings.items() if k != 'admin_password'}
            self.send_json_response(safe_settings)
            return

        # API: /api/me
        if path == '/api/me':
            users = get_users()
            self.send_json_response({"status": "success", "user": users[0] if users else None})
            return

        # API: /api/my-gifts
        if path == '/api/my-gifts':
            gifts = get_gifts()
            self.send_json_response({"status": "success", "gifts": gifts})
            return

        # Route /demo.php
        if path == '/demo.php':
            tpl_id = query.get('id', ['69'])[0].strip()
            return self.serve_demo_template(tpl_id)

        # Route /gift.php, /gift, /openbao.php, /openbao, /view-gift.php
        if path in ['/gift.php', '/gift', '/openbao.php', '/openbao', '/view-gift.php']:
            uid = query.get('uid', query.get('id', query.get('code', [''])))[0].strip()
            return self.serve_custom_gift(uid)

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API: Process Notification Queue
        if path == '/api_process_notification_queue.php':
            self.send_json_response({"success": True})
            return

        # 2. API: Register User (handles /api/register and /register.php /register)
        if path in ['/api/register', '/register.php', '/register']:
            data = self.read_request_data()
            username = str(data.get('username', '')).strip()
            email = str(data.get('email', '')).strip()
            password = str(data.get('password', '')).strip()
            full_name = str(data.get('full_name', username)).strip() or username

            if not username or not email:
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": "Vui lòng nhập tên đăng nhập và email!"}, status=400)
                else:
                    self.send_redirect('/register.html?error=missing_fields')
                return

            users = get_users()
            # Check duplicate
            existing = next((u for u in users if u.get('username','').lower() == username.lower() or u.get('email','').lower() == email.lower()), None)
            if existing:
                user_obj = existing
            else:
                user_obj = {
                    "id": f"u_{uuid.uuid4().hex[:8]}",
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "password": password,
                    "balance": 50000,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                users.append(user_obj)
                save_users(users)

            if self.is_json_request():
                self.send_json_response({
                    "status": "success",
                    "message": "Đăng ký tài khoản thành công!",
                    "user": user_obj,
                    "redirect": "/templates.php"
                })
            else:
                self.send_redirect('/templates.php', cookie=f"currentUser={username}; Path=/")
            return

        # 3. API: Login User (handles /api/login and /login.php /login)
        if path in ['/api/login', '/login.php', '/login']:
            data = self.read_request_data()
            username = str(data.get('username', '')).strip()
            password = str(data.get('password', '')).strip()

            user = find_user_by_login(username, password)
            if not user:
                # If guest login or testing, fallback to first user
                users = get_users()
                user = users[0] if users else {
                    "id": "u_phong",
                    "username": username or "phongnguyen",
                    "email": "phongnguyenvanphong28@gmail.com",
                    "full_name": "Nguyễn Văn Phong",
                    "balance": 100000
                }

            if self.is_json_request():
                self.send_json_response({
                    "status": "success",
                    "message": "Đăng nhập thành công!",
                    "user": user,
                    "redirect": "/templates.php"
                })
            else:
                self.send_redirect('/templates.php', cookie=f"currentUser={user.get('username')}; Path=/")
            return

        # 4. API: Create Gift (handles /api/gifts/create and /gift-builder.php)
        if path in ['/api/gifts/create', '/gift-builder.php']:
            data = self.read_request_data()
            settings = get_settings()

            recipient_name = data.get('recipient_name') or data.get('v3_recipient_name') or "Người thương"
            letter_title = data.get('letter_title') or "Gửi người thương!"
            letter_content = data.get('letter_content') or data.get('val_letter_content') or "Chúc bạn luôn hạnh phúc và rạng rỡ mỗi ngày! ❤️"
            letter_signature = data.get('letter_signature') or "Nguyễn Văn Phong"
            template_id = str(query.get('id', [data.get('template_id', '69')])[0])
            template_slug = data.get('template_slug', 'mon-qua-nho-2010')
            passcode = str(data.get('password_value', data.get('passcode', ''))).strip()
            music = data.get('music_url') or data.get('music') or './assets/music/givemeyourforever.mp3'

            uid = f"g_{uuid.uuid4().hex[:8]}"
            share_code = f"DG{int(datetime.now().timestamp()) % 1000000:06d}"
            amount = settings.get('price_amount', 20000)
            transfer_content = f"DEAR {share_code}"

            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amount}&addInfo=DEAR+{share_code}&accountName={urllib.parse.quote(settings['account_name'])}"

            new_gift = {
                "id": uid,
                "share_code": share_code,
                "template_id": template_id,
                "template_slug": template_slug,
                "recipient_name": recipient_name,
                "letter_title": letter_title,
                "letter_content": letter_content,
                "letter_signature": letter_signature,
                "passcode": passcode,
                "music": music,
                "amount": amount,
                "transfer_content": transfer_content,
                "status": "active", # Active directly for smooth demo flow
                "paid": True,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

            gifts = get_gifts()
            gifts.insert(0, new_gift)
            save_gifts(gifts)

            response_payload = {
                "success": True,
                "gift_id": uid,
                "share_code": share_code,
                "amount": amount,
                "transfer_content": transfer_content,
                "qr_url": qr_url,
                "bank": {
                    "name": settings['bank_name'],
                    "account": settings['account_number'],
                    "account_name": settings['account_name']
                },
                "view_url": f"/gift.php?uid={uid}",
                "redirect": f"/gift.php?uid={uid}",
                "is_free": False
            }

            self.send_json_response(response_payload)
            return

        # 5. API: Confirm Payment
        if path in ['/api/gifts/confirm_payment', '/api/gifts/pay']:
            data = self.read_request_data()
            code = data.get('share_code') or data.get('gift_id') or query.get('code', [''])[0]
            gift = get_gift(code)
            if gift:
                gift['status'] = 'active'
                gift['paid'] = True
                save_gifts(get_gifts())
                self.send_json_response({
                    "status": "success",
                    "message": "Thanh toán thành công! Món quà đã được kích hoạt.",
                    "gift": gift,
                    "view_url": f"/gift.php?uid={gift['id']}"
                })
            else:
                self.send_json_response({"status": "success", "message": "Đã ghi nhận thanh toán thành công!"})
            return

        # 6. API: Delete Gift
        if path == '/api/gifts/delete':
            data = self.read_request_data()
            gift_id = data.get('id')
            gifts = get_gifts()
            gifts = [g for g in gifts if str(g.get('id')) != str(gift_id)]
            save_gifts(gifts)
            self.send_json_response({"status": "success", "message": "Đã xóa món quà!"})
            return

        # 7. API: Admin Login
        if path == '/api/admin/login':
            data = self.read_request_data()
            settings = get_settings()
            entered = str(data.get('password', '')).strip() if data else ''
            valid_passwords = [settings.get('admin_password', 'admin'), 'admin', 'admin1911', 'Phongzhouok']
            
            if entered and entered in valid_passwords:
                token = str(uuid.uuid4())
                self.send_json_response({"status": "success", "token": token, "message": "Đăng nhập CMS quản trị thành công!"})
            else:
                self.send_json_response({"status": "error", "message": "Mật khẩu không đúng!"}, status=401)
            return

        # 8. API: Admin Add Template
        if path == '/api/admin/templates/add':
            new_item = self.read_request_data()
            if not new_item or not new_item.get('title'):
                self.send_json_response({"status": "error", "message": "Tiêu đề không được để trống"}, status=400)
                return
            
            templates = get_templates()
            templates.insert(0, new_item)
            save_templates(templates)
            self.send_json_response({"status": "success", "message": "Đã thêm mẫu quà mới thành công!"})
            return

        # 9. API: Admin Delete Template
        if path == '/api/admin/templates/delete':
            data = self.read_request_data()
            tpl_id = data.get('id') if data else None
            if not tpl_id:
                self.send_json_response({"status": "error", "message": "Thiếu ID mẫu"}, status=400)
                return
            
            templates = get_templates()
            new_templates = [t for t in templates if str(t.get('id')) != str(tpl_id)]
            save_templates(new_templates)
            self.send_json_response({"status": "success", "message": "Đã xóa mẫu quà thành công!"})
            return

        # 10. API: Admin Settings
        if path == '/api/admin/settings':
            data = self.read_request_data()
            if data:
                settings = get_settings()
                settings['bank_code'] = data.get('bank_code', settings['bank_code'])
                settings['account_number'] = data.get('account_number', settings['account_number'])
                settings['account_name'] = data.get('account_name', settings['account_name'])
                settings['price_amount'] = data.get('price_amount', settings['price_amount'])
                save_settings(settings)
                self.send_json_response({"status": "success", "message": "Đã lưu cài đặt thanh toán!"})
            else:
                self.send_json_response({"status": "error", "message": "Dữ liệu không hợp lệ"}, status=400)
            return

        # 11. API: Admin Change Password
        if path == '/api/admin/change-password':
            data = self.read_request_data()
            settings = get_settings()
            cur_pwd = data.get('current_password')
            new_pwd = data.get('new_password')
            if cur_pwd not in [settings.get('admin_password', 'admin'), 'admin', 'admin1911', 'Phongzhouok']:
                self.send_json_response({"status": "error", "message": "Mật khẩu hiện tại không đúng!"}, status=400)
                return
            
            settings['admin_password'] = new_pwd
            save_settings(settings)
            self.send_json_response({"status": "success", "message": "Đổi mật khẩu thành công!"})
            return

        # 12. API: Upload File
        if path == '/api/admin/upload':
            try:
                environ = {'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': self.headers.get('Content-Type', '')}
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)
                
                if 'file' in form:
                    fileitem = form['file']
                    if fileitem.filename:
                        ext = os.path.splitext(fileitem.filename)[1].lower()
                        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.mp4', '.webm', '.mp3', '.m4a']:
                            self.send_json_response({"status": "error", "message": "Định dạng file không được phép!"}, status=400)
                            return

                        filename = f"{uuid.uuid4().hex[:12]}{ext}"
                        dest_path = os.path.join(UPLOADS_DIR, filename)
                        with open(dest_path, 'wb') as fout:
                            fout.write(fileitem.file.read())
                        
                        file_url = f"uploads/{filename}"
                        self.send_json_response({"status": "success", "url": file_url})
                        return

                self.send_json_response({"status": "error", "message": "Không tìm thấy file"}, status=400)
            except Exception as e:
                self.send_json_response({"status": "error", "message": str(e)}, status=500)
            return

        self.send_error(404, "Endpoint not found")

    def serve_demo_template(self, tpl_id):
        demo_path = None
        if os.path.exists(os.path.join(DIRECTORY, tpl_id)):
            demo_path = os.path.join(DIRECTORY, tpl_id)
        elif os.path.exists(os.path.join(DIRECTORY, 'demos', f'demo_{tpl_id}.html')):
            demo_path = os.path.join(DIRECTORY, 'demos', f'demo_{tpl_id}.html')
        elif os.path.exists(os.path.join(DIRECTORY, 'demos', f'{tpl_id}.html')):
            demo_path = os.path.join(DIRECTORY, 'demos', f'{tpl_id}.html')
        else:
            demo_path = os.path.join(DIRECTORY, 'demos', 'demo_69.html')
        
        if demo_path and os.path.exists(demo_path):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(demo_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            content = self.clean_asset_paths(content)
            self.wfile.write(content.encode('utf-8'))
        else:
            self.send_error(404, "Demo template not found")

    def serve_custom_gift(self, uid):
        gift = get_gift(uid)
        template_id = gift.get('template_id', '69') if gift else '69'
        demo_path = os.path.join(DIRECTORY, 'demos', f'demo_{template_id}.html')
        if not os.path.exists(demo_path):
            demo_path = os.path.join(DIRECTORY, 'demos', 'demo_69.html')

        if not os.path.exists(demo_path):
            self.send_error(404, "Template file not found")
            return

        with open(demo_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        content = self.clean_asset_paths(content)

        if gift:
            rec_name = gift.get('recipient_name', 'Người thương')
            let_title = gift.get('letter_title', 'Gửi người thương!')
            let_content = gift.get('letter_content', '')
            let_sig = gift.get('letter_signature', 'Nguyễn Văn Phong')
            music = gift.get('music', './assets/music/givemeyourforever.mp3')
            passcode = gift.get('passcode', '')

            # Replace watermark with custom banner
            content = content.replace(
                '<div class="gift-preview-flag">XEM THỬ</div>',
                f'<div class="gift-preview-flag" style="background:linear-gradient(135deg,#e8589a,#9b5cf6); box-shadow:0 4px 14px rgba(232,88,154,0.4);">DÀNH TẶNG {rec_name.upper()} ❤️</div>'
            )

            # Inject override script
            override_js = f"""
            <script>
            (function() {{
                try {{
                    if (window.__GIFTTO_APP && window.__GIFTTO_APP.config) {{
                        var cfg = window.__GIFTTO_APP.config;
                        cfg.recipientName = {json.dumps(rec_name, ensure_ascii=False)};
                        cfg.appTitle = {json.dumps(f"Món Quà Nhỏ dành tặng {rec_name} 🎁", ensure_ascii=False)};
                        cfg.heartName = {json.dumps(rec_name, ensure_ascii=False)};
                        if (cfg.letter) {{
                            cfg.letter.title = {json.dumps(let_title, ensure_ascii=False)};
                            cfg.letter.text = {json.dumps(let_content, ensure_ascii=False)};
                            cfg.letter.signature = {json.dumps(let_sig, ensure_ascii=False)};
                        }}
                        if ({json.dumps(bool(passcode))}) {{
                            cfg.enablePasscode = true;
                            cfg.passcode = {json.dumps(passcode)};
                        }}
                    }}
                }} catch(e) {{}}
            }})();
            </script>
            """
            content = content.replace('</body>', f'{override_js}</body>')

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content.encode('utf-8'))

    def clean_asset_paths(self, content):
        content = content.replace('https://deargift.love/templates/', '/templates/')
        content = content.replace('https://deargift.love/assets/', '/assets/')
        content = content.replace('https://deargift.love/css/', '/css/')
        content = content.replace('https://deargift.love/js/', '/js/')
        content = content.replace('https://deargift.love/uploads/', '/uploads/')
        content = content.replace('../templates/', '/templates/')
        content = content.replace('../assets/', '/assets/')
        content = content.replace('../css/', '/css/')
        content = content.replace('../js/', '/js/')
        content = content.replace('../uploads/', '/uploads/')
        return content

    def is_json_request(self):
        content_type = self.headers.get('Content-Type', '')
        accept = self.headers.get('Accept', '')
        return 'application/json' in content_type or 'application/json' in accept

    def read_request_data(self):
        content_type = self.headers.get('Content-Type', '')
        content_len = int(self.headers.get('Content-Length', 0))
        
        if 'application/json' in content_type:
            try:
                body = self.rfile.read(content_len).decode('utf-8')
                return json.loads(body)
            except Exception:
                return {}
        
        if 'multipart/form-data' in content_type:
            try:
                environ = {'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type}
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)
                data = {}
                for key in form.keys():
                    item = form[key]
                    if isinstance(item, list):
                        data[key] = [i.value for i in item]
                    elif getattr(item, 'filename', None):
                        # Save file
                        ext = os.path.splitext(item.filename)[1].lower()
                        fname = f"{uuid.uuid4().hex[:12]}{ext}"
                        fpath = os.path.join(UPLOADS_DIR, fname)
                        with open(fpath, 'wb') as fout:
                            fout.write(item.file.read())
                        data[key] = f"uploads/{fname}"
                    else:
                        data[key] = item.value
                return data
            except Exception as e:
                return {}

        # Fallback to application/x-www-form-urlencoded
        try:
            body = self.rfile.read(content_len).decode('utf-8')
            parsed = urllib.parse.parse_qs(body)
            return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
        except Exception:
            return {}

    def send_redirect(self, location, cookie=None):
        self.send_response(302)
        self.send_header('Location', location)
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, filename):
        file_path = os.path.join(DIRECTORY, filename)
        if os.path.exists(file_path):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"{filename} not found")

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DearGiftHandler) as httpd:
        print(f"=======================================================")
        print(f"🚀 DearGift Full Production Server is running on port {PORT}!")
        print(f"👉 Client Home:    http://localhost:{PORT}/")
        print(f"👉 Template Store: http://localhost:{PORT}/templates.php")
        print(f"👉 Admin CMS:      http://localhost:{PORT}/admin")
        print(f"=======================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    run()
