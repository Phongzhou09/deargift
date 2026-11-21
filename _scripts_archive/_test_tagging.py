from bs4 import BeautifulSoup
import json
import re

with open('category_mapping.json', 'r', encoding='utf-8') as f:
    cat_map = json.load(f)

# Build inverted map: template_id -> list of category_ids
tpl_to_cats = {}
for cid, info in cat_map.items():
    for tid in info['template_ids']:
        tpl_to_cats.setdefault(str(tid), set()).add(str(cid))
        tpl_to_cats[str(tid)].add("1") # All templates belong to category 1 (All)

print("Template to categories mapping:")
for tid in sorted(tpl_to_cats.keys(), key=lambda x: int(x) if x.isdigit() else 999):
    print(f"  TID {tid}: cats={sorted(list(tpl_to_cats[tid]), key=int)}")

with open('templates.php', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

cards = soup.find_all('article', class_='tm-card')
print(f"Found {len(cards)} cards in templates.php")

for card in cards:
    # Find template id
    link = card.find('a', href=re.compile(r'id=(\d+)'))
    tid = None
    if link:
        m = re.search(r'id=(\d+)', link['href'])
        if m: tid = m.group(1)
    
    if tid:
        card['data-template-id'] = tid
        cids = sorted(list(tpl_to_cats.get(str(tid), {'1'})), key=int)
        card['data-category-ids'] = ','.join(cids)
    else:
        card['data-category-ids'] = '1'

print("Tagged all cards successfully!")
