with open('_inspect_live_login.py', 'r', encoding='utf-8') as f:
    pass

import urllib.request
from bs4 import BeautifulSoup
import re

req = urllib.request.Request('https://deargift.love/login.php', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

idx = html.find('handleGoogleLoginResponse')
if idx != -1:
    print(html[idx-500:idx+1000])

print("\n--- G_ID ELEMENTS ---")
for line in html.splitlines():
    if 'g_id' in line or 'gsi' in line or 'data-client_id' in line or 'auth_google' in line:
        print(line)
