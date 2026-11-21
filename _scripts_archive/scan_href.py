with open('admin.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'href="/' in l or "href='/" in l:
        print(f'{i+1}: {l.strip()}')
