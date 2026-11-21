import os, re

old_fb_pattern = r'https?://(?:www\.)?facebook\.com/profile\.php\?id=61592334239297'
target_fb = 'https://www.facebook.com/Phongzhouok99'

count = 0
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith(('.html', '.php', '.js', '.json', '.txt', '.md')):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                new_content, n = re.subn(old_fb_pattern, target_fb, content)
                if n > 0:
                    with open(p, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f"Updated {n} link(s) in: {p}")
                    count += 1
            except Exception as e:
                pass

print(f"Total files updated: {count}")
