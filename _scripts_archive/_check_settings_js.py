with open('settings.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
idx = c.find('phongnguyen')
print("Snippet around phongnguyen in settings.php:")
print(c[idx-100:idx+300])
