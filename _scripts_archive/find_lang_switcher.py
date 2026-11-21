with open('templates.php', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'is-active' in l and ('VI' in l or 'EN' in l):
        print(f'{i+1}: {l.strip()}')
