import os
import urllib.request

target_dir = 'templates/mon-qua-nho-2010/app/assets/music'
os.makedirs(target_dir, exist_ok=True)

url = 'https://deargift.love/templates/mon-qua-nho-2010/app/assets/music/givemeyourforever.mp3'
dest = os.path.join(target_dir, 'givemeyourforever.mp3')

if not os.path.exists(dest):
    print("Downloading givemeyourforever.mp3...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(dest, 'wb') as f:
        f.write(resp.read())
    print("Downloaded successfully! Size:", os.path.getsize(dest))
else:
    print("Already exists!")
