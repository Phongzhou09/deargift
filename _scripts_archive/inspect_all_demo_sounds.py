import os
import glob
import re

demos = sorted(glob.glob('demos/*.html'))
print(f"Total demo files: {len(demos)}")

has_audio_tag = 0
has_bgMusic = 0
has_howler = 0
no_audio_found = []

for d in demos:
    with open(d, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    
    audios = re.findall(r'<audio[^>]*src=[\"\']([^\"\']+)[\"\']', c)
    bgMusics = re.findall(r'(?:bgMusic|music|audioSource|songUrl)[\"\']?\s*:\s*[\"\']([^\"\']+)[\"\']', c)
    howlers = re.findall(r'new\s+Howl\(\{\s*src:\s*\[[\"\']([^\"\']+)[\"\']', c)
    mp3s = re.findall(r'[\w\-\./]+\.mp3', c)

    tid = os.path.basename(d)
    if audios or bgMusics or howlers or mp3s:
        all_sound = audios + bgMusics + howlers + mp3s
        print(f"{tid}: Sound sources -> {list(set(all_sound))[:3]}")
    else:
        no_audio_found.append(tid)

print(f"\nFiles with no audio references found ({len(no_audio_found)}):", no_audio_found)
