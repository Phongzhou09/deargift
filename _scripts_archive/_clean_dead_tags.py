import os
import re

files = [
    'my-gifts.html', 'my-gifts.php',
    'about.php', 'about.html',
    'contact.php', 'contact.html',
    'settings.php', 'settings.html'
]

for f in files:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    # remove bootstrap-custom.css
    c = c.replace('<link rel="stylesheet" href="css/bootstrap-custom.css">', '')
    
    # remove cloudflare email-decode script
    c = re.sub(r'<script[^>]*src=["\'](/cdn-cgi/scripts/[^"\']+)["\'][^>]*></script>', '', c)
    
    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(c)
    print(f"Cleaned dead tags in {f}")
