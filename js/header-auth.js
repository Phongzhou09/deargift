/**
 * DearGift Header Customer Auth Sync
 * Đồng bộ trạng thái tài khoản khách hàng trên thanh tiêu đề và menu di động
 * Đảm bảo: Khi đã đăng nhập/đăng ký, KHÔNG BAO GIỜ hiển thị "Đăng nhập / Đăng ký"
 * mà hiển thị tài khoản khách hàng cùng lối tắt "Quà của tôi" & "Cài đặt".
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

  function renderCustomerHeader(user) {
    if (!user) return;
    var name = user.full_name || user.name || user.username || user.email || 'Khách hàng';

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
          authDiv.style.cssText = 'display:inline-flex; align-items:center; gap:8px;';
          loginBtn.parentNode.insertBefore(authDiv, loginBtn);
          authDiv.appendChild(loginBtn);
          if (signupBtn) authDiv.appendChild(signupBtn);
        }
      }
    }

    if (authDiv) {
      authDiv.innerHTML = `
        <a href="my-gifts.php" class="btn-login hdr-desktop-only" style="background:#fce7f3; color:#e8589a; border:1px solid #fbcfe8; font-weight:700; text-decoration:none; padding:7px 14px; border-radius:50px; font-size:13px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(232,88,154,0.12); transition:all 0.2s ease;">
          <span>🎁</span> <span>Quà của tôi</span>
        </a>
        <div class="hdr-desktop-only" style="display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#3d3551; background:#f5eeff; padding:6px 14px; border-radius:50px; border:1px solid #e9d5ff;">
          <span style="font-size:14px;">👤</span>
          <a href="settings.php" style="color:#3d3551; text-decoration:none; font-weight:700; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="Tài khoản: ${name}">${name}</a>
          <a href="#" onclick="window.deargiftLogout && window.deargiftLogout(event)" style="color:#e8589a; margin-left:6px; font-size:11px; text-decoration:none; font-weight:700;" title="Đăng xuất">Thoát</a>
        </div>
      `;
    }

    // 2. Cập nhật menu di động (Mobile Navigation Panel)
    var mProfile = document.querySelector('.mnav-profile');
    var mAuth = document.querySelector('.mnav-auth');
    if (mProfile) {
      mProfile.className = 'mnav-profile';
      mProfile.innerHTML = `
        <span class="mnav-profile__avatar"><i data-lucide="user"></i></span>
        <div class="mnav-profile__copy">
          <strong>${name}</strong>
          <span>${user.email || 'Tài khoản khách hàng'}</span>
        </div>
      `;
    }
    if (mAuth) {
      mAuth.innerHTML = `
        <a class="mnav-auth__login" href="my-gifts.php"><i data-lucide="gift"></i> Quà của tôi</a>
        <a class="mnav-auth__register" href="settings.php"><i data-lucide="settings"></i> Cài đặt</a>
        <a class="mnav-auth__logout" href="#" onclick="window.deargiftLogout && window.deargiftLogout(event)" style="color:#e8589a; font-size:12px; font-weight:700; text-decoration:none; display:flex; align-items:center; gap:6px; padding:8px 12px; background:#fff1f2; border-radius:8px; margin-top:6px;"><i data-lucide="log-out"></i> Đăng xuất</a>
      `;
    }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerAuth);
  } else {
    initCustomerAuth();
  }
})();
