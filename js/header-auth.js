/**
 * DearGift Header Customer Auth Sync
 * Đồng bộ trạng thái tài khoản khách hàng trên thanh tiêu đề và menu di động
 * Đảm bảo: Khi đã đăng nhập/đăng ký, KHÔNG BAO GIỜ hiển thị "Đăng nhập / Đăng ký"
 * mà hiển thị tài khoản khách hàng: [Quản lý] + [Avatar P] [Tên] [Menu].
 */
(function () {
  'use strict';

  function getCookie(name) {
    try {
      var match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    } catch (e) {
      return null;
    }
  }

  function getStoredUser() {
    try {
      var raw = localStorage.getItem('deargift_user') || localStorage.getItem('deargift_customer');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && (u.username || u.email || u.full_name || u.name)) {
          return u;
        }
      }
    } catch (e) {}

    try {
      var cUser = getCookie('currentUser');
      if (cUser) {
        if (cUser.startsWith('{')) {
          var parsed = JSON.parse(cUser);
          if (parsed && (parsed.username || parsed.email || parsed.full_name)) return parsed;
        } else if (cUser.length > 0 && cUser !== 'guest') {
          return { username: cUser, full_name: cUser };
        }
      }
    } catch (e) {}

    return null;
  }

  window.deargiftLogout = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.removeItem('deargift_user');
      localStorage.removeItem('deargift_customer');
      document.cookie = 'currentUser=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    } catch (err) {}
    window.location.reload();
  };

  window.dgToggleAccountMenu = function (btn) {
    var box = btn.closest('.dg-account');
    if (!box) return;
    var open = !box.classList.contains('is-open');
    box.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var menu = box.querySelector('.dg-account-menu');
    if (menu) {
      menu.style.display = open ? 'block' : 'none';
    }
  };

  function renderCustomerHeader(user) {
    if (!user) return;
    var name = user.full_name || user.name || user.username || (user.email ? user.email.split('@')[0] : 'Khách');
    var initial = (name.charAt(0) || 'U').toUpperCase();
    var email = user.email || 'Tài khoản khách hàng';

    // 1. Tìm hoặc tạo vùng nút xác thực ở Header Desktop
    var authDiv = document.getElementById('header-auth-buttons');
    if (!authDiv) {
      var hdrActions = document.querySelector('.header-actions');
      if (hdrActions) {
        var loginBtn = hdrActions.querySelector('.btn-login');
        var signupBtn = hdrActions.querySelector('.btn-signup');
        if (loginBtn) {
          authDiv = document.createElement('div');
          authDiv.id = 'header-auth-buttons';
          authDiv.style.cssText = 'display:inline-flex; align-items:center; gap:12px;';
          loginBtn.parentNode.insertBefore(authDiv, loginBtn);
          authDiv.appendChild(loginBtn);
          if (signupBtn) authDiv.appendChild(signupBtn);
        }
      }
    }

    if (authDiv) {
      authDiv.style.cssText = 'display:inline-flex; align-items:center; gap:12px;';
      authDiv.innerHTML = `
        <a href="my-gifts.php" rel="nofollow" class="btn-nav-manage hdr-desktop-only" style="display:inline-flex; align-items:center; gap:6px; color:#ff4b91; text-decoration:none; font-weight:600; font-size:14px; padding:6px 12px; border-radius:50px; background:#fff0f6; border:1px solid #ffd6e7; transition:all .2s ease;" title="Quản lý quà tặng">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ff4b91" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m7.5 4.27 9 5.15"/>
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
          <span>Quản lý</span>
        </a>
        <div class="dg-account hdr-desktop-only" style="position:relative; display:inline-flex; align-items:center;">
          <button class="dg-account-trigger" type="button" aria-haspopup="true" aria-expanded="false" onclick="window.dgToggleAccountMenu && window.dgToggleAccountMenu(this)" style="display:inline-flex; align-items:center; gap:8px; padding:3px 8px 3px 4px; border:1px solid #f3c6dc; border-radius:999px; background:#fff; cursor:pointer; text-decoration:none;" title="Tài khoản: ${name}">
            <span class="dg-account-avatar" style="width:28px; height:28px; border-radius:50%; background:#a855f7; color:#ffffff; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; text-transform:uppercase; flex-shrink:0;">${initial}</span>
            <span class="dg-account-name" style="font-weight:600; color:#3d3551; font-size:13px; max-width:115px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
            <span class="dg-account-burger" style="width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:#fdeaf3; color:#d6377f; flex-shrink:0;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </span>
          </button>
          <div class="dg-account-menu" role="menu" style="display:none; position:absolute; right:0; top:calc(100% + 8px); z-index:10000; background:#fff; text-align:left; width:300px; padding:0; overflow:hidden; border:1px solid #f6dbe8; border-radius:18px; box-shadow:0 18px 44px rgba(61,53,81,.16);">
            <div style="display:flex; gap:12px; align-items:center; padding:14px 16px; background:linear-gradient(135deg,#fff1f7,#f4efff);">
              <span style="width:38px; height:38px; border-radius:50%; background:#a855f7; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; text-transform:uppercase; flex-shrink:0;">${initial}</span>
              <div style="overflow:hidden;">
                <strong style="display:block; font-size:14px; color:#2f2740; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</strong>
                <small style="display:block; font-size:11.5px; color:#7a7090; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</small>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:10px;">
              <a href="my-gifts.php" style="display:flex; gap:8px; align-items:center; padding:8px; border-radius:10px; color:#2f2740; text-decoration:none; font-size:12.5px; font-weight:600;">
                <span>📦</span> <span>Quà của tôi</span>
              </a>
              <a href="settings.php" style="display:flex; gap:8px; align-items:center; padding:8px; border-radius:10px; color:#2f2740; text-decoration:none; font-size:12.5px; font-weight:600;">
                <span>⚙️</span> <span>Cài đặt</span>
              </a>
              <a href="templates.php" style="display:flex; gap:8px; align-items:center; padding:8px; border-radius:10px; color:#2f2740; text-decoration:none; font-size:12.5px; font-weight:600;">
                <span>🎨</span> <span>Kho mẫu</span>
              </a>
              <a href="index.html" style="display:flex; gap:8px; align-items:center; padding:8px; border-radius:10px; color:#2f2740; text-decoration:none; font-size:12.5px; font-weight:600;">
                <span>🏠</span> <span>Trang chủ</span>
              </a>
            </div>
            <a href="#" onclick="window.deargiftLogout && window.deargiftLogout(event)" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-top:1px solid #f6e9f0; color:#e8589a; font-weight:700; font-size:12.5px; text-decoration:none; background:#fff7fb;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Đăng xuất</span>
            </a>
          </div>
        </div>
      `;
    }

    // 2. Cập nhật menu di động (Mobile Navigation Panel)
    var mProfile = document.querySelector('.mnav-profile');
    var mAuth = document.querySelector('.mnav-auth');
    if (mProfile) {
      mProfile.className = 'mnav-profile';
      mProfile.innerHTML = `
        <span class="mnav-profile__avatar" style="width:36px; height:36px; border-radius:50%; background:#a855f7; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; text-transform:uppercase; flex-shrink:0;">${initial}</span>
        <div class="mnav-profile__copy">
          <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</strong>
          <span style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; color:#64748b;">${email}</span>
        </div>
      `;
    }
    if (mAuth) {
      mAuth.innerHTML = `
        <a class="mnav-auth__login" href="my-gifts.php" style="display:inline-flex; align-items:center; gap:6px;"><i data-lucide="package"></i> Quản lý quà</a>
        <a class="mnav-auth__register" href="settings.php" style="display:inline-flex; align-items:center; gap:6px;"><i data-lucide="settings"></i> Cài đặt</a>
        <a class="mnav-auth__logout" href="#" onclick="window.deargiftLogout && window.deargiftLogout(event)" style="color:#e8589a; font-size:12px; font-weight:700; text-decoration:none; display:flex; align-items:center; gap:6px; padding:8px 12px; background:#fff1f2; border-radius:8px; margin-top:6px;"><i data-lucide="log-out"></i> Đăng xuất</a>
      `;
    }

    // Tự động đóng menu tài khoản khi click ra ngoài
    document.addEventListener('click', function(e) {
      var acc = document.querySelector('.dg-account');
      if (acc && !acc.contains(e.target)) {
        acc.classList.remove('is-open');
        var btn = acc.querySelector('.dg-account-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        var menu = acc.querySelector('.dg-account-menu');
        if (menu) menu.style.display = 'none';
      }
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  function attachRedirectToLoginLinks() {
    var cur = window.location.pathname + window.location.search;
    if (cur.includes('login') || cur.includes('register')) return;
    var encoded = encodeURIComponent(cur);
    document.querySelectorAll('a[href^="login.php"], a[href^="login.html"]').forEach(function(a) {
      if (!a.href.includes('redirect=')) {
        a.href = 'login.php?redirect=' + encoded;
      }
    });
    document.querySelectorAll('a[href^="register.php"], a[href^="register.html"]').forEach(function(a) {
      if (!a.href.includes('redirect=')) {
        a.href = 'register.php?redirect=' + encoded;
      }
    });
  }

  window.renderDearGiftUser = renderCustomerHeader;

  function initCustomerAuth() {
    var user = getStoredUser();
    if (user) {
      renderCustomerHeader(user);
    } else {
      attachRedirectToLoginLinks();
      if (typeof fetch === 'function') {
        fetch('/api/me')
          .then(function (r) {
            return r.json();
          })
          .then(function (res) {
            if (res && (res.status === 'success' || res.logged_in) && res.user) {
              try {
                localStorage.setItem('deargift_user', JSON.stringify(res.user));
                localStorage.setItem('deargift_customer', JSON.stringify(res.user));
              } catch (e) {}
              renderCustomerHeader(res.user);
            }
          })
          .catch(function () {});
      }
    }
  }

  // Chạy ngay lập tức nếu DOM đã có thể truy cập, không đợi toàn bộ tài nguyên nặng load xong
  if (document.getElementById('header-auth-buttons') || document.querySelector('.header-actions')) {
    initCustomerAuth();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerAuth);
  } else {
    initCustomerAuth();
  }
})();
