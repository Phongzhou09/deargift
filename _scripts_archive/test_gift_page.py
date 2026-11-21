import urllib.request
import json
from bs4 import BeautifulSoup

url = "http://localhost:8000/gift.php?uid=g_031862a4"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

print("Status 200, length:", len(html))
soup = BeautifulSoup(html, 'html.parser')
print("Title:", soup.title.string if soup.title else "No title")
print("Base href:", [b.get('href') for b in soup.find_all('base')])
scripts = soup.find_all('script')
print("Total scripts:", len(scripts))
for s in scripts:
    if s.get('src'):
        print("Script src:", s['src'])
    else:
        txt = s.string or ""
        if 'config' in txt or 'GIFTTO' in txt:
            print("Inline config snippet:", txt[:300])
