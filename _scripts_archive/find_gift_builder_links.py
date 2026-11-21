with open('gift-builder.php', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'tải' in l.lower() or 'liên kết' in l.lower() or 'copy' in l.lower() or 'share' in l.lower():
        if 'script' in l.lower() or 'function' in l.lower() or 'button' in l.lower() or 'modal' in l.lower():
            print(f"{i+1}: {l.strip()[:140]}")
