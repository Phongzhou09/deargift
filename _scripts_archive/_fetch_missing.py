import urllib.request
import os

def fetch_and_save(url, dest_path):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read()
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with open(dest_path, 'wb') as f:
                f.write(content)
            print(f"Downloaded {url} -> {dest_path} ({len(content)} bytes)")
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

fetch_and_save("https://deargift.love/css/home-modern.css", "css/home-modern.css")
fetch_and_save("https://deargift.love/js/security.js", "js/security.js")
fetch_and_save("https://deargift.love/js/demo-preview.js", "js/demo-preview.js")
fetch_and_save("https://deargift.love/js/hearts.js", "js/hearts.js")
