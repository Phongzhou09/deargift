with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re

idx = c.find('function sendLivePreviewUpdate')
if idx != -1:
    print("--- sendLivePreviewUpdate in gift-builder.php ---")
    print(c[idx:idx+3500])
else:
    print("sendLivePreviewUpdate not found")
