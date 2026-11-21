with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re
print("Sections in index.html:")
for m in re.finditer(r'<section[^>]*id=[\"\']([^\"\']+)[\"\']', c):
    print("  id:", m.group(1))

print("Has y-tuong:", 'y-tuong' in c)
print("Has danh-gia:", 'danh-gia' in c)
