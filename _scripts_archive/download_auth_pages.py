import urllib.request
import os

pages = {
    'login.php': 'https://deargift.love/login.php',
    'register.php': 'https://deargift.love/register.php'
}

for local_name, url in pages.items():
    print(f"Downloading {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8', errors='ignore')

        # Replace remote domain links with local links
        content = content.replace('https://deargift.love/css/', 'css/')
        content = content.replace('https://deargift.love/js/', 'js/')
        content = content.replace('https://deargift.love/assets/', 'assets/')
        content = content.replace('https://deargift.love/templates.php', 'templates.php')
        content = content.replace('https://deargift.love/templates/', 'templates/')
        content = content.replace('https://deargift.love/login.php', 'login.php')
        content = content.replace('https://deargift.love/register.php', 'register.php')
        content = content.replace('https://deargift.love/', 'index.html')

        # Replace author
        content = content.replace('Bùi Minh Quyết', 'Nguyễn Văn Phong')
        content = content.replace('Bùi Xuân Minh Quyết', 'Nguyễn Văn Phong')

        # Replace facebook
        content = content.replace('https://www.facebook.com/profile.php?id=61592334239297', 'https://www.facebook.com/Phongzhouok99')

        with open(local_name, 'w', encoding='utf-8') as f:
            f.write(content)

        html_name = local_name.replace('.php', '.html')
        with open(html_name, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"Saved {local_name} & {html_name} successfully! Size: {len(content)}")
    except Exception as e:
        print(f"Error {url}:", e)
