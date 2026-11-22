/**
 * Android: nhiều người bật khóa xoay màn hình nên kẹt ở thông báo "xoay ngang".
 * Script này gắn nút "Xoay ngang ngay" vào mọi thông báo xoay ngang đang hiện:
 * bấm → vào toàn màn hình rồi khóa hướng ngang (Android Chrome/WebView hỗ trợ).
 * Không làm gì trên iPhone/máy tính.
 */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  if (!/Android/i.test(ua)) return;

  var BTN_CLASS = 'dg-rotate-btn';

  function style() {
    if (document.getElementById('dg-rotate-style')) return;
    var s = document.createElement('style');
    s.id = 'dg-rotate-style';
    s.textContent = '.' + BTN_CLASS + '{display:inline-block;margin:18px auto 0;padding:13px 24px;border:0;border-radius:999px;' +
      'font:700 16px/1.2 system-ui,sans-serif;color:#fff;background:linear-gradient(120deg,#ff4f9a,#a855f7);' +
      'box-shadow:0 10px 24px rgba(168,85,247,.35);cursor:pointer;position:relative;z-index:2147483000;-webkit-tap-highlight-color:transparent}' +
      '.dg-rotate-hint{margin-top:10px;font:500 13px/1.45 system-ui,sans-serif;color:#fff;opacity:.9;max-width:300px;margin-left:auto;margin-right:auto}';
    document.head.appendChild(s);
  }

  function isShown(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }

  function goLandscape(btn) {
    var root = document.documentElement;
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    var done = function () {
      try {
        if (screen.orientation && screen.orientation.lock) {
          return screen.orientation.lock('landscape');
        }
      } catch (e) {}
      return Promise.reject(new Error('no-lock'));
    };
    var p = req ? Promise.resolve(req.call(root)) : Promise.resolve();
    p.then(done, done).then(function () {
      // Sau khi xoay, các trang tự ẩn thông báo theo media query / resize.
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 300);
    }, function () {
      var hint = btn.parentNode && btn.parentNode.querySelector('.dg-rotate-hint');
      if (!hint) {
        hint = document.createElement('p');
        hint.className = 'dg-rotate-hint';
        btn.parentNode.insertBefore(hint, btn.nextSibling);
      }
      hint.textContent = 'Máy chưa cho xoay tự động. Kéo thanh thông báo xuống, bật "Tự động xoay" rồi xoay ngang điện thoại nhé.';
    });
  }

  // Thông báo xoay ngang: phần tử đang hiện có chữ "xoay ngang" (không phải cả trang).
  function findNotices() {
    var out = [];
    var nodes = document.querySelectorAll('.rotate-notice, #orientationOverlay, [class*="rotate"], [id*="rotate"], [class*="orient"], [id*="orient"], [class*="landscape"], [id*="landscape"]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n === document.body || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
      if (!/xoay ngang|landscape|rotate/i.test(n.textContent || '')) continue;
      if (!isShown(n)) continue;
      // chỉ lấy phần tử ngoài cùng
      var inner = false;
      for (var j = 0; j < out.length; j++) if (out[j].contains(n)) inner = true;
      if (!inner) out.push(n);
    }
    return out;
  }

  function attach() {
    if (window.innerWidth > window.innerHeight) return; // đã ngang
    var notices = findNotices();
    if (!notices.length) return;
    style();
    notices.forEach(function (n) {
      if (n.querySelector('.' + BTN_CLASS)) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = BTN_CLASS;
      btn.textContent = '↻ Xoay ngang ngay';
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goLandscape(btn); });
      // đặt nút cạnh dòng chữ trong thông báo
      var host = n.querySelector('p, h2, h3') ? n.querySelector('p, h2, h3').parentNode : n;
      var wrap = document.createElement('div');
      wrap.style.textAlign = 'center';
      wrap.style.pointerEvents = 'auto';
      wrap.appendChild(btn);
      host.appendChild(wrap);
      n.style.pointerEvents = 'auto';
    });
  }

  var t = 0;
  function schedule() { clearTimeout(t); t = setTimeout(attach, 250); }
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
  setInterval(attach, 2000); // thông báo có thể hiện muộn (sau màn mở đầu)
})();
