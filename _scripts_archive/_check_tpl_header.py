with open('templates.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
header_match = re.search(r'<header[\s\S]*?</header>', c)
if header_match:
    print("Header in templates.php:")
    print(header_match.group(0))

# Check user auth sync in templates.php
scripts = re.findall(r'<script.*?>([\s\S]*?)</script>', c)
for s in scripts:
    if 'deargift_user' in s or 'currentUser' in s or 'my-gifts' in s:
        print("\n--- USER SYNC SCRIPT IN TEMPLATES.PHP ---")
        print(s[:1500])
