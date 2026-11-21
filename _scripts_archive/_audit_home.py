import urllib.request
from bs4 import BeautifulSoup
import re

url = 'https://deargift.love/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

print('Fetched live homepage, size:', len(html))
with open('live_home.html', 'w', encoding='utf-8') as f:
    f.write(html)

soup = BeautifulSoup(html, 'html.parser')
print('=== HOMEPAGE TITLE ===')
print(soup.title.string if soup.title else 'No title')

print('\n=== ALL SECTIONS & HEADINGS ===')
for s in soup.find_all(['section', 'header', 'footer']):
    s_id = s.get('id', '')
    s_class = ' '.join(s.get('class', []))
    h = s.find(['h1', 'h2', 'h3'])
    h_txt = h.get_text(strip=True)[:50] if h else 'No heading'
    print(f"  [{s.name}] id='{s_id}' class='{s_class}' -> Heading: {h_txt}")

print('\n=== NAVIGATION LINKS ===')
nav = soup.find('nav', class_='main-nav')
if nav:
    for a in nav.find_all('a'):
        print(f"  {a.get_text(strip=True)} -> {a.get('href')}")

print('\n=== SCRIPTS ===')
for s in soup.find_all('script'):
    src = s.get('src')
    if src:
        print('  Script src:', src)
    else:
        txt = (s.string or '').strip()
        print('  Inline script len:', len(txt), 'starts with:', txt[:50])

print('\n=== MODALS / INTERACTIVE ELEMENTS ===')
modals = soup.find_all(attrs={'class': re.compile(r'modal|popup|overlay|drawer', re.I)})
for m in modals:
    print('  Modal:', m.get('id'), m.get('class'))
