with open('register.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix toggle function
c = c.replace("toggleMẬT KHẨU('password','togglePwd1')", "togglePasswordVis('password','togglePwd1')")
c = c.replace("toggleMẬT KHẨU('password_confirm','togglePwd2')", "togglePasswordVis('password_confirm','togglePwd2')")

# Fix button
c = c.replace('Create free account', 'Tạo tài khoản miễn phí')

# Make links compatible with file:///
c = c.replace('href="login.php"', 'href="login.html"')
c = c.replace('href="register.php"', 'href="register.html"')

# Add togglePasswordVis function
js_fix = '''
<script>
function togglePasswordVis(id, iconId) {
  var input = document.getElementById(id);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}
</script>
'''
if 'function togglePasswordVis' not in c:
    c = c.replace('</body>', js_fix + '\n</body>')

with open('register.html', 'w', encoding='utf-8') as f:
    f.write(c)
with open('register.php', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed register.html and register.php!")
