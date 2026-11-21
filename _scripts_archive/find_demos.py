with open('templates.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
print("Matches in templates.php:")
for line in c.splitlines():
    if 'demo' in line.lower() or 'xem thử' in line.lower() or 'xem demo' in line.lower():
        print(line[:120])
