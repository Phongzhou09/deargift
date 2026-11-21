with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re

# find file inputs
file_inputs = re.findall(r'<input[^>]*type=["\']file["\'][^>]*>', c)
print(f"Total file inputs found: {len(file_inputs)}")
for fi in file_inputs:
    print("  File input:", fi)

# find photo upload JS handlers
print("\n--- PHOTO UPLOAD HANDLERS ---")
for m in re.finditer(r'upload|photo|image|preview|crop|FileReader', c, re.I):
    start = max(0, m.start() - 100)
    end = min(len(c), m.end() + 250)
    snippet = c[start:end]
    if 'input' in snippet and ('change' in snippet or 'file' in snippet or 'readAsDataURL' in snippet):
        print("Snippet:\n", snippet)
        print("-" * 40)
