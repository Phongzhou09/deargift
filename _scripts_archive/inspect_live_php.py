import urllib.request

url = 'https://deargift.love/templates/_v3/live.php?slug=mon-qua-nho-2010'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        content = r.read().decode('utf-8', errors='ignore')
        print("Length:", len(content))
        print("Snippet:\n", content[:2500])
except Exception as e:
    print('Error:', e)
