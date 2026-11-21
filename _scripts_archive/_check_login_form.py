with open('login.html', 'r', encoding='utf-8') as f:
    c = f.read()

import re
print("Length of login.html:", len(c))
# Check if there is an error alert or form
form_match = re.search(r'<form[\s\S]*?</form>', c)
if form_match:
    print("Form HTML:")
    print(form_match.group(0))
