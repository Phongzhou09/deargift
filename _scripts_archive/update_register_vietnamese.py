import re

with open('register.html', 'r', encoding='utf-8') as f:
    reg = f.read()

# Replace left side
reg = reg.replace('Start Creating<br><span>Digital Gifts</span><br>for Free 🚀',
                  'Bắt Đầu Tạo<br><span>Quà Tặng Kỹ Thuật Số</span><br>Miễn Phí 🚀')
reg = reg.replace('Takes only 30 seconds to sign up. Unlimited cards for your loved ones.',
                  'Chỉ mất 30 giây đăng ký — Tạo thiệp đẹp không giới hạn gửi cho người thân, bạn bè và người yêu.')
reg = reg.replace('Sign up for free', 'Đăng ký tài khoản miễn phí')
reg = reg.replace('Pick a username, email and password — done!', 'Chỉ cần tên đăng nhập, email và mật khẩu — xong ngay!')
reg = reg.replace('Pick a template', 'Chọn mẫu thiệp yêu thích')
reg = reg.replace('100+ unique 3D cards, heart QR and love messages', '100+ mẫu: thiệp 3D, QR tình yêu, link tỏ tình lãng mạn')
reg = reg.replace('Share the surprise', 'Gửi và gây bất ngờ ngay!')
reg = reg.replace('Send the link via chat and watch them smile', 'Copy link gửi qua Zalo, Messenger — người nhận xúc động!')

# Replace right side
reg = reg.replace('Create your account 🎉', 'Tạo tài khoản 🎉')
reg = reg.replace('Free forever — no credit card needed', 'Miễn phí mãi mãi — không cần thẻ tín dụng')
reg = reg.replace('>Sign in<', '>Đăng nhập<')
reg = reg.replace('>Sign up<', '>Đăng ký<')
reg = reg.replace('Username', 'TÊN ĐĂNG NHẬP')
reg = reg.replace('Email address', 'ĐỊA CHỈ EMAIL')
reg = reg.replace('Password', 'MẬT KHẨU')
reg = reg.replace('Confirm password', 'XÁC NHẬN MẬT KHẨU')
reg = reg.replace('placeholder="e.g. loveuser123"', 'placeholder="VD: loveuser123"')
reg = reg.replace('placeholder="you@example.com"', 'placeholder="contact@gmail.com"')
reg = reg.replace('placeholder="At least 8 characters"', 'placeholder="Tối thiểu 8 ký tự"')
reg = reg.replace('placeholder="Re-enter password"', 'placeholder="Nhập lại mật khẩu"')
reg = reg.replace('Enter password to check strength', 'Nhập mật khẩu để kiểm tra độ mạnh')
reg = reg.replace('Create free account &rarr;', '🎉 Tạo tài khoản miễn phí')
reg = reg.replace('or register with', 'hoặc đăng ký với')
reg = reg.replace('Already have an account?', 'Đã có tài khoản?')
reg = reg.replace('Sign in &rarr;', 'Đăng nhập ngay &rarr;')
reg = reg.replace('By registering you agree to our Terms of Service and Privacy Policy.',
                  'Bằng cách đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của DearGift.')

reg = reg.replace('<a href="/register.php?lang=vi" class="">VI</a><a href="/register.php?lang=en" class="active">EN</a>',
                  '<a href="javascript:switchAuthLang(\'vi\')" id="btnLangVi" class="active">VI</a><a href="javascript:switchAuthLang(\'en\')" id="btnLangEn" class="">EN</a>')

google_snippet = '''
<div style="display:flex; align-items:center; justify-content:center; gap:10px; padding:10px 16px; border:1.5px solid #eadff5; border-radius:50px; background:white; margin:12px 0; cursor:pointer;" onclick="handleGoogleRegister()">
  <div style="width:28px; height:28px; border-radius:50%; background:#7c3aed; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">P</div>
  <div style="text-align:left; font-size:12px; line-height:1.3;">
    <div style="font-weight:700; color:#3d3551;">Đăng nhập với tên Phong</div>
    <div style="color:#a79fb8;">phongnguyenvanphong28@gmail.com</div>
  </div>
  <svg style="margin-left:auto;" width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.2 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.2 0 15s.7 5.4 1.9 7.8l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.8 5.6 7 10.1 7z"/></svg>
</div>
<script>
function handleGoogleRegister() {
  localStorage.setItem('deargift_customer', JSON.stringify({ name: 'Phong', email: 'phongnguyenvanphong28@gmail.com', loggedIn: true }));
  alert('Đăng ký tài khoản thành công với Google phongnguyenvanphong28@gmail.com!');
  window.location.href = 'templates.php';
}
</script>
'''

if 'id="g_id_onload"' in reg:
    reg = re.sub(r'<div id=\"g_id_onload\"[\s\S]*?</div>\s*</div>', google_snippet, reg)

with open('register.html', 'w', encoding='utf-8') as f:
    f.write(reg)
with open('register.php', 'w', encoding='utf-8') as f:
    f.write(reg)

print("Updated register.html & register.php to Vietnamese matching screenshot!")
