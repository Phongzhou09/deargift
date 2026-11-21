with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(45, 95):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end='')
