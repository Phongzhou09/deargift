with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function handleGiftGeneration')
if idx == -1:
    idx = c.find('handleGiftGeneration')
print("handleGiftGeneration snippet:")
print(c[idx:idx+2500])
