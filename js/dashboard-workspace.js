/**
 * DearGift Customer Workspace Shell & Shared Helpers
 * Dùng chung cho: my-gifts.php, my-gifts.php?view=all, orders.php, transactions.php, settings.php, support.php
 */
(function () {
  'use strict';

  var payPollTimer = null;
  var templateMapCache = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatVnd(amount) {
    var n = Number(amount || 0);
    if (!Number.isFinite(n) || n <= 0) return 'Miễn phí';
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function formatDate(raw) {
    if (!raw) return 'Mới tạo';
    var d = new Date(String(raw).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function toast(msg, isError) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText =
      'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99999;' +
      'padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;' +
      'color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.22);opacity:0;transition:opacity .2s;' +
      'background:' + (isError ? '#dc2626' : '#2f2740') + ';';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; });
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 250);
    }, 2200);
  }

  function copyText(text, successMsg) {
    var msg = successMsg || '✓ Đã sao chép liên kết!';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(msg);
      }).catch(function () {
        fallbackCopy(text, msg);
      });
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(msg);
    } catch (e) {
      toast('Không thể tự động sao chép, vui lòng copy thủ công.', true);
    }
    ta.remove();
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.removeItem('deargift_user');
      localStorage.removeItem('deargift_customer');
      document.cookie = 'currentUser=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    } catch (err) {}
    window.location.href = '/logout.php';
  }

  function buildWorkspaceChrome(user, activeKey) {
    var fullName = user.full_name || user.username || 'Khách hàng';
    var email = user.email || 'Tài khoản DearGift';
    var avatarUrl = user.avatar || (
      'https://ui-avatars.com/api/?name=' +
      encodeURIComponent(fullName) +
      '&background=fff1f2&color=db2777&bold=true&size=128'
    );

    var navItems = [
      { key: 'overview', href: 'my-gifts.php', icon: 'layout-grid', label: 'Tổng quan' },
      { key: 'created', href: 'my-gifts.php?view=all', icon: 'library', label: 'Quà đã tạo' },
      { key: 'orders', href: 'orders.php', icon: 'shopping-bag', label: 'Đơn hàng' },
      { key: 'transactions', href: 'transactions.php', icon: 'credit-card', label: 'Giao dịch' },
      { key: 'settings', href: 'settings.php', icon: 'settings', label: 'Cài đặt' },
    ];

    var navHtml = navItems.map(function (it) {
      var cls = it.key === activeKey ? 'active' : '';
      return '<a href="' + it.href + '" class="' + cls + '"><i data-lucide="' + it.icon + '"></i><span>' + it.label + '</span></a>';
    }).join('');

    var bottomHtml = navItems.map(function (it) {
      var cls = 'bottom-nav-item' + (it.key === activeKey ? ' active' : '');
      return '<a href="' + it.href + '" class="' + cls + '"><i data-lucide="' + it.icon + '" style="width:18px;height:18px;"></i><span>' + it.label + '</span></a>';
    }).join('');

    var topnavHtml =
      '<a class="workspace-brand" href="index.html" aria-label="DearGift - Trang chủ">' +
        '<span class="workspace-brand-mark"><i data-lucide="gift"></i></span>' +
        '<span class="workspace-brand-name">Dear<span>Gift</span></span>' +
      '</a>' +
      '<nav class="workspace-nav" aria-label="Điều hướng tài khoản">' + navHtml + '</nav>' +
      '<div class="workspace-account">' +
        '<a href="support.php" class="workspace-icon-btn ' + (activeKey === 'support' ? 'active' : '') + '" aria-label="Hỗ trợ" title="Hỗ trợ"><i data-lucide="circle-help"></i></a>' +
        '<div class="dg-account">' +
          '<button class="dg-account-trigger" type="button" aria-haspopup="true" aria-expanded="false" onclick="DG.toggleAccountMenu(this)" title="Mở menu tài khoản">' +
            '<span class="dg-account-avatar"><img src="' + escapeHtml(avatarUrl) + '" referrerpolicy="no-referrer" alt=""></span>' +
            '<span class="dg-account-name">' + escapeHtml(fullName) + '</span>' +
            '<span class="dg-account-burger" aria-hidden="true"><i data-lucide="menu"></i></span>' +
          '</button>' +
          '<div class="dg-account-menu" role="menu">' +
            '<div class="dg-account-head">' +
              '<img src="' + escapeHtml(avatarUrl) + '" referrerpolicy="no-referrer" alt="">' +
              '<div>' +
                '<strong class="dg-menu-name">' + escapeHtml(fullName) + '</strong>' +
                '<small class="dg-menu-email">' + escapeHtml(email) + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="dg-account-grid">' +
              '<a href="my-gifts.php" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="layout-grid"></i></span><span><b>Tổng quan</b><small>Thống kê nhanh</small></span></a>' +
              '<a href="my-gifts.php?view=all" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="library"></i></span><span><b>Quà đã tạo</b><small>Link, QR, mở quà</small></span></a>' +
              '<a href="orders.php" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="shopping-bag"></i></span><span><b>Đơn hàng</b><small>Trạng thái thanh toán</small></span></a>' +
              '<a href="transactions.php" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="credit-card"></i></span><span><b>Giao dịch</b><small>Lịch sử thanh toán</small></span></a>' +
              '<a href="settings.php" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="settings"></i></span><span><b>Cài đặt</b><small>Hồ sơ &amp; bảo mật</small></span></a>' +
              '<a href="support.php" class="dg-account-item" role="menuitem"><span class="dg-account-ico"><i data-lucide="circle-help"></i></span><span><b>Hỗ trợ</b><small>Gửi yêu cầu</small></span></a>' +
            '</div>' +
            '<a href="templates.php" class="dg-account-cta"><i data-lucide="plus"></i> Tạo món quà mới</a>' +
            '<a href="index.html" class="dg-account-home" role="menuitem"><i data-lucide="house"></i> Về trang chủ</a>' +
            '<a href="#" class="dg-account-logout" role="menuitem" onclick="DG.logout(event)"><i data-lucide="log-out"></i> Đăng xuất</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    var headerEl = document.querySelector('header.workspace-topnav');
    if (!headerEl) {
      headerEl = document.createElement('header');
      headerEl.className = 'workspace-topnav';
      document.body.insertBefore(headerEl, document.body.firstChild);
    }
    headerEl.innerHTML = topnavHtml;

    var bottomEl = document.querySelector('.bottom-nav');
    if (!bottomEl) {
      bottomEl = document.createElement('div');
      bottomEl.className = 'bottom-nav';
      document.body.appendChild(bottomEl);
    }
    bottomEl.innerHTML = bottomHtml;

    // Hydrate any extra profile elements (e.g. inside settings.php)
    document.querySelectorAll('.user-display-name, .dg-account-name, [data-user-name]').forEach(function (el) {
      el.textContent = fullName;
    });
    document.querySelectorAll('.user-display-email, .dg-account-email, [data-user-email]').forEach(function (el) {
      el.textContent = email;
    });
    document.querySelectorAll('[data-user-avatar]').forEach(function (el) {
      el.src = avatarUrl;
    });
  }

  function ensureModals() {
    if (!document.getElementById('dg-pay-modal')) {
      var payDiv = document.createElement('div');
      payDiv.id = 'dg-pay-modal';
      payDiv.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(15,10,26,0.62);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
      payDiv.innerHTML =
        '<div style="background:#fff;border-radius:24px;max-width:390px;width:100%;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.28);text-align:center;">' +
          '<div style="background:linear-gradient(135deg,#ef4d87,#bd1558);padding:18px 24px;color:#fff;">' +
            '<h3 style="margin:0 0 4px;font-size:19px;font-weight:800;">Quét Mã VietQR Kích Hoạt Quà</h3>' +
            '<p style="margin:0;font-size:12.5px;opacity:0.92;">Tự động xác nhận sau vài giây khi chuyển khoản</p>' +
          '</div>' +
          '<div style="padding:22px;">' +
            '<img id="dg-pay-qr-img" src="" alt="VietQR" style="width:225px;height:225px;object-fit:contain;border-radius:16px;border:1px solid #f1e6ee;padding:6px;background:#fff;margin-bottom:14px;">' +
            '<div style="background:#faf7f9;border-radius:14px;padding:12px 16px;font-size:13px;text-align:left;margin-bottom:14px;line-height:1.7;">' +
              '<div style="display:flex;justify-content:space-between;"><span>Ngân hàng:</span><strong id="dg-pay-bank">MBBank</strong></div>' +
              '<div style="display:flex;justify-content:space-between;"><span>Số tiền:</span><strong id="dg-pay-amount" style="color:#16a34a;">0đ</strong></div>' +
              '<div style="display:flex;justify-content:space-between;"><span>Nội dung CK:</span><strong id="dg-pay-content" style="font-family:monospace;color:#d51e68;">DEAR ...</strong></div>' +
            '</div>' +
            '<div id="dg-pay-status" style="font-size:12.5px;font-weight:700;color:#2563eb;background:#eff6ff;border-radius:50px;padding:8px 14px;margin-bottom:14px;">⏳ Đang chờ xác nhận chuyển khoản...</div>' +
            '<button type="button" onclick="DG.closePayModal()" style="width:100%;background:#f1e6ee;border:none;border-radius:12px;padding:11px;font-size:13.5px;font-weight:700;color:#5d536e;cursor:pointer;">Đóng cửa sổ</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(payDiv);
    }

    if (!document.getElementById('dg-qr-share-modal')) {
      var shareDiv = document.createElement('div');
      shareDiv.id = 'dg-qr-share-modal';
      shareDiv.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(15,10,26,0.62);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
      shareDiv.innerHTML =
        '<div style="background:#fff;border-radius:24px;max-width:360px;width:100%;padding:24px;box-shadow:0 25px 50px rgba(0,0,0,0.28);text-align:center;">' +
          '<h3 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1b171c;">Mã QR Chia Sẻ Quà Tặng</h3>' +
          '<p id="dg-qr-share-sub" style="margin:0 0 16px;font-size:12.5px;color:#756d77;"></p>' +
          '<div id="dg-qr-share-box" style="display:inline-flex;padding:12px;border-radius:18px;border:1px solid #f1e6ee;background:#fff;margin-bottom:16px;"></div>' +
          '<div style="display:flex;gap:10px;">' +
            '<button type="button" id="dg-qr-copy-btn" style="flex:1;background:linear-gradient(135deg,#ef4d87,#bd1558);color:#fff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;">Copy Link</button>' +
            '<button type="button" onclick="DG.closeQrShareModal()" style="flex:1;background:#f1e6ee;color:#5d536e;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;">Đóng</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(shareDiv);
    }
  }

  function openPayModal(order, onPaid) {
    ensureModals();
    var scode = order.share_code || order.id;
    var amt = Number(order.amount || 19000);
    var transContent = order.transfer_content || ('DEAR ' + scode);
    var bankName = (order.bank && order.bank.name) ? order.bank.name : 'MBBank';
    var qrUrl = order.qr_url || (
      'https://img.vietqr.io/image/MB-2006999988836-compact2.png?amount=' +
      amt + '&addInfo=' + encodeURIComponent(transContent) + '&accountName=NGUYEN+VAN+PHONG'
    );

    document.getElementById('dg-pay-qr-img').src = qrUrl;
    document.getElementById('dg-pay-bank').textContent = bankName;
    document.getElementById('dg-pay-amount').textContent = formatVnd(amt);
    document.getElementById('dg-pay-content').textContent = transContent;
    var statusEl = document.getElementById('dg-pay-status');
    statusEl.innerHTML = '⏳ Đang chờ xác nhận chuyển khoản...';
    statusEl.style.background = '#eff6ff';
    statusEl.style.color = '#2563eb';
    document.getElementById('dg-pay-modal').style.display = 'flex';

    if (payPollTimer) clearInterval(payPollTimer);
    payPollTimer = setInterval(function () {
      fetch('/ajax_check_payment_status.php?code=' + encodeURIComponent(scode))
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && (res.status === 'active' || res.paid)) {
            clearInterval(payPollTimer);
            payPollTimer = null;
            statusEl.innerHTML = '✅ Đã nhận thanh toán! Món quà đã được kích hoạt.';
            statusEl.style.background = '#dcfce7';
            statusEl.style.color = '#15803d';
            setTimeout(function () {
              closePayModal();
              if (typeof onPaid === 'function') onPaid(order);
            }, 1300);
          }
        })
        .catch(function () {});
    }, 2500);
  }

  function closePayModal() {
    if (payPollTimer) {
      clearInterval(payPollTimer);
      payPollTimer = null;
    }
    var m = document.getElementById('dg-pay-modal');
    if (m) m.style.display = 'none';
  }

  function openQrShareModal(gift) {
    ensureModals();
    var viewUrl = window.location.origin + '/gift.php?uid=' + encodeURIComponent(gift.id);
    document.getElementById('dg-qr-share-sub').textContent =
      'Quét để mở quà dành tặng ' + (gift.recipient_name || 'Người thương') + ' (#' + (gift.share_code || gift.id) + ')';
    var box = document.getElementById('dg-qr-share-box');
    if (typeof window.qrcode === 'function') {
      var qr = window.qrcode(0, 'M');
      qr.addData(viewUrl);
      qr.make();
      box.innerHTML = qr.createSvgTag(5, 6);
    } else {
      box.innerHTML = '<a href="' + escapeHtml(viewUrl) + '" target="_blank" style="font-size:12px;word-break:break-all;">' + escapeHtml(viewUrl) + '</a>';
    }
    document.getElementById('dg-qr-copy-btn').onclick = function () {
      copyText(viewUrl, '✓ Đã sao chép link mở quà!');
    };
    document.getElementById('dg-qr-share-modal').style.display = 'flex';
  }

  function closeQrShareModal() {
    var m = document.getElementById('dg-qr-share-modal');
    if (m) m.style.display = 'none';
  }

  function getTemplateMetaMap() {
    if (templateMapCache) return Promise.resolve(templateMapCache);
    return fetch('/api/templates')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var map = {};
        if (Array.isArray(list)) {
          list.forEach(function (t) {
            if (t && t.id != null) map[String(t.id)] = t;
          });
        }
        templateMapCache = map;
        return map;
      })
      .catch(function () { return {}; });
  }

  function toggleAccountMenu(btn) {
    var box = btn.closest('.dg-account');
    if (!box) return;
    var open = !box.classList.contains('is-open');
    box.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('click', function (e) {
    document.querySelectorAll('.dg-account.is-open').forEach(function (box) {
      if (!box.contains(e.target)) {
        box.classList.remove('is-open');
        var btn = box.querySelector('.dg-account-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  function requireAuthAndBoot(activeKey, onReady) {
    function getFallbackUser() {
      try {
        var raw = localStorage.getItem('deargift_user') || localStorage.getItem('deargift_customer');
        if (raw) {
          var u = JSON.parse(raw);
          if (u && (u.username || u.email || u.full_name)) return u;
        }
      } catch (e) {}
      return null;
    }

    fetch('/api/me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.logged_in || !res.user) {
          var fallback = getFallbackUser();
          if (fallback) {
            buildWorkspaceChrome(fallback, activeKey);
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
              window.lucide.createIcons();
            }
            if (typeof onReady === 'function') onReady(fallback);
            return;
          }
          var redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = '/login.html?redirect=' + redirect;
          return;
        }
        try {
          localStorage.setItem('deargift_user', JSON.stringify(res.user));
          localStorage.setItem('deargift_customer', JSON.stringify(res.user));
        } catch (e) {}
        buildWorkspaceChrome(res.user, activeKey);
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
        if (typeof onReady === 'function') onReady(res.user);
      })
      .catch(function () {
        var fallback = getFallbackUser();
        if (fallback) {
          buildWorkspaceChrome(fallback, activeKey);
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
          if (typeof onReady === 'function') onReady(fallback);
        } else {
          toast('Không thể kết nối máy chủ xác thực.', true);
        }
      });
  }

  window.DG = {
    boot: requireAuthAndBoot,
    escapeHtml: escapeHtml,
    formatVnd: formatVnd,
    formatDate: formatDate,
    toast: toast,
    copyText: copyText,
    logout: logout,
    toggleAccountMenu: toggleAccountMenu,
    openPayModal: openPayModal,
    closePayModal: closePayModal,
    openQrShareModal: openQrShareModal,
    closeQrShareModal: closeQrShareModal,
    getTemplateMetaMap: getTemplateMetaMap,
  };
  window.dgToggleAccountMenu = toggleAccountMenu;
})();
