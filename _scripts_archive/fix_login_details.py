with open('login.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix toggle function
c = c.replace("toggleMật khẩu('password','togglePwd')", "togglePasswordVis('password','togglePwd')")
c = c.replace('togglePassword(', 'togglePasswordVis(')

# Fix Sign in button text
c = c.replace('>Sign in<', '>Đăng nhập &rarr;<')
c = c.replace('Sign in        <svg', 'Đăng nhập <svg')

# Make links compatible with file:///
c = c.replace('href="register.php"', 'href="register.html"')
c = c.replace('href="login.php"', 'href="login.html"')

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

with open('login.html', 'w', encoding='utf-8') as f:
    f.write(c)
with open('login.php', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed login.html and login.php!")
