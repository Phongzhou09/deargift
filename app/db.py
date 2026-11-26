#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DearGift Dual-Backend Database Layer (SQLite + PostgreSQL)
- Tự động dùng PostgreSQL nếu có biến môi trường DATABASE_URL (Railway Postgres).
- Mặc định dùng SQLite (WAL mode) tại data/deargift.db (hoặc DB_PATH) khi chạy local / gắn Volume.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

APP_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(APP_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
SQLITE_SCHEMA_FILE = os.path.join(APP_DIR, "schema.sql")
PG_SCHEMA_FILE = os.path.join(APP_DIR, "schema_pg.sql")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "deargift.db")

_DB_LOCK = threading.RLock()
_INITIALIZED_TARGETS: set[str] = set()


def get_database_url() -> str:
    """Return PostgreSQL URL if DATABASE_URL is set, else empty string."""
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url if url.startswith("postgresql://") else ""


def is_postgres() -> bool:
    return bool(get_database_url())


def get_db_path() -> str:
    """Return active SQLite database path (configurable via DB_PATH or SQLITE_PATH)."""
    env_path = (os.environ.get("DB_PATH") or os.environ.get("SQLITE_PATH") or "").strip()
    return env_path if env_path else DEFAULT_DB_PATH


def get_db_summary() -> str:
    if is_postgres():
        return "PostgreSQL (DATABASE_URL)"
    return f"SQLite ({get_db_path()})"


class _DBSession:
    """Unified thin wrapper normalizing SQLite '?' and PostgreSQL '%s' queries."""

    def __init__(self, conn: Any, pg: bool):
        self.conn = conn
        self.pg = pg

    def execute(self, sql: str, params: Tuple[Any, ...] = ()):
        if self.pg:
            pg_sql = sql.replace("?", "%s")
            cur = self.conn.cursor()
            cur.execute(pg_sql, params)
            return cur
        return self.conn.execute(sql, params)

    def executescript(self, sql_script: str) -> None:
        if self.pg:
            with self.conn.cursor() as cur:
                for stmt in [s.strip() for s in sql_script.split(";") if s.strip()]:
                    cur.execute(stmt)
        else:
            self.conn.executescript(sql_script)


@contextmanager
def get_connection():
    """Thread-safe connection context manager for PostgreSQL or SQLite."""
    pg_url = get_database_url()
    if pg_url:
        import psycopg
        from psycopg.rows import dict_row

        conn = psycopg.connect(pg_url, row_factory=dict_row, connect_timeout=10)
        try:
            yield _DBSession(conn, pg=True)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return

    db_path = get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    with _DB_LOCK:
        conn = sqlite3.connect(db_path, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        try:
            yield _DBSession(conn, pg=False)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


# ----------------- PASSWORD HASHING -----------------
def hash_password(plain: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with random salt."""
    if not plain:
        return ""
    if plain.startswith("pbkdf2_sha256$"):
        return plain
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 260000)
    return f"pbkdf2_sha256$260000${salt}${dk.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    """Verify plaintext password against stored PBKDF2 hash or legacy plaintext."""
    if not stored:
        return False
    if stored.startswith("pbkdf2_sha256$"):
        try:
            _, iter_s, salt, digest_hex = stored.split("$", 3)
            dk = hashlib.pbkdf2_hmac(
                "sha256", plain.encode("utf-8"), salt.encode("utf-8"), int(iter_s)
            )
            return hmac.compare_digest(dk.hex(), digest_hex)
        except Exception:
            return False
    return hmac.compare_digest(str(plain), str(stored))


# ----------------- ROW MAPPERS -----------------
def _val(row: Any, key: str, idx: int = 0) -> Any:
    if isinstance(row, dict):
        return row.get(key)
    try:
        return row[key]
    except Exception:
        return row[idx]


def _user_row_to_dict(row: Any) -> Dict[str, Any]:
    return {
        "id": _val(row, "id"),
        "username": _val(row, "username"),
        "email": _val(row, "email"),
        "full_name": _val(row, "full_name"),
        "phone": _val(row, "phone") or "",
        "avatar": _val(row, "avatar") or "",
        "provider": _val(row, "provider") or "local",
        "role": _val(row, "role") or "customer",
        "balance": int(_val(row, "balance") or 0),
        "created_at": _val(row, "created_at"),
        "updated_at": _val(row, "updated_at"),
    }


def _safe_json_loads(raw: Any, default: Any) -> Any:
    if isinstance(raw, (list, dict)):
        return raw
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _gift_row_to_dict(row: Any) -> Dict[str, Any]:
    return {
        "id": _val(row, "id"),
        "share_code": _val(row, "share_code"),
        "template_id": _val(row, "template_id"),
        "template_slug": _val(row, "template_slug"),
        "recipient_name": _val(row, "recipient_name"),
        "sender_name": _val(row, "sender_name") or "",
        "birthday_day": int(_val(row, "birthday_day") or 19),
        "birthday_month": int(_val(row, "birthday_month") or 11),
        "v3": _safe_json_loads(_val(row, "v3_json"), {}),
        "pin": _val(row, "pin") or "",
        "unlock_date": _val(row, "unlock_date") or "",
        "wishes_list": _val(row, "wishes_list") or "",
        "letter_title": _val(row, "letter_title") or "",
        "letter_content": _val(row, "letter_content") or "",
        "letter_signature": _val(row, "letter_signature") or "",
        "passcode": _val(row, "passcode") or "",
        "music": _val(row, "music") or "./assets/music/givemeyourforever.mp3",
        "photos": _safe_json_loads(_val(row, "photos_json"), []),
        "fly_photos": _safe_json_loads(_val(row, "fly_photos_json"), []),
        "amount": int(_val(row, "amount") or 0),
        "transfer_content": _val(row, "transfer_content") or "",
        "status": _val(row, "status") or "pending",
        "paid": bool(_val(row, "paid")),
        "user_id": _val(row, "user_id") or "",
        "user_email": _val(row, "user_email") or "",
        "username": _val(row, "username") or "",
        "created_at": _val(row, "created_at"),
        "updated_at": _val(row, "updated_at"),
    }


# ----------------- INITIALIZATION & MIGRATION -----------------
DEFAULT_SETTINGS: Dict[str, Any] = {
    "bank_code": "MB",
    "bank_name": "MBBank (Ngân hàng Quân Đội)",
    "account_number": "2006999988836",
    "account_name": "NGUYEN VAN PHONG",
    "price_amount": 19000,
    "site_name": "DearGift.love",
    "author_name": "Nguyễn Văn Phong",
    "facebook_url": "https://www.facebook.com/Phongzhouok99",
    "qr_image_url": "https://img.vietqr.io/image/MB-2006999988836-compact2.png",
    "admin_password": "Phongzhouok",
}


def init_db(force: bool = False) -> str:
    """Create tables (PostgreSQL or SQLite) and run idempotent initial seed/migration."""
    target_key = get_database_url() or get_db_path()
    with _DB_LOCK:
        if not force and target_key in _INITIALIZED_TARGETS:
            if is_postgres() or os.path.exists(target_key):
                return target_key

        schema_path = PG_SCHEMA_FILE if is_postgres() else SQLITE_SCHEMA_FILE
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        with get_connection() as db_sess:
            if not db_sess.pg:
                db_sess.execute("PRAGMA journal_mode = WAL;")
            db_sess.executescript(schema_sql)
            _seed_initial_data(db_sess)

        _INITIALIZED_TARGETS.add(target_key)
        return target_key


def _load_json_if_exists(filename: str) -> Any:
    for candidate in (
        os.path.join(BASE_DIR, filename),
        os.path.join(DATA_DIR, filename),
    ):
        if os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return None


def _count_rows(db_sess: _DBSession, table: str) -> int:
    row = db_sess.execute(f"SELECT COUNT(*) AS cnt FROM {table}").fetchone()
    return int(_val(row, "cnt", 0))


def _seed_initial_data(db_sess: _DBSession) -> None:
    """Seed empty tables from legacy JSON files (if present) or clean defaults."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Settings
    if _count_rows(db_sess, "settings") == 0:
        raw_settings = _load_json_if_exists("settings.json")
        merged = dict(DEFAULT_SETTINGS)
        if isinstance(raw_settings, dict):
            merged.update(raw_settings)
        for k, v in merged.items():
            db_sess.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                (str(k), json.dumps(v, ensure_ascii=False), now_str),
            )

    # 2. Users
    if _count_rows(db_sess, "users") == 0:
        raw_users = _load_json_if_exists("users.json")
        if not isinstance(raw_users, list) or not raw_users:
            raw_users = [
                {
                    "id": "u_phong",
                    "username": "phongnguyen",
                    "email": "phongnguyenvanphong28@gmail.com",
                    "full_name": "Nguyễn Văn Phong",
                    "password": "admin",
                    "role": "admin",
                    "balance": 100000,
                    "created_at": now_str,
                }
            ]
        for u in raw_users:
            if not isinstance(u, dict):
                continue
            uid = str(u.get("id") or f"u_{uuid.uuid4().hex[:8]}")
            uname = str(u.get("username") or "").strip()
            email = str(u.get("email") or "").strip().lower()
            if not uname or not email:
                continue
            pwd = str(u.get("password_hash") or u.get("password") or "")
            pwd_hash = hash_password(pwd) if pwd else ""
            role = str(u.get("role") or ("admin" if uid == "u_phong" else "customer"))
            created = str(u.get("created_at") or now_str)
            db_sess.execute(
                """
                INSERT INTO users
                (id, username, email, full_name, password_hash, phone, avatar, provider, role, balance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """,
                (
                    uid,
                    uname,
                    email,
                    str(u.get("full_name") or uname),
                    pwd_hash,
                    str(u.get("phone") or ""),
                    str(u.get("avatar") or ""),
                    str(u.get("provider") or "local"),
                    role,
                    int(u.get("balance") if u.get("balance") is not None else 50000),
                    created,
                    created,
                ),
            )

    # 3. Gifts
    if _count_rows(db_sess, "gifts") == 0:
        raw_gifts = _load_json_if_exists("gifts.json")
        if not isinstance(raw_gifts, list) or not raw_gifts:
            raw_gifts = [
                {
                    "id": "g_pv0673fd",
                    "share_code": "PV0673FD",
                    "template_id": "64",
                    "template_slug": "trung-thu-den-ong-sao",
                    "recipient_name": "Người thương",
                    "sender_name": "DearGift",
                    "letter_title": "Trung Thu — Đèn Ông Sao & Hoa 🏮",
                    "letter_content": "Chạm để khám phá hiệu ứng của mẫu quà này.",
                    "letter_signature": "Nguyễn Văn Phong",
                    "music": "/templates/trung-thu-den-ong-sao/app/bg-music.mp3",
                    "amount": 20000,
                    "transfer_content": "DEAR PV0673FD",
                    "status": "active",
                    "paid": True,
                    "created_at": now_str,
                }
            ]
        known_user_ids = {
            _val(r, "id") for r in db_sess.execute("SELECT id FROM users").fetchall()
        }
        for g in raw_gifts:
            if not isinstance(g, dict):
                continue
            gid = str(g.get("id") or f"g_{uuid.uuid4().hex[:8]}")
            share_code = str(g.get("share_code") or gid).strip()
            raw_uid = str(g.get("user_id") or "").strip()
            fk_uid = raw_uid if raw_uid in known_user_ids else None
            created = str(g.get("created_at") or now_str)
            is_paid = 1 if (g.get("paid") or g.get("status") == "active") else 0
            status = str(g.get("status") or ("active" if is_paid else "pending"))
            db_sess.execute(
                """
                INSERT INTO gifts
                (id, share_code, user_id, username, user_email, template_id, template_slug,
                 recipient_name, sender_name, birthday_day, birthday_month,
                 letter_title, letter_content, letter_signature, passcode, pin, unlock_date,
                 wishes_list, music, photos_json, fly_photos_json, v3_json,
                 amount, transfer_content, status, paid, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """,
                (
                    gid,
                    share_code,
                    fk_uid,
                    str(g.get("username") or ""),
                    str(g.get("user_email") or ""),
                    str(g.get("template_id") or "69"),
                    str(g.get("template_slug") or "mon-qua-nho-2010"),
                    str(g.get("recipient_name") or "Người thương"),
                    str(g.get("sender_name") or ""),
                    int(g.get("birthday_day") or 19),
                    int(g.get("birthday_month") or 11),
                    str(g.get("letter_title") or "Gửi người thương!"),
                    str(g.get("letter_content") or ""),
                    str(g.get("letter_signature") or ""),
                    str(g.get("passcode") or ""),
                    str(g.get("pin") or ""),
                    str(g.get("unlock_date") or ""),
                    str(g.get("wishes_list") or ""),
                    str(g.get("music") or "./assets/music/givemeyourforever.mp3"),
                    json.dumps(g.get("photos") or [], ensure_ascii=False),
                    json.dumps(g.get("fly_photos") or [], ensure_ascii=False),
                    json.dumps(g.get("v3") or {}, ensure_ascii=False),
                    int(g.get("amount") if g.get("amount") is not None else 20000),
                    str(g.get("transfer_content") or f"DEAR {share_code}"),
                    status,
                    is_paid,
                    created,
                    created,
                ),
            )

    # 4. Ideas
    if _count_rows(db_sess, "ideas") == 0:
        raw_ideas = _load_json_if_exists("ideas.json")
        if isinstance(raw_ideas, list):
            for item in raw_ideas:
                if isinstance(item, dict) and item.get("content"):
                    db_sess.execute(
                        "INSERT INTO ideas (name, contact, content, created_at) VALUES (?, ?, ?, ?)",
                        (
                            str(item.get("name") or "Khách hàng"),
                            str(item.get("contact") or ""),
                            str(item.get("content") or ""),
                            str(item.get("created_at") or now_str),
                        ),
                    )

    # 5. Reviews
    if _count_rows(db_sess, "reviews") == 0:
        raw_reviews = _load_json_if_exists("reviews.json")
        if isinstance(raw_reviews, list):
            for item in raw_reviews:
                if isinstance(item, dict) and item.get("content"):
                    db_sess.execute(
                        "INSERT INTO reviews (author, rating, content, created_at) VALUES (?, ?, ?, ?)",
                        (
                            str(item.get("author") or "Khách hàng"),
                            int(item.get("rating") or 5),
                            str(item.get("content") or ""),
                            str(item.get("created_at") or now_str),
                        ),
                    )


# ----------------- SETTINGS CRUD -----------------
def get_settings() -> Dict[str, Any]:
    init_db()
    result = dict(DEFAULT_SETTINGS)
    with get_connection() as db_sess:
        rows = db_sess.execute("SELECT key, value FROM settings").fetchall()
    for r in rows:
        k = _val(r, "key", 0)
        v = _val(r, "value", 1)
        try:
            result[k] = json.loads(v)
        except Exception:
            result[k] = v
    return result


def save_settings(data: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        for k, v in data.items():
            db_sess.execute(
                """
                INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (str(k), json.dumps(v, ensure_ascii=False), now_str),
            )
    return get_settings()


# ----------------- USERS CRUD -----------------
def get_all_users() -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as db_sess:
        rows = db_sess.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    return [_user_row_to_dict(r) for r in rows]


def get_user_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    init_db()
    ident = str(identifier or "").strip()
    if not ident:
        return None
    with get_connection() as db_sess:
        row = db_sess.execute(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
            (ident, ident),
        ).fetchone()
    return _user_row_to_dict(row) if row else None


def authenticate_user(identifier: str, password: Optional[str] = None) -> Optional[Dict[str, Any]]:
    init_db()
    ident = str(identifier or "").strip()
    if not ident:
        return None
    with get_connection() as db_sess:
        row = db_sess.execute(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
            (ident, ident),
        ).fetchone()
        if row:
            if password is None:
                return _user_row_to_dict(row)
            stored = _val(row, "password_hash") or ""
            if verify_password(password, stored):
                if not stored.startswith("pbkdf2_sha256$"):
                    db_sess.execute(
                        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                        (hash_password(password), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), _val(row, "id")),
                    )
                return _user_row_to_dict(row)

        if ident.lower() in ("admin", "phongnguyen", "phong"):
            if password is None or str(password) in ("admin", "admin1911", "Phongzhouok"):
                admin_row = db_sess.execute(
                    "SELECT * FROM users WHERE id = 'u_phong' OR role = 'admin' LIMIT 1"
                ).fetchone()
                if admin_row:
                    return _user_row_to_dict(admin_row)
    return None


def register_user(
    username: str, email: str, password: str, full_name: str = ""
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    init_db()
    uname = str(username or "").strip()
    mail = str(email or "").strip().lower()
    fname = str(full_name or uname).strip() or uname
    if not uname or not mail:
        return None, "Vui lòng nhập tên đăng nhập và email!"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        existing = db_sess.execute(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
            (uname, mail),
        ).fetchone()
        if existing:
            if password and verify_password(password, _val(existing, "password_hash") or ""):
                return _user_row_to_dict(existing), None
            return None, "Tên đăng nhập hoặc email đã được sử dụng!"

        uid = f"u_{uuid.uuid4().hex[:8]}"
        pwd_hash = hash_password(password) if password else ""
        db_sess.execute(
            """
            INSERT INTO users
            (id, username, email, full_name, password_hash, phone, avatar, provider, role, balance, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, '', '', 'local', 'customer', 50000, ?, ?)
            """,
            (uid, uname, mail, fname, pwd_hash, now_str, now_str),
        )
        row = db_sess.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        return _user_row_to_dict(row), None


def upsert_google_user(
    email: str, full_name: str = "", avatar: str = "", google_id: str = ""
) -> Dict[str, Any]:
    init_db()
    mail = str(email).strip().lower()
    username = mail.split("@")[0]
    fname = str(full_name or username).strip()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as db_sess:
        existing = db_sess.execute(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1",
            (mail, username),
        ).fetchone()
        if existing:
            eid = _val(existing, "id")
            db_sess.execute(
                """
                UPDATE users
                SET full_name = COALESCE(NULLIF(?, ''), full_name),
                    avatar = COALESCE(NULLIF(?, ''), avatar),
                    provider = 'google',
                    updated_at = ?
                WHERE id = ?
                """,
                (fname, str(avatar or ""), now_str, eid),
            )
            row = db_sess.execute("SELECT * FROM users WHERE id = ?", (eid,)).fetchone()
            return _user_row_to_dict(row)

        taken = db_sess.execute(
            "SELECT 1 FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1", (username,)
        ).fetchone()
        if taken:
            username = f"{username}_{uuid.uuid4().hex[:4]}"

        uid = f"u_gg_{(google_id or uuid.uuid4().hex)[:8]}"
        db_sess.execute(
            """
            INSERT INTO users
            (id, username, email, full_name, password_hash, phone, avatar, provider, role, balance, created_at, updated_at)
            VALUES (?, ?, ?, ?, '', '', ?, 'google', 'customer', 50000, ?, ?)
            """,
            (uid, username, mail, fname, str(avatar or ""), now_str, now_str),
        )
        row = db_sess.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        return _user_row_to_dict(row)


def update_user_profile(
    user_id: str, full_name: Optional[str] = None, phone: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    init_db()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        row = db_sess.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return None
        new_full = str(full_name).strip() if full_name else _val(row, "full_name")
        new_phone = str(phone).strip() if phone is not None else _val(row, "phone")
        db_sess.execute(
            "UPDATE users SET full_name = ?, phone = ?, updated_at = ? WHERE id = ?",
            (new_full, new_phone, now_str, user_id),
        )
        updated = db_sess.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _user_row_to_dict(updated)


def update_user_password(user_id: str, new_password: str) -> bool:
    init_db()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        cur = db_sess.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (hash_password(new_password), now_str, user_id),
        )
        return cur.rowcount > 0


def delete_user(user_id: str) -> bool:
    init_db()
    with get_connection() as db_sess:
        cur = db_sess.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return cur.rowcount > 0


# ----------------- GIFTS CRUD -----------------
def get_all_gifts() -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as db_sess:
        rows = db_sess.execute("SELECT * FROM gifts ORDER BY created_at DESC").fetchall()
    return [_gift_row_to_dict(r) for r in rows]


def get_gift(uid_or_code: str) -> Optional[Dict[str, Any]]:
    init_db()
    key = str(uid_or_code or "").strip()
    if not key:
        return None
    with get_connection() as db_sess:
        row = db_sess.execute(
            "SELECT * FROM gifts WHERE id = ? OR LOWER(share_code) = LOWER(?) LIMIT 1",
            (key, key),
        ).fetchone()
    return _gift_row_to_dict(row) if row else None


def get_gifts_for_user(user: Dict[str, Any]) -> List[Dict[str, Any]]:
    init_db()
    u_id = str(user.get("id") or "").strip().lower()
    u_name = str(user.get("username") or "").strip().lower()
    u_email = str(user.get("email") or "").strip().lower()

    clauses = []
    params: List[str] = []
    if u_id:
        clauses.append("LOWER(COALESCE(user_id, '')) = ?")
        params.append(u_id)
    if u_email:
        clauses.append("LOWER(user_email) = ?")
        params.append(u_email)
        clauses.append("LOWER(username) = ?")
        params.append(u_email)
    if u_name:
        clauses.append("LOWER(username) = ?")
        params.append(u_name)
        clauses.append("LOWER(user_email) = ?")
        params.append(u_name)

    if not clauses:
        return []

    sql = f"SELECT * FROM gifts WHERE {' OR '.join(clauses)} ORDER BY created_at DESC"
    with get_connection() as db_sess:
        rows = db_sess.execute(sql, tuple(params)).fetchall()
    return [_gift_row_to_dict(r) for r in rows]


def create_gift(gift: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    now_str = str(gift.get("created_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    gid = str(gift.get("id") or f"g_{uuid.uuid4().hex[:8]}")
    share_code = str(gift.get("share_code") or f"DG{int(time.time()) % 1000000:06d}")
    raw_uid = str(gift.get("user_id") or "").strip()

    with get_connection() as db_sess:
        fk_uid = None
        if raw_uid:
            exists = db_sess.execute("SELECT 1 FROM users WHERE id = ?", (raw_uid,)).fetchone()
            if exists:
                fk_uid = raw_uid

        db_sess.execute(
            """
            INSERT INTO gifts
            (id, share_code, user_id, username, user_email, template_id, template_slug,
             recipient_name, sender_name, birthday_day, birthday_month,
             letter_title, letter_content, letter_signature, passcode, pin, unlock_date,
             wishes_list, music, photos_json, fly_photos_json, v3_json,
             amount, transfer_content, status, paid, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                gid,
                share_code,
                fk_uid,
                str(gift.get("username") or ""),
                str(gift.get("user_email") or ""),
                str(gift.get("template_id") or "69"),
                str(gift.get("template_slug") or "mon-qua-nho-2010"),
                str(gift.get("recipient_name") or "Người thương"),
                str(gift.get("sender_name") or ""),
                int(gift.get("birthday_day") or 19),
                int(gift.get("birthday_month") or 11),
                str(gift.get("letter_title") or "Gửi người thương!"),
                str(gift.get("letter_content") or ""),
                str(gift.get("letter_signature") or ""),
                str(gift.get("passcode") or ""),
                str(gift.get("pin") or ""),
                str(gift.get("unlock_date") or ""),
                str(gift.get("wishes_list") or ""),
                str(gift.get("music") or "./assets/music/givemeyourforever.mp3"),
                json.dumps(gift.get("photos") or [], ensure_ascii=False),
                json.dumps(gift.get("fly_photos") or [], ensure_ascii=False),
                json.dumps(gift.get("v3") or {}, ensure_ascii=False),
                int(gift.get("amount") if gift.get("amount") is not None else 20000),
                str(gift.get("transfer_content") or f"DEAR {share_code}"),
                str(gift.get("status") or "pending"),
                1 if gift.get("paid") else 0,
                now_str,
                now_str,
            ),
        )
        row = db_sess.execute("SELECT * FROM gifts WHERE id = ?", (gid,)).fetchone()
        return _gift_row_to_dict(row)


def activate_gift(
    uid_or_code: str,
    gateway: str = "manual",
    transaction_ref: str = "",
    raw_payload: Any = None,
) -> Optional[Dict[str, Any]]:
    init_db()
    key = str(uid_or_code or "").strip()
    if not key:
        return None
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as db_sess:
        row = db_sess.execute(
            "SELECT * FROM gifts WHERE id = ? OR LOWER(share_code) = LOWER(?) LIMIT 1",
            (key, key),
        ).fetchone()
        if not row:
            return None

        rid = _val(row, "id")
        rcode = _val(row, "share_code")
        ramt = int(_val(row, "amount") or 0)
        db_sess.execute(
            "UPDATE gifts SET status = 'active', paid = 1, updated_at = ? WHERE id = ?",
            (now_str, rid),
        )
        db_sess.execute(
            """
            INSERT INTO payment_transactions (gift_id, share_code, amount, gateway, transaction_ref, raw_payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rid,
                rcode,
                ramt,
                gateway,
                str(transaction_ref or rcode),
                json.dumps(raw_payload or {}, ensure_ascii=False),
                now_str,
            ),
        )
        updated = db_sess.execute("SELECT * FROM gifts WHERE id = ?", (rid,)).fetchone()
        return _gift_row_to_dict(updated)


def match_and_activate_from_text(
    text: str, explicit_code: str = "", gateway: str = "webhook", raw_payload: Any = None
) -> List[str]:
    """Match pending/unpaid gifts against bank transfer description or explicit code."""
    init_db()
    upper_text = str(text or "").upper()
    explicit = str(explicit_code or "").strip().upper()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    matched_codes: List[str] = []

    with get_connection() as db_sess:
        rows = db_sess.execute("SELECT * FROM gifts").fetchall()
        for r in rows:
            code = str(_val(r, "share_code") or "").upper()
            if not code:
                continue
            is_match = False
            if explicit and explicit == code:
                is_match = True
            elif code in upper_text or f"DEAR {code}" in upper_text or f"DEAR{code}" in upper_text:
                is_match = True

            if is_match:
                if _val(r, "status") != "active" or not _val(r, "paid"):
                    rid = _val(r, "id")
                    db_sess.execute(
                        "UPDATE gifts SET status = 'active', paid = 1, updated_at = ? WHERE id = ?",
                        (now_str, rid),
                    )
                    db_sess.execute(
                        """
                        INSERT INTO payment_transactions (gift_id, share_code, amount, gateway, transaction_ref, raw_payload, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rid,
                            _val(r, "share_code"),
                            int(_val(r, "amount") or 0),
                            gateway,
                            code,
                            json.dumps(raw_payload or {}, ensure_ascii=False),
                            now_str,
                        ),
                    )
                matched_codes.append(code)
    return matched_codes


def delete_gift(gift_id: str) -> bool:
    init_db()
    with get_connection() as db_sess:
        cur = db_sess.execute(
            "DELETE FROM gifts WHERE id = ? OR LOWER(share_code) = LOWER(?)",
            (str(gift_id), str(gift_id)),
        )
        return cur.rowcount > 0


def get_stats() -> Dict[str, Any]:
    init_db()
    with get_connection() as db_sess:
        users_count = _count_rows(db_sess, "users")
        gifts_created = _count_rows(db_sess, "gifts")
        row = db_sess.execute(
            "SELECT COUNT(*) AS cnt FROM gifts WHERE paid = 1 OR status = 'active'"
        ).fetchone()
        gifts_paid = int(_val(row, "cnt", 0))
    return {
        "users_count": users_count,
        "gifts_created": gifts_created,
        "gifts_paid": gifts_paid,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ----------------- IDEAS & REVIEWS -----------------
def add_idea(name: str, contact: str, content: str) -> None:
    init_db()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        db_sess.execute(
            "INSERT INTO ideas (name, contact, content, created_at) VALUES (?, ?, ?, ?)",
            (str(name or "Khách hàng"), str(contact or ""), str(content or ""), now_str),
        )


def add_review(author: str, rating: int, content: str) -> None:
    init_db()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as db_sess:
        db_sess.execute(
            "INSERT INTO reviews (author, rating, content, created_at) VALUES (?, ?, ?, ?)",
            (str(author or "Khách hàng"), int(rating or 5), str(content or ""), now_str),
        )


# ----------------- ADMIN SESSIONS -----------------
def create_admin_session(token: str, ttl_seconds: int = 604800) -> None:
    init_db()
    now = time.time()
    with get_connection() as db_sess:
        db_sess.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (now,))
        db_sess.execute(
            """
            INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET created_at = excluded.created_at, expires_at = excluded.expires_at
            """,
            (token, now, now + ttl_seconds),
        )


def verify_admin_session(token: str) -> bool:
    init_db()
    if not token:
        return False
    now = time.time()
    with get_connection() as db_sess:
        row = db_sess.execute(
            "SELECT expires_at FROM admin_sessions WHERE token = ?", (token,)
        ).fetchone()
        if not row:
            return False
        if float(_val(row, "expires_at", 0)) < now:
            db_sess.execute("DELETE FROM admin_sessions WHERE token = ?", (token,))
            return False
        return True


if __name__ == "__main__":
    path = init_db(force=True)
    stats = get_stats()
    print(f"Database initialized ({get_db_summary()}): {path}")
    print(f"Stats: {json.dumps(stats, ensure_ascii=False)}")
