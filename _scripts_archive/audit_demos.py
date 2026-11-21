import os
import re

print("Auditing all demos in demos/ ...")
demo_files = [f for f in os.listdir('demos') if f.endswith('.html')]
print(f"Total demo files: {len(demo_files)}")

issues = []
for df in demo_files:
    path = os.path.join('demos', df)
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    
    # check if has iframe or assets
    iframes = re.findall(r'<iframe[^>]*src=["\']([^"\']+)["\']', c)
    for src in iframes:
        if not src.startswith(('http', '//')):
            clean_src = src.split('?')[0].replace('../', '').lstrip('/')
            if not os.path.exists(clean_src):
                issues.append((df, 'IFRAME', src, clean_src))

print(f"Total issues found: {len(issues)}")
for df, typ, raw, clean in issues[:15]:
    print(f"  [{df}] {typ}: {raw} -> NOT FOUND ({clean})")
