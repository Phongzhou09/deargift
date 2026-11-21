with open('gift-builder.php', 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if 'Quyết' in line or 'quyết' in line or 'ý tưởng' in line:
            print(f"gift-builder.php:{i+1}: {line.strip()[:150]}")

with open('templates.php', 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if 'Quyết' in line or 'quyết' in line or 'ý tưởng' in line:
            print(f"templates.php:{i+1}: {line.strip()[:150]}")
