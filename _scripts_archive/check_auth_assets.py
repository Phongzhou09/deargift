import re

for f in ['login.html', 'register.html']:
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        c = fp.read()
    links = re.findall(r'(?:href|src)=["\']([^"\']+)["\']', c)
    print(f"=== {f} ===")
    for l in links:
        if not l.startswith('data:') and not 'fonts.google' in l:
            print(" ", l)
