import urllib.request
from bs4 import BeautifulSoup
import json
import re

cat_map = {}
for cid in range(1, 11):
    url = f"https://deargift.love/templates.php?categoryId={cid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            soup = BeautifulSoup(resp.read().decode('utf-8'), 'html.parser')
            active_cat = soup.find('a', class_='tm-category is-active')
            cname = active_cat.get_text(strip=True) if active_cat else f'Cat {cid}'
            cards = soup.find_all('article', class_='tm-card')
            ids = []
            for c in cards:
                # Find demo or builder link with id
                link = c.find('a', href=re.compile(r'id=(\d+)'))
                if link:
                    m = re.search(r'id=(\d+)', link['href'])
                    if m: ids.append(m.group(1))
            cat_map[cid] = {
                'name': cname,
                'count': len(ids),
                'template_ids': ids
            }
            print(f"Cat {cid}: {cname} -> {len(ids)} templates: {ids}")
    except Exception as e:
        print(f"Error cat {cid}: {e}")

with open('category_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(cat_map, f, ensure_ascii=False, indent=2)
print("Saved category_mapping.json!")
