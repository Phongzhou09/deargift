import os

targets = ['templates.php', 'index.html', 'gift-builder.php', 'gift-builder.html']

for target in targets:
    if not os.path.exists(target):
        continue
    with open(target, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()

    new_c = c
    new_c = new_c.replace('https://deargift.love/#y-tuong', 'index.html#y-tuong')
    new_c = new_c.replace('https://deargift.love/#danh-gia', 'index.html#danh-gia')
    new_c = new_c.replace('https://deargift.love/', 'index.html')
    new_c = new_c.replace('Bùi Minh Quyết', 'Nguyễn Văn Phong')
    new_c = new_c.replace('Bùi Xuân Minh Quyết', 'Nguyễn Văn Phong')
    new_c = new_c.replace('https://www.facebook.com/profile.php?id=61592334239297', 'https://www.facebook.com/Phongzhouok99')

    if new_c != c:
        with open(target, 'w', encoding='utf-8') as f:
            f.write(new_c)
        print(f"Updated links in {target}")
    else:
        print(f"No changes needed in {target}")
