with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if 'ý tưởng' in line.lower() or 'đánh giá' in line.lower() or 'về deargift' in line.lower():
            print(f"Line {i+1}: {line.strip()[:140]}")
