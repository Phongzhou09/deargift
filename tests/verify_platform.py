#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive verification suite for DearGift:
1. Real SQLite DB integrity check
2. Security blocks on system/DB files
3. All main page HTTP checks
4. End-to-end DB CRUD + Auth + Gift + Payment + Admin API tests (isolated temp DB)
5. All 56 demos + b.html + vuon.html asset check (with <base href> resolution)
"""

import http.cookiejar
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8767
BASE = f"http://127.0.0.1:{PORT}"


def check_real_db():
    real_db = os.path.join(ROOT, "data", "deargift.db")
    assert os.path.exists(real_db), f"Missing real DB at {real_db}"
    conn = sqlite3.connect(real_db)
    tables = {
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    required = {
        "users",
        "gifts",
        "settings",
        "ideas",
        "reviews",
        "payment_transactions",
        "admin_sessions",
    }
    missing = required - tables
    assert not missing, f"Missing tables: {missing}"
    ucnt = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    gcnt = conn.execute("SELECT COUNT(*) FROM gifts").fetchone()[0]
    scnt = conn.execute("SELECT COUNT(*) FROM settings").fetchone()[0]
    conn.close()
    assert ucnt >= 8, f"Expected >= 8 users, got {ucnt}"
    assert gcnt >= 18, f"Expected >= 18 gifts, got {gcnt}"
    assert scnt >= 5, f"Expected >= 5 settings, got {scnt}"
    print(f"[PASS] Real DB OK: users={ucnt}, gifts={gcnt}, settings={scnt}")


def json_req(opener, path, method="GET", payload=None, headers=None):
    hdrs = dict(headers or {})
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
        hdrs.setdefault("Accept", "application/json")
    req = urllib.request.Request(BASE + path, data=data, headers=hdrs, method=method)
    try:
        with opener.open(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}


def resolve_asset_url(asset_ref, page_path, base_href):
    if asset_ref.startswith("/"):
        return asset_ref
    if base_href:
        base_clean = base_href if base_href.endswith("/") else (base_href + "/")
        if not base_clean.startswith("/"):
            base_clean = "/" + base_clean
        return urllib.parse.urljoin(BASE + base_clean, asset_ref).replace(BASE, "")
    return urllib.parse.urljoin(BASE + page_path, asset_ref).replace(BASE, "")


def run_tests():
    check_real_db()

    tmp_dir = tempfile.mkdtemp(prefix="dg_test_")
    tmp_db = os.path.join(tmp_dir, "deargift_test.db")
    shutil.copy2(os.path.join(ROOT, "data", "deargift.db"), tmp_db)

    env = os.environ.copy()
    env["PORT"] = str(PORT)
    env["DB_PATH"] = tmp_db
    proc = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        for _ in range(30):
            try:
                urllib.request.urlopen(BASE + "/", timeout=1).close()
                break
            except Exception:
                time.sleep(0.2)

        # 1. Security checks (must return 404)
        for blocked in [
            "/data/deargift.db",
            "/app/db.py",
            "/app/schema.sql",
            "/server.py",
            "/railway.toml",
            "/.gitignore",
            "/tests/verify_platform.py",
            "/templates_data.json",
        ]:
            try:
                urllib.request.urlopen(BASE + blocked, timeout=3)
                raise AssertionError(f"Security breach: {blocked} was accessible!")
            except urllib.error.HTTPError as e:
                assert e.code == 404, f"Expected 404 for {blocked}, got {e.code}"
        print("[PASS] Security blocks on system/DB/code files OK")

        # 1b. Railway healthcheck, robots, favicon, Gzip/ETag/304 & Cache-Control checks
        with urllib.request.urlopen(BASE + "/health", timeout=3) as r:
            assert r.status == 200
            assert "no-store" in r.headers.get("Cache-Control", "").lower()
            hdata = json.loads(r.read().decode("utf-8"))
            assert hdata.get("status") == "ok", f"Bad /health response: {hdata}"
        with urllib.request.urlopen(BASE + "/robots.txt", timeout=3) as r:
            assert r.status == 200 and "Disallow: /api/" in r.read().decode("utf-8")
        with urllib.request.urlopen(BASE + "/favicon.ico", timeout=3) as r:
            assert r.status == 200 and len(r.read()) > 100
            assert "immutable" in r.headers.get("Cache-Control", "").lower()

        for gz_path in ["/", "/api/templates", "/demo.php?id=69"]:
            req = urllib.request.Request(BASE + gz_path, headers={"Accept-Encoding": "gzip"})
            with urllib.request.urlopen(req, timeout=5) as r:
                assert r.status == 200
                assert r.headers.get("Content-Encoding") == "gzip", f"Expected gzip on {gz_path}, got {r.headers.get('Content-Encoding')}"
                assert "accept-encoding" in r.headers.get("Vary", "").lower(), f"Missing Vary on {gz_path}"
                etag = r.headers.get("ETag")
                assert etag, f"Missing ETag on {gz_path}"
                raw_gz = r.read()
                import gzip as _gzip
                assert len(_gzip.decompress(raw_gz)) > len(raw_gz)
            req_304 = urllib.request.Request(BASE + gz_path, headers={"Accept-Encoding": "gzip", "If-None-Match": etag})
            try:
                urllib.request.urlopen(req_304, timeout=5)
                raise AssertionError(f"Expected 304 Not Modified on {gz_path}")
            except urllib.error.HTTPError as e:
                assert e.code == 304, f"Expected 304 on {gz_path}, got {e.code}"

        with urllib.request.urlopen(BASE + "/api/stats", timeout=3) as r:
            assert "no-store" in r.headers.get("Cache-Control", "").lower(), f"Expected no-store on /api/stats, got {r.headers.get('Cache-Control')}"
            sdata = json.loads(r.read().decode("utf-8")).get("data", {})
            assert sdata.get("gifts_created", 0) >= 1000, f"Expected baseline >= 1000, got {sdata}"
            assert sdata.get("real_gifts_created", 0) >= 18, f"Expected real_gifts_created >= 18, got {sdata}"
            assert sdata.get("total_templates") == 56 and sdata.get("free_templates") == 50, f"Unexpected template stats: {sdata}"
            assert isinstance(sdata.get("template_real_usage"), dict)
        with urllib.request.urlopen(BASE + "/assets/images/logo-heart-32.png", timeout=3) as r:
            assert r.status == 200 and "immutable" in r.headers.get("Cache-Control", "").lower()
        print("[PASS] Healthcheck, robots, favicon, Gzip, ETag/304 & Cache-Control OK")

        # 2. Main pages & endpoints
        for page in [
            "/",
            "/templates.php",
            "/about.php",
            "/contact.php",
            "/login.html",
            "/register.html",
            "/my-gifts.html",
            "/my-gifts.php",
            "/my-gifts.php?view=all",
            "/orders.php",
            "/transactions.php",
            "/support.php",
            "/settings.php",
            "/payment.php",
            "/b.html",
            "/vuon.html",
            "/css/dashboard-shell.css",
            "/api/templates",
            "/api/settings",
            "/api/stats",
            "/api/gift-settings",
        ]:
            with urllib.request.urlopen(BASE + page, timeout=5) as r:
                assert r.status == 200, f"{page} returned {r.status}"
                txt = r.read().decode("utf-8", errors="ignore")
                if page == "/settings.php":
                    assert "user_a93e79" not in txt, "Stale user_a93e79 found in settings.php!"
                    assert "cdn-cgi" not in txt, "Stale cdn-cgi found in settings.php!"
                elif page in ("/about.php", "/contact.php"):
                    assert "header-auth-buttons" in txt and "js/header-auth.js" in txt, f"Missing header-auth on {page}"
                elif page == "/":
                    assert "1,000+" in txt and "56 mẫu quà" in txt and "4,176" not in txt, "Home stats not synced"
                elif page == "/templates.php":
                    assert "1,000+" in txt and "tm-stat-free" in txt and "3,844+" not in txt, "Templates stats not synced"
                elif page == "/css/dashboard-shell.css":
                    assert ".dg-account .dg-account-menu" in txt and ".dg-account-grid" in txt, "Missing .dg-account styles in dashboard-shell.css"
        # Admin page requires local or key; we connect from 127.0.0.1 so /admin returns 200
        with urllib.request.urlopen(BASE + "/admin", timeout=5) as r:
            assert r.status == 200
        print("[PASS] All main pages and public APIs return 200")

        # 3. Auth, Gift Creation, Isolation, Webhook, Admin CMS
        jar1 = http.cookiejar.CookieJar()
        op1 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar1))
        jar2 = http.cookiejar.CookieJar()
        op2 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar2))
        anon = urllib.request.build_opener()

        # Register new user
        st, res = json_req(
            op1,
            "/api/register",
            "POST",
            {"username": "testdbuser", "email": "testdb@example.com", "password": "secret123", "full_name": "Test DB"},
        )
        assert st == 200 and res.get("status") == "success", f"Register failed: {st} {res}"

        # Duplicate register with wrong password must be rejected (409)
        st, _ = json_req(
            anon,
            "/api/register",
            "POST",
            {"username": "testdbuser", "email": "testdb@example.com", "password": "wrong"},
        )
        assert st == 409, f"Expected 409 on duplicate register, got {st}"

        # Verify password was hashed in SQLite (not plaintext)
        tconn = sqlite3.connect(tmp_db)
        stored_hash = tconn.execute(
            "SELECT password_hash FROM users WHERE username='testdbuser'"
        ).fetchone()[0]
        assert stored_hash.startswith("pbkdf2_sha256$"), f"Password not hashed: {stored_hash}"

        # Login with legacy user & verify transparent hash upgrade
        st, res = json_req(
            op2, "/api/login", "POST", {"username": "khach1", "password": "123"}
        )
        assert st == 200 and res.get("status") == "success", f"Legacy login failed: {st} {res}"
        legacy_hash = tconn.execute(
            "SELECT password_hash FROM users WHERE username='khach1'"
        ).fetchone()[0]
        assert legacy_hash.startswith("pbkdf2_sha256$"), "Legacy hash not upgraded!"
        tconn.close()

        # Create gift as user 1
        st, gres = json_req(
            op1,
            "/api/gifts/create",
            "POST",
            {
                "template_id": "69",
                "recipient_name": "Minh Anh",
                "letter_content": "Happy test day",
                "total_price": 20000,
            },
        )
        assert st == 200 and gres.get("success"), f"Gift create failed: {gres}"
        gid = gres["gift_id"]
        scode = gres["share_code"]

        # Isolation: op1 sees gift/order, op2 does not, guest does not
        _, my1 = json_req(op1, "/api/my-gifts")
        _, my2 = json_req(op2, "/api/my-gifts")
        _, myg = json_req(anon, "/api/my-gifts")
        assert any(g["id"] == gid for g in my1.get("gifts", [])), "Creator missing gift"
        assert not any(g["id"] == gid for g in my2.get("gifts", [])), "Other user saw gift!"
        assert myg.get("gifts") == [] and myg.get("require_login"), "Guest saw gift!"

        _, ord1 = json_req(op1, "/api/my-orders")
        _, ordg = json_req(anon, "/api/my-orders")
        assert any(o["id"] == gid and o.get("qr_url") for o in ord1.get("orders", [])), "Creator missing order with QR!"
        assert ordg.get("orders") == [] and ordg.get("require_login"), "Guest saw orders!"

        # Bank webhook activation + transaction verification
        st, wres = json_req(
            anon, "/api/webhook/bank", "POST", {"content": f"CHUYEN KHOAN DEAR {scode}"}
        )
        assert st == 200 and scode in wres.get("matched", []), f"Webhook failed: {wres}"

        _, tx1 = json_req(op1, "/api/my-transactions")
        _, tx2 = json_req(op2, "/api/my-transactions")
        _, txg = json_req(anon, "/api/my-transactions")
        assert any(t["gift_id"] == gid and t["share_code"] == scode for t in tx1.get("transactions", [])), "Missing transaction after payment!"
        assert not any(t["gift_id"] == gid for t in tx2.get("transactions", [])), "Other user saw transaction!"
        assert txg.get("transactions") == [] and txg.get("require_login"), "Guest saw transactions!"

        # Verify active gift view page works
        with urllib.request.urlopen(BASE + f"/gift.php?uid={gid}", timeout=5) as r:
            body = r.read().decode("utf-8", errors="ignore")
            assert r.status == 200 and "Minh Anh" in body

        # Admin login & fetch all gifts & settings
        st, ares = json_req(anon, "/api/admin/login", "POST", {"password": "Phongzhouok"})
        assert st == 200 and ares.get("token"), f"Admin login failed: {ares}"
        adm_hdr = {"Authorization": "Bearer " + ares["token"]}
        st, all_gifts = json_req(anon, "/api/gifts", headers=adm_hdr)
        assert st == 200 and all_gifts.get("role") == "admin" and len(all_gifts.get("gifts", [])) >= 19
        st, adm_set = json_req(anon, "/api/settings")
        assert st == 200 and "bank_code" in adm_set, f"Settings broken: {adm_set}"

        # Ideas & reviews & unauthorized delete check
        st, _ = json_req(anon, "/api_submit_idea.php", "POST", {"name": "A", "content": "Idea test"})
        assert st == 200
        st, _ = json_req(anon, "/api_submit_review.php", "POST", {"author": "A", "rating": 5, "content": "Great"})
        assert st == 200
        st, _ = json_req(op2, "/api/gifts/delete", "POST", {"id": gid})
        assert st == 403, f"Unauthorized user deleted gift! status={st}"
        st, _ = json_req(op1, "/api/gifts/delete", "POST", {"id": gid})
        assert st == 200
        print("[PASS] Full DB auth, gift CRUD, isolation, webhook, and Admin API flow OK")

        # 4. All 56 demos + b.html + vuon.html asset verification (with <base href>)
        demos = sorted(
            [f for f in os.listdir(os.path.join(ROOT, "demos")) if f.startswith("demo_") and f.endswith(".html")],
            key=lambda x: int(re.search(r"\d+", x).group()),
        )
        asset_cache = {}
        failures = []
        pages_to_scan = []
        for df in demos:
            tid = re.search(r"\d+", df).group()
            pages_to_scan.append((f"/demo.php?id={tid}", f"demo_{tid}"))
        pages_to_scan += [("/b.html", "b.html"), ("/vuon.html", "vuon.html")]

        for page_url, label in pages_to_scan:
            with urllib.request.urlopen(BASE + page_url, timeout=5) as r:
                assert r.status == 200
                html = r.read().decode("utf-8", errors="ignore")
            html_no_comments = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)
            base_m = re.search(r'<base[^>]+href=[\x22\x27]([^\x22\x27]+)[\x22\x27]', html_no_comments, re.I)
            base_href = base_m.group(1) if base_m else ""
            tags = re.findall(
                r'(?:src|href|data-asset)=[\x22\x27]([^\x22\x27?#]+\.(?:js|css|png|jpg|jpeg|gif|webp|mp3|m4a|svg|mp4|webm|woff2?|ttf|otf))',
                html_no_comments,
                re.I,
            )
            for ref in set(tags):
                if ref.startswith(("http://", "https://", "//", "data:")):
                    continue
                resolved = resolve_asset_url(ref, page_url.split("?")[0], base_href)
                if resolved not in asset_cache:
                    try:
                        req = urllib.request.Request(BASE + resolved, headers={"Range": "bytes=0-15"})
                        with urllib.request.urlopen(req, timeout=3) as ar:
                            asset_cache[resolved] = ar.status in (200, 206)
                    except Exception:
                        asset_cache[resolved] = False
                if not asset_cache[resolved]:
                    failures.append((label, ref, resolved))

        assert not failures, f"Broken template assets: {failures[:10]}"
        print(f"[PASS] All {len(pages_to_scan)} demo/template pages & {len(asset_cache)} unique assets verified 200/206!")
    finally:
        proc.terminate()
        proc.wait(timeout=5)
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    run_tests()
