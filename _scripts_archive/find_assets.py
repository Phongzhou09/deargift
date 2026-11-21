import re

with open('demos/demo_69.html', 'r', encoding='utf-8') as f:
    text = f.read()

urls = re.findall(r'[\'"]([^\'"]+\.(?:jpg|png|webp|svg|gif|mp3|mp4))[\'"]', text, re.IGNORECASE)
for u in set(urls):
    print("Found asset:", u)
