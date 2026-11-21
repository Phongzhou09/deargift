import urllib.request

url = 'https://deargift.love/templates/_v3/live.php?slug=mon-qua-nho-2010'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        content = r.read().decode('utf-8', errors='ignore')
        with open('templates/_v3/live.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Downloaded live.html from deargift.love, length:", len(content))
except Exception as e:
    print('Error:', e)
