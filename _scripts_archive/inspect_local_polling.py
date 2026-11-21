with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
idx = c.find('function showQRModal')
if idx != -1:
    print("--- Local showQRModal in gift-builder.php ---")
    print(c[idx:idx+2000])
else:
    print("showQRModal not found directly")
