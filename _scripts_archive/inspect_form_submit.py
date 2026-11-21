with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

import re
# find submit button and form action
forms = re.findall(r'<form[^>]*>', c)
for f in forms:
    print("Form tag:", f)

# search for submit listener
listeners = re.findall(r'(\.addEventListener\([\'\"]submit[\'\"][\s\S]*?)(?:function|\()', c)
for l in listeners:
    print("Submit listener snippet:\n", l[:200])

# search for 'Tạo quà' button in form
btns = re.findall(r'<button[^>]*>[\s\S]*?Tạo quà[\s\S]*?</button>', c)
for b in btns:
    print("Button:", b)
