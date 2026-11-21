import os, re

files_with_deargift = []
for root, dirs, files in os.walk('.'):
    if '.git' in root or '.gemini' in root:
        continue
    for file in files:
        if file.endswith(('.php', '.html', '.js')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                matches = re.findall(r'href=[\"\'](https?://deargift\.love[^\s\"\'<>]*)[\"\']', content)
                if matches:
                    files_with_deargift.append((path, len(matches), set(matches)))
            except Exception:
                pass

print(f"Found {len(files_with_deargift)} files with deargift.love links:")
for path, count, matches in files_with_deargift[:15]:
    print(f"{path}: {count} links -> {list(matches)[:5]}")
