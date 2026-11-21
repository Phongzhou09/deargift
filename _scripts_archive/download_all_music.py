import urllib.request
import os

music_list = [
    ('uploads/music/song_1.m4a', 'https://deargift.love/uploads/music/song_1.m4a'),
    ('uploads/music/song_14.m4a', 'https://deargift.love/uploads/music/song_14.m4a'),
    ('demos/assets/music/bgmucsic.mp3', 'https://deargift.love/womens-day/assets/music/bgmucsic.mp3'),
    ('templates/valentine-deargift/assets/music/bgmucsic.mp3', 'https://deargift.love/valentine-deargift/assets/music/bgmucsic.mp3'),
    ('demos/music/happybirtday_uia.mp3', 'https://deargift.love/hpbd-book/music/happybirtday_uia.mp3'),
    ('demos/assets/musics/hoanhipgiangsinh.mp3', 'https://deargift.love/giang-sinh/assets/musics/hoanhipgiangsinh.mp3'),
    ('demos/assets/musics/nguoigieomamxanh.mp3', 'https://deargift.love/nha-giao-2011/assets/musics/nguoigieomamxanh.mp3'),
    ('demos/assets/musics/phepmau.mp3', 'https://deargift.love/valentine-sweet/assets/musics/phepmau.mp3'),
    ('demos/assets/musics/danhchoem.mp3', 'https://deargift.love/bo-hoa-8-3/assets/musics/danhchoem.mp3'),
    ('demos/assets/audio/happy-new-year.mp3', 'https://deargift.love/phao-hoa-nam-moi/assets/audio/happy-new-year.mp3'),
    ('demos/assets/music/bongtrang.mp3', 'https://deargift.love/trung-thu-nguyet-da/assets/music/bongtrang.mp3'),
    ('demos/assets/music.mp3', 'https://deargift.love/photo-bouquet/assets/music.mp3'),
    ('templates/bo-hoa-tulip/app/media/tiktok-music-1780247017983-dx1cxk.mp3', 'https://deargift.love/templates/bo-hoa-tulip/app/media/tiktok-music-1780247017983-dx1cxk.mp3')
]

for local_path, url in music_list:
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    if not os.path.exists(local_path):
        print(f"Downloading {url} -> {local_path}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(local_path, 'wb') as f:
                f.write(resp.read())
            print(f"  OK: {os.path.getsize(local_path)} bytes")
        except Exception as e:
            print(f"  Error {url}: {e}")
    else:
        print(f"Already exists: {local_path}")

print("All audio files downloaded!")
