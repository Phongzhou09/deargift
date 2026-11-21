import urllib.request
from bs4 import BeautifulSoup
import re

req = urllib.request.Request('https://deargift.love/login.php', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')

print("--- FORMS IN DEARGIFT.LOVE/LOGIN.PHP ---")
for f in soup.find_all('form'):
    print(f"Action: {f.get('action')}, Method: {f.get('method')}")
    for inp in f.find_all(['input', 'button']):
        print(f"  {inp.name} name={inp.get('name')} type={inp.get('type')} value={inp.get('value')}")

print("\n--- GOOGLE AUTH IN DEARGIFT.LOVE/LOGIN.PHP ---")
for tag in soup.find_all(lambda t: 'google' in str(t.get('class', [])).lower() or 'google' in str(t.get('id', '')).lower() or 'google' in t.text.lower()):
    if tag.name in ['div', 'a', 'button', 'script']:
        print(tag.name, tag.get('class'), tag.get('id'), tag.get('href'), tag.get('onclick'))

print("\n--- SCRIPTS IN DEARGIFT.LOVE/LOGIN.PHP ---")
for s in soup.find_all('script'):
    if s.get('src'):
        print("Src:", s.get('src'))
    else:
        text = s.string or ""
        if 'google' in text.lower() or 'oauth' in text.lower() or 'login' in text.lower() or 'credential' in text.lower():
            print("Inline script snippet:")
            print(text[:1000])
