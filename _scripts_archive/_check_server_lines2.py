with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("\n--- LINES 340-420 ---")
for i in range(340, min(420, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
