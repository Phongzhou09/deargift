with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re
matches = re.findall(r'id=["\']([a-zA-Z0-9_-]+)["\']', c)
print("Unique IDs in index.html:", sorted(list(set(matches))))
