with open('templates.php', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find("header-auth-buttons")
idx2 = c.find("header-auth-buttons", idx + 20)
if idx2 != -1:
    print(c[idx2-50:idx2+700])
