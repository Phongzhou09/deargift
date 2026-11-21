with open('login.html', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('</form>')
print(c[idx:idx+1500])
