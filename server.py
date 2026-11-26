#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DearGift Full-Stack Server
Simulates PHP endpoints, VietQR Payment Flow, Templates API, Customer Auth, Google Auth & Admin CMS.
Backed by SQLite database (`app/db.py`).
Author / Owner: Nguyễn Văn Phong
"""

import gzip
import hashlib
import hmac
import html
import io
import http.server
import secrets
import signal
import socket
import socketserver
import threading
import time
import traceback
import urllib.parse
import urllib.request
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

from app import db

PORT = int(os.environ.get('PORT', 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
CASSO_API_KEY = os.environ.get('CASSO_API_KEY', 'AK_CS.731c4690e73211f1a336b350062e06ec.fnn7zlR3fmIm8rCUy8Kr1I0rIJSQuZL80mEA0aL5UQ7mvncDXRoKYwLWRsybWRI9K4jlo3Or').strip()
_last_casso_sync = 0
_CASSO_LOCK = threading.Lock()
_SECRET_LOCK = threading.Lock()
_SECRET_CACHE = {}

ALLOWED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
ALLOWED_AUDIO_EXTS = {'.mp3', '.m4a', '.wav', '.ogg'}
ALLOWED_VIDEO_EXTS = {'.mp4', '.webm', '.mov', '.3gp'}
ALLOWED_UPLOAD_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_AUDIO_EXTS | ALLOWED_VIDEO_EXTS


def _validate_uploaded_bytes(ext: str, raw: bytes) -> bool:
    """Basic file-signature check preventing disguised scripts/HTML uploads."""
    if not raw:
        return False
    ext = ext.lower()
    if ext in ('.jpg', '.jpeg'):
        return raw.startswith(b'\xff\xd8\xff')
    if ext == '.png':
        return raw.startswith(b'\x89PNG\r\n\x1a\n')
    if ext == '.gif':
        return raw.startswith((b'GIF87a', b'GIF89a'))
    if ext == '.webp':
        return len(raw) >= 12 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'
    if ext == '.wav':
        return len(raw) >= 12 and raw[:4] == b'RIFF' and raw[8:12] == b'WAVE'
    if ext == '.ogg':
        return raw.startswith(b'OggS')
    if ext == '.mp3':
        return raw.startswith(b'ID3') or (len(raw) >= 2 and raw[0] == 0xFF and (raw[1] & 0xE0) == 0xE0)
    if ext in ('.m4a', '.mp4', '.mov', '.3gp'):
        return len(raw) >= 12 and (b'ftyp' in raw[:32] or b'moov' in raw[:32])
    if ext == '.webm':
        return raw.startswith(b'\x1a\x45\xdf\xa3')
    return False


def _read_or_create_secret(filename: str, env_names: tuple) -> bytes:
    for ename in env_names:
        val = (os.environ.get(ename) or '').strip()
        if val:
            return val.encode('utf-8')
    with _SECRET_LOCK:
        cached = _SECRET_CACHE.get(filename)
        if cached:
            return cached
        os.makedirs(db.DATA_DIR, exist_ok=True)
        spath = os.path.join(db.DATA_DIR, filename)
        secret_hex = ''
        if os.path.exists(spath):
            try:
                with open(spath, 'r', encoding='utf-8') as f:
                    secret_hex = f.read().strip()
            except Exception:
                secret_hex = ''
        if len(secret_hex) < 32:
            secret_hex = secrets.token_hex(32)
            try:
                fd = os.open(spath, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, 'w', encoding='utf-8') as f:
                    f.write(secret_hex)
            except Exception:
                pass
        bval = secret_hex.encode('utf-8')
        _SECRET_CACHE[filename] = bval
        return bval


def _get_session_secret() -> bytes:
    return _read_or_create_secret('.session_secret', ('DG_SESSION_SECRET', 'SESSION_SECRET'))


def _get_webhook_secret() -> str:
    return _read_or_create_secret('.webhook_secret', ('WEBHOOK_SECRET', 'CASSO_WEBHOOK_SECRET')).decode('utf-8')


class _AuthRateLimiter:
    """Thread-safe sliding/lockout rate limiter to block brute-force and automated scraping."""

    def __init__(self, max_attempts: int, window_seconds: int, max_keys: int = 2048):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._lock = threading.Lock()
        self._records = {}  # key -> [count, reset_ts]

    def is_limited(self, key: str):
        now = time.time()
        with self._lock:
            rec = self._records.get(key)
            if not rec:
                return False, 0
            count, reset_ts = rec
            if now >= reset_ts:
                self._records.pop(key, None)
                return False, 0
            if count >= self.max_attempts:
                return True, max(1, int(reset_ts - now))
            return False, 0

    def record(self, key: str):
        now = time.time()
        with self._lock:
            if len(self._records) > self.max_keys:
                stale = [k for k, v in self._records.items() if now >= v[1]]
                for k in stale:
                    self._records.pop(k, None)
                while len(self._records) >= self.max_keys:
                    self._records.pop(next(iter(self._records)), None)
            rec = self._records.get(key)
            if not rec or now >= rec[1]:
                rec = [1, now + self.window_seconds]
            else:
                rec[0] += 1
            self._records[key] = rec
            remaining = max(0, self.max_attempts - rec[0])
            limited = rec[0] >= self.max_attempts
            wait_sec = max(1, int(rec[1] - now)) if limited else 0
            return limited, remaining, wait_sec

    def check_and_consume(self, key: str):
        now = time.time()
        with self._lock:
            if len(self._records) > self.max_keys:
                stale = [k for k, v in self._records.items() if now >= v[1]]
                for k in stale:
                    self._records.pop(k, None)
                while len(self._records) >= self.max_keys:
                    self._records.pop(next(iter(self._records)), None)
            rec = self._records.get(key)
            if not rec or now >= rec[1]:
                self._records[key] = [1, now + self.window_seconds]
                return False, max(0, self.max_attempts - 1), 0
            if rec[0] >= self.max_attempts:
                return True, 0, max(1, int(rec[1] - now))
            rec[0] += 1
            self._records[key] = rec
            return False, max(0, self.max_attempts - rec[0]), 0

    def reset(self, key: str):
        with self._lock:
            self._records.pop(key, None)


_LOGIN_IP_LIMITER = _AuthRateLimiter(max_attempts=20, window_seconds=900)
_LOGIN_ACCOUNT_LIMITER = _AuthRateLimiter(max_attempts=5, window_seconds=900)
_REGISTER_LIMITER = _AuthRateLimiter(max_attempts=5, window_seconds=900)
_GOOGLE_AUTH_LIMITER = _AuthRateLimiter(max_attempts=10, window_seconds=900)
_SETTINGS_LIMITER = _AuthRateLimiter(max_attempts=10, window_seconds=900)
_FEEDBACK_LIMITER = _AuthRateLimiter(max_attempts=15, window_seconds=900)
_CREATE_LIMITER = _AuthRateLimiter(max_attempts=40, window_seconds=900)


def _normalize_ip(ip_str: str) -> str:
    ip = str(ip_str or '').strip()
    if ip.startswith('::ffff:'):
        ip = ip[7:]
    return ip or 'unknown'


def _is_trusted_proxy_peer(ip_str: str) -> bool:
    ip = _normalize_ip(ip_str)
    return (
        ip in ('127.0.0.1', '::1', 'localhost')
        or ip.startswith(('10.', '192.168.', '100.64.', '172.16.', '172.17.', '172.18.', '172.19.', '172.2', '172.30.', '172.31.'))
    )


def _get_client_ip(handler) -> str:
    peer_ip = _normalize_ip(handler.client_address[0] if handler.client_address else '')
    if _is_trusted_proxy_peer(peer_ip):
        cf_ip = handler.headers.get('CF-Connecting-IP', '').strip()
        if cf_ip:
            return _normalize_ip(cf_ip.split(',')[0])
        xff = handler.headers.get('X-Forwarded-For', '').strip()
        if xff:
            parts = [p.strip() for p in xff.split(',') if p.strip()]
            if parts:
                return _normalize_ip(parts[-1])
        x_real = handler.headers.get('X-Real-IP', '').strip()
        if x_real:
            return _normalize_ip(x_real)
    return peer_ip


def make_session_token(user: dict, ttl_seconds: int = 86400) -> str:
    if not isinstance(user, dict) or not user.get('id'):
        return ''
    now = int(time.time())
    payload_obj = {
        'uid': str(user['id']),
        'u': str(user.get('username') or user.get('email') or ''),
        'role': str(user.get('role') or 'customer'),
        'pv': db.get_user_auth_stamp(str(user['id'])),
        'iat': now,
        'exp': now + ttl_seconds,
    }
    raw = json.dumps(payload_obj, separators=(',', ':'), sort_keys=True).encode('utf-8')
    b64 = base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')
    sig = hmac.new(_get_session_secret(), b64.encode('ascii'), hashlib.sha256).hexdigest()
    return f"dgs1.{b64}.{sig}"


def verify_session_token(token: str):
    tok = str(token or '').strip()
    if not tok.startswith('dgs1.'):
        return None
    parts = tok.split('.')
    if len(parts) != 3:
        return None
    _, b64, sig = parts
    expected = hmac.new(_get_session_secret(), b64.encode('ascii'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        padded = b64 + '=' * (-len(b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
        if not isinstance(data, dict):
            return None
        if int(data.get('exp') or 0) < int(time.time()):
            return None
        uid = str(data.get('uid') or '').strip()
        if not uid:
            return None
        user = db.get_user_by_id(uid)
        if not user:
            return None
        cur_pv = db.get_user_auth_stamp(uid)
        if not hmac.compare_digest(str(data.get('pv') or ''), cur_pv):
            return None
        return user
    except Exception:
        return None


def _is_https_request(handler) -> bool:
    proto = (handler.headers.get('X-Forwarded-Proto') or '').split(',')[0].strip().lower()
    return proto == 'https'


def build_auth_cookies(handler, user: dict, max_age: int = 86400) -> list:
    sec_attr = "; Secure" if _is_https_request(handler) else ""
    sess_tok = make_session_token(user, ttl_seconds=max_age)
    uname = urllib.parse.quote(str(user.get('username') or user.get('email') or 'user'))
    return [
        f"dg_session={sess_tok}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax{sec_attr}",
        f"currentUser={uname}; Path=/; Max-Age={max_age}; SameSite=Lax{sec_attr}",
    ]


def clear_auth_cookies(handler) -> list:
    sec_attr = "; Secure" if _is_https_request(handler) else ""
    return [
        f"dg_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax{sec_attr}",
        f"currentUser=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax{sec_attr}",
    ]


def _admin_portal_cookie_token(secret_pass: str) -> str:
    return hmac.new(_get_session_secret(), f"portal:{secret_pass}".encode('utf-8'), hashlib.sha256).hexdigest()


def sync_casso_transactions():
    global _last_casso_sync
    api_key = os.environ.get('CASSO_API_KEY', '').strip() or CASSO_API_KEY
    if not api_key:
        return False
    with _CASSO_LOCK:
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
        matched = False
        for rec in records:
            desc = str(rec.get('description', '')).upper()
            try:
                rec_amt = int(float(rec.get('amount') or 0))
            except (ValueError, TypeError):
                rec_amt = 0
            if rec_amt <= 0:
                continue
            codes = db.match_and_activate_from_text(desc, gateway='casso', raw_payload=rec, paid_amount=rec_amt)
            if codes:
                matched = True
        return matched
    except Exception:
        return False

BUILDER_CONFIGS = {}
try:
    cfg_file = os.path.join(DIRECTORY, 'js', 'all_builder_configs.json')
    if os.path.exists(cfg_file):
        with open(cfg_file, 'r', encoding='utf-8') as f:
            BUILDER_CONFIGS = json.load(f)
except Exception:
    pass
TEMPLATES_DATA_FILE = os.path.join(DIRECTORY, 'templates_data.json')
UPLOADS_DIR = os.environ.get('UPLOADS_DIR', '').strip() or os.path.join(DIRECTORY, 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)
db.init_db()

ADMIN_LOCK = threading.Lock()
ADMIN_SESSIONS = set()
ADMIN_FAILED_LOGINS = {}  # ip -> {'count': int, 'lockout_until': float}

PROTECTED_SYSTEM_EXTENSIONS = (
    '.py', '.pyc', '.sh', '.yaml', '.yml', '.env', '.json', '.bak', '.log',
    '.db', '.db-wal', '.db-shm', '.sqlite', '.sqlite3', '.sql', '.toml'
)
PROTECTED_SYSTEM_FILES = {
    'server.py', 'db.py', 'schema.sql', 'deargift.db', 'cloudflared.exe',
    'settings.json', 'users.json', 'gifts.json', 'ideas.json', 'reviews.json',
    'templates_data.json', 'start.sh', 'render.yaml', 'requirements.txt',
    'procfile', 'nixpacks.toml', 'railway.toml', '.gitignore', '.python-version',
    '.session_secret', '.webhook_secret'
}

def is_protected_system_file(path_str):
    raw_path = str(path_str or '')
    if '\x00' in raw_path or '..' in urllib.parse.unquote(raw_path):
        return True
    clean = raw_path.strip('/').split('?')[0].lower()
    # Block Git internals, backend code, database files, tests and config files unconditionally
    if (
        clean.startswith(('.git', 'app/', 'data/', 'tests/', 'scratch/', 'js_src_backup', '_scripts_archive'))
        or clean in ('app', 'data', 'tests', 'scratch')
        or '/.git' in clean
        or clean.endswith('.map')
        or clean in ['.env', 'render.yaml', 'requirements.txt', 'procfile', 'nixpacks.toml', 'railway.toml', 'server.py', 'users.json', 'gifts.json', 'settings.json']
    ):
        return True
    # Allow public asset data (e.g. assets/data/*.json, templates/*.json)
    if clean.startswith('assets/'):
        return False
    fname = os.path.basename(clean)
    if fname in PROTECTED_SYSTEM_FILES:
        return True
    if fname.startswith('.'):
        return True
    if fname.endswith(PROTECTED_SYSTEM_EXTENSIONS):
        return True
    return False

def is_local_request(handler):
    forwarded = handler.headers.get('CF-Connecting-IP') or handler.headers.get('X-Forwarded-For') or handler.headers.get('X-Real-IP')
    if forwarded:
        return False
    client_ip = handler.client_address[0] if handler.client_address else ''
    if client_ip.startswith('::ffff:'):
        client_ip = client_ip[7:]
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
    expected_portal = _admin_portal_cookie_token(secret_pass)
    
    # 2. Check query secret key: ?key=... or ?secret=... or ?admin_key=...
    q_key = query.get('key', [''])[0] or query.get('secret', [''])[0] or query.get('admin_key', [''])[0]
    if q_key and hmac.compare_digest(q_key, secret_pass):
        return True
        
    # 3. Check Cookie: admin_portal_access (HMAC token, never plaintext password)
    cookie_header = handler.headers.get('Cookie', '')
    if 'admin_portal_access=' in cookie_header:
        for piece in cookie_header.split(';'):
            piece = piece.strip()
            if piece.startswith('admin_portal_access='):
                val = piece.split('=', 1)[1].strip()
                if hmac.compare_digest(val, expected_portal):
                    return True
    return False

def verify_admin_request(handler):
    auth = handler.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token:
            with ADMIN_LOCK:
                if token in ADMIN_SESSIONS:
                    return True
            if db.verify_admin_session(token):
                with ADMIN_LOCK:
                    ADMIN_SESSIONS.add(token)
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
    'photo-bouquet': '68',
    'thiep-cuoi-sang-trong': '70',
    'wedding-save-the-date': '70',
    'tet-sum-vay-3d': '71',
    'tet-sum-vay': '71',
    'vuon-hoa-3d-360': '72',
    'vuon-hoa': '72',
    'silkgarden': '72',
    'boys-day-19-11-gau-kem': '73',
    'boysday': '73'
}

def _dlove_token_secret():
    env_sec = (os.environ.get('DLOVE_TOKEN_SECRET') or '').strip()
    return env_sec.encode('utf-8') if env_sec else _get_session_secret()

def make_dlove_token(identifier, ttl_seconds: int = 604800):
    ident = str(identifier or '').strip()
    if not ident:
        return ''
    payload_obj = {'u': ident, 'exp': int(time.time()) + ttl_seconds}
    payload = base64.urlsafe_b64encode(json.dumps(payload_obj, separators=(',', ':')).encode('utf-8')).decode('ascii').rstrip('=')
    sig = hmac.new(_dlove_token_secret(), payload.encode('utf-8'), hashlib.sha256).hexdigest()[:32]
    return f"dgtk.{payload}.{sig}"

def verify_dlove_token(token):
    tok = str(token or '').strip()
    if not tok.startswith('dgtk.'):
        return ''
    parts = tok.split('.')
    if len(parts) != 3:
        return ''
    _, payload, sig = parts
    expected_full = hmac.new(_dlove_token_secret(), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    expected = expected_full[:len(sig)] if len(sig) in (24, 32) else expected_full[:32]
    if not hmac.compare_digest(sig, expected):
        return ''
    try:
        padded = payload + '=' * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode('utf-8')
        if decoded.startswith('{'):
            obj = json.loads(decoded)
            if int(obj.get('exp') or 0) < int(time.time()):
                return ''
            return str(obj.get('u') or '').strip()
        return decoded
    except Exception:
        return ''

_DLOVE_PRESIGN_TOKENS = {}


# ----------------- JWT & GOOGLE HELPER -----------------
def verify_google_id_token(credential: str):
    """Verify Google OAuth ID Token via Google tokeninfo endpoint."""
    tok = str(credential or '').strip()
    if not tok or len(tok) > 4096 or tok.count('.') != 2:
        return None
    try:
        url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + urllib.parse.quote(tok, safe='')
        req = urllib.request.Request(url, headers={'User-Agent': 'DearGift/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status != 200:
                return None
            info = json.loads(resp.read().decode('utf-8'))
        if not isinstance(info, dict):
            return None
        email = str(info.get('email') or '').strip().lower()
        verified_flag = str(info.get('email_verified') or '').lower() == 'true' or info.get('email_verified') is True
        if not email or not verified_flag:
            return None
        exp = int(info.get('exp') or 0)
        if exp <= int(time.time()):
            return None
        expected_aud = (os.environ.get('GOOGLE_CLIENT_ID') or '').strip()
        if expected_aud and str(info.get('aud') or '').strip() != expected_aud:
            return None
        return info
    except Exception:
        return None


def process_google_auth(data):
    if not isinstance(data, dict):
        return None, "Dữ liệu không hợp lệ!"
    credential = str(data.get('credential', '')).strip()
    if not credential:
        return None, "Yêu cầu xác thực Google ID Token hợp lệ! Vui lòng đăng nhập bằng tên đăng nhập và mật khẩu."

    info = verify_google_id_token(credential)
    if not info:
        return None, "Google ID Token không hợp lệ hoặc đã hết hạn!"

    email = str(info.get('email', '')).strip().lower()
    full_name = str(info.get('name', '')).strip() or email.split('@')[0]
    google_id = str(info.get('sub', '')).strip()
    avatar = str(info.get('picture', '')).strip()

    user = db.upsert_google_user(email=email, full_name=full_name, avatar=avatar, google_id=google_id, verified=True)
    if not user:
        return None, "Không thể đăng nhập tài khoản này qua Google!"
    return user, None


# ----------------- SETTINGS HELPER (SQLite backed) -----------------
def get_settings():
    return db.get_settings()

def save_settings(data):
    return db.save_settings(data)

# ----------------- USERS HELPER (SQLite backed) -----------------
def get_users():
    return db.get_all_users()

def find_user_by_login(identifier, password=None):
    return db.authenticate_user(identifier, password)

# ----------------- GIFTS HELPER (SQLite backed) -----------------
def get_gifts():
    return db.get_all_gifts()

def get_gift(uid):
    return db.get_gift(uid)

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


_NO_STORE_PREFIXES = (
    '/health', '/healthz', '/ping', '/ajax_', '/admin',
    '/my-gifts', '/orders', '/transactions', '/settings', '/payment',
    '/gift-builder', '/tao-vuon', '/sua-vuon', '/gift-qr', '/login', '/register', '/logout', '/auth_',
    '/gift.php', '/gift/', '/v3/', '/templates/_v3/live', '/vuon/',
    '/api/me', '/api/login', '/api/register', '/api/logout', '/api/user/',
    '/api/stats', '/api/gifts', '/api/my-', '/api/auth/', '/api/admin/',
    '/api/settings', '/api/gift/', '/api/webhook/', '/api/payment/', '/api/dlove/', '/api_submit', '/api_csrf'
)

def _is_no_store_path(path_str):
    p_clean = (path_str or '/').lower().split('?', 1)[0]
    if p_clean in ('/health', '/healthz', '/ping') or p_clean.startswith(_NO_STORE_PREFIXES):
        return True
    if '/builder.' in p_clean:
        return True
    return False

_STATIC_CACHE_LOCK = threading.Lock()
_STATIC_GZ_CACHE = {}  # path -> (mtime_ns, size, raw_bytes, gz_bytes_or_empty, etag, mtime, mem_sz)
_STATIC_CACHE_BYTES = 0
_STATIC_CACHE_MAX_BYTES = 16 * 1024 * 1024
_STATIC_CACHE_MAX_FILE = 1024 * 1024

def _get_cached_static_file(file_path, allow_gzip=True):
    """Return (raw_bytes, gz_bytes_or_none, etag, mtime) using bounded 16MB RAM cache."""
    global _STATIC_CACHE_BYTES
    fs = os.stat(file_path)
    mtime_ns = getattr(fs, 'st_mtime_ns', int(fs.st_mtime * 1_000_000_000))
    fsize = fs.st_size
    etag = f'"{int(fs.st_mtime)}-{fsize}"'

    if fsize > _STATIC_CACHE_MAX_FILE:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
        gz_data = None
        if allow_gzip and fsize > 256:
            cand = gzip.compress(raw_data, compresslevel=5)
            if len(cand) < len(raw_data):
                gz_data = cand
        return raw_data, gz_data, etag, fs.st_mtime

    with _STATIC_CACHE_LOCK:
        cached = _STATIC_GZ_CACHE.get(file_path)
        if cached and cached[0] == mtime_ns and cached[1] == fsize:
            _, _, raw_data, gz_data, cached_etag, cached_mtime, _ = cached
            if allow_gzip and gz_data is None and fsize > 256:
                cand = gzip.compress(raw_data, compresslevel=5)
                gz_data = cand if len(cand) < len(raw_data) else b''
                mem_sz = len(raw_data) + len(gz_data)
                _STATIC_GZ_CACHE[file_path] = (mtime_ns, fsize, raw_data, gz_data, cached_etag, cached_mtime, mem_sz)
                _STATIC_CACHE_BYTES += len(gz_data)
            return raw_data, (gz_data if gz_data else None), cached_etag, cached_mtime

    with open(file_path, 'rb') as f:
        raw_data = f.read()
    gz_data = None
    if allow_gzip and fsize > 256:
        cand = gzip.compress(raw_data, compresslevel=5)
        gz_data = cand if len(cand) < len(raw_data) else b''

    mem_sz = len(raw_data) + (len(gz_data) if gz_data else 0)
    with _STATIC_CACHE_LOCK:
        old = _STATIC_GZ_CACHE.pop(file_path, None)
        if old:
            _STATIC_CACHE_BYTES -= old[6]
        while _STATIC_GZ_CACHE and (_STATIC_CACHE_BYTES + mem_sz > _STATIC_CACHE_MAX_BYTES or len(_STATIC_GZ_CACHE) >= 96):
            oldest_k = next(iter(_STATIC_GZ_CACHE))
            evicted = _STATIC_GZ_CACHE.pop(oldest_k)
            _STATIC_CACHE_BYTES -= evicted[6]
        _STATIC_GZ_CACHE[file_path] = (mtime_ns, fsize, raw_data, gz_data, etag, fs.st_mtime, mem_sz)
        _STATIC_CACHE_BYTES += mem_sz
    return raw_data, (gz_data if gz_data else None), etag, fs.st_mtime

def _cleanup_failed_logins(now_ts):
    with ADMIN_LOCK:
        stale = [
            ip for ip, rec in ADMIN_FAILED_LOGINS.items()
            if (rec.get('lockout_until', 0) and rec.get('lockout_until', 0) + 3600 < now_ts)
            or (not rec.get('lockout_until', 0) and rec.get('count', 0) == 0)
        ]
        for ip in stale:
            ADMIN_FAILED_LOGINS.pop(ip, None)
        while len(ADMIN_FAILED_LOGINS) > 512:
            ADMIN_FAILED_LOGINS.pop(next(iter(ADMIN_FAILED_LOGINS)), None)


class _BadRequestError(Exception):
    def __init__(self, status: int = 400, message: str = "Dữ liệu không hợp lệ!"):
        self.status = status
        self.message = message
        super().__init__(message)


_SENSITIVE_CORS_PREFIXES = (
    '/api/me', '/api/my-', '/api/gifts', '/api/admin', '/api/settings',
    '/api/user', '/api/login', '/api/register', '/api/logout', '/api/auth',
    '/settings', '/auth_google', '/api/payment', '/api/webhook', '/webhook',
    '/api/dlove/orders', '/api/dlove/configs', '/api/dlove/uploads',
    '/api/dlove/websites', '/api/dlove/payments', '/api/dlove/auth',
)

_NOINDEX_PREFIXES = (
    '/admin', '/my-gifts', '/orders', '/transactions', '/settings',
    '/payment', '/gift.php', '/vuon/', '/api/', '/ajax_'
)


class DearGiftHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "DearGift"
    sys_version = ""
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webp': 'image/webp',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.otf': 'font/otf',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.webmanifest': 'application/manifest+json',
        '.svg': 'image/svg+xml',
        '.php': 'text/html; charset=utf-8',
    }

    def __init__(self, *args, **kwargs):
        self._cache_control_sent = False
        self._sent_custom_headers = set()
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        if args and isinstance(args[0], str) and args[0].startswith(('GET /health', 'HEAD /health', 'GET /ping')):
            return
        super().log_message(format, *args)

    def send_response(self, code, message=None):
        self._cache_control_sent = False
        self._sent_custom_headers = set()
        super().send_response(code, message)

    def send_header(self, keyword, value):
        k_low = keyword.lower()
        self._sent_custom_headers.add(k_low)
        if k_low == 'cache-control':
            self._cache_control_sent = True
        super().send_header(keyword, value)

    def _is_sensitive_endpoint(self, path_clean: str) -> bool:
        return path_clean.startswith(_SENSITIVE_CORS_PREFIXES)

    def _allowed_cors_origin(self, path_clean: str):
        origin = (self.headers.get('Origin') or '').strip()
        if not self._is_sensitive_endpoint(path_clean):
            return '*'
        if not origin:
            return None
        try:
            parsed_orig = urllib.parse.urlparse(origin)
            host_hdr = (self.headers.get('Host') or '').strip().lower()
            if parsed_orig.scheme in ('http', 'https') and parsed_orig.netloc.lower() == host_hdr:
                return origin
        except Exception:
            pass
        return None

    def _etag_matches(self, etag):
        if not etag:
            return False
        inm = (self.headers.get('If-None-Match') or '').strip()
        if not inm:
            return False
        if inm == '*':
            return True
        norm_target = etag[2:] if etag.startswith('W/') else etag
        for part in inm.split(','):
            cand = part.strip()
            if cand.startswith('W/'):
                cand = cand[2:]
            if cand == norm_target:
                return True
        return False

    def end_headers(self):
        p_clean = (self.path or '/').lower().split('?', 1)[0]
        cors_orig = self._allowed_cors_origin(p_clean)
        if cors_orig and 'access-control-allow-origin' not in self._sent_custom_headers:
            self.send_header('Access-Control-Allow-Origin', cors_orig)
            if cors_orig != '*':
                self.send_header('Access-Control-Allow-Credentials', 'true')
                if 'vary' not in self._sent_custom_headers:
                    self.send_header('Vary', 'Origin')
        if 'x-content-type-options' not in self._sent_custom_headers:
            self.send_header('X-Content-Type-Options', 'nosniff')
        if 'x-frame-options' not in self._sent_custom_headers:
            self.send_header('X-Frame-Options', 'SAMEORIGIN')
        if 'content-security-policy' not in self._sent_custom_headers:
            if p_clean.startswith('/uploads/'):
                self.send_header('Content-Security-Policy', "default-src 'none'; sandbox")
            else:
                self.send_header('Content-Security-Policy', "frame-ancestors 'self'")
        if 'referrer-policy' not in self._sent_custom_headers:
            self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        if 'permissions-policy' not in self._sent_custom_headers:
            self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        if 'cross-origin-opener-policy' not in self._sent_custom_headers:
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
        if _is_https_request(self) and 'strict-transport-security' not in self._sent_custom_headers:
            self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        if p_clean.startswith(_NOINDEX_PREFIXES) and 'x-robots-tag' not in self._sent_custom_headers:
            self.send_header('X-Robots-Tag', 'noindex, nofollow, noarchive')

        if not self._cache_control_sent:
            if _is_no_store_path(p_clean):
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            elif p_clean.startswith('/api/'):
                self.send_header('Cache-Control', 'public, max-age=300, must-revalidate')
            elif any(p_clean.endswith(ext) for ext in ('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.m4a', '.mp4', '.webm', '.wav', '.ogg')):
                self.send_header('Cache-Control', 'public, max-age=2592000, immutable')
            elif any(p_clean.endswith(ext) for ext in ('.css', '.js')):
                self.send_header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
            elif p_clean.endswith('.txt'):
                self.send_header('Cache-Control', 'public, max-age=86400')
            elif any(p_clean.endswith(ext) for ext in ('.html', '.php', '.json', '.webmanifest')) or p_clean in ('', '/'):
                self.send_header('Cache-Control', 'public, max-age=0, must-revalidate')
        super().end_headers()

    def send_head(self):
        # Serve static files with cached Gzip compression & ETag support
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            parts = urllib.parse.urlsplit(self.path)
            if not parts.path.endswith('/'):
                self.send_response(301)
                new_parts = (parts[0], parts[1], parts[2] + '/', parts[3], parts[4])
                self.send_header("Location", urllib.parse.urlunsplit(new_parts))
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index_path = os.path.join(path, index)
                if os.path.exists(index_path):
                    path = index_path
                    break
            else:
                return super().send_head()

        ctype = self.guess_type(path)
        try:
            fs = os.stat(path)
        except OSError:
            self.send_error(404, "File not found")
            return None

        compress_types = ('text/', 'application/javascript', 'text/javascript', 'application/json', 'image/svg+xml')
        is_compressible = any(ctype.startswith(t) for t in compress_types)
        etag = f'"{int(fs.st_mtime)}-{fs.st_size}"'
        if self._etag_matches(etag):
            self.send_response(304)
            self.send_header('ETag', etag)
            if is_compressible:
                self.send_header('Vary', 'Accept-Encoding')
            self.end_headers()
            return None

        accepts_gzip = 'gzip' in (self.headers.get('Accept-Encoding') or '').lower()
        should_compress = accepts_gzip and is_compressible and fs.st_size > 256

        if should_compress:
            try:
                _, compressed_data, cached_etag, cached_mtime = _get_cached_static_file(path, allow_gzip=True)
                if compressed_data:
                    self.send_response(200)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Encoding", "gzip")
                    self.send_header("Vary", "Accept-Encoding")
                    self.send_header("Content-Length", str(len(compressed_data)))
                    self.send_header("ETag", cached_etag)
                    self.send_header("Last-Modified", self.date_time_string(cached_mtime))
                    self.end_headers()
                    return io.BytesIO(compressed_data)
            except Exception:
                pass

        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if is_compressible:
            self.send_header("Vary", "Accept-Encoding")
        self.send_header("Content-Length", str(fs[6]))
        self.send_header("ETag", etag)
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.end_headers()
        return f

    def get_request_user(self):
        # Strictly trust server-verified HMAC session cookie OR signed Bearer token.
        # NEVER trust unsigned currentUser cookie or forgeable X-User header.
        cookie_header = self.headers.get('Cookie', '')
        if 'dg_session=' in cookie_header:
            for piece in cookie_header.split(';'):
                piece = piece.strip()
                if piece.startswith('dg_session='):
                    tok = urllib.parse.unquote(piece[len('dg_session='):]).strip()
                    user = verify_session_token(tok)
                    if user:
                        return user
                    break

        auth_h = self.headers.get('Authorization', '').strip()
        if auth_h.lower().startswith('bearer '):
            ident = verify_dlove_token(auth_h[7:].strip())
            if ident:
                return db.get_user_by_identifier(ident)

        return None

    get_current_user = get_request_user

    def translate_path(self, path):
        base_dir = os.path.realpath(DIRECTORY)
        uploads_dir = os.path.realpath(UPLOADS_DIR)
        resolved = super().translate_path(path)
        real_resolved = os.path.realpath(resolved)
        if not (real_resolved == base_dir or real_resolved.startswith(base_dir + os.sep)):
            return os.path.join(base_dir, '__invalid_traversal__')
        if not os.path.exists(resolved):
            clean = urllib.parse.urlparse(path).path.lstrip('/')
            if clean.startswith('uploads/'):
                up_rel = clean[len('uploads/'):].replace('\\', '/')
                up_cand = os.path.realpath(os.path.join(uploads_dir, up_rel))
                if up_cand.startswith(uploads_dir + os.sep) and os.path.exists(up_cand):
                    return up_cand
            if clean and '/' not in clean and '\\' not in clean:
                legacy_cand = os.path.realpath(os.path.join(DIRECTORY, 'assets', 'legacy', clean))
                if legacy_cand.startswith(base_dir + os.sep) and os.path.exists(legacy_cand):
                    return legacy_cand
        return resolved

    def _safe_exec(self, fn):
        try:
            return fn()
        except _BadRequestError as bre:
            return self.send_json_response(
                {"status": "error", "success": False, "message": bre.message},
                status=bre.status,
            )
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return None
        except Exception:
            traceback.print_exc()
            if self.is_json_request() or (self.path or '').startswith(('/api/', '/settings', '/auth_')):
                return self.send_json_response(
                    {"status": "error", "success": False, "message": "Có lỗi xảy ra, vui lòng thử lại sau."},
                    status=500,
                )
            return self.send_error(500, "Internal Server Error")

    def do_OPTIONS(self):
        p_clean = (self.path or '/').lower().split('?', 1)[0]
        self.send_response(200, "OK")
        cors_orig = self._allowed_cors_origin(p_clean)
        if cors_orig:
            self.send_header('Access-Control-Allow-Origin', cors_orig)
            if cors_orig != '*':
                self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Requested-With, X-CSRF-Token, X-Webhook-Secret, Secure-Token')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_PUT(self):
        def _run():
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path.startswith('/api/dlove/'):
                return self.handle_dlove_put(parsed.path, urllib.parse.parse_qs(parsed.query))
            self.send_error(404, "Endpoint not found")
        return self._safe_exec(_run)

    def do_PATCH(self):
        def _run():
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path.startswith('/api/dlove/'):
                return self.handle_dlove_post(parsed.path, urllib.parse.parse_qs(parsed.query))
            self.send_error(404, "Endpoint not found")
        return self._safe_exec(_run)

    def do_DELETE(self):
        def _run():
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path.startswith('/api/dlove/'):
                user = self.get_current_user()
                if not user and not verify_admin_request(self):
                    return self.send_json_response({"success": False, "message": "Vui lòng đăng nhập!"}, status=401)
                return self.send_json_response({"success": True, "data": {}})
            self.send_error(404, "Endpoint not found")
        return self._safe_exec(_run)

    def do_GET(self):
        return self._safe_exec(self._handle_do_GET)

    def _handle_do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Lightweight Railway / load-balancer healthcheck (no-store, zero DB query)
        if path in ('/health', '/healthz', '/ping'):
            return self.send_json_response({"status": "ok", "service": "deargift"}, allow_etag=False)

        if self.path.startswith('/api/gift-settings'):
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
            return self.send_json_response(resp_data)

        # Block access to internal/sensitive system files
        if is_protected_system_file(path):
            self.send_error(404, "File not found")
            return

        # Serve /favicon.ico cleanly from brand icon (prevents noisy 404 egress)
        if path == '/favicon.ico' and not os.path.exists(os.path.join(DIRECTORY, 'favicon.ico')):
            fav_png = os.path.join(DIRECTORY, 'assets', 'images', 'logo-heart-32.png')
            if os.path.exists(fav_png):
                try:
                    raw_fav, _, _, _ = _get_cached_static_file(fav_png, allow_gzip=False)
                    return self.send_bytes_response(raw_fav, content_type='image/png', allow_etag=True, compressible=False)
                except Exception:
                    pass

        # Media file handling (Video and Audio with full HTTP 206 Range support)
        if path.lower().endswith(('.mp4', '.webm', '.mp3', '.m4a', '.wav', '.ogg')):
            fname = os.path.basename(path)
            fname_low = fname.lower()
            ext_mime_map = {
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.mp3': 'audio/mpeg',
                '.m4a': 'audio/mp4',
                '.ogg': 'audio/ogg',
                '.wav': 'audio/wav',
            }
            ctype = next((m for ext, m in ext_mime_map.items() if fname_low.endswith(ext)), 'application/octet-stream')
            
            # Direct path check with traversal containment
            base_dir_real = os.path.realpath(DIRECTORY)
            uploads_dir_real = os.path.realpath(UPLOADS_DIR)
            direct = os.path.realpath(os.path.join(DIRECTORY, path.lstrip('/')))
            in_safe_dir = (
                direct.startswith(base_dir_real + os.sep)
                or direct.startswith(uploads_dir_real + os.sep)
            )
            if in_safe_dir and os.path.exists(direct) and os.path.isfile(direct):
                return self.serve_media_with_range(direct, ctype)

            cand_paths = [
                os.path.join(DIRECTORY, 'assets', 'legacy', fname),
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
                portal_tok = _admin_portal_cookie_token(secret_pass)
                sec_attr = "; Secure" if _is_https_request(self) else ""
                cookie_val = f"admin_portal_access={portal_tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800{sec_attr}"
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

        if path in ['/tao-vuon.html', '/tao-vuon', '/tao-vuon.php', '/sua-vuon.html', '/sua-vuon']:
            return self.serve_tao_vuon(query)

        if path in ['/gift-qr.html', '/gift-qr']:
            return self.serve_file('gift-qr.html')

        if path.startswith('/vuon/'):
            slug_part = path[len('/vuon/'):].strip('/')
            return self.serve_vuon_slug(slug_part)

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

        if path in ['/orders.php', '/orders.html', '/orders']:
            return self.serve_file('orders.html')

        if path in ['/transactions.php', '/transactions.html', '/transactions']:
            return self.serve_file('transactions.html')

        if path in ['/support.php', '/support.html', '/support']:
            return self.serve_file('support.html')

        if path in ['/payment.php', '/payment.html', '/payment']:
            return self.serve_file('payment.php')

        if path == '/api/payment/details':
            code = query.get('code', query.get('uid', ['']))[0].strip()
            gift = get_gift(code)
            if gift and not gift.get('paid', False):
                sync_casso_transactions()
                gift = get_gift(code)
            if not gift:
                return self.send_json_response({"success": False, "message": "Không tìm thấy đơn hàng"}, status=404)
            settings = get_settings()
            amt = max(0, int(gift.get('amount') or 0))
            scode = gift.get('share_code') or gift.get('id')
            t_content = gift.get('transfer_content') or f"DEAR {scode}"
            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amt}&addInfo={urllib.parse.quote(t_content)}&accountName={urllib.parse.quote(settings['account_name'])}"
            # Expose only payment checkout summary — strip letter content, PIN/passcode, photos, user PII
            g_out = {
                "id": gift.get("id"),
                "share_code": scode,
                "recipient_name": gift.get("recipient_name") or "Người thương",
                "amount": amt,
                "transfer_content": t_content,
                "status": gift.get("status") or "pending",
                "paid": bool(gift.get("paid")),
                "qr_url": qr_url,
            }
            return self.send_json_response({
                "success": True,
                "gift": g_out,
                "bank": {
                    "code": settings['bank_code'],
                    "name": settings['bank_name'],
                    "account": settings['account_number'],
                    "account_name": settings['account_name']
                }
            })

        if path.startswith('/api/dlove/'):
            return self.handle_dlove_get(path, query)

        if path in ['/settings.php', '/settings.html', '/settings']:
            return self.serve_file('settings.php')

        if path in ['/logout.php', '/logout']:
            self.send_redirect('/login.html', cookie=clear_auth_cookies(self))
            return

        # CSRF Token API
        if path == '/api_csrf_token.php':
            token = f"csrf_{secrets.token_hex(16)}"
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

        # Bank Webhook via GET (STRICTLY requires admin or configured webhook secret header)
        if path in ['/api/webhook/bank', '/webhook_bank.php']:
            if not self._verify_webhook_request():
                self.send_json_response({"error": 403, "success": False, "message": "Forbidden: webhook secret required"}, status=403)
                return
            content = str(query.get('content', [''])[0] or query.get('code', [''])[0] or '').upper()
            explicit = query.get('code', [''])[0].strip().upper()
            paid_amt = None
            if 'amount' in query:
                try:
                    paid_amt = int(float(query['amount'][0]))
                except (ValueError, TypeError):
                    paid_amt = 0
            matched_codes = db.match_and_activate_from_text(content, explicit_code=explicit, gateway='bank_get', raw_payload=query, paid_amount=paid_amt)
            if matched_codes:
                self.send_json_response({"error": 0, "success": True, "message": f"Đã tự động kích hoạt quà! Mã: {', '.join(matched_codes)}", "matched": matched_codes})
            else:
                self.send_json_response({"error": 0, "success": True, "message": "Không tìm thấy mã quà khớp", "matched": []})
            return

        # API: /api/templates
        if path == '/api/templates':
            self.send_json_response(get_templates())
            return

        # API: /api/stats (Real-time live system stats synced with catalog & DB)
        if path == '/api/stats':
            stats = db.get_stats()
            tpl_list = get_templates()
            free_cnt = sum(
                1 for t in tpl_list
                if str(t.get('price', '')).strip().lower() in ('miễn phí', 'free', '0', '')
            )
            stats['total_templates'] = len(tpl_list)
            stats['free_templates'] = free_cnt
            stats['paid_templates'] = max(0, len(tpl_list) - free_cnt)
            self.send_json_response({
                "success": True,
                "data": stats
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

        # API: /api/my-gifts & /api/gifts (Admin sees all; customers strictly isolated)
        if path in ['/api/my-gifts', '/api/gifts']:
            if path == '/api/gifts' and verify_admin_request(self):
                self.send_json_response({
                    "status": "success",
                    "role": "admin",
                    "gifts": db.get_all_gifts()
                })
                return

            user = self.get_current_user()
            if not user:
                self.send_json_response({
                    "status": "guest",
                    "require_login": True,
                    "gifts": []
                })
                return

            user_gifts = db.get_gifts_for_user(user)
            self.send_json_response({
                "status": "success",
                "user": user.get('username') or user.get('email'),
                "gifts": user_gifts
            })
            return

        # API: /api/my-orders (Customer Orders with VietQR payment info)
        if path in ['/api/my-orders', '/api/orders']:
            user = self.get_current_user()
            if not user:
                self.send_json_response({
                    "status": "guest",
                    "require_login": True,
                    "orders": []
                })
                return
            settings = get_settings()
            bank_code = settings.get('bank_code', 'MB')
            account_number = settings.get('account_number', '2006999988836')
            account_name = settings.get('account_name', 'NGUYEN VAN PHONG')
            bank_name = settings.get('bank_name', 'MBBank')
            user_gifts = db.get_gifts_for_user(user)
            orders = []
            for g in user_gifts:
                amt = int(g.get('amount') or 0)
                scode = g.get('share_code') or g.get('id')
                t_content = g.get('transfer_content') or f"DEAR {scode}"
                qr_url = f"https://img.vietqr.io/image/{bank_code}-{account_number}-compact2.png?amount={amt}&addInfo={urllib.parse.quote(t_content)}&accountName={urllib.parse.quote(account_name)}"
                item = dict(g)
                item['qr_url'] = qr_url
                item['bank'] = {
                    'code': bank_code,
                    'name': bank_name,
                    'account': account_number,
                    'account_name': account_name,
                }
                orders.append(item)
            self.send_json_response({
                "status": "success",
                "user": user.get('username') or user.get('email'),
                "orders": orders
            })
            return

        # API: /api/my-transactions (Customer Payment Transactions)
        if path in ['/api/my-transactions', '/api/transactions']:
            user = self.get_current_user()
            if not user:
                self.send_json_response({
                    "status": "guest",
                    "require_login": True,
                    "transactions": []
                })
                return
            txs = db.get_transactions_for_user(user)
            self.send_json_response({
                "status": "success",
                "user": user.get('username') or user.get('email'),
                "transactions": txs
            })
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

    def do_HEAD(self):
        return self.do_GET()

    def _verify_webhook_request(self) -> bool:
        if verify_admin_request(self):
            return True
        expected = _get_webhook_secret()
        if not expected:
            return False
        candidates = [
            self.headers.get('X-Webhook-Secret', ''),
            self.headers.get('Secure-Token', ''),
            self.headers.get('X-Secrete-Key', ''),
        ]
        auth_h = self.headers.get('Authorization', '').strip()
        if auth_h.lower().startswith(('bearer ', 'apikey ')):
            candidates.append(auth_h.split(' ', 1)[1].strip())
        for cand in candidates:
            if cand and hmac.compare_digest(cand.strip(), expected):
                return True
        return False

    def _user_owns_gift(self, user, gift) -> bool:
        if verify_admin_request(self):
            return True
        if not user or not gift:
            return False
        user_keys = {
            str(user.get('id') or '').strip().lower(),
            str(user.get('username') or '').strip().lower(),
            str(user.get('email') or '').strip().lower(),
        } - {'', 'guest'}
        gift_keys = {
            str(gift.get('user_id') or '').strip().lower(),
            str(gift.get('username') or '').strip().lower(),
            str(gift.get('user_email') or '').strip().lower(),
        } - {'', 'guest'}
        return bool(user_keys & gift_keys)

    def _parse_template_catalog_price(self, template_id: str, settings: dict) -> int:
        tid_s = str(template_id or '').strip()
        for t in get_templates():
            if str(t.get('id', '')).strip() == tid_s:
                p_str = str(t.get('price', '') or '').strip().lower()
                if p_str in ('miễn phí', 'free', '0', '0đ', ''):
                    return 0
                digits = re.sub(r'[^0-9]', '', p_str)
                return int(digits) if digits else 0
        try:
            return max(0, int(float(settings.get('price_amount') or 50000)))
        except (ValueError, TypeError):
            return 50000

    def _calculate_authoritative_gift_price(self, data: dict, template_id: str, photos: list, fly_photos: list, music: str, settings: dict) -> int:
        base_price = self._parse_template_catalog_price(template_id, settings)
        dur = str(data.get('duration') or '').strip().lower()
        dur_map = {'': 0, 'free': 0, '15d': 0, '7d': 0, '30d': 0, 'one_year': 30000, 'lifetime': 60000}
        dur_price = dur_map.get(dur, 0)

        qr_raw = str(data.get('enable_qr') or '').strip().lower()
        qr_price = 10000 if qr_raw in ('1', 'true', 'on', 'yes') else 0

        music_upload = str(data.get('music_upload') or '').strip()
        music_price = 10000 if music_upload.startswith('uploads/') else 0

        use_default = str(data.get('use_default_photos') or '').strip().lower() in ('1', 'true', 'on', 'yes')
        photo_price = 0
        if not use_default:
            uploaded_cnt = sum(1 for u in (photos + fly_photos) if isinstance(u, str) and u.lstrip('/').startswith('uploads/'))
            photo_price = min(40, uploaded_cnt) * 5000

        tip_raw = data.get('tip_amount_val') or data.get('tip') or 0
        if isinstance(tip_raw, list):
            tip_raw = tip_raw[0]
        try:
            tip_amt = max(0, min(int(float(str(tip_raw or 0).strip())), 10_000_000))
        except (ValueError, TypeError):
            tip_amt = 0

        return max(0, base_price + dur_price + qr_price + music_price + photo_price + tip_amt)

    def do_POST(self):
        return self._safe_exec(self._handle_do_POST)

    def _handle_do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        client_ip = _get_client_ip(self)

        # Block access to internal/sensitive system files
        if is_protected_system_file(path):
            self.send_error(404, "File not found")
            return

        if path in ['/logout.php', '/logout', '/api/logout']:
            cookies = clear_auth_cookies(self)
            if self.is_json_request() or path.startswith('/api/'):
                self.send_json_response({"status": "success", "success": True, "message": "Đã đăng xuất!"}, cookie=cookies)
            else:
                self.send_redirect('/login.html', cookie=cookies)
            return

        # Route Live Preview (POST - from v3LivePreview)
        if path in ['/templates/_v3/live.php', '/templates/_v3/live.html']:
            data = self.read_request_data(max_bytes=2 * 1024 * 1024)
            return self.serve_live_preview(data)

        # Bank Webhook for Auto Payment Approval (STRICTLY requires verified secret + amount check)
        casso_paths = [
            '/api/webhook/bank', '/api/payment/webhook', '/webhook_bank.php',
            '/api/casso/webhook', '/api/seapay/webhook', '/casso/webhook',
            '/webhook/casso', '/webhook', '/api/webhook', '/webhook.php',
            '/casso', '/casso.php', '/api/casso', '/api/casso.php',
            '/casso-webhook', '/casso_webhook', '/casso_webhook.php'
        ]
        if path.rstrip('/') in [p.rstrip('/') for p in casso_paths]:
            if not self._verify_webhook_request():
                self.send_json_response({
                    "error": 403,
                    "success": False,
                    "message": "Forbidden: invalid webhook secret"
                }, status=403)
                return
            data = self.read_request_data(max_bytes=256 * 1024, allow_list=True)
            matched_codes = []
            # Support Casso array payload: {"error": 0, "data": [{"description": "...", "amount": 50000}]}
            records = data.get('data') if isinstance(data, dict) and isinstance(data.get('data'), list) else None
            if records is not None:
                for rec in records:
                    if not isinstance(rec, dict):
                        continue
                    desc = str(rec.get('description') or '').upper()
                    try:
                        rec_amt = int(float(rec.get('amount') or 0))
                    except (ValueError, TypeError):
                        rec_amt = 0
                    if rec_amt <= 0:
                        continue
                    matched_codes.extend(db.match_and_activate_from_text(desc, gateway='webhook', raw_payload=rec, paid_amount=rec_amt))
            else:
                raw_text = json.dumps(data, ensure_ascii=False).upper() if isinstance(data, (dict, list)) else str(data).upper()
                explicit_code = str(data.get('code') or data.get('share_code') or '').strip().upper() if isinstance(data, dict) else ''
                paid_amt = None
                if isinstance(data, dict) and 'amount' in data and data.get('amount') is not None:
                    try:
                        paid_amt = int(float(data.get('amount')))
                    except (ValueError, TypeError):
                        paid_amt = 0
                matched_codes = db.match_and_activate_from_text(raw_text, explicit_code=explicit_code, gateway='webhook', raw_payload=data, paid_amount=paid_amt)

            if matched_codes:
                self.send_json_response({
                    "error": 0,
                    "success": True,
                    "message": f"Đã tự động kích hoạt quà theo webhook ngân hàng! Mã quà: {', '.join(matched_codes)}",
                    "matched": matched_codes
                })
            else:
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

        # 2. Google OAuth Authentication (Verified ID Token Only)
        if path in ['/auth_google.php', '/api/auth/google']:
            limited, _, wait_sec = _GOOGLE_AUTH_LIMITER.check_and_consume(client_ip)
            if limited:
                self.send_json_response({
                    "success": False,
                    "status": "error",
                    "message": f"Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau {wait_sec} giây!"
                }, status=429)
                return
            data = self.read_request_data(max_bytes=65536)
            user, err = process_google_auth(data)
            if user:
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                self.send_json_response({
                    "success": True,
                    "status": "success",
                    "message": f"Chào mừng {user.get('full_name')}!",
                    "redirect": "/templates.php",
                    "user": safe_user
                }, cookie=build_auth_cookies(self, user))
            else:
                self.send_json_response({"success": False, "status": "error", "message": err or "Đăng nhập Google thất bại!"}, status=400)
            return

        # 3. API: Register User (Strict Validation + Rate Limiting)
        if path in ['/api/register', '/register.php', '/register']:
            limited, wait_sec = _REGISTER_LIMITER.is_limited(client_ip)
            if limited:
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": f"Quá nhiều lần đăng ký từ IP của bạn. Thử lại sau {wait_sec} giây!"}, status=429)
                else:
                    self.send_redirect('/register.html?error=rate_limited')
                return

            data = self.read_request_data(max_bytes=65536)
            username = data.get('username', '')
            email = data.get('email', '')
            password = data.get('password', '')
            full_name = data.get('full_name', username if isinstance(username, str) else '')

            if not isinstance(username, str) or not isinstance(email, str) or not isinstance(password, str):
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": "Dữ liệu đăng ký không hợp lệ!"}, status=400)
                else:
                    self.send_redirect('/register.html?error=invalid_input')
                return

            user_obj, err = db.register_user(
                username=username,
                email=email,
                password=password,
                full_name=full_name if isinstance(full_name, str) else '',
            )
            if not user_obj:
                is_dup = bool(err and 'đã được sử dụng' in err)
                status_code = 409 if is_dup else 400
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": err or "Đăng ký thất bại!"}, status=status_code)
                else:
                    self.send_redirect('/register.html?error=' + ('account_exists' if is_dup else 'invalid_input'))
                return

            _REGISTER_LIMITER.record(client_ip)
            safe_user = {k: v for k, v in user_obj.items() if k != 'password'}
            cookies = build_auth_cookies(self, user_obj)
            if self.is_json_request():
                self.send_json_response({
                    "status": "success",
                    "message": "Đăng ký tài khoản thành công!",
                    "user": safe_user,
                    "redirect": "/templates.php"
                }, cookie=cookies)
            else:
                self.send_redirect('/templates.php', cookie=cookies)
            return

        # 4. API: Login User (Rate-Limited + Strict Validation + Signed HttpOnly Session)
        if path in ['/api/login', '/login.php', '/login']:
            data = self.read_request_data(max_bytes=65536)
            raw_user = data.get('username', '')
            raw_pwd = data.get('password', '')
            if not isinstance(raw_user, str) or not isinstance(raw_pwd, str):
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": "Dữ liệu đăng nhập không hợp lệ!"}, status=400)
                else:
                    self.send_redirect('/login.html?error=invalid_credentials')
                return

            username = raw_user.strip()
            password = raw_pwd
            if not username or len(username) > 254 or not password or not password.strip() or len(password) > 128:
                if self.is_json_request():
                    self.send_json_response({"status": "error", "message": "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu hợp lệ!"}, status=400)
                else:
                    self.send_redirect('/login.html?error=missing_fields')
                return

            acct_key = f"{client_ip}:{username.lower()}"
            ip_lim, ip_wait = _LOGIN_IP_LIMITER.is_limited(client_ip)
            acc_lim, acc_wait = _LOGIN_ACCOUNT_LIMITER.is_limited(acct_key)
            if ip_lim or acc_lim:
                wait_s = max(ip_wait, acc_wait)
                if self.is_json_request():
                    self.send_json_response({
                        "status": "error",
                        "message": f"Nhập sai quá nhiều lần. Vui lòng thử lại sau {wait_s} giây!"
                    }, status=429)
                else:
                    self.send_redirect('/login.html?error=rate_limited')
                return

            user = find_user_by_login(username, password)
            if user:
                _LOGIN_ACCOUNT_LIMITER.reset(acct_key)
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                cookies = build_auth_cookies(self, user)
                if self.is_json_request():
                    self.send_json_response({
                        "status": "success",
                        "message": "Đăng nhập thành công!",
                        "user": safe_user,
                        "redirect": "/templates.php"
                    }, cookie=cookies)
                else:
                    self.send_redirect('/templates.php', cookie=cookies)
            else:
                _LOGIN_IP_LIMITER.record(client_ip)
                acc_now_lim, remaining, wait_s = _LOGIN_ACCOUNT_LIMITER.record(acct_key)
                if acc_now_lim:
                    if self.is_json_request():
                        self.send_json_response({
                            "status": "error",
                            "message": f"Nhập sai quá 5 lần. Tài khoản tạm khóa {wait_s} giây!"
                        }, status=429)
                    else:
                        self.send_redirect('/login.html?error=rate_limited')
                    return
                if self.is_json_request():
                    self.send_json_response({
                        "status": "error",
                        "message": f"Tên đăng nhập hoặc mật khẩu không chính xác! Còn {remaining} lần thử."
                    }, status=401)
                else:
                    self.send_redirect('/login.html?error=invalid_credentials')
            return

        # 5. API: Submit Idea (Homepage Idea Modal)
        if path == '/api_submit_idea.php':
            limited, _, wait_sec = _FEEDBACK_LIMITER.check_and_consume(client_ip)
            if limited:
                self.send_json_response({"success": False, "message": f"Gửi quá nhanh, vui lòng thử lại sau {wait_sec} giây!"}, status=429)
                return
            data = self.read_request_data(max_bytes=16384)
            name = db.sanitize_text(data.get('name', 'Khách hàng'), max_len=80) or 'Khách hàng'
            contact = db.sanitize_text(data.get('contact', ''), max_len=120)
            content = db.sanitize_text(data.get('content', ''), max_len=2000, allow_newlines=True)
            if not content:
                self.send_json_response({"success": False, "message": "Vui lòng nhập nội dung ý tưởng!"}, status=400)
                return
            db.add_idea(name=name, contact=contact, content=content)
            self.send_json_response({
                "success": True,
                "message": "Cảm ơn bạn đã đóng góp ý tưởng! Chúng tôi sẽ xem xét sớm nhất."
            })
            return

        # 6. API: Submit Review (Homepage Reviews Section)
        if path == '/api_submit_review.php':
            limited, _, wait_sec = _FEEDBACK_LIMITER.check_and_consume(client_ip)
            if limited:
                self.send_json_response({"success": False, "message": f"Gửi quá nhanh, vui lòng thử lại sau {wait_sec} giây!"}, status=429)
                return
            data = self.read_request_data(max_bytes=16384)
            user = self.get_request_user()
            try:
                rating = max(1, min(5, int(data.get('rating', 5) or 5)))
            except (ValueError, TypeError):
                rating = 5
            content = db.sanitize_text(data.get('content', ''), max_len=2000, allow_newlines=True)
            author_name = user.get('full_name') if user else (db.sanitize_text(data.get('author', 'Khách hàng'), max_len=80) or 'Khách hàng')
            db.add_review(author=author_name, rating=rating, content=content)
            self.send_json_response({
                "success": True,
                "message": "Cảm ơn bạn đã gửi đánh giá!"
            })
            return

        # 7. API: User Settings / Profile Updates (STRICT Auth + Current Password + Ownership)
        if path in ['/settings.php', '/api/user/settings', '/api/settings/update']:
            data = self.read_request_data(max_bytes=65536)
            act = data.get('action')
            user = self.get_request_user()
            if not user:
                self.send_json_response({"status": "error", "success": False, "message": "Vui lòng đăng nhập để thực hiện thao tác này!"}, status=401)
                return

            lim_key = f"{client_ip}:{user['id']}"
            limited, _, wait_sec = _SETTINGS_LIMITER.check_and_consume(lim_key)
            if limited:
                self.send_json_response({"status": "error", "success": False, "message": f"Thao tác quá nhanh! Vui lòng thử lại sau {wait_sec} giây."}, status=429)
                return

            if act == 'update_profile':
                new_name = data.get('full_name')
                phone = data.get('phone') if 'phone' in data else None
                updated = db.update_user_profile(user['id'], full_name=new_name, phone=phone) or user
                safe_user = {k: v for k, v in updated.items() if k != 'password'}
                self.send_json_response({"status": "success", "success": True, "message": "Cập nhật hồ sơ thành công!", "user": safe_user})
                return
            elif act == 'change_password':
                cur_pwd = data.get('current_password', '')
                new_pwd = data.get('new_password', '')
                if not isinstance(new_pwd, str) or not isinstance(cur_pwd, str):
                    self.send_json_response({"status": "error", "success": False, "message": "Dữ liệu mật khẩu không hợp lệ!"}, status=400)
                    return
                matched, has_pwd = db.verify_user_password(user['id'], cur_pwd)
                if has_pwd and not matched:
                    self.send_json_response({"status": "error", "success": False, "message": "Mật khẩu hiện tại không chính xác!"}, status=403)
                    return
                pwd_val, pwd_err = db.validate_password(new_pwd, min_len=6, max_len=128)
                if pwd_err or not pwd_val:
                    self.send_json_response({"status": "error", "success": False, "message": pwd_err or "Mật khẩu mới không hợp lệ!"}, status=400)
                    return
                if not db.update_user_password(user['id'], pwd_val):
                    self.send_json_response({"status": "error", "success": False, "message": "Không thể cập nhật mật khẩu!"}, status=500)
                    return
                fresh_user = db.get_user_by_id(user['id']) or user
                self.send_json_response(
                    {"status": "success", "success": True, "message": "Đổi mật khẩu thành công!"},
                    cookie=build_auth_cookies(self, fresh_user),
                )
                return
            elif act == 'delete_account':
                confirm_u = str(data.get('confirm_username') or '').strip()
                if not confirm_u or confirm_u != str(user.get('username') or '').strip():
                    self.send_json_response({"status": "error", "success": False, "message": "Tên đăng nhập xác nhận không khớp!"}, status=400)
                    return
                cur_pwd = data.get('current_password', '')
                matched, has_pwd = db.verify_user_password(user['id'], cur_pwd if isinstance(cur_pwd, str) else '')
                if has_pwd and not matched:
                    self.send_json_response({"status": "error", "success": False, "message": "Vui lòng nhập đúng mật khẩu hiện tại để xóa tài khoản!"}, status=403)
                    return
                db.delete_user(user['id'])
                self.send_json_response({"status": "success", "success": True, "message": "Tài khoản đã được xóa!"}, cookie=clear_auth_cookies(self))
                return

            self.send_json_response({"status": "error", "success": False, "message": "Hành động không hợp lệ!"}, status=400)
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

            limited, _, wait_sec = _CREATE_LIMITER.check_and_consume(client_ip)
            if limited:
                self.send_json_response({"success": False, "status": "error", "message": f"Tạo quà quá nhanh, thử lại sau {wait_sec} giây!"}, status=429)
                return

            data = self.read_request_data(max_bytes=26 * 1024 * 1024)
            settings = get_settings()

            recipient_name = data.get('recipient_name') or data.get('v3_recipient_name') or "Người thương"
            if isinstance(recipient_name, list): recipient_name = recipient_name[0]
            recipient_name = db.sanitize_text(str(recipient_name or "Người thương"), max_len=80) or "Người thương"

            birthday_day = data.get('birthday_day') or data.get('v3_calendar_day') or (data.get('v3', {}).get('calendar_day') if isinstance(data.get('v3'), dict) else None) or 19
            if isinstance(birthday_day, list): birthday_day = birthday_day[0]
            try: birthday_day = max(1, min(31, int(birthday_day)))
            except Exception: birthday_day = 19

            birthday_month = data.get('birthday_month') or data.get('v3_calendar_month') or (data.get('v3', {}).get('calendar_month') if isinstance(data.get('v3'), dict) else None) or 11
            if isinstance(birthday_month, list): birthday_month = birthday_month[0]
            try: birthday_month = max(1, min(12, int(birthday_month)))
            except Exception: birthday_month = 11

            letter_title = data.get('letter_title') or "Gửi người thương!"
            if isinstance(letter_title, list): letter_title = letter_title[0]
            letter_title = db.sanitize_text(str(letter_title or "Gửi người thương!"), max_len=120) or "Gửi người thương!"

            letter_content = data.get('letter_content') or data.get('val_letter_content') or "Chúc bạn luôn hạnh phúc và rạng rỡ mỗi ngày! ❤️"
            if isinstance(letter_content, list): letter_content = letter_content[0]
            letter_content = db.sanitize_text(str(letter_content or ""), max_len=4000, allow_newlines=True)

            letter_signature = data.get('letter_signature') or "Nguyễn Văn Phong"
            if isinstance(letter_signature, list): letter_signature = letter_signature[0]
            letter_signature = db.sanitize_text(str(letter_signature or ""), max_len=80)

            template_id = str(query.get('id', [data.get('template_id', '69')])[0]).strip()[:20]
            template_slug = data.get('template_slug', 'mon-qua-nho-2010')
            if isinstance(template_slug, list): template_slug = template_slug[0]
            template_slug = re.sub(r'[^a-zA-Z0-9_-]', '', str(template_slug or 'mon-qua-nho-2010'))[:64]

            passcode = db.sanitize_text(str(data.get('password_value', data.get('passcode', ''))).strip(), max_len=32)
            music = data.get('music_url') or data.get('music') or './assets/music/givemeyourforever.mp3'
            if isinstance(music, list): music = music[0]
            music = db.sanitize_text(str(music or './assets/music/givemeyourforever.mp3'), max_len=500)

            # Parse photos (bounded to prevent array-flooding)
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
            photos = [str(u).strip()[:500] for u in photos if isinstance(u, str) and str(u).strip()][:30]

            fly_photos = []
            if 'fly_photos[]' in data:
                p = data['fly_photos[]']
                if isinstance(p, list): fly_photos.extend(p)
                elif p: fly_photos.append(p)
            if 'fly_photos' in data:
                p = data['fly_photos']
                if isinstance(p, list): fly_photos.extend(p)
                elif p: fly_photos.append(p)
            fly_photos = [str(u).strip()[:500] for u in fly_photos if isinstance(u, str) and str(u).strip()][:30]

            uid = f"g_{uuid.uuid4().hex[:8]}"
            share_code = f"DG{secrets.token_hex(4).upper()}"
            while get_gift(share_code) is not None:
                share_code = f"DG{secrets.token_hex(4).upper()}"

            # Server-authoritative pricing: NEVER trust client price to downgrade/bypass payment
            amount = self._calculate_authoritative_gift_price(
                data=data,
                template_id=template_id,
                photos=photos,
                fly_photos=fly_photos,
                music=music,
                settings=settings,
            )

            is_free = (amount <= 0)
            status = "active" if is_free else "pending"
            paid = True if is_free else False
            transfer_content = f"DEAR {share_code}"

            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amount}&addInfo=DEAR+{share_code}&accountName={urllib.parse.quote(settings['account_name'])}"

            sender_name = data.get('sender_name') or (user.get('full_name') if user else '') or letter_signature
            if isinstance(sender_name, list): sender_name = sender_name[0]
            sender_name = db.sanitize_text(str(sender_name or ''), max_len=80)

            new_gift = {
                "id": uid,
                "share_code": share_code,
                "template_id": template_id,
                "template_slug": template_slug,
                "recipient_name": recipient_name,
                "sender_name": sender_name,
                "birthday_day": birthday_day,
                "birthday_month": birthday_month,
                "v3": data.get("v3", {}) if isinstance(data.get("v3"), dict) else {},
                "pin": data.get("v3_pin") or (data.get("v3", {}).get("pin") if isinstance(data.get("v3"), dict) else None) or data.get("pin", ""),
                "unlock_date": data.get("v3_unlock_date") or (data.get("v3", {}).get("unlock_date") if isinstance(data.get("v3"), dict) else None) or "",
                "wishes_list": data.get("v3_wishes") or (data.get("v3", {}).get("wishes") if isinstance(data.get("v3"), dict) else None) or "",
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

            db.create_gift(new_gift)

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

        # 9. API: Confirm Payment (STRICTLY Admin Only — prevents self-activation)
        if path in ['/api/gifts/confirm_payment', '/api/gifts/pay']:
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "success": False, "message": "Yêu cầu quyền quản trị viên để duyệt thanh toán!"}, status=403)
                return
            data = self.read_request_data(max_bytes=16384)
            code = str(data.get('code') or data.get('share_code') or data.get('gift_id') or query.get('code', [''])[0]).strip()
            target_gift = db.activate_gift(code, gateway='manual', raw_payload=data)
            if target_gift:
                self.send_json_response({
                    "status": "success",
                    "success": True,
                    "message": "Thanh toán thành công! Món quà đã được kích hoạt.",
                    "gift": target_gift,
                    "view_url": f"/gift.php?uid={target_gift['id']}"
                })
            else:
                self.send_json_response({"status": "error", "success": False, "message": "Không tìm thấy mã quà tặng!"}, status=404)
            return

        # 10. API: Delete Gift
        if path == '/api/gifts/delete':
            data = self.read_request_data(max_bytes=16384)
            gift_id = data.get('id')
            if not isinstance(gift_id, str) or not gift_id.strip():
                self.send_json_response({"status": "error", "message": "Thiếu mã quà tặng!"}, status=400)
                return
            gift_id = gift_id.strip()
            is_admin = verify_admin_request(self)
            user = self.get_current_user()
            gift = get_gift(gift_id)
            if not is_admin:
                if not user:
                    self.send_json_response({"status": "error", "message": "Vui lòng đăng nhập!"}, status=401)
                    return
                if not gift:
                    self.send_json_response({"status": "error", "message": "Không tìm thấy món quà!"}, status=404)
                    return
                if not self._user_owns_gift(user, gift):
                    self.send_json_response({"status": "error", "message": "Không có quyền xóa món quà này!"}, status=403)
                    return
            elif not gift:
                self.send_json_response({"status": "error", "message": "Không tìm thấy món quà!"}, status=404)
                return
            db.delete_gift(gift_id)
            self.send_json_response({"status": "success", "message": "Đã xóa món quà!"})
            return

        # 11. API: Admin Login (Lock-Protected Brute-Force Shield + Constant-Time Check)
        if path == '/api/admin/login':
            now = datetime.now().timestamp()
            with ADMIN_LOCK:
                if len(ADMIN_FAILED_LOGINS) > 128:
                    stale = [
                        ip for ip, r in ADMIN_FAILED_LOGINS.items()
                        if (r.get('lockout_until', 0) and r.get('lockout_until', 0) + 3600 < now)
                        or (not r.get('lockout_until', 0) and r.get('count', 0) == 0)
                    ]
                    for ip in stale:
                        ADMIN_FAILED_LOGINS.pop(ip, None)
                rec = dict(ADMIN_FAILED_LOGINS.get(client_ip, {'count': 0, 'lockout_until': 0}))
            if rec.get('lockout_until', 0) > now:
                wait_sec = max(1, int(rec['lockout_until'] - now))
                self.send_json_response({"status": "error", "message": f"Nhập sai quá nhiều lần. IP của bạn tạm thời bị khóa trong {wait_sec} giây!"}, status=429)
                return

            data = self.read_request_data(max_bytes=65536)
            settings = get_settings()
            raw_entered = data.get('password', '')
            if not isinstance(raw_entered, str):
                self.send_json_response({"status": "error", "message": "Dữ liệu không hợp lệ!"}, status=400)
                return
            entered = raw_entered.strip()
            admin_pwd = str(settings.get('admin_password', 'Phongzhouok'))

            if entered and len(entered) <= 128 and hmac.compare_digest(entered, admin_pwd):
                token = secrets.token_hex(24)
                with ADMIN_LOCK:
                    ADMIN_FAILED_LOGINS.pop(client_ip, None)
                    ADMIN_SESSIONS.add(token)
                db.create_admin_session(token)
                self.send_json_response({"status": "success", "token": token, "message": "Đăng nhập CMS quản trị thành công!"})
            else:
                with ADMIN_LOCK:
                    cur = ADMIN_FAILED_LOGINS.get(client_ip, {'count': 0, 'lockout_until': 0})
                    cur['count'] = cur.get('count', 0) + 1
                    if cur['count'] >= 5:
                        cur['lockout_until'] = now + 900  # Lock 15 minutes
                        ADMIN_FAILED_LOGINS[client_ip] = cur
                        self.send_json_response({"status": "error", "message": "Nhập sai quá 5 lần. Địa chỉ IP của bạn bị khóa tạm thời 15 phút!"}, status=429)
                    else:
                        ADMIN_FAILED_LOGINS[client_ip] = cur
                        remaining = 5 - cur['count']
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
            new_item = self.read_request_data(max_bytes=65536)
            if not new_item or not isinstance(new_item.get('title'), str) or not new_item.get('title').strip():
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
            data = self.read_request_data(max_bytes=16384)
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
            data = self.read_request_data(max_bytes=65536)
            if not data:
                self.send_json_response({"status": "error", "message": "Dữ liệu không hợp lệ"}, status=400)
                return
            settings = get_settings()
            if 'bank_code' in data and isinstance(data['bank_code'], str):
                settings['bank_code'] = db.sanitize_text(data['bank_code'], max_len=32) or settings['bank_code']
            if 'account_number' in data and isinstance(data['account_number'], str):
                settings['account_number'] = db.sanitize_text(data['account_number'], max_len=40) or settings['account_number']
            if 'account_name' in data and isinstance(data['account_name'], str):
                settings['account_name'] = db.sanitize_text(data['account_name'], max_len=100) or settings['account_name']
            if 'price_amount' in data and data['price_amount'] is not None:
                try:
                    settings['price_amount'] = max(0, min(100_000_000, int(float(data['price_amount']))))
                except (ValueError, TypeError):
                    self.send_json_response({"status": "error", "message": "Số tiền mặc định không hợp lệ!"}, status=400)
                    return
            save_settings(settings)
            self.send_json_response({"status": "success", "message": "Đã cập nhật cấu hình thanh toán thành công!"})
            return

        # 15. API: Admin Change Password (No Hardcoded Backdoor Fallback)
        if path == '/api/admin/change-password':
            if not verify_admin_request(self):
                self.send_json_response({"status": "error", "message": "Yêu cầu quyền quản trị viên cao cấp!"}, status=403)
                return
            data = self.read_request_data(max_bytes=65536)
            settings = get_settings()
            cur_pwd = data.get('current_password')
            new_pwd = data.get('new_password')
            if not isinstance(cur_pwd, str) or not cur_pwd:
                self.send_json_response({"status": "error", "message": "Vui lòng nhập mật khẩu hiện tại!"}, status=400)
                return
            expected_pwd = str(settings.get('admin_password') or '')
            if not expected_pwd or not hmac.compare_digest(cur_pwd, expected_pwd):
                self.send_json_response({"status": "error", "message": "Mật khẩu hiện tại không đúng!"}, status=400)
                return
            pwd_val, pwd_err = db.validate_password(new_pwd, min_len=8, max_len=128)
            if pwd_err or not pwd_val:
                self.send_json_response({"status": "error", "message": pwd_err or "Mật khẩu mới phải từ 8 đến 128 ký tự!"}, status=400)
                return

            settings['admin_password'] = pwd_val
            save_settings(settings)
            cur_auth = self.headers.get('Authorization', '')
            cur_tok = cur_auth[7:].strip() if cur_auth.startswith('Bearer ') else ''
            with ADMIN_LOCK:
                ADMIN_SESSIONS.clear()
                if cur_tok:
                    ADMIN_SESSIONS.add(cur_tok)
            self.send_json_response({"status": "success", "message": "Đổi mật khẩu thành công!"})
            return

        # 16. API: Upload File
        if path.startswith('/api/dlove/'):
            return self.handle_dlove_post(path, query)

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
                        ext = os.path.splitext(os.path.basename(fileitem.filename))[1].lower()
                        if ext not in ALLOWED_UPLOAD_EXTS:
                            self.send_json_response({"status": "error", "message": "Định dạng file không được phép!"}, status=400)
                            return
                        raw = fileitem.file.read(25 * 1024 * 1024 + 1)
                        if len(raw) > 25 * 1024 * 1024 or not _validate_uploaded_bytes(ext, raw):
                            self.send_json_response({"status": "error", "message": "Tệp không hợp lệ hoặc vượt quá 25MB!"}, status=400)
                            return

                        filename = f"{uuid.uuid4().hex[:12]}{ext}"
                        dest_path = os.path.join(UPLOADS_DIR, filename)
                        with open(dest_path, 'wb') as fout:
                            fout.write(raw)

                        file_url = f"uploads/{filename}"
                        self.send_json_response({"status": "success", "url": file_url})
                        return

                self.send_json_response({"status": "error", "message": "Không tìm thấy file"}, status=400)
            except Exception:
                self.send_json_response({"status": "error", "message": "Lỗi khi tải tệp lên!"}, status=500)
            return

        self.send_error(404, "Endpoint not found")

    def _get_request_origin(self):
        proto = (self.headers.get('X-Forwarded-Proto') or 'http').split(',')[0].strip()
        host = (self.headers.get('Host') or f"127.0.0.1:{PORT}").strip()
        return f"{proto}://{host}"

    def _dlove_pricing_payload(self, tpl_type='silkgarden'):
        settings = get_settings()
        try:
            vip_price = max(0, int(float(settings.get('price_amount') or 19000)))
        except (ValueError, TypeError):
            vip_price = 19000
        return {
            "templateType": tpl_type,
            "requirePackage": True,
            "slugOrigin": self._get_request_origin() + "/vuon",
            "photoQuotaFields": {"people": "maxPhotos", "memories": "maxMemoryPhotos"},
            "expiration": {
                "15d": {"days": 15, "label": "15 ngày", "price": 0, "priceUsd": 0},
                "forever": {"days": None, "label": "Vĩnh viễn", "price": vip_price, "priceUsd": 2},
            },
            "features": {
                "people": {"label": "Ảnh khu vườn", "price": 0, "priceUsd": 0},
                "bouquet": {"label": "Bó hoa riêng", "price": 0, "priceUsd": 0},
                "memories": {"label": "Cuộn phim ký ức", "price": 0, "priceUsd": 0},
                "letter": {"label": "Lá thư", "price": 0, "priceUsd": 0},
                "customMusic": {"label": "Nhạc riêng", "price": 0, "priceUsd": 0},
                "customSlug": {"label": "Liên kết tùy chỉnh", "price": 0, "priceUsd": 0},
            },
            "packages": [
                {
                    "id": "free-garden",
                    "label": "Miễn phí",
                    "price": 0,
                    "priceUsd": 0,
                    "expiration": "15d",
                    "maxPhotos": 30,
                    "maxMemoryPhotos": 10,
                    "includes": ["people", "bouquet", "memories", "letter", "customMusic", "customSlug"],
                    "watermark": False,
                },
                {
                    "id": "vip-forever",
                    "label": "Lưu trữ vĩnh viễn",
                    "price": vip_price,
                    "priceUsd": 2,
                    "expiration": "forever",
                    "maxPhotos": 30,
                    "maxMemoryPhotos": 10,
                    "includes": ["people", "bouquet", "memories", "letter", "customMusic", "customSlug"],
                    "watermark": False,
                },
            ],
        }

    def _dlove_music_items(self):
        origin = self._get_request_origin()
        label_map = {
            "garden_bgm.mp3": ("Vườn hoa dịu dàng", ["dịu dàng", "có sẵn"]),
            "bongtrang.mp3": ("Bóng trăng", ["nhẹ nhàng"]),
            "somotthegioi.mp3": ("Sợ một thế giới", ["tình cảm"]),
            "givemeyourforever.mp3": ("Give Me Your Forever", ["lãng mạn"]),
            "phepmau.mp3": ("Phép màu", ["ấm áp"]),
            "danhchoem.mp3": ("Dành cho em", ["ngọt ngào"]),
            "messenger.mp3": ("Giai điệu kỷ niệm", ["acoustic"]),
            "nguoigieomamxanh.mp3": ("Người gieo mầm xanh", ["tri ân"]),
            "music.mp3": ("Giai điệu mùa yêu", ["lofi"]),
        }
        items = []
        seen = set()
        candidates = []
        vg_track = os.path.join(DIRECTORY, 'assets', 'vuon-hoa', 'audio', 'garden_bgm.mp3')
        if os.path.exists(vg_track):
            candidates.append(('/assets/vuon-hoa/audio/garden_bgm.mp3', 'garden_bgm.mp3'))
        music_dir = os.path.join(DIRECTORY, 'assets', 'music')
        if os.path.isdir(music_dir):
            for fname in sorted(os.listdir(music_dir)):
                if fname.lower().endswith('.mp3'):
                    candidates.append((f'/assets/music/{urllib.parse.quote(fname)}', fname))
        for rel_url, fname in candidates:
            full_url = f"{origin}{rel_url}"
            if full_url in seen:
                continue
            seen.add(full_url)
            name, tags = label_map.get(fname, (os.path.splitext(fname)[0].replace('-', ' ').replace('_', ' '), ["nhạc nền"]))
            items.append({
                "url": full_url,
                "name": name,
                "tags": tags,
                "occasion": "other",
                "durationSec": None,
            })
        return items

    def _normalize_dlove_url(self, val):
        if not isinstance(val, str):
            return val
        s = val.strip()
        m = re.match(r'^https?://[^/]+(/(?:uploads|assets)/.+)$', s, re.I)
        if m:
            return m.group(1)
        return s

    def _gift_hex16(self, gift_id):
        gid = str(gift_id or '').strip()
        if re.fullmatch(r'[a-f0-9]{16}', gid, re.I):
            return gid.lower()
        return hashlib.md5(gid.encode('utf-8')).hexdigest()[:16]

    def _find_dlove_gift(self, key_or_slug, by_slug=False):
        key = str(key_or_slug or '').strip()
        if not key:
            return None
        if not by_slug:
            direct = get_gift(key)
            if direct:
                return direct
        key_low = key.lower()
        for g in get_gifts():
            if by_slug:
                v3 = g.get('v3') if isinstance(g.get('v3'), dict) else {}
                cslug = str(v3.get('customSlug') or '').strip().lower()
                if (cslug and cslug == key_low) or str(g.get('share_code') or '').lower() == key_low or str(g.get('id') or '').lower() == key_low:
                    return g
            else:
                if self._gift_hex16(g.get('id')) == key_low:
                    return g
        return None

    def _dlove_gift_to_silkgarden(self, gift):
        v3 = gift.get('v3') if isinstance(gift.get('v3'), dict) else {}
        hex16 = str(v3.get('websiteId') or '').strip()
        if not re.fullmatch(r'[a-f0-9]{16}', hex16, re.I):
            hex16 = self._gift_hex16(gift.get('id'))

        if isinstance(v3.get('people'), list) and len(v3['people']) > 0:
            cfg = json.loads(json.dumps(v3, ensure_ascii=False))
            cfg['websiteId'] = hex16
            cfg['productType'] = 'silkgarden'
            cfg['configVersion'] = 1
            for p in cfg.get('people', []):
                if isinstance(p, dict):
                    p['image'] = self._normalize_dlove_url(p.get('image', ''))
                    p['original'] = self._normalize_dlove_url(p.get('original') or p.get('image', ''))
            if isinstance(cfg.get('memories'), dict) and isinstance(cfg['memories'].get('photos'), list):
                for mp in cfg['memories']['photos']:
                    if isinstance(mp, dict):
                        mp['image'] = self._normalize_dlove_url(mp.get('image', ''))
            if cfg.get('bgMusic'):
                cfg['bgMusic'] = self._normalize_dlove_url(cfg['bgMusic'])
            return cfg

        photos = [self._normalize_dlove_url(p) for p in (gift.get('photos') or []) if p]
        if not photos:
            photos = [f"/assets/vuon-hoa/portraits/portrait-0{i}.webp" for i in range(1, 6)]
        rec = str(gift.get('recipient_name') or 'Người thương')
        people = []
        for idx, p_url in enumerate(photos[:30]):
            people.append({
                "id": f"flower-{idx+1}",
                "name": rec if idx == 0 else f"Kỷ niệm {idx+1:02d}",
                "image": p_url,
                "original": p_url,
                "wish": str(gift.get('letter_content') or f"Chúc {rec} luôn hạnh phúc và rạng rỡ!")[:280],
            })
        fly = [self._normalize_dlove_url(p) for p in (gift.get('fly_photos') or []) if p] or photos[:5]
        return {
            "websiteId": hex16,
            "productType": "silkgarden",
            "configVersion": 1,
            "title": f"Vườn hoa · {rec}",
            "intro": {
                "headline": f"Gửi {rec}!",
                "subtitle": "Có một khu vườn nhỏ,\nđang đợi bạn ghé thăm.",
                "buttonLabel": "Cùng nhau khám phá nhé",
                "occasion": "",
            },
            "people": people,
            "enableBouquet": True,
            "enableMemories": bool(fly),
            "memories": {
                "title": "Những ngày mình bên nhau",
                "buttonLabel": "Miền ký ức",
                "photos": [{"id": f"mem-{i+1}", "image": u, "width": 800, "height": 800, "alt": f"Kỷ niệm {i+1}"} for i, u in enumerate(fly[:10])],
            },
            "enableLetter": True,
            "letter": {
                "title": str(gift.get('letter_title') or f"Gửi {rec},"),
                "opening": "",
                "text": str(gift.get('letter_content') or "Chúc bạn luôn bình an và hạnh phúc."),
                "signoff": "Thương gửi,",
                "sender": str(gift.get('sender_name') or gift.get('letter_signature') or ""),
                "date": "",
                "envelopeLine": "Một lá thư dành riêng cho bạn",
                "buttonLabel": "Lá thư",
            },
            "bgMusic": self._normalize_dlove_url(gift.get('music') or '/assets/vuon-hoa/audio/garden_bgm.mp3'),
            "showWatermark": False,
        }

    def _dlove_gift_to_order(self, g):
        origin = self._get_request_origin()
        tid = str(g.get('template_id') or '')
        slug = str(g.get('template_slug') or '')
        if tid == '72' or slug == 'vuon-hoa-3d-360':
            t_type = 'silkgarden'
        elif tid == '73' or slug == 'boys-day-19-11-gau-kem':
            t_type = 'boysday'
        else:
            t_type = 'photobouquet'
        amt = int(g.get('amount') or 0)
        is_paid = bool(g.get('paid')) or g.get('status') == 'active'
        status_str = ('FREE' if amt == 0 else 'PAID') if is_paid else 'PENDING_PAYMENT'
        gid = g.get('id')
        scode = g.get('share_code') or gid
        return {
            "_id": gid,
            "orderCode": scode,
            "type": t_type,
            "name": f"Vườn hoa · {g.get('recipient_name') or 'Người thương'}" if t_type == 'silkgarden' else f"Món quà · {g.get('recipient_name') or 'Người thương'}",
            "status": status_str,
            "price": amt,
            "currency": "VND",
            "linkproduct": f"{origin}/gift.php?uid={gid}",
            "configId": gid if t_type == 'silkgarden' else None,
            "trackToken": hashlib.md5(f"{gid}:{scode}".encode()).hexdigest(),
            "createdAt": g.get('created_at') or "",
        }

    def serve_tao_vuon(self, query):
        filepath = os.path.join(DIRECTORY, 'tao-vuon.html')
        if not os.path.exists(filepath):
            return self.send_error(404, "tao-vuon.html not found")
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            html = f.read()
        user = self.get_current_user()
        user_js = "null"
        if user:
            ident = user.get('username') or user.get('email') or user.get('id')
            payload = {
                "id": user.get('id', ''),
                "username": user.get('username', ''),
                "email": user.get('email', ''),
                "full_name": user.get('full_name', ''),
                "dlove_token": make_dlove_token(ident),
            }
            user_js = json.dumps(payload, ensure_ascii=False)
        html = html.replace(
            'window.__DG_CURRENT_USER__ = window.__DG_CURRENT_USER__ || null;',
            f'window.__DG_CURRENT_USER__ = {user_js};',
            1,
        )
        return self.send_bytes_response(html, allow_etag=False)

    def serve_vuon_slug(self, slug):
        gift = self._find_dlove_gift(slug, by_slug=True)
        if not gift:
            return self.serve_file('vuon.html')
        return self._serve_vuon_with_gift(gift)

    def _serve_vuon_with_gift(self, gift):
        vuon_path = os.path.join(DIRECTORY, 'vuon.html')
        if not os.path.exists(vuon_path):
            return self.send_error(404, "vuon.html not found")
        with open(vuon_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        sg_cfg = self._dlove_gift_to_silkgarden(gift)
        payload_json = json.dumps({"success": True, "data": sg_cfg}, ensure_ascii=False)
        gid_json = json.dumps(gift.get('id', ''), ensure_ascii=False)
        hex16_json = json.dumps(sg_cfg['websiteId'], ensure_ascii=False)
        inject_head = f"""<script>
    window.__DG_GIFT_DATA__ = {payload_json};
    (function() {{
      try {{
        var p = new URLSearchParams(window.location.search);
        var id = p.get('id') || '';
        if (!/^[a-f0-9]{{16}}$/i.test(id) && window.location.pathname.indexOf('/vuon/') !== 0) {{
          p.set('uid', {gid_json});
          p.set('id', {hex16_json});
          window.history.replaceState(null, '', window.location.pathname + '?' + p.toString());
        }}
      }} catch(e) {{}}
    }})();
  </script>"""
        content = content.replace('  <script>\n    // Ensure default demo gift ID', inject_head + '\n  <script>\n    // Ensure default demo gift ID', 1)
        return self.send_bytes_response(content, allow_etag=False)

    def handle_dlove_get(self, path, query):
        sub = path[len('/api/dlove'):]
        if sub.startswith('/pricing/'):
            tpl = sub[len('/pricing/'):].strip('/') or 'silkgarden'
            return self.send_json_response({"success": True, "data": self._dlove_pricing_payload(tpl)})

        if sub == '/music/shared' or sub.startswith('/music/'):
            items = self._dlove_music_items()
            return self.send_json_response({
                "success": True,
                "data": {
                    "items": items,
                    "systemMusicUrls": [x["url"] for x in items],
                },
            })

        if sub.startswith('/slugs/check/'):
            parts = sub.strip('/').split('/')
            cand = parts[-1].lower() if len(parts) >= 4 else ''
            if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]', cand):
                return self.send_json_response({"success": True, "data": {"available": False, "reason": "invalid_format", "message": "Chỉ dùng 3–30 ký tự thường, số và dấu gạch ngang."}})
            taken = cand in SLUG_TO_ID or cand in {'tao-vuon', 'sua-vuon', 'templates', 'admin', 'login', 'register'} or (self._find_dlove_gift(cand, by_slug=True) is not None)
            if taken:
                return self.send_json_response({"success": True, "data": {"available": False, "reason": "taken", "message": "Tên này đã có người dùng.", "suggestions": [f"{cand}-1", f"{cand}-love"]}})
            return self.send_json_response({"success": True, "data": {"available": True, "reason": None}})

        if sub.startswith('/access/by-slug/silkgarden/'):
            slug = urllib.parse.unquote(sub[len('/access/by-slug/silkgarden/'):].strip('/'))
            g = self._find_dlove_gift(slug, by_slug=True)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy khu vườn."}, status=404)
            if not (g.get('paid') or g.get('status') == 'active'):
                return self.send_json_response({"success": False, "paymentRequired": True, "message": "Khu vườn chưa được thanh toán."}, status=403)
            return self.send_json_response({"success": True, "data": self._dlove_gift_to_silkgarden(g)})

        if sub.startswith('/access/silkgarden/'):
            gid = urllib.parse.unquote(sub[len('/access/silkgarden/'):].strip('/'))
            if gid == 'ac8fb44238066def':
                dp = os.path.join(DIRECTORY, 'assets', 'data', 'silkgarden_demo.json')
                if os.path.exists(dp):
                    with open(dp, 'r', encoding='utf-8') as f:
                        return self.send_json_response(json.load(f))
            g = self._find_dlove_gift(gid, by_slug=False)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy khu vườn."}, status=404)
            if not (g.get('paid') or g.get('status') == 'active'):
                return self.send_json_response({"success": False, "paymentRequired": True, "message": "Khu vườn chưa được thanh toán."}, status=403)
            return self.send_json_response({"success": True, "data": self._dlove_gift_to_silkgarden(g)})

        if sub.startswith('/access/boysday/'):
            gid = urllib.parse.unquote(sub[len('/access/boysday/'):].strip('/'))
            if gid == '61f15939408dab54':
                dp = os.path.join(DIRECTORY, 'assets', 'data', 'boysday_demo.json')
                if os.path.exists(dp):
                    with open(dp, 'r', encoding='utf-8') as f:
                        return self.send_json_response(json.load(f))
            g = self._find_dlove_gift(gid, by_slug=False)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy món quà."}, status=404)
            if not (g.get('paid') or g.get('status') == 'active') and not self._user_owns_gift(self.get_current_user(), g):
                return self.send_json_response({"success": False, "paymentRequired": True, "message": "Món quà chưa được thanh toán."}, status=403)
            if isinstance(g.get('v3'), dict) and g['v3'].get('character'):
                return self.send_json_response({"success": True, "data": g['v3']})
            return self.send_json_response({"success": False, "message": "Không tìm thấy món quà."}, status=404)

        if sub == '/orders/my':
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "message": "Vui lòng đăng nhập"}, status=401)
            gifts = db.get_gifts_for_user(user)
            orders = [self._dlove_gift_to_order(g) for g in gifts]
            return self.send_json_response({
                "success": True,
                "data": {"orders": orders, "items": orders, "pagination": {"page": 1, "totalPages": 1}},
            })

        if sub.startswith('/orders/'):
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "message": "Vui lòng đăng nhập"}, status=401)
            ocode = urllib.parse.unquote(sub[len('/orders/'):].strip('/'))
            g = get_gift(ocode)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy đơn"}, status=404)
            if not self._user_owns_gift(user, g):
                return self.send_json_response({"success": False, "message": "Không có quyền xem đơn hàng này!"}, status=403)
            return self.send_json_response({"success": True, "data": {"order": self._dlove_gift_to_order(g)}})

        if sub.startswith('/payments/status/') or sub.startswith('/payments/track/'):
            part = sub.split('/')[-1]
            ocode = urllib.parse.unquote(part)
            g = get_gift(ocode)
            if g and not (g.get('paid') or g.get('status') == 'active'):
                sync_casso_transactions()
                g = get_gift(ocode)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy đơn"}, status=404)
            ord_obj = self._dlove_gift_to_order(g)
            return self.send_json_response({
                "success": True,
                "data": {
                    "status": ord_obj["status"],
                    "linkproduct": ord_obj["linkproduct"],
                    "orderCode": ord_obj["orderCode"],
                },
            })

        if sub.startswith('/configs/silkgarden/'):
            cid = urllib.parse.unquote(sub[len('/configs/silkgarden/'):].strip('/'))
            g = self._find_dlove_gift(cid, by_slug=False)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy thiệp"}, status=404)
            is_paid = bool(g.get('paid')) or g.get('status') == 'active'
            if not is_paid and not self._user_owns_gift(self.get_current_user(), g):
                return self.send_json_response({"success": False, "paymentRequired": True, "message": "Không có quyền truy cập thiệp chưa thanh toán!"}, status=403)
            sg = self._dlove_gift_to_silkgarden(g)
            origin = self._get_request_origin()
            for p in sg.get('people', []):
                if isinstance(p, dict):
                    for fld in ('image', 'original'):
                        if isinstance(p.get(fld), str) and p[fld].startswith('/uploads/'):
                            p[fld] = origin + p[fld]
            return self.send_json_response({"success": True, "data": {"config": sg, "updatedAt": g.get('updated_at') or g.get('created_at') or ""}})

        if sub.startswith('/vouchers/saved'):
            return self.send_json_response({"success": True, "data": {"items": [], "pagination": {"page": 1, "totalPages": 1}}})

        if sub.startswith('/lucky-draw/') or sub.startswith('/video-campaign/'):
            return self.send_json_response({"success": True, "data": {"enabled": False, "canSpin": False, "reason": "closed", "campaign": {"enabled": False, "remaining": 0, "capacity": 0}}})

        return self.send_json_response({"success": False, "message": "Not found"}, status=404)

    def handle_dlove_put(self, path, query):
        sub = path[len('/api/dlove'):]
        if sub == '/uploads/put':
            key = (query.get('key') or [''])[0].strip()
            ext = _DLOVE_PRESIGN_TOKENS.pop(key, '')
            if not ext or ext.lower() not in ALLOWED_UPLOAD_EXTS:
                return self.send_json_response({"success": False, "message": "Invalid upload key"}, status=400)
            try:
                clen = int(self.headers.get('Content-Length') or 0)
            except (ValueError, TypeError):
                clen = 0
            if clen <= 0 or clen > 25 * 1024 * 1024:
                return self.send_json_response({"success": False, "message": "Kích thước file không hợp lệ (tối đa 25MB)"}, status=400)
            body = self.rfile.read(clen)
            if not _validate_uploaded_bytes(ext, body):
                return self.send_json_response({"success": False, "message": "Nội dung tệp không khớp định dạng cho phép!"}, status=400)
            fname = f"garden_{key}{ext}"
            fpath = os.path.join(UPLOADS_DIR, fname)
            with open(fpath, 'wb') as f:
                f.write(body)
            return self.send_json_response({"success": True, "url": f"/uploads/{fname}"})
        return self.send_json_response({"success": False, "message": "Method not allowed"}, status=404)

    def handle_dlove_post(self, path, query):
        sub = path[len('/api/dlove'):]
        origin = self._get_request_origin()
        client_ip = _get_client_ip(self)

        if sub == '/pricing/calculate':
            data = self.read_request_data(max_bytes=65536)
            feats = data.get('features') if isinstance(data.get('features'), dict) else {}
            pkg_id = feats.get('packageId')
            pricing = self._dlove_pricing_payload(data.get('templateType') or 'silkgarden')
            pkg = next((p for p in pricing['packages'] if p['id'] == pkg_id), pricing['packages'][0])
            base_total = max(0, int(pkg['price']))
            return self.send_json_response({"success": True, "data": {"baseTotal": base_total, "total": base_total, "currency": "VND"}})

        if sub == '/uploads/presign':
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "error": {"code": "UNAUTHORIZED", "message": "Vui lòng đăng nhập để tải tệp!"}}, status=401)
            data = self.read_request_data(max_bytes=16384)
            ftype = str(data.get('fileType') or 'image').lower()
            ctype = str(data.get('contentType') or '').lower()
            ext_map = {
                'image/webp': '.webp', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/gif': '.gif',
                'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
            }
            ext = ext_map.get(ctype.split(';')[0].strip(), '.mp3' if ftype == 'audio' else '.webp')
            key = secrets.token_hex(8)
            if len(_DLOVE_PRESIGN_TOKENS) > 512:
                _DLOVE_PRESIGN_TOKENS.clear()
            _DLOVE_PRESIGN_TOKENS[key] = ext
            return self.send_json_response({
                "success": True,
                "data": {
                    "uploadUrl": f"{origin}/api/dlove/uploads/put?key={key}",
                    "publicUrl": f"{origin}/uploads/garden_{key}{ext}",
                },
            })

        if sub in ('/uploads/image', '/uploads/audio'):
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "error": {"code": "UNAUTHORIZED", "message": "Vui lòng đăng nhập để tải tệp!"}}, status=401)
            is_audio = (sub == '/uploads/audio')
            allowed = ALLOWED_AUDIO_EXTS if is_audio else ALLOWED_IMAGE_EXTS
            try:
                environ = {'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': self.headers.get('Content-Type', '')}
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)
                if 'file' not in form:
                    return self.send_json_response({"success": False, "message": "Thiếu tệp tải lên"}, status=400)
                fitem = form['file']
                orig_name = getattr(fitem, 'filename', '') or ('music.mp3' if is_audio else 'upload.jpg')
                ext = os.path.splitext(os.path.basename(orig_name))[1].lower() or ('.mp3' if is_audio else '.jpg')
                if ext not in allowed:
                    return self.send_json_response({"success": False, "message": "Định dạng tệp không được hỗ trợ"}, status=400)
                raw = fitem.file.read(25 * 1024 * 1024 + 1)
                if len(raw) > 25 * 1024 * 1024 or not _validate_uploaded_bytes(ext, raw):
                    return self.send_json_response({"success": False, "message": "Tệp không hợp lệ hoặc vượt quá 25 MB"}, status=400)
                fname = f"garden_{uuid.uuid4().hex[:14]}{ext}"
                with open(os.path.join(UPLOADS_DIR, fname), 'wb') as fout:
                    fout.write(raw)
                return self.send_json_response({"success": True, "data": {"url": f"{origin}/uploads/{fname}", "key": fname}})
            except Exception:
                return self.send_json_response({"success": False, "message": "Lỗi khi tải tệp lên!"}, status=500)

        if sub == '/websites/silkgarden':
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "error": {"code": "UNAUTHORIZED", "message": "Vui lòng đăng nhập để tạo thiệp!"}}, status=401)
            limited, _, wait_sec = _CREATE_LIMITER.check_and_consume(client_ip)
            if limited:
                return self.send_json_response({"success": False, "message": f"Thao tác quá nhanh, thử lại sau {wait_sec} giây!"}, status=429)
            data = self.read_request_data(max_bytes=512 * 1024)
            cfg = data.get('config') if isinstance(data.get('config'), dict) else {}
            feats = data.get('features') if isinstance(data.get('features'), dict) else {}
            pkg_id = feats.get('packageId') or 'free-garden'
            pricing = self._dlove_pricing_payload('silkgarden')
            pkg = next((p for p in pricing['packages'] if p['id'] == pkg_id), pricing['packages'][0])
            amount = max(0, int(pkg['price']))

            cslug = str(data.get('slug') or '').strip().lower()
            if cslug:
                if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]', cslug):
                    return self.send_json_response({"success": False, "message": "Định dạng tên liên kết không hợp lệ!"}, status=400)
                if cslug in SLUG_TO_ID or self._find_dlove_gift(cslug, by_slug=True):
                    return self.send_json_response({"success": False, "error": {"code": "SLUG_TAKEN", "message": "Tên liên kết này đã được sử dụng"}, "data": {"suggestions": [f"{cslug}-1", f"{cslug}-love"]}}, status=409)

            uid = f"g_{uuid.uuid4().hex[:8]}"
            hex16 = self._gift_hex16(uid)
            share_code = f"DG{secrets.token_hex(4).upper()}"
            while get_gift(share_code) is not None:
                share_code = f"DG{secrets.token_hex(4).upper()}"

            people = cfg.get('people') if isinstance(cfg.get('people'), list) else []
            for p in people:
                if isinstance(p, dict):
                    p['image'] = self._normalize_dlove_url(p.get('image', ''))
                    p['original'] = self._normalize_dlove_url(p.get('original') or p.get('image', ''))
            mems = cfg.get('memories') if isinstance(cfg.get('memories'), dict) else {}
            for mp in (mems.get('photos') if isinstance(mems.get('photos'), list) else []):
                if isinstance(mp, dict):
                    mp['image'] = self._normalize_dlove_url(mp.get('image', ''))

            cfg_saved = dict(cfg)
            cfg_saved['websiteId'] = hex16
            cfg_saved['giftId'] = uid
            cfg_saved['productType'] = 'silkgarden'
            cfg_saved['configVersion'] = 1
            if cslug:
                cfg_saved['customSlug'] = cslug
            cfg_saved['bgMusic'] = self._normalize_dlove_url(cfg_saved.get('bgMusic') or '/assets/vuon-hoa/audio/garden_bgm.mp3')
            cfg_saved['showWatermark'] = False

            first_person_name = (people[0].get('name') or '').strip() if (people and isinstance(people[0], dict)) else ''
            intro = cfg_saved.get('intro') if isinstance(cfg_saved.get('intro'), dict) else {}
            rec_name = db.sanitize_text(first_person_name or str(intro.get('headline') or '').strip() or 'Người thương', max_len=80) or 'Người thương'
            letter = cfg_saved.get('letter') if isinstance(cfg_saved.get('letter'), dict) else {}
            is_free = (amount <= 0)
            settings = get_settings()
            transfer_content = f"DEAR {share_code}"
            photos_list = [p.get('image') for p in people if isinstance(p, dict) and p.get('image')]

            new_gift = {
                "id": uid,
                "share_code": share_code,
                "template_id": "72",
                "template_slug": "vuon-hoa-3d-360",
                "recipient_name": rec_name,
                "sender_name": db.sanitize_text(str(letter.get('sender') or user.get('full_name') or 'DearGift'), max_len=80),
                "birthday_day": 19,
                "birthday_month": 11,
                "v3": cfg_saved,
                "letter_title": db.sanitize_text(str(letter.get('title') or f"Gửi {rec_name}!"), max_len=120),
                "letter_content": db.sanitize_text(str(letter.get('text') or ''), max_len=4000, allow_newlines=True),
                "letter_signature": db.sanitize_text(str(letter.get('sender') or user.get('full_name') or 'DearGift'), max_len=80),
                "passcode": "",
                "music": cfg_saved['bgMusic'],
                "photos": photos_list,
                "fly_photos": [mp.get('image') for mp in (mems.get('photos') or []) if isinstance(mp, dict) and mp.get('image')],
                "amount": amount,
                "transfer_content": transfer_content,
                "status": "active" if is_free else "pending",
                "paid": True if is_free else False,
                "user_id": user.get('id', ''),
                "user_email": user.get('email', ''),
                "username": user.get('username', ''),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            db.create_gift(new_gift)
            linkproduct = f"{origin}/vuon/{cslug}" if cslug else f"{origin}/gift.php?uid={uid}"
            return self.send_json_response({
                "success": True,
                "data": {
                    "websiteId": hex16,
                    "giftId": uid,
                    "orderCode": share_code,
                    "linkproduct": linkproduct,
                    "needsPayment": not is_free,
                    "checkoutUrl": f"{origin}/payment.php?code={share_code}" if not is_free else "",
                    "trackToken": hashlib.md5(f"{uid}:{share_code}".encode()).hexdigest(),
                    "price": amount,
                    "currency": "VND",
                    "paymentMethod": "PAYOS",
                },
            })

        if sub == '/payments/create':
            user = self.get_current_user()
            if not user:
                return self.send_json_response({"success": False, "message": "Vui lòng đăng nhập!"}, status=401)
            data = self.read_request_data(max_bytes=16384)
            ocode = str(data.get('orderCode') or '').strip()
            g = get_gift(ocode)
            if not g:
                return self.send_json_response({"success": False, "message": "Không tìm thấy đơn"}, status=404)
            if not self._user_owns_gift(user, g):
                return self.send_json_response({"success": False, "message": "Không có quyền thao tác đơn hàng này!"}, status=403)
            scode = g.get('share_code') or g.get('id')
            return self.send_json_response({"success": True, "data": {"checkoutUrl": f"{origin}/payment.php?code={scode}"}})

        if sub == '/auth/login-email':
            data = self.read_request_data(max_bytes=65536)
            raw_email = data.get('email', '')
            raw_pwd = data.get('password', '')
            if not isinstance(raw_email, str) or not isinstance(raw_pwd, str):
                return self.send_json_response({"success": False, "message": "Dữ liệu đăng nhập không hợp lệ"}, status=400)
            email = raw_email.strip()
            pwd = raw_pwd
            if not email or not pwd or not pwd.strip():
                return self.send_json_response({"success": False, "message": "Vui lòng nhập email và mật khẩu"}, status=400)

            acct_key = f"{client_ip}:{email.lower()}"
            ip_lim, ip_wait = _LOGIN_IP_LIMITER.is_limited(client_ip)
            acc_lim, acc_wait = _LOGIN_ACCOUNT_LIMITER.is_limited(acct_key)
            if ip_lim or acc_lim:
                wait_s = max(ip_wait, acc_wait)
                return self.send_json_response({"success": False, "message": f"Nhập sai quá nhiều lần. Vui lòng thử lại sau {wait_s} giây!"}, status=429)

            user = find_user_by_login(email, pwd)
            if not user:
                _LOGIN_IP_LIMITER.record(client_ip)
                acc_now_lim, remaining, wait_s = _LOGIN_ACCOUNT_LIMITER.record(acct_key)
                if acc_now_lim:
                    return self.send_json_response({"success": False, "message": f"Nhập sai quá 5 lần. Tài khoản tạm khóa {wait_s} giây!"}, status=429)
                return self.send_json_response({"success": False, "message": f"Email hoặc mật khẩu không đúng (còn {remaining} lần thử)"}, status=401)

            _LOGIN_ACCOUNT_LIMITER.reset(acct_key)
            ident = user.get('username') or user.get('email')
            safe_u = {k: v for k, v in user.items() if k != 'password'}
            safe_u['uid'] = safe_u.get('id', '')
            return self.send_json_response({"success": True, "token": make_dlove_token(ident), "user": safe_u}, cookie=build_auth_cookies(self, user))

        if sub == '/vouchers/check':
            return self.send_json_response({"success": True, "data": {"valid": False, "reason": "not_found"}})

        if sub.startswith('/configs/silkgarden/') and sub.endswith('/preview-edit'):
            return self.send_json_response({"success": True, "data": {"baseTotal": 0, "total": 0, "delta": 0}})

        return self.send_json_response({"success": False, "message": "Not found"}, status=404)

    def serve_demo_template(self, tpl_id):
        demo_path = None
        tpl_str = str(tpl_id or '').strip().lstrip('/')
        safe_demos_dir = os.path.realpath(os.path.join(DIRECTORY, 'demos'))
        safe_tpl_dir = os.path.realpath(os.path.join(DIRECTORY, 'templates'))

        def _is_safe_demo_html(p):
            rp = os.path.realpath(p)
            return (
                (rp.startswith(safe_demos_dir + os.sep) or rp.startswith(safe_tpl_dir + os.sep))
                and rp.lower().endswith(('.html', '.htm'))
                and os.path.isfile(rp)
            )

        if tpl_str == '32':
            cand32 = os.path.join(DIRECTORY, 'demos', 'demo_32.html')
            if _is_safe_demo_html(cand32):
                demo_path = cand32
            elif os.path.isfile(os.path.join(DIRECTORY, 'corazon-galactico', 'index.html')):
                demo_path = os.path.join(DIRECTORY, 'corazon-galactico', 'index.html')
        elif tpl_str and '\x00' not in tpl_str and '..' not in tpl_str:
            cand_rel = os.path.join(DIRECTORY, tpl_str)
            cand_demo_id = os.path.join(DIRECTORY, 'demos', f'demo_{tpl_str}.html')
            cand_demo_raw = os.path.join(DIRECTORY, 'demos', f'{tpl_str}.html')
            if _is_safe_demo_html(cand_rel):
                demo_path = cand_rel
            elif _is_safe_demo_html(cand_demo_id):
                demo_path = cand_demo_id
            elif _is_safe_demo_html(cand_demo_raw):
                demo_path = cand_demo_raw

        if not demo_path:
            demo_path = os.path.join(DIRECTORY, 'demos', 'demo_69.html')

        if demo_path and os.path.exists(demo_path):
            with open(demo_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            content = self.clean_asset_paths(content)

            # Audio mapping matching each template's theme
            audio_map = {
                '21': '/assets/music/happy_birthday_amee.mp3',
                '25': '/assets/music/happy_birthday_amee.mp3',
                '26': '/assets/music/happy_birthday_amee.mp3',
                '28': '/assets/music/happy_birthday_amee.mp3',
                '42': '/assets/music/happy_birthday_amee.mp3',
                '70': '/assets/music/givemeyourforever.mp3',
                '71': '/assets/music/happy-new-year.mp3',
                '50': '/assets/music/happy_birthday_amee.mp3',
                '53': '/assets/music/happy_birthday_amee.mp3',
                '59': '/assets/music/happy_birthday_amee.mp3',
                '60': '/assets/music/happy_birthday_amee.mp3',
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

                // Strict single-audio enforcement: pause other audio without killing native template JS Audio
                window.__dg_audios = window.__dg_audios || new Set();
                if (!window.__dg_audio_hooked) {{
                    window.__dg_audio_hooked = true;
                    var OrigAudio = window.Audio;
                    if (OrigAudio) {{
                        window.Audio = function(src) {{
                            var inst = src !== undefined ? new OrigAudio(src) : new OrigAudio();
                            try {{ window.__dg_audios.add(inst); }} catch(e) {{}}
                            return inst;
                        }};
                        window.Audio.prototype = OrigAudio.prototype;
                    }}
                    var origPlay = HTMLMediaElement.prototype.play;
                    HTMLMediaElement.prototype.play = function() {{
                        var self = this;
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
                }}

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
                    // Wrapper pages hosting an inner iframe delegate audio to the iframe app — avoid dual playback
                    if (document.querySelector('iframe')) return;

                    var audio = document.querySelector('audio');
                    if (!audio) {{
                        // Do not hijack pages that already play music dynamically via JS Audio()
                        if (window.__dg_audios && window.__dg_audios.size > 0) return;
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
                            var anyPlaying = false;
                            try {{
                                window.__dg_audios.forEach(function(a) {{
                                    if (!a.paused) anyPlaying = true;
                                }});
                            }} catch(e) {{}}
                            if (!anyPlaying && audio.paused) {{
                                var p = audio.play();
                                if (p && p.catch) p.catch(function(){{}});
                            }}
                        }}
                        setTimeout(tryPlay, 150);
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

            self.send_bytes_response(
                content,
                content_type='text/html; charset=utf-8',
                extra_headers={
                    'Content-Security-Policy': "frame-ancestors 'self'",
                    'X-Frame-Options': 'SAMEORIGIN',
                },
            )
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
        self.send_bytes_response(html)

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
            share_code = str(gift.get('share_code', ''))
            amount = max(0, int(gift.get('amount') or 20000))
            rec_name = html.escape(str(gift.get('recipient_name', 'Người thương')), quote=True)
            transfer_content = html.escape(str(gift.get('transfer_content', f"DEAR {share_code}")), quote=True)
            bank_name_esc = html.escape(str(settings.get('bank_name', '')), quote=True)
            acc_name_esc = html.escape(str(settings.get('account_name', '')), quote=True)
            acc_num_esc = html.escape(str(settings.get('account_number', '')), quote=True)
            share_code_esc = html.escape(share_code, quote=True)
            share_code_qs = urllib.parse.quote(share_code)
            qr_url = f"https://img.vietqr.io/image/{settings['bank_code']}-{settings['account_number']}-compact2.png?amount={amount}&addInfo={urllib.parse.quote(gift.get('transfer_content', f'DEAR {share_code}'))}&accountName={urllib.parse.quote(settings['account_name'])}"

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
        <img src="{html.escape(qr_url, quote=True)}" alt="VietQR MBBank">
    </div>

    <div class="status-pill" id="poll-status">
        ⏳ Đang chờ hệ thống xác nhận tiền về...
    </div>

    <div class="info">
        <div><span>Ngân hàng:</span><strong>{bank_name_esc}</strong></div>
        <div><span>Chủ tài khoản:</span><strong>{acc_name_esc}</strong></div>
        <div><span>Số tài khoản:</span><strong>{acc_num_esc}</strong></div>
        <div><span>Số tiền:</span><strong>{amount:,}đ</strong></div>
        <div><span>Nội dung CK:</span><strong>{transfer_content}</strong></div>
    </div>
</div>

<script>
function pollStatus() {{
    fetch('/ajax_check_payment_status.php?code={share_code_qs}')
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
            self.send_bytes_response(pending_html, allow_etag=False)
            return

        # Active gift: serve full template
        template_id = str(gift.get('template_id', '69')).strip()
        template_slug = str(gift.get('template_slug', '')).strip()

        # Template 72: 3D Floral Garden (vuon.html hydrated with saved silkgarden config)
        if template_id == '72' or template_slug == 'vuon-hoa-3d-360':
            return self._serve_vuon_with_gift(gift)

        # Template 73: Boys Day 19/11 Interactive Chibi 3D (b.html hydrated cleanly)
        if template_id == '73' or template_slug == 'boys-day-19-11-gau-kem':
            b_path = os.path.join(DIRECTORY, 'b.html')
            if os.path.exists(b_path):
                with open(b_path, 'r', encoding='utf-8', errors='ignore') as f:
                    b_content = f.read()
                v3 = gift.get('v3') if isinstance(gift.get('v3'), dict) else {}
                if v3.get('character') and isinstance(v3.get('memories'), list):
                    bd_data = json.loads(json.dumps(v3, ensure_ascii=False))
                else:
                    dp = os.path.join(DIRECTORY, 'assets', 'data', 'boysday_demo.json')
                    bd_data = {}
                    if os.path.exists(dp):
                        with open(dp, 'r', encoding='utf-8') as fd:
                            bd_data = json.load(fd).get('data', {})
                    if gift.get('letter_content'):
                        bd_data.setdefault('letter', {})['text'] = gift['letter_content']
                    if gift.get('recipient_name'):
                        bd_data['greeting'] = f"{gift['recipient_name']} ơi, theo em nhé ♡"
                    if gift.get('photos'):
                        bd_data['memories'] = [{"id": f"mem-{i+1}", "image": self._normalize_dlove_url(u), "title": "", "wish": "", "frame": False} for i, u in enumerate(gift['photos'][:20])]
                    if gift.get('music'):
                        bd_data['bgMusic'] = self._normalize_dlove_url(gift['music'])
                hex16 = self._gift_hex16(gift.get('id'))
                bd_data['websiteId'] = hex16
                bd_json = json.dumps({"success": True, "data": bd_data}, ensure_ascii=False)
                gid_js = json.dumps(gift.get('id', ''), ensure_ascii=False)
                hex16_js = json.dumps(hex16, ensure_ascii=False)
                inj = f"""<script>
    window.__DG_GIFT_DATA__ = {bd_json};
    (function() {{
      try {{
        var p = new URLSearchParams(window.location.search);
        if (!/^[a-f0-9]{{16}}$/i.test(p.get('id') || '')) {{
          p.set('uid', {gid_js});
          p.set('id', {hex16_js});
          window.history.replaceState(null, '', window.location.pathname + '?' + p.toString());
        }}
      }} catch(e) {{}}
    }})();
  </script>"""
                b_content = b_content.replace('  <script>\n    // Ensure default demo gift ID', inj + '\n  <script>\n    // Ensure default demo gift ID', 1)
                return self.send_bytes_response(b_content, allow_etag=False)

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

        # Replace watermark with custom banner (escaped against XSS)
        content = content.replace(
            '<div class="gift-preview-flag">XEM THỬ</div>',
            f'<div class="gift-preview-flag" style="background:linear-gradient(135deg,#e8589a,#9b5cf6); box-shadow:0 4px 14px rgba(232,88,154,0.4);">DÀNH TẶNG {html.escape(str(rec_name).upper())} ❤️</div>'
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

        self.send_bytes_response(content)

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

    def _save_safe_upload(self, sub_item):
        orig_name = getattr(sub_item, 'filename', '') or ''
        if not orig_name:
            return ''
        ext = os.path.splitext(os.path.basename(orig_name))[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTS:
            return ''
        raw = sub_item.file.read(25 * 1024 * 1024 + 1)
        if not raw or len(raw) > 25 * 1024 * 1024 or not _validate_uploaded_bytes(ext, raw):
            return ''
        fname = f"{uuid.uuid4().hex[:12]}{ext}"
        fpath = os.path.join(UPLOADS_DIR, fname)
        with open(fpath, 'wb') as fout:
            fout.write(raw)
        return f"uploads/{fname}"

    def read_request_data(self, max_bytes: int = 26 * 1024 * 1024, allow_list: bool = False):
        content_type = self.headers.get('Content-Type', '')
        raw_clen = self.headers.get('Content-Length', '0')
        try:
            content_len = int(raw_clen)
        except (ValueError, TypeError):
            raise _BadRequestError(400, "Content-Length không hợp lệ!")
        if content_len < 0:
            raise _BadRequestError(400, "Content-Length không hợp lệ!")
        if content_len > max_bytes:
            raise _BadRequestError(413, "Kích thước dữ liệu vượt quá giới hạn cho phép!")

        if 'application/json' in content_type:
            if content_len == 0:
                return {}
            try:
                body = self.rfile.read(content_len).decode('utf-8')
                parsed_json = json.loads(body)
            except Exception:
                raise _BadRequestError(400, "Dữ liệu JSON không hợp lệ!")
            if isinstance(parsed_json, dict):
                return parsed_json
            if allow_list and isinstance(parsed_json, list):
                return parsed_json
            raise _BadRequestError(400, "Payload JSON phải là đối tượng hợp lệ!")

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
                                saved = self._save_safe_upload(sub)
                                if saved:
                                    file_vals.append(saved)
                            elif hasattr(sub, 'value'):
                                val = sub.value
                                if isinstance(val, bytes):
                                    try: val = val.decode('utf-8')
                                    except Exception: val = ''
                                file_vals.append(val)
                        data[key] = file_vals
                    elif getattr(item, 'filename', None) and item.filename:
                        saved = self._save_safe_upload(item)
                        if saved:
                            data[key] = saved
                    else:
                        val = item.value
                        if isinstance(val, bytes):
                            try: val = val.decode('utf-8')
                            except Exception: val = ''
                        data[key] = val
                return data
            except _BadRequestError:
                raise
            except Exception:
                raise _BadRequestError(400, "Dữ liệu biểu mẫu không hợp lệ!")

        # Fallback to application/x-www-form-urlencoded
        if content_len == 0:
            return {}
        try:
            body = self.rfile.read(content_len).decode('utf-8')
            parsed = urllib.parse.parse_qs(body)
            return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
        except Exception:
            raise _BadRequestError(400, "Dữ liệu form không hợp lệ!")

    def _emit_cookies(self, cookie):
        if not cookie:
            return
        if isinstance(cookie, (list, tuple)):
            for c in cookie:
                if c:
                    self.send_header('Set-Cookie', c)
        else:
            self.send_header('Set-Cookie', cookie)

    def send_redirect(self, location, cookie=None):
        self.send_response(302)
        self.send_header('Location', location)
        self._emit_cookies(cookie)
        self.end_headers()

    def send_bytes_response(self, raw_bytes, content_type='text/html; charset=utf-8', status=200, cookie=None, allow_etag=None, compressible=True, extra_headers=None):
        if isinstance(raw_bytes, str):
            raw_bytes = raw_bytes.encode('utf-8')
        if allow_etag is None:
            allow_etag = (self.command in ('GET', 'HEAD') and status == 200 and not cookie and not _is_no_store_path(self.path))

        etag = None
        if allow_etag:
            digest = hashlib.md5(raw_bytes, usedforsecurity=False).hexdigest()[:12]
            etag = f'"{digest}-{len(raw_bytes)}"'
            if self._etag_matches(etag):
                self.send_response(304)
                self.send_header('ETag', etag)
                if compressible:
                    self.send_header('Vary', 'Accept-Encoding')
                self.end_headers()
                return

        payload = raw_bytes
        use_gzip = False
        if compressible and len(raw_bytes) >= 256 and 'gzip' in (self.headers.get('Accept-Encoding') or '').lower():
            gz = gzip.compress(raw_bytes, compresslevel=5)
            if len(gz) < len(raw_bytes):
                payload = gz
                use_gzip = True

        self.send_response(status)
        self.send_header('Content-Type', content_type)
        if use_gzip:
            self.send_header('Content-Encoding', 'gzip')
        if compressible:
            self.send_header('Vary', 'Accept-Encoding')
        if etag:
            self.send_header('ETag', etag)
        self.send_header('Content-Length', str(len(payload)))
        self._emit_cookies(cookie)
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass

    def send_json_response(self, data, status=200, cookie=None, allow_etag=None):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_bytes_response(
            body,
            content_type='application/json; charset=utf-8',
            status=status,
            cookie=cookie,
            allow_etag=allow_etag,
            extra_headers={
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Webhook-Secret, Secure-Token',
            },
        )

    def serve_file(self, filename, cookie=None):
        file_path = os.path.join(DIRECTORY, filename)
        if not os.path.exists(file_path):
            self.send_error(404, f"{filename} not found")
            return
        try:
            accepts_gzip = 'gzip' in (self.headers.get('Accept-Encoding') or '').lower()
            raw_data, gz_data, etag, mtime = _get_cached_static_file(file_path, allow_gzip=accepts_gzip)
            allow_etag = (cookie is None and not _is_no_store_path(self.path))
            if allow_etag and self._etag_matches(etag):
                self.send_response(304)
                self.send_header('ETag', etag)
                self.send_header('Vary', 'Accept-Encoding')
                self.end_headers()
                return

            payload = gz_data if (accepts_gzip and gz_data) else raw_data
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            if accepts_gzip and gz_data:
                self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
            if allow_etag:
                self.send_header('ETag', etag)
            self.send_header('Last-Modified', self.date_time_string(mtime))
            self.send_header('Content-Length', str(len(payload)))
            self._emit_cookies(cookie)
            self.end_headers()
            if self.command != 'HEAD':
                try:
                    self.wfile.write(payload)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    pass
        except OSError:
            self.send_error(404, f"{filename} not found")

    def serve_media_with_range(self, file_path, content_type):
        if not os.path.exists(file_path):
            self.send_error(404, "Media file not found")
            return

        file_size = os.path.getsize(file_path)
        range_header = self.headers.get('Range')
        chunk_size = 65536

        if not range_header:
            etag = None
            try:
                fs = os.stat(file_path)
                etag = f'"{int(fs.st_mtime)}-{fs.st_size}"'
                if self._etag_matches(etag):
                    self.send_response(304)
                    self.send_header('ETag', etag)
                    self.end_headers()
                    return
            except OSError:
                pass
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            if etag:
                self.send_header('ETag', etag)
            self.end_headers()
            if self.command != 'HEAD':
                try:
                    with open(file_path, 'rb') as f:
                        while True:
                            chunk = f.read(chunk_size)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    pass
            return

        try:
            unit, _, range_spec = range_header.strip().partition('=')
            if unit.lower() != 'bytes' or not range_spec:
                raise ValueError("Unsupported range unit")
            first_range = range_spec.split(',')[0].strip()
            start_str, _, end_str = first_range.partition('-')
            if not start_str and not end_str:
                raise ValueError("Empty range")
            if not start_str:
                suffix = int(end_str)
                if suffix <= 0:
                    raise ValueError("Invalid suffix")
                start = max(0, file_size - suffix)
                end = file_size - 1
            else:
                start = int(start_str)
                end = int(end_str) if end_str else file_size - 1
            if file_size == 0 or start >= file_size or start < 0 or end < start:
                self.send_response(416, "Range Not Satisfiable")
                self.send_header('Content-Range', f'bytes */{file_size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            if end >= file_size:
                end = file_size - 1
            length = end - start + 1

            self.send_response(206, "Partial Content")
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(length))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            try:
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = f.read(min(chunk_size, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass
        except ValueError as e:
            self.send_error(416, f"Invalid range: {e}")
        except Exception as e:
            self.send_error(500, f"Range error: {e}")

    def serve_gift_builder(self, query):
        tpl_id = query.get('id', ['69'])[0].strip()
        user = self.get_current_user()
        if not user:
            self.send_redirect(f'/login.html?redirect=/gift-builder.php?id={tpl_id}')
            return

        if str(tpl_id).strip() in ('72', 'vuon-hoa-3d-360', 'vuon-hoa', 'silkgarden'):
            return self.serve_tao_vuon(query)

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

        # Dynamic tabs and section isolation with full templates_v3_meta integration
        v3_meta_path = os.path.join(DIRECTORY, 'templates_v3_meta', f'sec_v3_{tpl_id}.html')
        has_custom_v3 = os.path.exists(v3_meta_path)

        if has_custom_v3:
            try:
                with open(v3_meta_path, 'r', encoding='utf-8') as f_v3:
                    custom_v3_html = f_v3.read().strip()
                # Replace default sec-v3 with template-specific scenario form
                sec_v3_pattern = r'(<div class="gb-section active" id="sec-v3">.*?)(?=\s*<!--\s*SECTION:|\s*<div class="gb-section" id="sec-)'
                content = re.sub(sec_v3_pattern, custom_v3_html, content, count=1, flags=re.DOTALL)
                # Keep tab-sec-v3 active
                content = content.replace('id="tab-sec-letter" data-section="sec-letter" onclick="switchSection(\'sec-letter\', this)" style="display:none;"', 'id="tab-sec-letter" data-section="sec-letter" onclick="switchSection(\'sec-letter\', this)"')
            except Exception as e:
                pass
        elif str(tpl_id) != '69':
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

        self.send_bytes_response(content, allow_etag=False)


class _DearGiftHTTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class _DearGiftDualStackServer(_DearGiftHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()


def _create_http_server():
    if getattr(socket, 'has_dualstack_ipv6', lambda: False)():
        try:
            return _DearGiftDualStackServer(("::", PORT), DearGiftHandler)
        except OSError:
            pass
    return _DearGiftHTTPServer(("", PORT), DearGiftHandler)


def run():
    db.init_db()
    with _create_http_server() as httpd:
        def _handle_sigterm(signum, frame):
            threading.Thread(target=httpd.shutdown, daemon=True).start()

        for sig_name in ('SIGTERM', 'SIGINT'):
            sig = getattr(signal, sig_name, None)
            if sig is not None:
                try:
                    signal.signal(sig, _handle_sigterm)
                except Exception:
                    pass

        print(f"=======================================================")
        print(f"🚀 DearGift Full Production Server is running on port {PORT}!")
        print(f"👉 Client Home:    http://localhost:{PORT}/")
        print(f"👉 Template Store: http://localhost:{PORT}/templates.php")
        print(f"👉 Admin CMS:      http://localhost:{PORT}/admin")
        print(f"👉 Database:       {db.get_db_summary()}")
        print(f"=======================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == '__main__':
    run()
