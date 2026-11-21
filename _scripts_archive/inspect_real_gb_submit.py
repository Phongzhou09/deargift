import urllib.request
import re

req = urllib.request.Request('https://deargift.love/gift-builder.php?id=69', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')

# search for form submit or showQRModal
idx = html.find('showQRModal')
if idx != -1:
    print("--- Where showQRModal is called in deargift.love ---")
    print(html[idx-1000:idx+500])
