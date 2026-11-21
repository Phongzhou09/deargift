import urllib.request
import re

req = urllib.request.Request('https://deargift.love/gift-builder.php?id=69', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    print('Gift builder length:', len(html))
    
    # search for payment polling, qr modal, check status
    for m in re.finditer(r'payment|qr|check|vietqr|status', html, re.I):
        start = max(0, m.start() - 100)
        end = min(len(html), m.end() + 200)
        snippet = html[start:end]
        if 'ajax' in snippet or 'polling' in snippet or 'fetch' in snippet or 'setInterval' in snippet or 'transfer' in snippet:
            print("--- Snippet ---")
            print(snippet)
            print("----------------")
except Exception as e:
    print('Error:', e)
