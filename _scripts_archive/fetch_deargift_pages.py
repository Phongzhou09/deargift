import urllib.request
import re

urls = ['https://deargift.love/', 'https://deargift.love/about.php', 'https://deargift.love/contact.php']

for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            print(f"=== {u} ===")
            print(f"  Length: {len(content)}, Final URL: {resp.geturl()}")
            ids = re.findall(r'id=[\"\']([a-zA-Z0-9_-]+)[\"\']', content)
            print("  IDs:", ids[:10])
    except Exception as e:
        print(f"Error {u}:", e)
