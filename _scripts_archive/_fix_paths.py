import os
import glob
import re

files = glob.glob("*.html") + glob.glob("*.php")
total_fixes = 0

for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    new_content = content
    new_content = re.sub(r'index\.html(js|css|assets|templates|uploads|demos)', r'\1', new_content)
    new_content = new_content.replace('index.htmltemplates.php', 'templates.php')
    new_content = new_content.replace('index.htmlabout.php', 'about.php')
    new_content = new_content.replace('index.htmlcontact.php', 'contact.php')
    new_content = new_content.replace('index.htmllogin.php', 'login.php')
    new_content = new_content.replace('index.htmlregister.php', 'register.php')

    if new_content != content:
        diff_count = len(content) - len(new_content)
        total_fixes += 1
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed paths in {filepath}")

print(f"Done! Fixed {total_fixes} files.")
