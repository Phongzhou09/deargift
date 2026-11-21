with open('register.html', 'r', encoding='utf-8') as f:
    c = f.read()

start_marker = '<div class="divider">'
idx_start = c.find(start_marker)
print("Content in register.html starting at divider:\n", c[idx_start:idx_start+2000])
