with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function v3LivePreview')
print(c[idx+1500:idx+3500])
