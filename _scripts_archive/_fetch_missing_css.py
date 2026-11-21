import urllib.request
import os

assets = [
    "css/dashboard-shell.css",
    "css/dashboard.css",
    "css/settings-modern.css",
    "css/bootstrap-custom.css",
    "assets/images/logo-heart-96.png",
    "assets/images/logo-heart-48.png"
]

for a in assets:
    url = f"https://deargift.love/{a}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read()
            os.makedirs(os.path.dirname(a), exist_ok=True)
            with open(a, 'wb') as f:
                f.write(content)
            print(f"Downloaded {url} -> {a} ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed {url}: {e}")
