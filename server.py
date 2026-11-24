#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DearGift Full-Stack Local Server
Simulates PHP endpoints, VietQR Payment Flow, Templates API, Customer Auth, Google Auth & Admin CMS.
Author / Owner: Nguyễn Văn Phong
"""

import http.server
import socketserver
import urllib.parse
import json
import os
import uuid
try:
    import cgi
except ImportError:
    try:
        import legacy_cgi as cgi
    except ImportError:
        cgi = None
import re
import base64
from datetime import datetime

PORT = int(os.environ.get('PORT', 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
CASSO_API_KEY = os.environ.get('CASSO_API_KEY', 'AK_CS.731c4690e73211f1a336b350062e06ec.fnn7zlR3fmIm8rCUy8Kr1I0rIJSQuZL80mEA0aL5UQ7mvncDXRoKYwLWRsybWRI9K4jlo3Or').strip()
_last_casso_sync = 0

def sync_casso_transactions():
    global _last_casso_sync
    api_key = os.environ.get('CASSO_API_KEY', '').strip() or CASSO_API_KEY
    if not api_key:
        return False
    now = time.time()
    if now - _last_casso_sync < 3:
        return False
    _last_casso_sync = now
    try:
        req = urllib.request.Request(
            'https://oauth.casso.vn/v2/transactions?page=1&pageSize=20&sort=DESC',
            headers={'Authorization': f'Apikey {api_key}', 'User-Agent': 'DearGift/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        records = (data.get('data') or {}).get('records') or []
        gifts = get_gifts()
        matched = False
        for rec in records:
            desc = str(rec.get('description', '')).upper()
            for g in gifts:
                if g.get('status') != 'active':
                    code = str(g.get('share_code', '')).upper()
                    if code and (code in desc or f"DEAR {code}" in desc or f"DEAR{code}" in desc):
                        g['status'] = 'active'
                        g['paid'] = True
                        matched = True
        if matched:
            save_gifts(gifts)
        return matched
    except Exception:
        return False

BUILDER_CONFIGS = {}
try:
    cfg_file = os.path.join(DIRECTORY, 'js', 'all_builder_configs.json')
    if os.path.exists(cfg_file):
        with open(cfg_file, 'r', encoding='utf-8') as f:
            BUILDER_CONFIGS = json.load(f)
except Exception as e:
    pass
TEMPLATES_DATA_FILE = os.path.join(DIRECTORY, 'templates_data.json')
SETTINGS_FILE = os.path.join(DIRECTORY, 'settings.json')
GIFTS_FILE = os.path.join(DIRECTORY, 'gifts.json')
USERS_FILE = os.path.join(DIRECTORY, 'users.json')
IDEAS_FILE = os.path.join(DIRECTORY, 'ideas.json')
REVIEWS_FILE = os.path.join(DIRECTORY, 'reviews.json')
UPLOADS_DIR = os.path.join(DIRECTORY, 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

ADMIN_SESSIONS = set()
ADMIN_FAILED_LOGINS = {}  # ip -> {'count': int, 'lockout_until': float}

PROTECTED_SYSTEM_EXTENSIONS = ('.py', '.pyc', '.sh', '.yaml', '.yml', '.env', '.json', '.bak', '.log')
PROTECTED_SYSTEM_FILES = {
    'server.py', 'cloudflared.exe', 'settings.json', 'users.json',
    'gifts.json', 'ideas.json', 'reviews.json', 'templates_data.json',
    'start.sh', 'render.yaml', 'requirements.txt', '.gitignore', '.python-version'
}

def is_protected_system_file(path_str):
    clean = path_str.strip('/').split('?')[0].lower()
    fname = os.path.basename(clean)
    if fname in PROTECTED_SYSTEM_FILES:
        return True
    if fname.startswith('.'):
        return True
    if clean.startswith('.git'):
        return True
    if fname.endswith(PROTECTED_SYSTEM_EXTENSIONS):
        return True
    return False

def is_local_request(handler):
    forwarded = handler.headers.get('CF-Connecting-IP') or handler.headers.get('X-Forwarded-For') or handler.headers.get('X-Real-IP')
    if forwarded:
        return False
    client_ip = handler.client_address[0] if handler.client_address else ''
    host = handler.headers.get('Host', '')
    if (client_ip in ['127.0.0.1', '::1', 'localhost']) and ('localhost' in host or '127.0.0.1' in host):
        return True
    return False

def can_access_admin_portal(handler, query):
    # 1. Direct local connection
    if is_local_request(handler):
        return True
    
    settings = get_settings()
    secret_pass = str(settings.get('admin_password', 'Phongzhouok')).strip()
    
    # 2. Check query secret key: ?key=... or ?secret=... or ?admin_key=...
    q_key = query.get('key', [''])[0] or query.get('secret', [''])[0] or query.get('admin_key', [''])[0]
    if q_key and q_key == secret_pass:
        return True
        
    # 3. Check Cookie: admin_portal_access
    cookie_header = handler.headers.get('Cookie', '')
    if 'admin_portal_access=' in cookie_header:
        for piece in cookie_header.split(';'):
            piece = piece.strip()
            if piece.startswith('admin_portal_access='):
                val = piece.split('=', 1)[1]
                if val == secret_pass:
                    return True
    return False

def verify_admin_request(handler):
    auth = handler.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token and token in ADMIN_SESSIONS:
            return True
    return False

SLUG_TO_ID = {
    'mon-qua-nho-2010': '69',
    'hpbd-vip': '21',
    'lovegift': '12',
    'giang-sinh': '22',
    'christmas-gift': '47',
    'christmas': '9',
    'hpbd-book': '28',
    'lucky-chance': '23',
    'valentine-real': '29',
    'valentine': '29',
    'galaxy-viewer': '30',
    'corazon-galactico': '32',
    'hpbd-letter': '25',
    'hpbd-surprise': '26',
    'xe-bus': '27',
    'golden-bloom': '31',
    'trung-thu-nguyet-da': '33',
    'anniversary': '40',
    'bakery-mixtape': '41',
    'banh-kem-sinh-nhat': '42',
    'bloom-memory-box': '43',
    'blooming-flowers': '44',
    'bo-hoa-tulip': '45',
    'chiikawa-delivery': '46',
    'christmas-magazine': '48',
    'confession': '49',
    'denim-blue-birthday': '50',
    'galaxy-love': '51',
    'gf-day': '52',
    'happy-birthday-vip2': '53',
    'hoa-hong-valentine': '54',
    'khoa-tim-ky-niem': '55',
    'phao-hoa-tinh-yeu': '56',
    'pixel-gift': '57',
    'qua-cau-ky-niem': '58',
    'sinh-nhat-bat-den': '59',
    'spidey-birthday': '60',
    'tinh-cau-tinh-yeu': '61',
    'trai-tim-3d': '62',
    'trai-tim-nhip-dap': '63',
    'trung-thu-den-ong-sao': '64',
    'valentine-deargift': '65',
    'violet-memory-hub': '66',
    'vuon-hoa-ma-pin': '67',
    'troll-ny': '8',
    'nha-giao-2011': '34',
    'valentine-sweet': '35',
    'bo-hoa-8-3': '36',
    'phao-hoa-nam-moi': '37',
    'mua-tinh-yeu-3d': '38',
    'ky-niem-bo-me': '39',
    'photo-bouquet': '68'
}

# ----------------- JWT & GOOGLE HELPER -----------------
def decode_jwt_payload(token):
    try:
        parts = token.split('.')
        if len(parts) >= 2:
            payload = parts[1]
            padded = payload + '=' * (-len(payload) % 4)
            data = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            return data
    except Exception:
        pass
    return None

def process_google_auth(data, users):
    credential = str(data.get('credential', '')).strip()
    access_token = str(data.get('access_token', '')).strip()
    
    email = None
    full_name = None
    google_id = None
    avatar = ""

    # 1. Nếu có token từ Google One-Tap / Sign-In thì giải mã
    if credential:
        jwt_data = decode_jwt_payload(credential)
        if jwt_data and jwt_data.get('email'):
            email = str(jwt_data.get('email', '')).strip().lower()
            full_name = str(jwt_data.get('name', '')).strip() or email.split('@')[0]
            google_id = str(jwt_data.get('sub', ''))
            avatar = str(jwt_data.get('picture', ''))

    # 2. Hoặc nếu truyền email / name trực tiếp (Đăng nhập nhanh tiện lợi)
    if not email:
        raw_email = str(data.get('email', '')).strip().lower()
        if raw_email and '@' in raw_email:
            email = raw_email
            full_name = str(data.get('name') or data.get('full_name') or email.split('@')[0]).strip()
            google_id = uuid.uuid4().hex[:12]
            avatar = str(data.get('avatar', ''))

    if not email or '@' not in email:
        return None, "Vui lòng nhập địa chỉ email hợp lệ!"

    username = email.split('@')[0]
    # Check if user already exists
    user = next((u for u in users if u.get('email', '').lower() == email or u.get('username', '').lower() == username.lower()), None)
    if not user:
        user = {
            "id": f"u_gg_{google_id[:8]}",
            "username": username,
            "email": email,
            "full_name": full_name or username,
            "avatar": avatar,
            "provider": "google",
            "balance": 50000,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        users.append(user)
    else:
        if full_name:
            user['full_name'] = full_name
        user['provider'] = 'google'
        if avatar:
            user['avatar'] = avatar

    return user, None


# ----------------- SETTINGS HELPER -----------------
def get_settings():
    default_settings = {
        "bank_code": "MB",
        "bank_name": "MBBank",
        "account_number": "2006999988836",
        "account_name": "NGUYEN VAN PHONG",
        "price_amount": 20000,
        "site_name": "DearGift.love",
        "author_name": "Nguyễn Văn Phong",
        "facebook_url": "https://www.facebook.com/Phongzhouok99",
        "admin_password": "admin"
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
    # Allow master admin login
    if id_lower in ['admin', 'phongnguyen', 'phong']:
        if password is None or str(password) in ['admin', 'admin1911', 'Phongzhouok']:
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

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def get_request_user(self):
        cookie_header = self.headers.get('Cookie', '')
        username_or_email = None
        if 'currentUser=' in cookie_header:
            for piece in cookie_header.split(';'):
                piece = piece.strip()
                if piece.startswith('currentUser='):
                    username_or_email = urllib.parse.unquote(piece[len('currentUser='):]).strip()
                    break
        
        if not username_or_email:
            username_or_email = self.headers.get('X-User', '').strip()

        if not username_or_email:
            return None

        users = get_users()
        u_lower = username_or_email.lower()
        for u in users:
            if u.get('username', '').lower() == u_lower or u.get('email', '').lower() == u_lower:
                return u
        return {"username": username_or_email, "full_name": username_or_email, "role": "customer"}

    get_current_user = get_request_user

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-User')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/gift-settings') or self.path.startswith('/api/settings'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            import json
            resp_data = {
                "success": True,
                "data": {
                    "settings": {
                        "senderName": "DearGift",
                        "receiverName": "Người thương",
                        "letterMessage": "Chạm để khám phá hiệu ứng của mẫu quà này.",
                        "frameId": "star",
                        "paletteId": "pink"
                    }
                }
            }
            self.wfile.write(json.dumps(resp_data).encode('utf-8'))
            return
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Block access to internal/sensitive system files
        if is_protected_system_file(path):
            self.send_error(404, "File not found")
            return

        # Media file handling (Video and Audio with full HTTP 206 Range support)
        if path.lower().endswith(('.mp4', '.webm', '.mp3', '.m4a', '.wav', '.ogg')):
            fname = os.path.basename(path)
            ctype = 'video/mp4' if fname.endswith('.mp4') else ('video/webm' if fname.endswith('.webm') else ('audio/mpeg' if fname.endswith('.mp3') else 'audio/wav'))
            
            # Direct path check
            direct = os.path.join(DIRECTORY, path.lstrip('/'))
            if os.path.exists(direct) and os.path.isfile(direct):
                return self.serve_media_with_range(direct, ctype)

            cand_paths = [
                os.path.join(DIRECTORY, 'assets', 'images', fname),
                os.path.join(DIRECTORY, 'christmas-gift', 'assets', 'images', fname),
                os.path.join(DIRECTORY, 'giang-sinh', 'assets', 'images', fname),
                os.path.join(DIRECTORY, 'templates', 'christmas-gift', 'assets', 'images', fname),
                os.path.join(DIRECTORY, 'troll-ny', fname),
                os.path.join(DIRECTORY, 'demos', fname),
                os.path.join(DIRECTORY, 'assets', 'music', fname),
                os.path.join(DIRECTORY, 'assets', 'musics', fname),
                os.path.join(DIRECTORY, 'christmas-gift', 'assets', 'musics', fname),
                os.path.join(DIRECTORY, 'assets', 'audio', fname),
                os.path.join(DIRECTORY, 'demos', 'assets', fname),
                os.path.join(DIRECTORY, 'demos', 'music', fname),
                os.path.join(DIRECTORY, 'templates', 'mon-qua-nho-2010', 'app', 'assets', 'music', fname),
                os.path.join(DIRECTORY, 'templates', 'christmas-tree', fname)
            ]
            for cand in cand_paths:
                if os.path.exists(cand) and os.path.isfile(cand):
                    return self.serve_media_with_range(cand, ctype)
            
            if fname.endswith(('.mp3', '.m4a', '.wav', '.ogg')):
                fallback = os.path.join(DIRECTORY, 'assets', 'music', 'givemeyourforever.mp3')
                if os.path.exists(fallback):
                    return self.serve_media_with_range(fallback, 'audio/mpeg')

        # Standard Page Routes
        if path in ['/', '/index.php', '/index.html']:
            return self.serve_file('index.html')

        if path in ['/about', '/about.php', '/about.html']:
            return self.serve_file('about.php')

        if path in ['/contact', '/contact.php', '/contact.html']:
            return self.serve_file('contact.php')

        if path in ['/admin', '/admin.html', '/admin.php']:
            if can_access_admin_portal(self, query):
                settings = get_settings()
                secret_pass = str(settings.get('admin_password', 'Phongzhouok')).strip()
                cookie_val = f"admin_portal_access={secret_pass}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800"
                return self.serve_file('admin.html', cookie=cookie_val)
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(b"<!DOCTYPE html><html lang='vi'><head><meta charset='utf-8'><title>404 Not Found</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;'><h1>404 Not Found</h1><p>Kh\xc3\xb4ng t\xc3\xacm th\xe1\xba\xa5y trang y\xc3\xaau c\xe1\xba\xa7u.</p><p><a href='/' style='color:#e8589a;'>V\xe1\xbb\x81 trang ch\xe1\xbb\xa7</a></p></body></html>")
                return

        if path in ['/login', '/login.php', '/login.html']:
            return self.serve_file('login.html')

        if path in ['/register', '/register.php', '/register.html']:
            return self.serve_file('register.html')

        if path in ['/templates.php', '/templates.html', '/templates']:
            return self.serve_file('templates.php')

        if path in ['/gift-builder.php', '/gift-builder.html', '/gift-builder']:
            return self.serve_gift_builder(query)

        # Catch any /<slug>/builder.php or /<slug>/builder.html and route to gift-builder
        if path.endswith('/builder.php') or path.endswith('/builder.html'):
            slug_match = re.match(r'^/([^/]+)/builder(?:\.php|\.html)?$', path)
            if slug_match:
                slug = slug_match.group(1)
                tpl_id = SLUG_TO_ID.get(slug, slug)
                query['id'] = [tpl_id]
                return self.serve_gift_builder(query)

        # Catch SEO landing routes and footer policy links
        seo_redirects = {
            '/qua-tang-19-11.php': '/gift-builder.php?id=69',
            '/qua-tang-19-11': '/gift-builder.php?id=69',
            '/thiet-lap-qr-tinh-yeu.php': '/gift-builder.php?id=69',
            '/thiet-lap-qr-tinh-yeu': '/gift-builder.php?id=69',
            '/tao-link-to-tinh.php': '/gift-builder.php?id=12',
            '/tao-link-to-tinh': '/gift-builder.php?id=12',
            '/thiep-sinh-nhat-3d.php': '/gift-builder.php?id=21',
            '/thiep-sinh-nhat-3d': '/gift-builder.php?id=21',
            '/privacy.php': '/about.php',
            '/privacy': '/about.php',
            '/refund.php': '/about.php',
            '/refund': '/about.php',
            '/terms.php': '/about.php',
            '/terms': '/about.php',
            '/guide.php': '/templates.php',
            '/guide': '/templates.php',
        }
        if path in seo_redirects:
            self.send_redirect(seo_redirects[path])
            return

        # Route Live Preview (GET)
        if path in ['/templates/_v3/live.php', '/templates/_v3/live.html']:
            return self.serve_live_preview(query)

        if path in ['/my-gifts.php', '/my-gifts.html', '/my-gifts']:
            return self.serve_file('my-gifts.html')

        if path in ['/payment.php', '/payment.html', '/payment']:
            return self.serve_file('payment.php')

        if path in ['/settings.php', '/settings.html', '/settings']:
            return self.serve_file('settings.php')

        if path in ['/logout.php', '/logout']:
            self.send_redirect('/login.html', cookie="currentUser=; path=/; max-age=0")
            return

        # CSRF Token API
        if path == '/api_csrf_token.php':
            token = f"csrf_{uuid.uuid4().hex}"
            self.send_json_response({"success": True, "csrf_token": token, "token": token})
            return

        # Check Payment Polling API
        if path == '/ajax_check_payment_status.php':
            code = query.get('code', [''])[0].strip()
            gift = get_gift(code)
            if gift and not gift.get('paid', False):
                sync_casso_transactions()
                gift = get_gift(code)
            if gift and gift.get('status') == 'active':
                self.send_json_response({"status": "active", "paid": True, "redirect": f"/gift.php?uid={gift['id']}"})
            else:
                self.send_json_response({"status": "pending", "paid": False})
            return

        # Bank Webhook via GET (e.g. for testing or simple GET webhook triggers)
        if path in ['/api/webhook/bank', '/webhook_bank.php']:
            content = str(query.get('content', [''])[0] or query.get('code', [''])[0] or '').upper()
            gifts = get_gifts()
            matched = False
            matched_codes = []
            for g in gifts:
                share_code = str(g.get('share_code', '')).upper()
                if share_code and (share_code in content or f"DEAR {share_code}" in content or f"DEAR{share_code}" in content or query.get('code', [''])[0].strip().upper() == share_code):
                    g['status'] = 'active'
                    g['paid'] = True
                    matched = True
                    matched_codes.append(share_code)
            if matched:
                save_gifts(gifts)
                self.send_json_response({"error": 0, "success": True, "message": f"Đã tự động kích hoạt quà! Mã: {', '.join(matched_codes)}", "matched": matched_codes})
            else:
                self.send_json_response({"error": 0, "success": True, "message": "Không tìm thấy mã quà khớp", "query": query})
            return

        # API: /api/templates
        if path == '/api/templates':
            self.send_json_response(get_templates())
            return

        # API: /api/settings
                # API: /api/stats (Real-time live system stats)
        if path == '/api/stats':
            users = get_users()
            gifts = get_gifts()
            paid_count = len([g for g in gifts if g.get('paid') or g.get('status') == 'active'])
            self.send_json_response({
                "success": True,
                "data": {
                    "users_count": len(users),
                    "gifts_created": len(gifts),
                    "gifts_paid": paid_count,
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            })
            return

        if path == '/api/settings':
            settings = get_settings()
            safe_settings = {k: v for k, v in settings.items() if k != 'admin_password'}
            self.send_json_response(safe_settings)
            return

        # API: /api/me (Customer Profile)
        if path == '/api/me':
            user = self.get_request_user()
            if user:
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                self.send_json_response({"status": "success", "logged_in": True, "user": safe_user})
            else:
                self.send_json_response({"status": "guest", "logged_in": False, "user": None})
            return

        # API: /api/my-gifts & /api/gifts (Strictly isolated by logged-in user / Google account)
        if path in ['/api/my-gifts', '/api/gifts']:
            user = self.get_current_user()
            if not user:
                # Nếu chưa đăng nhập, trả về mảng rỗng để không xem trộm quà của người khác
                self.send_json_response({
                    "status": "guest",
                    "require_login": True,
                    "gifts": []
                })
                return

            u_id = str(user.get('id', '')).strip().lower()
            u_name = str(user.get('username', '')).strip().lower()
            u_email = str(user.get('email', '')).strip().lower()

            all_gifts = get_gifts()
            user_gifts = []
            for g in all_gifts:
                g_user = str(g.get('username', '')).strip().lower()
                g_email = str(g.get('user_email', '')).strip().lower()
                g_uid = str(g.get('user_id', '')).strip().lower()

                # So khớp chính xác theo ID, email hoặc username của tài khoản đang đăng nhập
                is_owner = False
                if u_id and g_uid and u_id == g_uid:
                    is_owner = True
                elif u_email and g_email and u_email == g_email:
                    is_owner = True
                elif u_name and g_user and u_name == g_user:
                    is_owner = True
                elif u_email and g_user and u_email == g_user:
                    is_owner = True
                elif u_name and g_email and u_name == g_email:
                    is_owner = True

                if is_owner:
                    user_gifts.append(g)

            self.send_json_response({"status": "success", "user": u_name or u_email, "gifts": user_gifts})
            return

        # Route /demo.php, /<template_slug>/demo.php
        if path.endswith('/demo.php') or path.endswith('/preview-gift.php') or path in ['/demo.php', '/preview-gift.php', '/preview-gift']:
            parts = [p for p in path.strip('/').split('/') if p]
            slug = parts[0] if (len(parts) >= 2 and parts[-1] in ['demo.php', 'preview-gift.php']) else None
            default_id = SLUG_TO_ID.get(slug, '69') if slug else '69'
            tpl_id = query.get('id', [default_id])[0].strip()
            return self.serve_demo_template(tpl_id)

        # Route /gift.php, /<template_slug>/gift.php, /gift, /openbao.php, /view-gift.php
        if path.endswith('/gift.php') or path.endswith('/gift') or path in ['/openbao.php', '/openbao', '/view-gift.php']:
            uid = query.get('uid', query.get('id', query.get('code', [''])))[0].strip()
            parts = [p for p in path.strip('/').split('/') if p]
            slug = parts[0] if (len(parts) >= 2 and parts[-1] in ['gift.php', 'gift', 'view-gift.php']) else None
            return self.serve_custom_gift(uid, slug=slug)

        # Route /_next/ to templates/trung-thu-den-ong-sao/app/_next/
        if path.startswith('/_next/'):
            self.path = '/templates/trung-thu-den-ong-sao/app' + path
            return super().do_GET()

        # Route /people/ and /images/khung/ for Trung Thu template
        if path.startswith('/people/'):
            self.path = '/templates/trung-thu-den-ong-sao/app' + path
            return super().do_GET()
        if path.startswith('/images/khung/'):
            self.path = '/templates/trung-thu-den-ong-sao/app' + path
            return super().do_GET()

        # Fix double gift path like /gift/gift/gift.js -> /gift/gift.js
        if '/gift/gift/' in path:
            self.path = self.path.replace('/gift/gift/', '/gift/')
            return super().do_GET()

        # Root fallback for app music or icons
        if path == '/bg-music.mp3':
            self.path = '/templates/trung-thu-den-ong-sao/app/bg-music.mp3'
            return super().do_GET()
        if path in ['/icon', '/apple-icon']:
            self.path = '/assets/images/logo-heart-180.png'
            return super().do_GET()

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Block access to internal/sensitive system files
        if is_protected_system_file(path):
            self.send_error(404, "File not found")
            return

        # Route Live Preview (POST - from v3LivePreview)
        if path in ['/templates/_v3/live.php', '/templates/_v3/live.html']:
            data = self.read_request_data()
            return self.serve_live_preview(data)

        # Bank Webhook for Auto Payment Approval (Casso, SeAPay, PayOS, MBBank App / SMS forwarders)
        casso_paths = [
            '/api/webhook/bank', '/api/payment/webhook', '/webhook_bank.php', 
            '/api/casso/webhook', '/api/seapay/webhook', '/casso/webhook', 
            '/webhook/casso', '/webhook', '/api/webhook', '/webhook.php',
            '/casso', '/casso.php', '/api/casso', '/api/casso.php',
            '/casso-webhook', '/casso_webhook', '/casso_webhook.php'
        ]
        if path.rstrip('/') in [p.rstrip('/') for p in casso_paths]:
            data = self.read_request_data()
            raw_text = json.dumps(data, ensure_ascii=False).upper() if isinstance(data, (dict, list)) else str(data).upper()
            explicit_code = str(data.get('code') or data.get('share_code') or '').strip().upper() if isinstance(data, dict) else ''

            gifts = get_gifts()
            matched = False
            matched_codes = []
            for g in gifts:
                share_code = str(g.get('share_code', '')).upper()
                if not share_code:
                    continue
                if explicit_code and explicit_code == share_code:
                    g['status'] = 'active'
                    g['paid'] = True
                    matched = True
                    matched_codes.append(share_code)
                elif share_code in raw_text or f"DEAR {share_code}" in raw_text or f"DEAR{share_code}" in raw_text:
                    g['status'] = 'active'
                    g['paid'] = True
                    matched = True
                    matched_codes.append(share_code)
            if matched:
                save_gifts(gifts)
                self.send_json_response({
                    "error": 0,
                    "success": True,
                    "message": f"Đã tự động kích hoạt quà theo webhook ngân hàng! Mã quà: {', '.join(matched_codes)}",
                    "matched": matched_codes
                })
            else:
                # Trả về error: 0 để Casso xác nhận kiểm tra webhook (Test Webhook) thành công
                self.send_json_response({
                    "error": 0,
                    "success": True,
                    "message": "Webhook received successfully",
                    "matched": []
                })
            return

        # 1. API: Process Notification Queue
        if path == '/api_process_notification_queue.php':
            self.send_json_response({"success": True})
            return

        # 2. Google OAuth Authentication (Customer Google Sign-In)
        if path in ['/auth_google.php', '/api/auth/google']:
            data = self.read_request_data()
            users = get_users()
            user, err = process_google_auth(data, users)
            if user:
                save_users(users)
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                cookie_val = f"currentUser={urllib.parse.quote(user.get('username'))}; Path=/; Max-Age=86400"
                self.send_json_response({
                    "success": True,
                    "status": "success",
                    "message": f"Chào mừng {user.get('full_name')}!",
                    "redirect": "/templates.php",
                    "user": safe_user
                }, cookie=cookie_val)
            else:
                self.send_json_response({"success": False, "status": "error", "message": err or "Đăng nhập Google thất bại!"}, status=400)
            return

        # 3. API: Register User (handles /api/register and /register.php /register)
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
            existing = next((u for u in users if u.get('username','').lower() == username.lower() or u.get('email','').lower() == email.lower()), None)
            if existing:
                user_obj = existing
                if password:
                    user_obj['password'] = password
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

            safe_user = {k: v for k, v in user_obj.items() if k != 'password'}
            cookie_val = f"currentUser={urllib.parse.quote(username)}; Path=/; Max-Age=86400"
            if self.is_json_request():
                self.send_json_response({
                    "status": "success",
                    "message": "Đăng ký tài khoản thành công!",
                    "user": safe_user,
                    "redirect": "/templates.php"
                }, cookie=cookie_val)
            else:
                self.send_redirect('/templates.php', cookie=cookie_val)
            return

        # 4. API: Login User (handles /api/login and /login.php /login)
        if path in ['/api/login', '/login.php', '/login']:
            data = self.read_request_data()
            username = str(data.get('username', '')).strip()
            password = str(data.get('password', '')).strip()

            user = find_user_by_login(username, password)
            if user:
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                cookie_val = f"currentUser={urllib.parse.quote(user.get('username'))}; Path=/; Max-Age=86400"
                if self.is_json_request():
                    self.send_json_response({
                        "status": "success",
                        "message": "Đăng nhập thành công!",
                        "user": safe_user,
                        "redirect": "/templates.php"
                    }, cookie=cookie_val)
                else:
                    self.send_redirect('/templates.php', cookie=cookie_val)
            else:
                if self.is_json_request():
                    self.send_json_response({
                        "status": "error",
                        "message": "Tên đăng nhập hoặc mật khẩu không chính xác!"
                    }, status=401)
                else:
                    self.send_redirect('/login.html?error=invalid_credentials')
            return

        # 5. API: Submit Idea (Homepage Idea Modal)
        if path == '/api_submit_idea.php':
            data = self.read_request_data()
            name = str(data.get('name', 'Khách hàng')).strip()
            contact = str(data.get('contact', '')).strip()
            content = str(data.get('content', '')).strip()
            ideas = []
            if os.path.exists(IDEAS_FILE):
                try:
                    with open(IDEAS_FILE, 'r', encoding='utf-8') as f:
                        ideas = json.load(f)
                except Exception:
                    pass
            ideas.append({
                "name": name,
                "contact": contact,
                "content": content,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            with open(IDEAS_FILE, 'w', encoding='utf-8') as f:
                json.dump(ideas, f, ensure_ascii=False, indent=2)
            self.send_json_response({
                "success": True,
                "message": "Cảm ơn bạn đã đóng góp ý tưởng! Chúng tôi sẽ xem xét sớm nhất."
            })
            return

        # 6. API: Submit Review (Homepage Reviews Section)
        if path == '/api_submit_review.php':
            data = self.read_request_data()
            user = self.get_request_user()
            rating = int(data.get('rating', 5) or 5)
            content = str(data.get('content', '')).strip()
            author_name = user.get('full_name') if user else (str(data.get('author', 'Khách hàng')).strip() or 'Khách hàng')
            reviews = []
            if os.path.exists(REVIEWS_FILE):
                try:
                    with open(REVIEWS_FILE, 'r', encoding='utf-8') as f:
                        reviews = json.load(f)
                except Exception:
                    pass
            reviews.append({
                "author": author_name,
                "rating": rating,
                "content": content,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
                json.dump(reviews, f, ensure_ascii=False, indent=2)
            self.send_json_response({
                "success": True,
                "message": "Cảm ơn bạn đã gửi đánh giá!"
            })
            return

        # 7. API: User Settings / Profile Updates
        if path in ['/settings.php', '/api/user/settings', '/api/settings/update']:
            data = self.read_request_data()
            act = data.get('action')
            user = self.get_request_user()
            if not user:
                uname = data.get('username') or data.get('confirm_username')
                if uname:
                    users = get_users()
                    user = next((u for u in users if u.get('username','').lower() == str(uname).lower()), None)
            
            if user:
                users = get_users()
                target = next((u for u in users if u.get('id') == user.get('id')), user)
                if act == 'update_profile':
                    new_name = data.get('full_name') or data.get('username')
                    if new_name:
                        target['full_name'] = new_name
                    if 'phone' in data:
                        target['phone'] = data.get('phone', '')
                    save_users(users)
                    safe_user = {k: v for k, v in target.items() if k != 'password'}
                    self.send_json_response({"status": "success", "success": True, "message": "Cập nhật hồ sơ thành công!", "user": safe_user})
                    return
                elif act == 'change_password':
                    new_pwd = str(data.get('new_password', '')).strip()
                    if new_pwd and len(new_pwd) >= 6:
                        target['password'] = new_pwd
                        save_users(users)
                        self.send_json_response({"status": "success", "success": True, "message": "Đổi mật khẩu thành công!"})
                    else:
                        self.send_json_response({"status": "error", "success": False, "message": "Mật khẩu mới phải có ít nhất 6 ký tự!"}, status=400)
                    return
                elif act == 'delete_account':
                    users = [u for u in users if u.get('id') != target.get('id')]
                    save_users(users)
                    self.send_json_response({"status": "success", "success": True, "message": "Tài khoản đã được xóa!"}, cookie="currentUser=; path=/; max-age=0")
                    return
            
            self.send_json_response({"status": "success", "success": True, "message": "Đã lưu cài đặt!"})
            return

        # 8. API: Create Gift (handles /api/gifts/create and /gift-builder.php)
        if path in ['/api/gifts/create', '/gift-builder.php']:
            user = self.get_current_user()
            if not user:
                tpl_id = str(query.get('id', ['69'])[0])
                login_redirect = f"/login.html?redirect=/gift-builder.php?id={tpl_id}"
                if self.is_json_request():
                    self.send_json_response({
                        "success": False,
                        "status": "error",
                        "require_login": True,
                        "redirect": login_redirect,
                        "message": "Vui lòng đăng ký hoặc đăng nhập tài khoản trước khi tạo quà và thanh toán!"
                    }, status=401)
                else:
                    self.send_redirect(login_redirect)
                return

            data = self.read_request_data()
            settings = get_settings()

            recipient_name = data.get('recipient_name') or data.get('v3_recipient_name') or "Người thương"
            birthday_day = data.get('birthday_day') or data.get('v3_calendar_day') or (data.get('v3', {}).get('calendar_day') if isinstance(data.get('v3'), dict) else None) or 19
            if isinstance(birthday_day, list): birthday_day = birthday_day[0]
            try: birthday_day = int(birthday_day)
            except Exception: birthday_day = 19

            birthday_month = data.get('birthday_month') or data.get('v3_calendar_month') or (data.get('v3', {}).get('calendar_month') if isinstance(data.get('v3'), dict) else None) or 11
            if isinstance(birthday_month, list): birthday_month = birthday_month[0]
            try: birthday_month = int(birthday_month)
            except Exception: birthday_month = 11
            if isinstance(recipient_name, list): recipient_name = recipient_name[0]
            letter_title = data.get('letter_title') or "Gửi người thương!"
            if isinstance(letter_title, list): letter_title = letter_title[0]
            letter_content = data.get('letter_content') or data.get('val_letter_content') or "Chúc bạn luôn hạnh phúc và rạng rỡ mỗi ngày! ❤️"
            if isinstance(letter_content, list): letter_content = letter_content[0]
            letter_signature = data.get('letter_signature') or "Nguyễn Văn Phong"
            if isinstance(letter_signature, list): letter_signature = letter_signature[0]
            template_id = str(query.get('id', [data.get('template_id', '69')])[0])
            template_slug = data.get('template_slug', 'mon-qua-nho-2010')
            if isinstance(template_slug, list): template_slug = template_slug[0]
            passcode = str(data.get('password_value', data.get('passcode', ''))).strip()
            music = data.get('music_url') or data.get('music') or './assets/music/givemeyourforever.mp3'
            if isinstance(music, list): music = music[0]

            # Parse photos
            photos = []
            if 'photos[]' in data:
                p = data['photos[]']
                if isinstance(p, list): photos.extend(p)
                elif p: photos.append(p)
            if 'photos' in data:
                p = data['photos']
                if isinstance(p, list): photos.extend(p)
                elif p: photos.append(p)
            if 'photos_json' in data:
                pj = data['photos_json']
                if isinstance(pj, list): pj = pj[0]
                try:
                    p = json.loads(pj)
                    if isinstance(p, list): photos.extend(p)
                except Exception:
                    pass

            fly_photos = []
            if 'fly_photos[]' in data:
                p = data['fly_photos[]']
                if isinstance(p, list): fly_photos.extend(p)
                elif p: fly_photos.append(p)
            if 'fly_photos' in data:
                p = data['fly_photos']
                if isinstance(p, list): fly_photos.extend(p)
                elif p: fly_photos.append(p)

            uid = f"g_{uuid.uuid4().hex[:8]}"
            share_code = f"DG{int(datetime.now().timestamp()) % 1000000:06d}"
            
            # Determine dynamic total price from form submission
            amount_val = data.get('total_price_hidden') or data.get('total_price') or data.get('amount')
            if isinstance(amount_val, list):
                amount_val = amount_val[0]
            try:
                if amount_val is not None and str(amount_val).strip() != '':
                    amount = int(float(str(amount_val).strip()))
                else:
                    amount = int(settings.get('price_amount', 50000))
            except (ValueError, TypeError):
                amount = int(settings.get('price_amount', 50000))

            is_free = (amount <= 0)
            status = "active" if is_free else "pending"
            paid = True if is_free else False
            transfer_content = f"DEAR {share_code}"

            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amount}&addInfo=DEAR+{share_code}&accountName={urllib.parse.quote(settings['account_name'])}"

            new_gift = {
                "id": uid,
                "share_code": share_code,
                "template_id": template_id,
                "template_slug": template_slug,
                "recipient_name": recipient_name,
                "birthday_day": birthday_day,
                "birthday_month": birthday_month,
                "letter_title": letter_title,
                "letter_content": letter_content,
                "letter_signature": letter_signature,
                "passcode": passcode,
                "music": music,
                "photos": photos,
                "fly_photos": fly_photos,
                "amount": amount,
                "transfer_content": transfer_content,
                "status": status,
                "paid": paid,
                "user_id": user.get('id', '') if user else '',
                "user_email": user.get('email', '') if user else '',
                "username": user.get('username', '') if user else 'guest',
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

            gifts = get_gifts()
            gifts.insert(0, new_gift)
            save_gifts(gifts)

            response_payload = {
                "success": True,
                "is_free": is_free,
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
                "redirect": f"/gift.php?uid={uid}"
            }

            self.send_json_response(response_payload)
            return

        # 9. API: Confirm Payment
        if path in ['/api/gifts/confirm_payment', '/api/gifts/pay']:
            data = self.read_request_data()
            code = str(data.get('share_code') or data.get('gift_id') or query.get('code', [''])[0]).strip()
            gifts = get_gifts()
            target_gift = None
            for g in gifts:
                if str(g.get('id', '')) == code or str(g.get('share_code', '')).lower() == code.lower():
                    g['status'] = 'active'
                    g['paid'] = True
                    target_gift = g
                    break
            if target_gift:
                save_gifts(gifts)
                self.send_json_response({
                    "status": "success",
                    "success": True,
                    "message": "Thanh toán thành công! Món quà đã được kích hoạt.",
                    "gift": target_gift,
                    "view_url": f"/gift.php?uid={target_gift['id']}"
                })
            else:
                self.send_json_response({"status": "success", "success": True, "message": "Đã ghi nhận thanh toán thành công!"})
            return

        # 10. API: Delete Gift
        if path == '/api/gifts/delete':
            data = self.read_request_data()
            gift_id = data.get('id')
            gifts = get_gifts()
            gifts = [g for g in gifts if str(g.get('id')) != str(gift_id)]
            save_gifts(gifts)
            self.send_json_response({"status": "success", "message": "Đã xóa món quà!"})
            return

        # 11. API: Admin Login
        if path == '/api/admin/login':
            client_ip = self.headers.get('CF-Connecting-IP') or self.headers.get('X-Forwarded-For') or (self.client_address[0] if self.client_address else 'unknown')
            client_ip = client_ip.split(',')[0].strip()
            now = datetime.now().timestamp()
            
            # Anti Brute-Force Check
            rec = ADMIN_FAILED_LOGINS.get(client_ip, {'count': 0, 'lockout_until': 0})
            if rec.get('lockout_until', 0) > now:
                wait_sec = int(rec['lockout_until'] - now)
                self.send_json_response({"status": "error", "message": f"Nhập sai quá nhiều lần. IP của bạn tạm thời bị khóa trong {wait_sec} giây!"}, status=429)
                return

            data = self.read_request_data()
            settings = get_settings()
            entered = str(data.get('password', '')).strip() if data else ''
            admin_pwd = settings.get('admin_password', 'Phongzhouok')
            
            if entered and entered == admin_pwd:
                ADMIN_FAILED_LOGINS.pop(client_ip, None)
                token = uuid.uuid4().hex
                ADMIN_SESSIONS.add(token)
                self.send_json_response({"status": "success", "token": token, "message": "Đăng nhập CMS quản trị thành công!"})
            else:
                rec['count'] = rec.get('count', 0) + 1
                if rec['count'] >= 5:
                    rec['lockout_until'] = now + 900  # Lock 15 minutes
                    ADMIN_FAILED_LOGINS[client_ip] = rec
                    self.send_json_response({"status": "error", "message": "Nhập sai quá 5 lần. Địa chỉ IP của bạn bị khóa tạm thời 15 phút!"}, status=429)
                else:
                    ADMIN_FAILED_LOGINS[client_ip] = rec
                    remaining = 5 - rec['count']
                    self.send_json_response({"status": "error", "message": f"Mật khẩu quản trị không chính xác! Còn {remaining} lần thử."}, status=401)
            return

        # API: Admin Verify Session
        if path == '/api/admin/verify':
            if verify_admin_request(self):
                self.send_json_response({"status": "success", "message": "Xác thực phiên thành công"})
            else:
                self.send_json_response({"status": "error", "message": "Phiên làm việc hết hạn hoặc không hợp lệ"}, status=401)
            return

        # 12. API: Admin Add Template
        if path == '/api/admin/templates/add':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
            new_item = self.read_request_data()
            if not new_item or not new_item.get('title'):
                self.send_json_response({"status": "error", "message": "Tiêu đề không được để trống"}, status=400)
                return
            
            templates = get_templates()
            new_id = max([int(t.get('id', 0)) for t in templates] + [0]) + 1
            new_item['id'] = new_id
            new_item['slug'] = f"template-{new_id}"
            new_item['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            templates.append(new_item)
            save_templates(templates)
            self.send_json_response({"status": "success", "template": new_item})
            return

        # 13. API: Admin Delete Template
        if path == '/api/admin/templates/delete':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
            data = self.read_request_data()
            tpl_id = data.get('id')
            templates = get_templates()
            templates = [t for t in templates if str(t.get('id')) != str(tpl_id)]
            save_templates(templates)
            self.send_json_response({"status": "success", "message": "Đã xóa mẫu quà!"})
            return

        # 14. API: Admin Update Settings
        if path == '/api/admin/settings':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
            data = self.read_request_data()
            if not data:
                self.send_json_response({"status": "error", "message": "Dữ liệu không hợp lệ"}, status=400)
                return
            settings = get_settings()
            settings['bank_code'] = data.get('bank_code', settings['bank_code'])
            settings['account_number'] = data.get('account_number', settings['account_number'])
            settings['account_name'] = data.get('account_name', settings['account_name'])
            settings['price_amount'] = data.get('price_amount', settings['price_amount'])
            save_settings(settings)
            self.send_json_response({"status": "success", "message": "Đã cập nhật cấu hình thanh toán thành công!"})
            return

        # 15. API: Admin Change Password
        if path == '/api/admin/change-password':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
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

        # 16. API: Upload File
        if path == '/api/admin/upload':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
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
        tpl_str = str(tpl_id).strip()
        if tpl_str == '32':
            if os.path.exists(os.path.join(DIRECTORY, 'demos', 'demo_32.html')):
                demo_path = os.path.join(DIRECTORY, 'demos', 'demo_32.html')
            elif os.path.exists(os.path.join(DIRECTORY, 'corazon-galactico', 'index.html')):
                demo_path = os.path.join(DIRECTORY, 'corazon-galactico', 'index.html')
        elif os.path.exists(os.path.join(DIRECTORY, tpl_str)):
            demo_path = os.path.join(DIRECTORY, tpl_str)
        elif os.path.exists(os.path.join(DIRECTORY, 'demos', f'demo_{tpl_str}.html')):
            demo_path = os.path.join(DIRECTORY, 'demos', f'demo_{tpl_str}.html')
        elif os.path.exists(os.path.join(DIRECTORY, 'demos', f'{tpl_str}.html')):
            demo_path = os.path.join(DIRECTORY, 'demos', f'{tpl_str}.html')
        else:
            demo_path = os.path.join(DIRECTORY, 'demos', 'demo_69.html')
        
        if demo_path and os.path.exists(demo_path):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Security-Policy', "frame-ancestors *")
            self.send_header('X-Frame-Options', 'ALLOWALL')
            self.end_headers()
            with open(demo_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            content = self.clean_asset_paths(content)

            # Audio mapping matching each template's theme
            audio_map = {
                '21': '/demos/music/happybirtday_uia.mp3',
                '25': '/demos/music/happybirtday_uia.mp3',
                '26': '/demos/music/happybirtday_uia.mp3',
                '28': '/demos/music/happybirtday_uia.mp3',
                '42': '/demos/music/happybirtday_uia.mp3',
                '50': '/demos/music/happybirtday_uia.mp3',
                '53': '/demos/music/happybirtday_uia.mp3',
                '59': '/demos/music/happybirtday_uia.mp3',
                '60': '/demos/music/happybirtday_uia.mp3',
                '9': '/assets/music/hoanhipgiangsinh.mp3',
                '22': '/assets/music/hoanhipgiangsinh.mp3',
                '47': '/assets/music/hoanhipgiangsinh.mp3',
                '48': '/assets/music/hoanhipgiangsinh.mp3',
                '37': '/assets/music/happy-new-year.mp3',
                '7': '/assets/music/danhchoem.mp3',
                '36': '/assets/music/danhchoem.mp3',
                '68': '/assets/music/danhchoem.mp3',
                '34': '/assets/music/nguoigieomamxanh.mp3',
                '33': '/assets/music/bongtrang.mp3',
                '64': '/assets/music/bongtrang.mp3',
                '29': '/assets/music/messenger.mp3',
                '65': '/assets/music/messenger.mp3'
            }
            pref_audio = audio_map.get(tpl_str, '/assets/music/givemeyourforever.mp3')

            helper_script = f"""
            <script id="dg-universal-helper">
            (function() {{
                window.IS_DEMO_MODE = true;

                // Auto-bypass orientation locks inside iframes (e.g. gift builder or modal preview)
                if (window.self !== window.top) {{
                    window.__skipOrientationLock = true;
                    window.__skipOrientationGate = true;
                    var hideLocks = function() {{
                        ['orientation-lock', 'orientation-gate', 'landscape-warning'].forEach(function(id) {{
                            var el = document.getElementById(id);
                            if (el) {{
                                el.style.display = 'none';
                                el.hidden = true;
                            }}
                        }});
                    }};
                    if (document.readyState === 'loading') {{
                        document.addEventListener('DOMContentLoaded', hideLocks);
                    }} else {{
                        hideLocks();
                    }}
                    window.addEventListener('resize', hideLocks);
                }}

                var prefAudio = "{pref_audio}";
                var fullAudioUrl = new URL(prefAudio, window.location.origin).href;

                // Strict single-audio enforcement: only 1 audio element can play at a time anywhere
                window.__dg_audios = window.__dg_audios || new Set();
                var origPlay = HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play = function() {{
                    var self = this;
                    // Only pause other audios if THIS element is an AUDIO element (never let background videos pause audio!)
                    if (self && self.tagName === 'AUDIO') {{
                        document.querySelectorAll('audio').forEach(function(a) {{
                            if (a !== self && !a.paused) {{
                                try {{ a.pause(); }} catch(e) {{}}
                            }}
                        }});
                        window.__dg_audios.forEach(function(a) {{
                            if (a !== self && !a.paused) {{
                                try {{ a.pause(); }} catch(e) {{}}
                            }}
                        }});
                        window.__dg_audios.add(self);
                    }}
                    return origPlay.apply(this, arguments);
                }};

                function stopAllAudios() {{
                    document.querySelectorAll('audio').forEach(function(a) {{
                        try {{ a.pause(); }} catch(e) {{}}
                    }});
                    window.__dg_audios.forEach(function(a) {{
                        try {{ a.pause(); }} catch(e) {{}}
                    }});
                }}

                // Message handling: Audio control + Universal Photo/Data Live Preview Sync
                window.addEventListener('message', function(evt) {{
                    if (!evt.data) return;
                    if (evt.data.type === 'DG_STOP_AUDIO' || evt.data.type === 'DG_PAUSE_AUDIO') {{
                        stopAllAudios();
                    }}
                    var isDG = evt.data.type === 'DG_LIVE_PREVIEW_UPDATE' || evt.data.type === 'LIVE_PREVIEW_UPDATE';
                    var payload = (evt.data.payload || evt.data.data) || {{}};

                    // Audio update: ONLY change audio if user explicitly chose a new track AND not preserving original demo sound
                    if (evt.data.type === 'DG_CHANGE_MUSIC' || (payload.music_url && !payload.preserve_demo_audio)) {{
                        var newMusic = evt.data.music_url || payload.music_url;
                        if (newMusic) {{
                            stopAllAudios();
                            var targetAudio = document.querySelector('audio#dg-bg-music') || document.querySelector('audio');
                            if (targetAudio) {{
                                targetAudio.src = newMusic;
                                targetAudio.load();
                                targetAudio.play().catch(function(){{}});
                            }}
                        }}
                    }}

                    // Universal Photo Synchronization for all 52 templates
                    if (isDG && payload.photos && Array.isArray(payload.photos) && payload.photos.length > 0) {{
                        var photos = payload.photos;
                        window.__dg_photos = photos;

                        // 1. Christmas Gift (window.giftChristmasData / window.dataChristmasTree)
                        if (window.giftChristmasData) {{
                            window.giftChristmasData.photos = photos;
                            window.giftChristmasData.vipGift = {{ type: 'photos', images: photos }};
                        }}
                        if (window.dataChristmasTree && window.dataChristmasTree.data) {{
                            window.dataChristmasTree.data.images = photos;
                        }}
                        if (typeof window.__updateChristmasPhotos === 'function') {{
                            try {{ window.__updateChristmasPhotos(photos); }} catch(e) {{}}
                        }}

                        // 2. 3D & WebGL custom template hooks
                        if (typeof window.updatePhotos === 'function') {{
                            try {{ window.updatePhotos(photos); }} catch(e) {{}}
                        }}
                        if (typeof window.updateSpherePhotos === 'function') {{
                            try {{ window.updateSpherePhotos(photos); }} catch(e) {{}}
                        }}
                        if (window.config) {{
                            if (Array.isArray(window.config.photos)) window.config.photos = photos;
                            if (Array.isArray(window.config.sphereImages)) window.config.sphereImages = photos;
                            if (Array.isArray(window.config.images)) window.config.images = photos;
                        }}

                        // 3. DOM Image injection for photo cards, albums, polaroids, heart grids, books
                        var selectors = [
                            '.photo-item img', '.photo-slot img', '.album-photo img',
                            '.polaroid-item img', '.polaroid img', '.heart-photo img',
                            '.box-photo img', '.box-face img', '.cube-face img',
                            '.gallery-img', '.carousel-item img', '#photo-grid img',
                            '#gift-photos img', '.photo-card img', '.memory-photo img',
                            '.tree-photo img', '.photo-wrap img', '.sw-page__img img',
                            '.sweet-page__img img', 'img[data-user-photo]', 'img.user-photo',
                            'img.user-image', '.user-photo-img', '.frame-img img'
                        ];
                        var matchedImgs = document.querySelectorAll(selectors.join(','));
                        if (matchedImgs.length > 0) {{
                            matchedImgs.forEach(function(img, idx) {{
                                var pUrl = photos[idx % photos.length];
                                if (pUrl && img.src !== pUrl) {{
                                    img.src = pUrl;
                                    img.style.objectFit = 'cover';
                                }}
                            }});
                        }}
                    }}

                    // Universal Letter & Text Synchronization for all 52 templates
                    if (isDG) {{
                        var rName = payload.recipient_name || '';
                        var sName = payload.sender_name || '';
                        var msgText = payload.message || payload.val_letter_content || '';

                        // 1. Christmas Gift letter & recipient sync
                        if (window.giftChristmasData) {{
                            if (rName) window.giftChristmasData.recipientName = rName;
                            window.giftChristmasData.letter = window.giftChristmasData.letter || {{}};
                            if (rName) window.giftChristmasData.letter.greeting = 'Gửi ' + rName + ' thân mến,';
                            if (msgText) window.giftChristmasData.letter.content = msgText;
                            if (sName) window.giftChristmasData.letter.signature = sName;
                            if (window.giftManager && typeof window.giftManager.updateLetterContent === 'function') {{
                                if (rName) window.giftManager.recipientName = rName;
                                try {{ window.giftManager.updateLetterContent(); }} catch(e) {{}}
                            }}
                        }}
                        if (window.settings && rName) {{
                            window.settings.recipientName = rName;
                        }}

                        // 2. Lucky Chance (Gửi Vận May - ID 23) sync
                        if (window.luckyChanceData) {{
                            if (rName) window.luckyChanceData.recipientName = rName;
                            if (msgText) {{
                                var lcs = msgText.split('\\n').map(function(s){{return s.trim();}}).filter(Boolean);
                                if (lcs.length > 0) window.luckyChanceData.messages = lcs;
                            }}
                            if (payload.photos && payload.photos.length > 0) {{
                                window.luckyChanceData.images = payload.photos;
                            }}
                            if (window.LuckyChance && typeof window.LuckyChance.applyServerData === 'function') {{
                                try {{
                                    window.LuckyChance.applyServerData(window.luckyChanceData);
                                    if (typeof window.LuckyChance.resetFallingSystem === 'function') {{
                                        window.LuckyChance.resetFallingSystem();
                                    }}
                                }} catch(e) {{}}
                            }}
                        }}

                        // 3. Universal DOM Letter & Recipient sync across templates
                        if (rName) {{
                            var rSelectors = [
                                '.recipient-name', '.receiver-name', '#letterRecipientName',
                                '.letter-greeting', '.name-receiver', '#name-receiver',
                                '.receiver', '[data-recipient]'
                            ];
                            document.querySelectorAll(rSelectors.join(',')).forEach(function(el) {{
                                if (el.classList.contains('letter-greeting')) {{
                                    el.textContent = 'Gửi ' + rName + ' thân mến,';
                                }} else {{
                                    el.textContent = rName;
                                }}
                            }});
                        }}

                        if (msgText) {{
                            var mSelectors = [
                                '.letter-content', '.letter-body', '.letter-text',
                                '#letter-content', '#letterContent', '#letterText',
                                '#letter-body', '#letterBody', '.wishes-text',
                                '.message-content', '.gift-message', '[data-message]'
                            ];
                            document.querySelectorAll(mSelectors.join(',')).forEach(function(el) {{
                                if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {{
                                    el.value = msgText;
                                }} else {{
                                    el.textContent = msgText;
                                }}
                            }});
                        }}

                        if (sName) {{
                            var sSelectors = [
                                '.signature-name', '.letter-signature', '.sender-name',
                                '#signature', '#sender_name', '[data-sender]'
                            ];
                            document.querySelectorAll(sSelectors.join(',')).forEach(function(el) {{
                                el.textContent = sName;
                            }});
                        }}
                    }}
                }});

                function initAudio() {{
                    var audio = document.querySelector('audio');
                    if (!audio) {{
                        audio = document.createElement('audio');
                        audio.id = 'dg-bg-music';
                        audio.loop = true;
                        audio.preload = 'auto';
                        document.body.appendChild(audio);
                    }}
                    if (!audio.src || audio.src === window.location.href || audio.src === 'about:blank' || audio.error) {{
                        audio.src = fullAudioUrl;
                    }}
                    window.__dg_audios.add(audio);

                    // Only autoplay if NOT in an iframe (standalone demo mode)
                    var isInIframe = false;
                    try {{ isInIframe = window.self !== window.top; }} catch(e) {{ isInIframe = true; }}
                    
                    if (!isInIframe) {{
                        function tryPlay() {{
                            if (audio.paused) {{
                                var p = audio.play();
                                if (p && p.catch) p.catch(function(){{}});
                            }}
                        }}
                        tryPlay();
                        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function(evt) {{
                            window.addEventListener(evt, tryPlay, {{ passive: true, once: true }});
                            document.addEventListener(evt, tryPlay, {{ passive: true, once: true }});
                        }});
                    }}
                }}

                if (document.readyState === 'loading') {{
                    document.addEventListener('DOMContentLoaded', initAudio);
                }} else {{
                    initAudio();
                }}
            }})();
            </script>
            """
            if '</body>' in content:
                content = content.replace('</body>', f'{helper_script}</body>')
            else:
                content += helper_script

            self.wfile.write(content.encode('utf-8'))
        else:
            self.send_error(404, "Demo template not found")

    def serve_live_preview(self, params):
        slug = params.get('slug', 'mon-qua-nho-2010')
        if isinstance(slug, list): slug = slug[0]
        rec_name = params.get('recipient_name') or params.get('v3_recipient_name') or 'Người Thương'
        if isinstance(rec_name, list): rec_name = rec_name[0]
        sender_name = params.get('sender_name') or 'Thương nhiều ♥'
        if isinstance(sender_name, list): sender_name = sender_name[0]
        let_title = params.get('letter_title') or 'Gửi người thương!'
        if isinstance(let_title, list): let_title = let_title[0]
        let_content = params.get('letter_content') or "Chẳng cần phải đợi đến một ngày lễ đặc biệt nào cả, vì mỗi ngày có bạn ở bên đều là một ngày thật đáng trân trọng.\n\nChúc bạn luôn bình an, rạng rỡ, ngập tràn niềm vui và luôn cảm nhận được thật nhiều yêu thương mỗi ngày nhé! ❤️"
        if isinstance(let_content, list): let_content = let_content[0]
        music = params.get('music') or '/templates/mon-qua-nho-2010/app/assets/music/givemeyourforever.mp3'
        if isinstance(music, list): music = music[0]
        passcode = params.get('passcode') or params.get('password_value') or ''
        if isinstance(passcode, list): passcode = passcode[0]

        photos = []
        pj = params.get('photos_json')
        if pj:
            if isinstance(pj, list): pj = pj[0]
            try:
                decoded = json.loads(pj)
                if isinstance(decoded, list):
                    photos = decoded
            except Exception:
                pass
        if not photos:
            raw_p = params.get('photos[]') or params.get('photos')
            if isinstance(raw_p, list):
                photos = raw_p
            elif raw_p:
                photos = [raw_p]
        if not photos:
            photos = [
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-0.jpg",
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-1.jpg",
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-2.jpg",
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-3.jpg",
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-4.jpg",
                "/templates/mon-qua-nho-2010/app/assets/demo/sphere-5.jpg"
            ]

        cfg = {
            "appTitle": f"Món Quà Nhỏ - Dành riêng cho {rec_name} 💖",
            "appIcon": "/templates/mon-qua-nho-2010/app/assets/images/icons/couple.png",
            "enableWebsiteInfo": True,
            "enablePasscode": bool(passcode),
            "passcode": str(passcode),
            "passcodeTitle": "Nhập mật khẩu",
            "passcodeSubtitle": "Gợi ý: Mật khẩu món quà",
            "enableMorphEffect": True,
            "morphTexts": [f"Gửi {rec_name}", "Một món quà nhỏ", "Dành riêng cho bạn", "Mãi bên nhau nhé"],
            "particleImage": "/templates/mon-qua-nho-2010/app/assets/demo/particle.png",
            "particleImageShape": "heart",
            "particleColor": "",
            "heartName": rec_name,
            "enableSphere": True,
            "sphereImages": photos,
            "enableSphereFlyingImages": True,
            "flyingCaptions": ["Thương thật nhiều 💕", "Khoảnh khắc đẹp nhất ✨", "Mãi bên nhau nhé 🥰", "Luôn rạng rỡ nhé 🌸"],
            "enableLetter": True,
            "letter": {
                "title": let_title,
                "text": let_content,
                "image": photos[0] if photos else "/templates/mon-qua-nho-2010/app/assets/demo/letter.png",
                "caption": "Khoảnh khắc đẹp của chúng mình ♥",
                "signature": sender_name,
                "envColor": "night"
            },
            "bgMusic": music,
            "bgVolume": 0.55,
            "autoPlay": False,
            "recipientName": rec_name,
            "enableCalendar": True,
            "calendar": {
                "day": 21,
                "month": 11,
                "title": "Ngày Đặc Biệt Của Chúng Mình",
                "caption": f"Dành tặng {rec_name} ♥"
            },
            "enableBouquet": True,
            "bouquet": {
                "count": 9,
                "color": "red",
                "title": "Tặng bạn bó hoa không bao giờ tàn",
                "meaning": "Mãi mãi bên nhau",
                "subtitle": "Hoa thật rồi sẽ héo, nhưng bó hoa này sẽ nở mãi — như tình cảm chân thành dành cho bạn mỗi ngày."
            },
            "enableGiftBox": True,
            "giftBox": {
                "color": "pink",
                "message": "Một buổi hẹn đi ăn món ngon bạn thích vào cuối tuần này nhé! 🍲✨",
                "image": "/templates/mon-qua-nho-2010/app/assets/demo/giftbox.jpg"
            },
            "enableFinale": True,
            "finale": {
                "texts": ["Yêu Thương", "Mãi Bên Nhau"],
                "message": "Cảm ơn vì đã luôn ở bên nhau",
                "loveStart": "2024-02-14",
                "counterLabel": "Mình đã bên nhau"
            }
        }

        tid = SLUG_TO_ID.get(slug, '69')
        p1 = f'templates/{slug}/app/index.html'
        p2 = f'templates/{slug}/index.html'
        p3 = f'{slug}/index.html'
        if os.path.exists(os.path.join(DIRECTORY, p1)):
            frame_src = f'/{p1}?id=deargift'
        elif os.path.exists(os.path.join(DIRECTORY, p2)):
            frame_src = f'/{p2}?id=deargift'
        elif os.path.exists(os.path.join(DIRECTORY, p3)):
            frame_src = f'/{p3}?id=deargift'
        else:
            frame_src = f'/demo.php?id={tid}'

        html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Xem Trước Món Quà Nhỏ · {rec_name} 🎁</title>
<link rel="stylesheet" href="/templates/_v3/assets/css/gift.css">
<style>
body.tpl-body-mon-qua-nho-2010 {{ background: #0b0a12; overflow: hidden; margin: 0; padding: 0; }}
body.tpl-body-mon-qua-nho-2010 .gift-stage {{ padding: 0; margin: 0; width: 100%; height: 100vh; }}
.gift-app-frame {{ position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 1; background: #0b0a12; }}
.gift-preview-flag {{
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(232, 88, 154, 0.9);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 14px;
    border-radius: 50px;
    z-index: 9999;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 12px rgba(232,88,154,0.35);
    pointer-events: none;
}}
</style>
</head>
<body class="gift-body tpl-body-mon-qua-nho-2010">
<div class="gift-preview-flag">XEM TRƯỚC DEMO TRỰC TIẾP</div>
<main class="gift-stage">
<script>
window.__GIFTTO_APP = {{"config": {json.dumps(cfg, ensure_ascii=False)}, "music": {json.dumps(music)}}};
window.addEventListener('message', function(e) {{
    if (e.data && e.data.type === 'DG_LIVE_PREVIEW_UPDATE' && e.data.payload) {{
        if (window.__GIFTTO_APP && window.__GIFTTO_APP.config) {{
            var p = e.data.payload;
            if (p.recipientName) window.__GIFTTO_APP.config.recipientName = p.recipientName;
            if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {{
                window.__GIFTTO_APP.config.sphereImages = p.photos;
            }}
        }}
    }}
}});
try {{
    if (window.parent && window.parent !== window) {{
        window.parent.postMessage({{ type: 'DG_PREVIEW_READY' }}, '*');
    }}
}} catch(e) {{}}
</script>
<iframe class="gift-app-frame" src="{frame_src}" title="Món Quà Nhỏ VIP" allow="autoplay; fullscreen; clipboard-write; web-share" allowfullscreen></iframe>
</main>
<script src="/templates/_v3/assets/js/effects.js"></script>
<script src="/templates/_v3/assets/js/gift.js"></script>
</body>
</html>"""
        html = self.clean_asset_paths(html)
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def serve_custom_gift(self, uid, slug=None):
        gift = get_gift(uid) if uid else None
        if not gift:
            if slug and slug in SLUG_TO_ID:
                return self.serve_demo_template(SLUG_TO_ID[slug])
            if uid and uid in SLUG_TO_ID:
                return self.serve_demo_template(SLUG_TO_ID[uid])
            if slug:
                return self.serve_demo_template('64' if 'trung-thu' in slug else '69')
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"""<!DOCTYPE html>
<html><head><meta charset='utf-8'><title>Kh\xc3\xb4ng t\xc3\xacm th\xe1\xba\xa5y qu\xc3\xa0</title></head>
<body style='font-family:sans-serif;text-align:center;padding:50px;'>
<h2>\xe2\x9d\x8c Kh\xc3\xb4ng t\xc3\xacm th\xe1\xba\xa5y m\xc3\xb3n qu\xc3\xa0 n\xc3\xa0y</h2>
<p><a href='/templates.php' style='color:#e8589a;font-weight:bold;'>Kh\xc3\xa1m ph\xc3\xa1 m\xe1\xba\xabu qu\xc3\xa0 \xe2\x86\x92</a></p>
</body></html>""")
            return

        # Check payment status
        if gift.get('status') == 'pending' or not gift.get('paid', False):
            settings = get_settings()
            share_code = gift.get('share_code', '')
            amount = gift.get('amount', 20000)
            rec_name = gift.get('recipient_name', 'Người thương')
            transfer_content = gift.get('transfer_content', f"DEAR {share_code}")
            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amount}&addInfo={urllib.parse.quote(transfer_content)}&accountName={urllib.parse.quote(settings['account_name'])}"
            
            pending_html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chờ Kích Hoạt Món Quà · {rec_name} 🎁</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
* {{ box-sizing: border-box; margin:0; padding:0; }}
body {{ font-family: 'Be Vietnam Pro', sans-serif; background: #0f0c1b; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
.card {{ background: #1a152e; border: 1px solid rgba(232,88,154,0.25); border-radius: 28px; max-width: 420px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }}
.badge {{ display: inline-block; background: #f59e0b; color: #fff; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 50px; margin-bottom: 16px; }}
h1 {{ font-size: 22px; font-weight: 800; margin-bottom: 8px; }}
p.sub {{ font-size: 13px; color: #a5a0be; line-height: 1.5; margin-bottom: 20px; }}
.qr-box {{ background: #fff; border-radius: 20px; padding: 16px; margin-bottom: 20px; display: inline-block; }}
.qr-box img {{ width: 220px; height: 220px; object-fit: contain; display: block; border-radius: 12px; }}
.info {{ background: rgba(255,255,255,0.06); border-radius: 16px; padding: 14px 18px; text-align: left; font-size: 13px; margin-bottom: 20px; line-height: 1.8; }}
.info div {{ display: flex; justify-content: space-between; }}
.info strong {{ color: #e8589a; font-weight: 700; }}
.btn-act {{ width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 14px; border-radius: 50px; font-weight: 800; font-size: 14px; cursor: pointer; margin-bottom: 10px; transition: transform 0.2s; }}
.btn-act:hover {{ transform: scale(1.02); }}
.status-pill {{ font-size: 12.5px; color: #60a5fa; background: rgba(96,165,250,0.12); border-radius: 10px; padding: 8px 12px; margin-bottom: 16px; }}
</style>
</head>
<body>
<div class="card">
    <div class="badge">⏳ ĐƠN QUÀ CHỜ THANH TOÁN</div>
    <h1>Món Quà Nhỏ dành tặng {rec_name} ❤️</h1>
    <p class="sub">Vui lòng quét mã QR chuyển khoản để kích hoạt và mở món quà 3D lung linh này!</p>
    
    <div class="qr-box">
        <img src="{qr_url}" alt="VietQR MBBank">
    </div>

    <div class="status-pill" id="poll-status">
        ⏳ Đang chờ hệ thống xác nhận tiền về...
    </div>

    <div class="info">
        <div><span>Ngân hàng:</span><strong>{settings['bank_name']}</strong></div>
        <div><span>Chủ tài khoản:</span><strong>{settings['account_name']}</strong></div>
        <div><span>Số tài khoản:</span><strong>{settings['account_number']}</strong></div>
        <div><span>Số tiền:</span><strong>{amount:,}đ</strong></div>
        <div><span>Nội dung CK:</span><strong>{transfer_content}</strong></div>
    </div>
</div>

<script>
function pollStatus() {{
    fetch('/ajax_check_payment_status.php?code={share_code}')
    .then(r => r.json())
    .then(res => {{
        if (res && res.status === 'active') {{
            document.getElementById('poll-status').innerHTML = '✅ Đã nhận được thanh toán! Đang mở quà...';
            document.getElementById('poll-status').style.color = '#34d399';
            setTimeout(() => {{ window.location.reload(); }}, 1200);
        }}
    }}).catch(() => {{}});
}}
setInterval(pollStatus, 2500);
</script>
</body>
</html>"""
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(pending_html.encode('utf-8'))
            return

        # Active gift: serve full template
        template_id = gift.get('template_id', '69')
        demo_path = os.path.join(DIRECTORY, 'demos', f'demo_{template_id}.html')
        if not os.path.exists(demo_path):
            demo_path = os.path.join(DIRECTORY, 'demos', 'demo_69.html')

        if not os.path.exists(demo_path):
            self.send_error(404, "Template file not found")
            return

        with open(demo_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        content = self.clean_asset_paths(content)

        rec_name = gift.get('recipient_name', 'Người thương')
        let_title = gift.get('letter_title', 'Gửi người thương!')
        let_content = gift.get('letter_content', '')
        let_sig = gift.get('letter_signature', 'Nguyễn Văn Phong')
        music = gift.get('music', './assets/music/givemeyourforever.mp3')
        passcode = gift.get('passcode', '')
        photos = gift.get('photos', [])
        first_photo_json = json.dumps(photos[0], ensure_ascii=False) if photos else '""'

        # Replace watermark with custom banner
        content = content.replace(
            '<div class="gift-preview-flag">XEM THỬ</div>',
            f'<div class="gift-preview-flag" style="background:linear-gradient(135deg,#e8589a,#9b5cf6); box-shadow:0 4px 14px rgba(232,88,154,0.4);">DÀNH TẶNG {rec_name.upper()} ❤️</div>'
        )

        # Inject override script
        b_day = gift.get('birthday_day', 19)
        b_month = gift.get('birthday_month', 11)

        override_js = f"""
        <script>
        (function() {{
            try {{
                if (window.__GIFTTO_APP) {{
                    if (window.__GIFTTO_APP.config) {{
                        var cfg = window.__GIFTTO_APP.config;
                        cfg.recipientName = {json.dumps(rec_name, ensure_ascii=False)};
                        cfg.appTitle = {json.dumps(f"Món Quà Nhỏ dành tặng {rec_name} 🎁", ensure_ascii=False)};
                        cfg.heartName = {json.dumps(rec_name, ensure_ascii=False)};
                        if (cfg.letter) {{
                            cfg.letter.title = {json.dumps(let_title, ensure_ascii=False)};
                            cfg.letter.text = {json.dumps(let_content, ensure_ascii=False)};
                            cfg.letter.signature = {json.dumps(let_sig, ensure_ascii=False)};
                        }}
                        if ({json.dumps(bool(photos))}) {{
                            cfg.sphereImages = {json.dumps(photos, ensure_ascii=False)};
                            if (cfg.letter) {{
                                cfg.letter.image = {first_photo_json};
                            }}
                        }}
                        if ({json.dumps(bool(passcode))}) {{
                            cfg.enablePasscode = true;
                            cfg.passcode = {json.dumps(passcode)};
                        }}
                    }}
                    if (window.__GIFTTO_APP.cake) {{
                        var cake = window.__GIFTTO_APP.cake;
                        cake.day = {int(b_day)};
                        cake.month = {int(b_month)};
                        cake.receiverName = {json.dumps(rec_name, ensure_ascii=False)};
                        cake.senderName = {json.dumps(let_sig, ensure_ascii=False)};
                        if ({json.dumps(bool(let_content))}) {{
                            cake.letterBody = {json.dumps(let_content, ensure_ascii=False)};
                        }}
                        if ({json.dumps(bool(photos))}) {{
                            cake.photos = {json.dumps(photos, ensure_ascii=False)};
                        }}
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
        # DO NOT strip <base> tags because templates rely on remote styles/scripts/images!
        content = content.replace('https://deargift.love/uploads/', '/uploads/')
        content = content.replace('../uploads/', '/uploads/')
        content = content.replace('https://deargift.love/templates/mon-qua-nho-2010/', '/templates/mon-qua-nho-2010/')
        content = content.replace('../templates/mon-qua-nho-2010/', '/templates/mon-qua-nho-2010/')
        # Prevent any client-side redirect away from the demo/gift preview
        content = re.sub(r'/\*+\s*window\.location\.href\s*=\s*[\'"]config-editor\.html[\'"]\s*;?\s*\*+/', '// redirect disabled', content)
        content = re.sub(r'/\*+\s*window\.location\.href\s*=\s*[\'"]\.\./templates\.php[\'"]\s*;?\s*\*+/', '// redirect disabled', content)
        content = content.replace("window.location.href = 'config-editor.html'", "// redirect disabled")
        content = content.replace('window.location.href = "../templates.php"', "// redirect disabled")
        content = re.sub(r'window\.location\.replace\(createPath\);', '// redirect disabled', content)
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
                        file_vals = []
                        for sub in item:
                            if getattr(sub, 'filename', None) and sub.filename:
                                ext = os.path.splitext(sub.filename)[1].lower() or '.jpg'
                                fname = f"{uuid.uuid4().hex[:12]}{ext}"
                                fpath = os.path.join(UPLOADS_DIR, fname)
                                with open(fpath, 'wb') as fout:
                                    fout.write(sub.file.read())
                                file_vals.append(f"uploads/{fname}")
                            elif hasattr(sub, 'value'):
                                val = sub.value
                                if isinstance(val, bytes):
                                    try: val = val.decode('utf-8')
                                    except Exception: val = ''
                                file_vals.append(val)
                        data[key] = file_vals
                    elif getattr(item, 'filename', None) and item.filename:
                        # Save single file
                        ext = os.path.splitext(item.filename)[1].lower() or '.jpg'
                        fname = f"{uuid.uuid4().hex[:12]}{ext}"
                        fpath = os.path.join(UPLOADS_DIR, fname)
                        with open(fpath, 'wb') as fout:
                            fout.write(item.file.read())
                        data[key] = f"uploads/{fname}"
                    else:
                        val = item.value
                        if isinstance(val, bytes):
                            try: val = val.decode('utf-8')
                            except Exception: val = ''
                        data[key] = val
                return data
            except Exception:
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

    def send_json_response(self, data, status=200, cookie=None):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-User')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, filename, cookie=None):
        file_path = os.path.join(DIRECTORY, filename)
        if os.path.exists(file_path):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            if cookie:
                self.send_header('Set-Cookie', cookie)
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"{filename} not found")

    def serve_media_with_range(self, file_path, content_type):
        if not os.path.exists(file_path):
            self.send_error(404, "Media file not found")
            return

        file_size = os.path.getsize(file_path)
        range_header = self.headers.get('Range')

        if not range_header:
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
            return

        try:
            bytes_range = range_header.strip().split('=')[1]
            parts = bytes_range.split('-')
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            if end >= file_size:
                end = file_size - 1
            length = end - start + 1

            self.send_response(206, "Partial Content")
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(length))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            with open(file_path, 'rb') as f:
                f.seek(start)
                self.wfile.write(f.read(length))
        except Exception as e:
            self.send_error(500, f"Range error: {e}")

    def serve_gift_builder(self, query):
        tpl_id = query.get('id', ['69'])[0].strip()
        user = self.get_current_user()
        if not user:
            self.send_redirect(f'/login.html?redirect=/gift-builder.php?id={tpl_id}')
            return

        filepath = os.path.join(DIRECTORY, 'gift-builder.php')
        if not os.path.exists(filepath):
            self.send_error(404, 'gift-builder.php not found')
            return

        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        tpl_id = query.get('id', ['69'])[0].strip()
        cfg = BUILDER_CONFIGS.get(str(tpl_id), {})
        title = cfg.get('title', 'Tạo Món Quà Trực Tuyến')
        price = cfg.get('price', 'Miễn phí')
        tabs = cfg.get('tabs', [])

        # Title & Header
        content = re.sub(r'<h1 id="gb-studio-title">.*?</h1>', f'<h1 id="gb-studio-title">{title}</h1>', content)
        content = re.sub(r'<span class="gb-live-preview-title">.*?</span>', f'<span class="gb-live-preview-title">👀 Xem trước: {title}</span>', content)
        content = re.sub(r'<title>.*?</title>', f'<title>Tạo {title} | DearGift</title>', content)

        # Price
        content = re.sub(r'<span[^>]*id="pr-template"[^>]*>.*?</span>', f'<span class="price-val " id="pr-template" style="color: #e8589a; font-weight:700">{price}</span>', content, flags=re.DOTALL)

        # Iframe & Form action
        expected_src = 'templates/_v3/live.php?slug=mon-qua-nho-2010' if str(tpl_id) == '69' else f'preview-gift.php?id={tpl_id}'
        content = content.replace('src="templates/_v3/live.php?slug=mon-qua-nho-2010"', f'src="{expected_src}"')
        content = content.replace('action="gift-builder.php?id=69"', f'action="gift-builder.php?id={tpl_id}"')
        content = content.replace('value="69" id="hidden_template_id"', f'value="{tpl_id}" id="hidden_template_id"')
        content = content.replace('id="hidden_template_id" value="69"', f'id="hidden_template_id" value="{tpl_id}"')

        # Photo and letter tab labels
        photo_tab_label = "Album ảnh"
        letter_tab_label = "Lời chúc & Thư"
        for t in tabs:
            if t.get('section') == 'sec-photos':
                photo_tab_label = t.get('label', photo_tab_label)
            if t.get('section') == 'sec-letter':
                letter_tab_label = t.get('label', letter_tab_label)

        content = content.replace('<span class="tab-label">Album Quả cầu</span>', f'<span class="tab-label">{photo_tab_label}</span>')
        content = content.replace('<span class="tab-label">Lời chúc & Thư</span>', f'<span class="tab-label">{letter_tab_label}</span>')

        # Dynamic tabs and section isolation
        if str(tpl_id) != '69':
            content = content.replace('id="tab-sec-v3"', 'id="tab-sec-v3" style="display:none;"')
            content = content.replace('class="icon-tab active" id="tab-sec-v3"', 'class="icon-tab" id="tab-sec-v3" style="display:none;"')
            content = content.replace('id="tab-sec-letter" data-section="sec-letter" onclick="switchSection(\'sec-letter\', this)" style="display:none;"', 'id="tab-sec-letter" data-section="sec-letter" onclick="switchSection(\'sec-letter\', this)"')

            active_sec = 'sec-photos'
            for t in tabs:
                if t.get('active'):
                    active_sec = t.get('section', active_sec)
                    break

            if active_sec == 'sec-photos':
                content = content.replace('class="icon-tab " data-section="sec-photos"', 'class="icon-tab active" data-section="sec-photos"')
                content = content.replace('class="gb-section active" id="sec-v3"', 'class="gb-section" id="sec-v3" style="display:none;"')
                content = content.replace('class="gb-section " id="sec-photos"', 'class="gb-section active" id="sec-photos"')
            elif active_sec == 'sec-letter':
                content = content.replace('id="tab-sec-letter"', 'id="tab-sec-letter" class="icon-tab active"')
                content = content.replace('class="gb-section active" id="sec-v3"', 'class="gb-section" id="sec-v3" style="display:none;"')
                content = content.replace('class="gb-section " id="sec-letter"', 'class="gb-section active" id="sec-letter"')

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content.encode('utf-8'))


def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), DearGiftHandler) as httpd:
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
