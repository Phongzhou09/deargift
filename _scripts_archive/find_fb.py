import os, re

found = set()
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith(('.html', '.php', '.js')):
            p = os.path.join(root, f)
            try:
                c = open(p, 'r', encoding='utf-8').read()
                m = re.findall(r'https?://(?:www\.)?facebook\.com/[^\s"\'<>]+', c)
                found.update(m)
            except Exception:
                pass

print("Facebook links found:", found)
