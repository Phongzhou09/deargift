import urllib.request
import os

pages = {
    'index.html': 'https://deargift.love/',
    'about.php': 'https://deargift.love/about.php',
    'contact.php': 'https://deargift.love/contact.php'
}

for local_name, url in pages.items():
    print(f"Downloading {url} to {local_name}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8', errors='ignore')

        # Replace author credits
        content = content.replace('Bùi Minh Quyết', 'Nguyễn Văn Phong')
        content = content.replace('Bùi Xuân Minh Quyết', 'Nguyễn Văn Phong')
        content = content.replace('bùi minh quyết', 'Nguyễn Văn Phong')
        content = content.replace('BÙI MINH QUYẾT', 'NGUYỄN VĂN PHONG')

        # Replace Facebook links
        content = content.replace('https://www.facebook.com/profile.php?id=61592334239297', 'https://www.facebook.com/Phongzhouok99')
        content = content.replace('https://facebook.com/profile.php?id=61592334239297', 'https://www.facebook.com/Phongzhouok99')

        # Fix internal navigation
        content = content.replace('https://deargift.love/#y-tuong', 'index.html#y-tuong')
        content = content.replace('https://deargift.love/#danh-gia', 'index.html#danh-gia')
        content = content.replace('https://deargift.love/', 'index.html')

        with open(local_name, 'w', encoding='utf-8') as f:
            f.write(content)

        # Also copy to .html version if .php
        if local_name.endswith('.php'):
            html_name = local_name.replace('.php', '.html')
            with open(html_name, 'w', encoding='utf-8') as f:
                f.write(content)

        print(f"Saved {local_name} successfully! Length: {len(content)}")
    except Exception as e:
        print(f"Error downloading {url}:", e)
