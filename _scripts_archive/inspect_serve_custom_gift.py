with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'def serve_custom_gift' in line:
        print(f"Found at line {i+1}")
        for j in range(i, min(i+90, len(lines))):
            print(f"{j+1}: {lines[j]}", end='')
        break
