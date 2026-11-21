import json
import os
import re

with open('demo_bases.json', 'r', encoding='utf-8') as f:
    bases = json.load(f)

count = 0
for tid, base_url in bases.items():
    file_path = os.path.join('demos', f'demo_{tid}.html')
    if not os.path.exists(file_path):
        continue
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Check if <base href="..."> already exists
    if '<base ' in content:
        content = re.sub(r'<base\s+href=[\"\'][^\"\']*[\"\']\s*/?>', f'<base href="{base_url}">', content)
    else:
        # Insert base tag right after <head>
        content = re.sub(r'(<head[^>]*>)', rf'\1\n<base href="{base_url}">', content, count=1, flags=re.I)
    
    # Also replace any Bùi Minh Quyết with Nguyễn Văn Phong
    content = content.replace('Bùi Minh Quyết', 'Nguyễn Văn Phong')
    content = content.replace('Bùi Xuân Minh Quyết', 'Nguyễn Văn Phong')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    count += 1

print(f"Successfully injected base URL into {count} demo files!")
