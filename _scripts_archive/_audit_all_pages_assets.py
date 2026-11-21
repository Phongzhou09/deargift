import os
import re
from bs4 import BeautifulSoup
import urllib.parse

files_to_check = [
    'index.html', 'templates.php', 'login.html', 'register.html',
    'gift-builder.php', 'settings.php', 'my-gifts.html', 'about.php', 'contact.php', 'admin.html'
]

missing_total = set()

for filename in files_to_check:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')

    # check images
    for img in soup.find_all('img'):
        src = img.get('src')
        if src and not src.startswith(('http://', 'https://', 'data:', '//')):
            clean = src.split('?')[0].lstrip('/')
            if not os.path.exists(clean):
                missing_total.add(('IMG', filename, src, clean))

    # check css
    for link in soup.find_all('link', rel=lambda r: r and 'stylesheet' in r):
        href = link.get('href')
        if href and not href.startswith(('http://', 'https://', '//')):
            clean = href.split('?')[0].lstrip('/')
            if not os.path.exists(clean):
                missing_total.add(('CSS', filename, href, clean))

    # check scripts
    for s in soup.find_all('script', src=True):
        src = s.get('src')
        if src and not src.startswith(('http://', 'https://', '//')):
            clean = src.split('?')[0].lstrip('/')
            if not os.path.exists(clean):
                missing_total.add(('JS', filename, src, clean))

print(f"Total missing assets across all main pages: {len(missing_total)}")
for mtype, fn, raw, clean in sorted(missing_total):
    print(f"[{mtype}] In {fn}: {raw} -> {clean}")
