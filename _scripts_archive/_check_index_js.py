with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re

# Check functions in index.html
functions = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', html)
print('Functions defined in index.html:')
for fn in sorted(set(functions)):
    print(' -', fn)

# Check endpoints in index.html
endpoints = set(re.findall(r'["\']([^"\']+\.php[^"\']*)["\']', html))
print('\nEndpoints in index.html:')
for ep in sorted(endpoints):
    print(' -', ep)
