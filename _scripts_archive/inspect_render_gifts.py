with open('my-gifts.html', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function renderGifts')
print(c[idx:idx+2500])
