import re

files = ['login.html', 'login.php', 'register.html', 'register.php', 'settings.html', 'settings.php']
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    print(f"\n--- Checking {f} ---")
    matches = re.findall(r'phong[a-zA-Z0-9_]*', c, re.IGNORECASE)
    print("Matches for phong:", set(matches))
