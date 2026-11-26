-- DearGift SQLite Database Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'local',
    role TEXT NOT NULL DEFAULT 'customer',
    balance INTEGER NOT NULL DEFAULT 50000,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS gifts (
    id TEXT PRIMARY KEY,
    share_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL DEFAULT '',
    user_email TEXT NOT NULL DEFAULT '',
    template_id TEXT NOT NULL DEFAULT '69',
    template_slug TEXT NOT NULL DEFAULT 'mon-qua-nho-2010',
    recipient_name TEXT NOT NULL DEFAULT 'Người thương',
    sender_name TEXT NOT NULL DEFAULT '',
    birthday_day INTEGER NOT NULL DEFAULT 19,
    birthday_month INTEGER NOT NULL DEFAULT 11,
    letter_title TEXT NOT NULL DEFAULT '',
    letter_content TEXT NOT NULL DEFAULT '',
    letter_signature TEXT NOT NULL DEFAULT '',
    passcode TEXT NOT NULL DEFAULT '',
    pin TEXT NOT NULL DEFAULT '',
    unlock_date TEXT NOT NULL DEFAULT '',
    wishes_list TEXT NOT NULL DEFAULT '',
    music TEXT NOT NULL DEFAULT '',
    photos_json TEXT NOT NULL DEFAULT '[]',
    fly_photos_json TEXT NOT NULL DEFAULT '[]',
    v3_json TEXT NOT NULL DEFAULT '{}',
    amount INTEGER NOT NULL DEFAULT 20000,
    transfer_content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gifts_share_code ON gifts(share_code);
CREATE INDEX IF NOT EXISTS idx_gifts_user_id ON gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_username ON gifts(username);
CREATE INDEX IF NOT EXISTS idx_gifts_user_email ON gifts(user_email);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);
CREATE INDEX IF NOT EXISTS idx_gifts_created_at ON gifts(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Khách hàng',
    contact TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL DEFAULT 'Khách hàng',
    rating INTEGER NOT NULL DEFAULT 5,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gift_id TEXT NULL REFERENCES gifts(id) ON DELETE SET NULL,
    share_code TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL DEFAULT 0,
    gateway TEXT NOT NULL DEFAULT 'manual',
    transaction_ref TEXT NOT NULL DEFAULT '',
    raw_payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_share_code ON payment_transactions(share_code);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at REAL NOT NULL,
    expires_at REAL NOT NULL
);
