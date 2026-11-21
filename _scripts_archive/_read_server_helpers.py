with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(95, 140):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end='')
