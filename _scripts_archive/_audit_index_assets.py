import os
import re
from bs4 import BeautifulSoup

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print("=== AUDITING INDEX.HTML ===")

# 1. Images
img_tags = soup.find_all('img')
print(f"Total images found: {len(img_tags)}")
missing_local_imgs = []
for img in img_tags:
    src = img.get('src')
    if src:
        # ignore http / data URLs
        if not src.startswith(('http://', 'https://', 'data:')):
            clean_src = src.split('?')[0].lstrip('/')
            if not os.path.exists(clean_src):
                missing_local_imgs.append(src)

print(f"Missing local images: {len(missing_local_imgs)}")
for m in missing_local_imgs[:10]:
    print(" - Missing:", m)

# 2. CSS links
css_tags = soup.find_all('link', rel=lambda r: r and 'stylesheet' in r)
print(f"\nTotal stylesheet links: {len(css_tags)}")
missing_css = []
for c in css_tags:
    href = c.get('href')
    if href and not href.startswith(('http://', 'https://', '//')):
        clean_href = href.split('?')[0].lstrip('/')
        if not os.path.exists(clean_href):
            missing_css.append(href)
print(f"Missing local CSS: {len(missing_css)}")
for m in missing_css:
    print(" - Missing CSS:", m)

# 3. Scripts
script_tags = soup.find_all('script', src=True)
print(f"\nTotal external scripts: {len(script_tags)}")
missing_js = []
for s in script_tags:
    src = s.get('src')
    if src and not src.startswith(('http://', 'https://', '//')):
        clean_src = src.split('?')[0].lstrip('/')
        if not os.path.exists(clean_src):
            missing_js.append(src)
print(f"Missing local scripts: {len(missing_js)}")
for m in missing_js:
    print(" - Missing JS:", m)

# 4. Check photo-1544816155-12df9643f363
print("\nIs 'photo-1544816155-12df9643f363' referenced anywhere in workspace?")
for root, dirs, files in os.walk('.'):
    if '_scripts_archive' in root or '.git' in root:
        continue
    for f in files:
        if f.endswith(('.html', '.php', '.css', '.js', '.json')):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                if 'photo-1544816155-12df9643f363' in fp.read():
                    print(f"  Referenced in: {p}")
