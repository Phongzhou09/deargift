import urllib.request
import re
import os

pages_to_check = [
    '/',
    '/index.html',
    '/templates.php',
    '/gift-builder.php',
    '/about.php',
    '/contact.php',
    '/login.php',
    '/register.php',
    '/admin',
    '/demo.php?id=69',
    '/demo.php?id=21'
]

print("=== STARTING FULL AUDIT OF DEARGIFT WEBSITE ===")
for p in pages_to_check:
    url = 'http://localhost:8000' + p
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            print(f"[{resp.status}] {p} - Size: {len(content)} bytes")

            # Check for broken Bùi Minh Quyết references
            if 'Bùi Minh Quyết' in content or 'Bùi Xuân Minh Quyết' in content:
                print(f"  ⚠️ Warning: Found old author name in {p}")
            
            # Check for dead deargift.love links
            remote_links = re.findall(r'href=[\"\'](https?://deargift\.love[^\s\"\'<>]*)[\"\']', content)
            if remote_links:
                print(f"  ⚠️ Warning: Found {len(remote_links)} remote deargift.love links in {p}")

    except Exception as e:
        print(f"[FAIL] {p}: {e}")

print("=== AUDIT COMPLETE ===")
