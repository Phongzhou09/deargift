with open('login.html', 'r', encoding='utf-8') as f:
    c = f.read()

start_marker = '<div class="divider"><hr><span>hoặc tiếp tục với</span><hr></div>'
end_marker = '<div class="auth-footer">'

idx_start = c.find(start_marker)
idx_end = c.find(end_marker)

print("idx_start:", idx_start, "idx_end:", idx_end)
print("Content between:\n", c[idx_start:idx_end])
