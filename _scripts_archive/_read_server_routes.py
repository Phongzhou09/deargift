with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- SERVER.PY LINES 140-230 ---")
for i in range(140, min(230, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
