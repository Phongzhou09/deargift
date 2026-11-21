with open('demos/demo_69.html', 'r', encoding='utf-8') as f:
    demo = f.read()

# check where music and assets are loaded in demo_69.html
import re
print("demo_69.html assets and scripts:")
for m in re.finditer(r'src=["\']([^"\']+)["\']|href=["\']([^"\']+)["\']', demo):
    val = m.group(1) or m.group(2)
    if not val.startswith(('http', 'data:', '#')):
        print("  Relative path:", val)
