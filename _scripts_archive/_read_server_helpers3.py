with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(540, min(620, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
