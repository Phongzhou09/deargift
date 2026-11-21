with open('my-gifts.html', 'r', encoding='utf-8') as f:
    c = f.read()

print("Length of my-gifts.html:", len(c))
print("--- SCRIPT SECTION OF MY-GIFTS.HTML ---")
import re
scripts = re.findall(r'<script.*?>([\s\S]*?)</script>', c)
for s in scripts:
    print(s[:1500])
