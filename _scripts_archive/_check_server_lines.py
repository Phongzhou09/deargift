with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Total lines in server.py:", len(lines))

print("\n--- LINES 190-230 ---")
for i in range(190, min(230, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')

print("\n--- LINES 275-315 ---")
for i in range(275, min(315, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
