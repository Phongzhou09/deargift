with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

import re
header_match = re.search(r'<header[\s\S]*?</header>', c)
if header_match:
    print(header_match.group(0)[:1500])
