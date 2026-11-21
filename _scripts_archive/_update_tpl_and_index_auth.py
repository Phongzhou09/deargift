with open('templates.php', 'r', encoding='utf-8') as f:
    tpl_c = f.read()

old_tpl_auth = """        var user = JSON.parse(localStorage.getItem('deargift_user') || localStorage.getItem('deargift_customer') || 'null');
        var authDiv = document.getElementById('header-auth-buttons');
        if (user && authDiv) {
            var name = user.full_name || user.name || user.username || 'Bạn';
            authDiv.innerHTML = `
                <a href="my-gifts.php" class="btn-login hdr-desktop-only" style="background:#fce7f3; color:#e8589a; border:1px solid #fbcfe8; font-weight:700; text-decoration:none; padding:7px 14px; border-radius:50px;">🎁 Quà của tôi</a>
                <div class="hdr-desktop-only" style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#3d3551; background:#f5eeff; padding:6px 14px; border-radius:50px;">
                    <span>👤</span>
                    <span>${name}</span>
                    <a href="#" onclick="localStorage.removeItem('deargift_user');localStorage.removeItem('deargift_customer');document.cookie='currentUser=; path=/; max-age=0';location.reload();" style="color:#e8589a; margin-left:6px; font-size:11px; text-decoration:none;">Thoát</a>
                </div>
            `;
        }"""

new_tpl_auth = """        function renderUserAuth(user) {
            var authDiv = document.getElementById('header-auth-buttons');
            if (user && authDiv) {
                var name = user.full_name || user.name || user.username || 'Khách';
                authDiv.innerHTML = `
                    <a href="my-gifts.php" class="btn-login hdr-desktop-only" style="background:#fce7f3; color:#e8589a; border:1px solid #fbcfe8; font-weight:700; text-decoration:none; padding:7px 14px; border-radius:50px;">🎁 Quà của tôi</a>
                    <div class="hdr-desktop-only" style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#3d3551; background:#f5eeff; padding:6px 14px; border-radius:50px;">
                        <span>👤</span>
                        <a href="settings.php" style="color:#3d3551; text-decoration:none; font-weight:700;" title="Cài đặt & Bảo mật">${name}</a>
                        <a href="#" onclick="localStorage.removeItem('deargift_user');localStorage.removeItem('deargift_customer');document.cookie='currentUser=; path=/; max-age=0';location.reload();" style="color:#e8589a; margin-left:6px; font-size:11px; text-decoration:none;" title="Đăng xuất">Thoát</a>
                    </div>
                `;
                var mProfile = document.querySelector('.mnav-profile');
                var mAuth = document.querySelector('.mnav-auth');
                if (mProfile && mAuth) {
                    mProfile.className = 'mnav-profile';
                    mProfile.innerHTML = `
                        <span class="mnav-profile__avatar"><i data-lucide="user"></i></span>
                        <div class="mnav-profile__copy">
                            <strong>${name}</strong>
                            <span>${user.email || 'Tài khoản thành viên'}</span>
                        </div>
                    `;
                    mAuth.innerHTML = `
                        <a class="mnav-auth__login" href="my-gifts.php"><i data-lucide="gift"></i> Quà của tôi</a>
                        <a class="mnav-auth__register" href="settings.php"><i data-lucide="settings"></i> Cài đặt</a>
                    `;
                }
            }
        }

        var localUser = JSON.parse(localStorage.getItem('deargift_user') || localStorage.getItem('deargift_customer') || 'null');
        if (localUser) {
            renderUserAuth(localUser);
        } else {
            fetch('/api/me').then(r => r.json()).then(res => {
                if (res.status === 'success' && res.user) {
                    localStorage.setItem('deargift_user', JSON.stringify(res.user));
                    renderUserAuth(res.user);
                }
            }).catch(function(){});
        }"""

if old_tpl_auth in tpl_c:
    tpl_c = tpl_c.replace(old_tpl_auth, new_tpl_auth)
    with open('templates.php', 'w', encoding='utf-8') as f:
        f.write(tpl_c)
    print("Updated templates.php header auth!")
else:
    print("Could not find exact old_tpl_auth block in templates.php")

# Check index.html
with open('index.html', 'r', encoding='utf-8') as f:
    idx_c = f.read()

if old_tpl_auth in idx_c:
    idx_c = idx_c.replace(old_tpl_auth, new_tpl_auth)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(idx_c)
    print("Updated index.html header auth!")
else:
    # Check if there is another auth block in index.html
    print("Checking auth block in index.html...")
    idx_pos = idx_c.find('header-auth-buttons')
    idx_pos2 = idx_c.find('header-auth-buttons', idx_pos + 30)
    if idx_pos2 != -1:
        print("Found second header-auth-buttons at:", idx_pos2)
