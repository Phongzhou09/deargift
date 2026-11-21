from bs4 import BeautifulSoup
import re

with open("settings.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace any lingering deargift links with relative links
html = html.replace("https://deargift.love/settings.php", "settings.php")
html = html.replace("https://deargift.love/my-gifts.php", "my-gifts.php")
html = html.replace("https://deargift.love/index.php", "index.html")
html = html.replace("https://deargift.love/login.php", "login.html")
html = html.replace("https://deargift.love/register.php", "register.html")
html = html.replace("https://deargift.love/templates.php", "templates.php")
html = html.replace("https://deargift.love/about.php", "about.php")
html = html.replace("https://deargift.love/contact.php", "contact.php")
html = html.replace("https://deargift.love/", "/")

sync_script = """
<script id="dg-settings-sync-script">
document.addEventListener('DOMContentLoaded', function() {
    var rawUser = localStorage.getItem('deargift_user') || localStorage.getItem('deargift_customer');
    if (!rawUser) {
        // Not logged in -> redirect to login
        window.location.href = 'login.html';
        return;
    }

    var user = JSON.parse(rawUser);
    var username = user.username || 'phongnguyen';
    var fullName = user.full_name || user.name || username;
    var email = user.email || (username + '@gmail.com');
    var phone = user.phone || '';

    // Fill display elements
    document.querySelectorAll('.user-display-name, .dg-account-name, .sidebar-user-name, [data-user-name]').forEach(function(el) {
        el.textContent = fullName;
    });
    document.querySelectorAll('.user-display-email, .dg-account-email, .sidebar-user-email, [data-user-email]').forEach(function(el) {
        el.textContent = email;
    });
    
    // Fill form fields
    var uInput = document.querySelector('input[name="username"]');
    if (uInput) uInput.value = username;

    var pInput = document.querySelector('input[name="phone"]');
    if (pInput && phone) pInput.value = phone;

    var cInput = document.querySelector('input[name="confirm_username"]');
    if (cInput) cInput.placeholder = 'Nhập đúng tên tài khoản: ' + username;

    // Email badge
    document.querySelectorAll('.email-display-val').forEach(function(el) {
        el.textContent = email;
    });

    // Intercept form submissions
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var act = (form.querySelector('input[name="action"]') || {}).value;
            
            if (act === 'update_profile') {
                var newUsername = (form.querySelector('input[name="username"]') || {}).value || username;
                var newPhone = (form.querySelector('input[name="phone"]') || {}).value || '';
                user.username = newUsername;
                user.phone = newPhone;
                localStorage.setItem('deargift_user', JSON.stringify(user));
                localStorage.setItem('deargift_customer', JSON.stringify(user));
                if (typeof window.showToast === 'function') {
                    window.showToast('✓ Cập nhật hồ sơ thành công!');
                } else {
                    alert('✓ Cập nhật hồ sơ thành công!');
                }
            } else if (act === 'change_password') {
                var curPwd = (form.querySelector('input[name="current_password"]') || {}).value;
                var newPwd = (form.querySelector('input[name="new_password"]') || {}).value;
                if (!newPwd || newPwd.length < 6) {
                    alert('Mật khẩu mới phải có ít nhất 6 ký tự!');
                    return;
                }
                user.password = newPwd;
                localStorage.setItem('deargift_user', JSON.stringify(user));
                form.reset();
                if (typeof window.showToast === 'function') {
                    window.showToast('✓ Đổi mật khẩu thành công!');
                } else {
                    alert('✓ Đổi mật khẩu thành công!');
                }
            } else if (act === 'delete_account') {
                var confirmVal = (form.querySelector('input[name="confirm_username"]') || {}).value;
                if (confirmVal !== username) {
                    alert('Tên tài khoản xác nhận không đúng!');
                    return;
                }
                localStorage.removeItem('deargift_user');
                localStorage.removeItem('deargift_customer');
                document.cookie = "currentUser=; path=/; max-age=0";
                alert('Tài khoản đã được xóa.');
                window.location.href = 'index.html';
            } else {
                if (typeof window.showToast === 'function') {
                    window.showToast('✓ Đã lưu cài đặt!');
                } else {
                    alert('✓ Đã lưu cài đặt!');
                }
            }
        });
    });
});
</script>
"""

if 'id="dg-settings-sync-script"' in html:
    html = re.sub(r'<script id="dg-settings-sync-script">.*?</script>', sync_script, html, flags=re.DOTALL)
else:
    html = html.replace('</body>', sync_script + '\n</body>')

with open('settings.html', 'w', encoding='utf-8') as f:
    f.write(html)
with open('settings.php', 'w', encoding='utf-8') as f:
    f.write(html)

print("Enhanced settings.html & settings.php successfully!")
