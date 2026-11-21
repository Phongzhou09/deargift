import re

with open('demos/demo_69.html', 'r', encoding='utf-8') as f:
    text = f.read()

imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', text)
print("Demo 69 images:", imgs[:10])

# Also check relative links in demo_69
links = re.findall(r'(?:href|src)=["\']([^"\']+)["\']', text)
broken = [l for l in links if not l.startswith(('http', '//', 'data:'))]
print("Relative paths in demo 69:", set(broken[:20]))
