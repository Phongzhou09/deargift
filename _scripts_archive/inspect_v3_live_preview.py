with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function v3LivePreview')
if idx != -1:
    print("--- v3LivePreview ---")
    print(c[idx:idx+2000])
else:
    print("v3LivePreview not found")
