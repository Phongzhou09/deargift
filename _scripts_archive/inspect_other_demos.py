import os, re

demos = ['demo_21.html', 'demo_7.html', 'demo_12.html', 'demo_22.html', 'demo_28.html']

for d in demos:
    path = os.path.join('demos', d)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    print(f"=== {d} ===")
    links = re.findall(r'(?:href|src)=[\"\']([^\"\']+)[\"\']', c)
    css_js = [l for l in links if not l.startswith('data:') and not 'fonts.google' in l][:10]
    print("  First assets:", css_js)
