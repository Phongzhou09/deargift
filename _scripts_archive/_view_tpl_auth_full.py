with open('templates.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find("header-auth-buttons")
idx2 = c.find("header-auth-buttons", idx + 20)
print(c[idx2-100:idx2+1100])
