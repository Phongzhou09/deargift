import re

# 1. Update login.html to Vietnamese
with open('login.html', 'r', encoding='utf-8') as f:
    login = f.read()

# Replace texts
login = login.replace('Create the Most<br><span>Romantic Digital Gift</span><br>for Someone Special 💖',
                      'Tạo Quà Tặng<br><span>Lãng Mạn Nhất</span><br>Cho Người Ấy 💖')
login = login.replace('Build a 3D card, heart-shaped QR or romantic link in only a few minutes.',
                      'Thiệp 3D, mã QR tình yêu, link tỏ tình — tất cả miễn phí và chỉ mất 2 phút để tạo.')
login = login.replace('100+ unique templates', '100+ mẫu thiệp độc đáo')
login = login.replace('3D cards, heart QR and romantic effects', 'Thiệp 3D, QR tình yêu, chữ rơi lãng mạn')
login = login.replace('Create it in minutes', 'Tạo trong 2 phút')
login = login.replace('No design or coding skills needed', 'Không cần thiết kế, không cần lập trình')
login = login.replace('Share anywhere', 'Gửi qua Zalo & Messenger')
login = login.replace('Copy the link and send an instant surprise', 'Copy link — người ấy bất ngờ ngay lập tức')

# Right side
login = login.replace('Welcome back 👋', 'Chào mừng trở lại 👋')
login = login.replace('Welcome back! 👋', 'Chào mừng trở lại 👋')
login = login.replace('Sign in to create and manage your digital gifts', 'Đăng nhập để tạo thiệp và gửi quà cho người ấy')
login = login.replace('Create personal cards and romantic digital gifts', 'Đăng nhập để tạo thiệp và gửi quà cho người ấy')

login = login.replace('>Sign in<', '>Đăng nhập<')
login = login.replace('>Sign up<', '>Đăng ký<')
login = login.replace('placeholder="e.g. loveuser"', 'placeholder="VD: loveuser"')
login = login.replace('placeholder="Your password"', 'placeholder="Nhập mật khẩu"')
login = login.replace('>Forgot password?<', '>Quên mật khẩu?<')
login = login.replace('Sign in &rarr;', 'Đăng nhập &rarr;')
login = login.replace('or continue with', 'hoặc tiếp tục với')
login = login.replace('Sign in with Google', 'Đăng nhập với Google')
login = login.replace("Don't have an account?", 'Chưa có tài khoản?')
login = login.replace('Sign up for free &rarr;', 'Đăng ký miễn phí &rarr;')
login = login.replace('Username or email', 'Tên đăng nhập')
login = login.replace('Password', 'Mật khẩu')

# Switcher active class
login = login.replace('<a href="/login.php?lang=vi" class="">VI</a><a href="/login.php?lang=en" class="active">EN</a>',
                      '<a href="javascript:switchAuthLang(\'vi\')" id="btnLangVi" class="active">VI</a><a href="javascript:switchAuthLang(\'en\')" id="btnLangEn" class="">EN</a>')

# Add Google account display
login_google_snippet = '''
<div style="display:flex; align-items:center; justify-content:center; gap:10px; padding:10px 16px; border:1.5px solid #eadff5; border-radius:50px; background:white; margin:12px 0; cursor:pointer;" onclick="handleGoogleSuccess()">
  <div style="width:28px; height:28px; border-radius:50%; background:#7c3aed; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">P</div>
  <div style="text-align:left; font-size:12px; line-height:1.3;">
    <div style="font-weight:700; color:#3d3551;">Đăng nhập với tên Phong</div>
    <div style="color:#a79fb8;">phongnguyenvanphong28@gmail.com</div>
  </div>
  <svg style="margin-left:auto;" width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.2 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.2 0 15s.7 5.4 1.9 7.8l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.8 5.6 7 10.1 7z"/></svg>
</div>
<script>
function handleGoogleSuccess() {
  localStorage.setItem('deargift_customer', JSON.stringify({ name: 'Phong', email: 'phongnguyenvanphong28@gmail.com', loggedIn: true }));
  alert('Đăng nhập thành công với tài khoản phongnguyenvanphong28@gmail.com!');
  window.location.href = 'templates.php';
}
</script>
'''

if 'id="g_id_onload"' in login:
    # replace google container with the styled button from screenshot
    login = re.sub(r'<div id=\"g_id_onload\"[\s\S]*?</div>\s*</div>', login_google_snippet, login)

with open('login.html', 'w', encoding='utf-8') as f:
    f.write(login)
with open('login.php', 'w', encoding='utf-8') as f:
    f.write(login)

print("Updated login.html & login.php to Vietnamese matching screenshot!")
