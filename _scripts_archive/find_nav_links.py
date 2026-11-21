with open('templates.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[:300]):
    if '<a ' in l:
        print(f"{i+1}: {l.strip()}")
