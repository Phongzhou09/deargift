with open('settings.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded fallback
old_block = """    var user = JSON.parse(rawUser);
    var username = user.username || 'phongnguyen';
    var fullName = user.full_name || user.name || username;
    var email = user.email || (username + '@gmail.com');
    var phone = user.phone || '';"""

new_block = """    var user = JSON.parse(rawUser);
    var email = user.email || '';
    var username = user.username || (email ? email.split('@')[0] : 'khachhang');
    var fullName = user.full_name || user.name || username;
    var phone = user.phone || '';"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Replaced old fallback in settings.php")
else:
    print("Old block not found directly, checking regex or manual replace...")
    content = content.replace("'phongnguyen'", "(user.email ? user.email.split('@')[0] : 'khachhang')")

# Ensure fetch updates backend
old_update = """            if (act === 'update_profile') {
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
                }"""

new_update = """            if (act === 'update_profile') {
                var newUsername = (form.querySelector('input[name="username"]') || {}).value || username;
                var newPhone = (form.querySelector('input[name="phone"]') || {}).value || '';
                user.username = newUsername;
                user.full_name = newUsername;
                user.phone = newPhone;
                localStorage.setItem('deargift_user', JSON.stringify(user));
                localStorage.setItem('deargift_customer', JSON.stringify(user));
                fetch('/settings.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'update_profile', username: newUsername, phone: newPhone})
                }).catch(function(){});
                if (typeof window.showToast === 'function') {
                    window.showToast('✓ Cập nhật hồ sơ thành công!');
                } else {
                    alert('✓ Cập nhật hồ sơ thành công!');
                }"""

if old_update in content:
    content = content.replace(old_update, new_update)
    print("Replaced update_profile with backend sync")

# Also sync change_password to backend
old_pwd = """            } else if (act === 'change_password') {
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
                }"""

new_pwd = """            } else if (act === 'change_password') {
                var curPwd = (form.querySelector('input[name="current_password"]') || {}).value;
                var newPwd = (form.querySelector('input[name="new_password"]') || {}).value;
                if (!newPwd || newPwd.length < 6) {
                    alert('Mật khẩu mới phải có ít nhất 6 ký tự!');
                    return;
                }
                user.password = newPwd;
                localStorage.setItem('deargift_user', JSON.stringify(user));
                fetch('/settings.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'change_password', username: username, new_password: newPwd})
                }).catch(function(){});
                form.reset();
                if (typeof window.showToast === 'function') {
                    window.showToast('✓ Đổi mật khẩu thành công!');
                } else {
                    alert('✓ Đổi mật khẩu thành công!');
                }"""

if old_pwd in content:
    content = content.replace(old_pwd, new_pwd)
    print("Replaced change_password with backend sync")

# Also delete account to backend
old_del = """            } else if (act === 'delete_account') {
                var confirmVal = (form.querySelector('input[name="confirm_username"]') || {}).value;
                if (confirmVal !== username) {
                    alert('Tên tài khoản xác nhận không đúng!');
                    return;
                }
                localStorage.removeItem('deargift_user');
                localStorage.removeItem('deargift_customer');
                document.cookie = "currentUser=; path=/; max-age=0";
                alert('Tài khoản đã được xóa.');
                window.location.href = 'index.html';"""

new_del = """            } else if (act === 'delete_account') {
                var confirmVal = (form.querySelector('input[name="confirm_username"]') || {}).value;
                if (confirmVal !== username) {
                    alert('Tên tài khoản xác nhận không đúng!');
                    return;
                }
                localStorage.removeItem('deargift_user');
                localStorage.removeItem('deargift_customer');
                document.cookie = "currentUser=; path=/; max-age=0";
                fetch('/settings.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'delete_account', username: username})
                }).catch(function(){});
                alert('Tài khoản đã được xóa.');
                window.location.href = 'index.html';"""

if old_del in content:
    content = content.replace(old_del, new_del)
    print("Replaced delete_account with backend sync")

with open('settings.php', 'w', encoding='utf-8') as f:
    f.write(content)
with open('settings.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved settings.php and settings.html!")
