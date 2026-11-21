with open('gift-builder.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function handlePhotoUpload')
if idx != -1:
    print("--- handlePhotoUpload in gift-builder.php ---")
    print(c[idx:idx+2500])
else:
    print("handlePhotoUpload not found")
