import urllib.request
import re
from bs4 import BeautifulSoup

req = urllib.request.Request('https://deargift.love/', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')

# Find all fetch/ajax/endpoints
endpoints = set(re.findall(r'["\']([^"\']+\.php[^"\']*)["\']', html))
print('Endpoints referenced in deargift.love HTML:')
for ep in sorted(endpoints):
    print(' -', ep)

# Find all onclick handlers
onclicks = set(re.findall(r'onclick=["\']([^"\']+)["\']', html))
print('\nOnclick handlers:')
for oc in sorted(onclicks):
    print(' -', oc)

# Check all button texts
soup = BeautifulSoup(html, 'html.parser')
print('\nButtons:')
for btn in soup.find_all(['button', 'a']):
    txt = btn.get_text(strip=True)
    href = btn.get('href')
    onclick = btn.get('onclick')
    if txt and (href or onclick):
        if len(txt) < 40:
            print(f"[{btn.name}] '{txt}' -> href={href}, onclick={onclick}")
