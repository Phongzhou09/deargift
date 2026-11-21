with open('login.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Extract script blocks
import re
scripts = re.findall(r'<script.*?>([\s\S]*?)</script>', c)
for i, s in enumerate(scripts):
    if 'handleCustomer' in s or 'form' in s:
        print(f"--- SCRIPT {i} ---")
        print(s[:1500])
