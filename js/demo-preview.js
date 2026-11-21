/**
 * Cửa sổ "Xem demo" dạng khung điện thoại.
 * Mọi link có thuộc tính [data-demo-preview] sẽ mở demo trong khung iPhone thay vì tab mới.
 * Ctrl/Cmd/Shift + click hoặc click chuột giữa vẫn mở tab mới như bình thường.
 */
(function () {
  'use strict';

  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    close: 'Close preview',
    note: 'If the frame stays blank (the page blocks embedding), use the "Open in new tab" button below.',
    hideIsland: 'Hide Dynamic Island',
    showIsland: 'Show Dynamic Island',
    newTab: 'Open in new tab',
    closeBtn: 'Close',
    title: 'Template preview'
  } : {
    close: 'Đóng xem mẫu',
    note: 'Nếu khung trống (trang chặn nhúng), hãy dùng nút "Mở trong tab mới" bên dưới.',
    hideIsland: 'Ẩn Dynamic Island',
    showIsland: 'Hiện Dynamic Island',
    newTab: 'Mở trong tab mới',
    closeBtn: 'Đóng',
    title: 'Xem trước mẫu quà'
  };
  var ISLAND_KEY = 'dg_demo_hide_island';

  var overlay = null, panel, frameHost, loading, newTabLink, islandBtn, lastFocus = null;

  function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'dp-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="dp-panel" role="dialog" aria-modal="true" aria-label="' + T.title + '">' +
        '<button type="button" class="dp-close" aria-label="' + T.close + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
        '</button>' +
        '<div class="dp-phone"><i class="dp-phone__btn"></i>' +
          '<div class="dp-screen">' +
            '<div class="dp-island" aria-hidden="true"></div>' +
            '<div class="dp-loading" aria-hidden="true"><span></span></div>' +
            '<div class="dp-home" aria-hidden="true"></div>' +
          '</div>' +
        '</div>' +
        '<p class="dp-note">' + T.note + '</p>' +
        '<div class="dp-actions">' +
          '<button type="button" class="dp-btn dp-btn--island"></button>' +
          '<button type="button" class="dp-btn dp-btn--close">' + T.closeBtn + '</button>' +
          '<a class="dp-btn dp-btn--primary" target="_blank" rel="noopener">' + T.newTab + '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    panel = overlay.querySelector('.dp-panel');
    frameHost = overlay.querySelector('.dp-screen');
    loading = overlay.querySelector('.dp-loading');
    newTabLink = overlay.querySelector('.dp-btn--primary');
    islandBtn = overlay.querySelector('.dp-btn--island');

    overlay.querySelector('.dp-close').addEventListener('click', close);
    overlay.querySelector('.dp-btn--close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    // Đóng khi mở tab mới để demo không chạy (và phát nhạc) song song ở hai nơi.
    newTabLink.addEventListener('click', function () { setTimeout(close, 0); });
    islandBtn.addEventListener('click', function () {
      var hidden = !panel.classList.contains('no-island');
      setIsland(hidden);
      storageSet(ISLAND_KEY, hidden ? '1' : '0');
    });
    setIsland(storageGet(ISLAND_KEY) === '1');

    document.addEventListener('keydown', function (e) {
      if (!overlay.hidden && e.key === 'Escape') close();
    });
  }

  function setIsland(hidden) {
    panel.classList.toggle('no-island', hidden);
    islandBtn.textContent = hidden ? T.showIsland : T.hideIsland;
  }

  function open(url, label) {
    if (!overlay) build();
    lastFocus = document.activeElement;
    newTabLink.href = url;
    panel.setAttribute('aria-label', label ? T.title + ': ' + label : T.title);

    var old = frameHost.querySelector('iframe');
    if (old) old.remove();
    loading.classList.remove('is-done');

    var iframe = document.createElement('iframe');
    iframe.title = label || T.title;
    iframe.allow = 'autoplay; fullscreen; clipboard-write; accelerometer; gyroscope';
    iframe.addEventListener('load', function () { loading.classList.add('is-done'); });
    iframe.src = url;
    frameHost.insertBefore(iframe, loading);

    overlay.hidden = false;
    document.body.classList.add('dp-lock');
    void overlay.offsetWidth; // ép reflow để hiệu ứng mở chạy mà không phụ thuộc requestAnimationFrame
    overlay.classList.add('is-open');
    overlay.querySelector(window.matchMedia('(max-width:560px)').matches ? '.dp-btn--close' : '.dp-close').focus({ preventScroll: true });
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    // Gỡ hẳn iframe để dừng nhạc, WebGL và mọi timer của mẫu.
    var iframe = frameHost.querySelector('iframe');
    if (iframe) { iframe.src = 'about:blank'; iframe.remove(); }
    overlay.classList.remove('is-open');
    document.body.classList.remove('dp-lock');
    setTimeout(function () { if (!overlay.classList.contains('is-open')) overlay.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-demo-preview]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(link.href, link.getAttribute('data-demo-title') || '');
  });

  window.DGDemoPreview = { open: open, close: close };
})();
