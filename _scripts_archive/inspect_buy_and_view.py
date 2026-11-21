import re
from bs4 import BeautifulSoup

print("=== CHECKING TEMPLATES.PHP BUTTONS ===")
with open('templates.php', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
preview_btns = soup.find_all(lambda tag: 'xem thử' in tag.text.lower() or 'preview' in tag.text.lower())
print(f"Total Preview buttons in templates.php: {len(preview_btns)}")
for b in preview_btns[:5]:
    print(f"  {b.name} href={b.get('href')} onclick={b.get('onclick')} data-attrs={ {k:v for k,v in b.attrs.items() if k.startswith('data-')} }")

create_btns = soup.find_all(lambda tag: 'tạo quà' in tag.text.lower() or 'create gift' in tag.text.lower())
print(f"Total Create/Buy buttons in templates.php: {len(create_btns)}")
for b in create_btns[:5]:
    print(f"  {b.name} href={b.get('href')} onclick={b.get('onclick')}")

print("\n=== CHECKING GIFT-BUILDER.PHP SUBMISSION ===")
with open('gift-builder.php', 'r', encoding='utf-8') as f:
    gb_html = f.read()

# find submit handler in gift-builder.php
forms = re.findall(r'<form[\s\S]*?</form>', gb_html)
print(f"Forms in gift-builder.php: {len(forms)}")

# find all fetch / submit calls in gift-builder.php
fetches = re.findall(r'fetch\([\'\"]([^\'\"]+)[\'\"]', gb_html)
print("Fetches in gift-builder.php:", set(fetches))
