import urllib.request
import re
import os
import json

test_ids = [21, 7, 12, 22, 28, 23, 29, 30, 25, 26, 27, 31, 33, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 8, 9, 34, 35, 36, 37, 38, 39, 68, 69]

mapping = {}

for tid in test_ids:
    url = f"https://deargift.love/demo.php?id={tid}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            final_url = resp.geturl()
            # extract directory base: e.g. https://deargift.love/hpbd-vip/
            base = final_url.rsplit('/', 1)[0] + '/'
            mapping[tid] = base
            print(f"id={tid} -> {base}")
    except Exception as e:
        print(f"id={tid} failed: {e}")
        mapping[tid] = "https://deargift.love/"

with open('demo_bases.json', 'w', encoding='utf-8') as f:
    json.dump(mapping, f, indent=2)

print("Saved demo_bases.json!")
