with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(460, min(540, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
