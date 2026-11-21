with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

import re
matches = re.findall(r'async function submitReview[\s\S]*?^    \}', c, re.M)
if not matches:
    matches = re.findall(r'function submitReview[\s\S]*?^    \}', c, re.M)

for m in matches:
    print(m)
