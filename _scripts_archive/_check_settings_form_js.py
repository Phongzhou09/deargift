with open('settings.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(645, len(lines)):
    print(f"{i+1}: {lines[i]}", end='')
