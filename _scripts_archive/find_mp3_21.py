import urllib.request
import re

with open('demos/demo_21.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

mp3s = re.findall(r'[^"\'<>\s]+\.mp3', c)
print("MP3s in demo_21:", mp3s)
