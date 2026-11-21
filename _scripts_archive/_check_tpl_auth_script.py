with open('templates.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
matches = re.findall(r'header-auth-buttons[\s\S]*?</script>', c)
for m in matches:
    print(m[:1000])
