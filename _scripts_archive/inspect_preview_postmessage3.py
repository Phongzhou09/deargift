with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function sendLivePreviewUpdate')
print(c[idx+4000:idx+6500])
