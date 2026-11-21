import os

for f in ['index.html', 'about.html', 'contact.html', 'templates.php', 'settings.php']:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            c = fp.read()
            has_nvp = 'Nguyễn Văn Phong' in c
            has_fb = 'Phongzhouok99' in c
            print(f"{f}: Nguyen Van Phong: {has_nvp}, FB link: {has_fb}")
