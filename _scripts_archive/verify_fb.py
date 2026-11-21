import re

for filename in ['templates.php', 'index.html', 'gift-builder.php', 'gift-builder.html', 'admin.html']:
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    matches = re.findall(r'https?://[^\s\"\'<>]*facebook[^\s\"\'<>]*', c)
    print(filename, '->', matches)
