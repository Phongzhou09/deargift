import os
import glob

demos = glob.glob('demos/*.html')
count = 0
total_replaced = 0

for d in demos:
    with open(d, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    new_content = content
    # Replace absolute root or remote URLs with relative or local-friendly paths
    new_content = new_content.replace('https://deargift.love/templates/', '../templates/')
    new_content = new_content.replace('https://deargift.love/assets/', '../assets/')
    new_content = new_content.replace('https://deargift.love/css/', '../css/')
    new_content = new_content.replace('https://deargift.love/js/', '../js/')
    new_content = new_content.replace('https://deargift.love/uploads/', '../uploads/')
    
    if new_content != content:
        with open(d, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1

print(f"Updated {count} demo files with local relative paths!")
