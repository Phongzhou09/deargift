with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- SERVER.PY LINES 230-340 ---")
for i in range(230, min(340, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
