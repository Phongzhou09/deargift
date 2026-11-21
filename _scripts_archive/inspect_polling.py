with open('_scripts_archive/inspect_payment.py', 'r', encoding='utf-8') as f:
    pass

import urllib.request
import re

req = urllib.request.Request('https://deargift.love/gift-builder.php?id=69', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')

idx = html.find('function startPaymentPolling')
if idx != -1:
    print(html[idx:idx+2500])
else:
    print("Not found startPaymentPolling")
