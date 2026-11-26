/**
 * Cầu nối xem trước trực tiếp cho Builder (chỉ bật với quà demo preview_mode).
 * Builder gửi DG_LIVE_PREVIEW_UPDATE qua postMessage → lưu tạm vào sessionStorage
 * → tải lại trang để toàn bộ cảnh (chữ viết tay, thư, ảnh, nhạc) dùng dữ liệu mới.
 */
(function () {
  'use strict';
  if (!window.GIFT2011_PREVIEW) return;

  var code = new URLSearchParams(window.location.search).get('code') || 'builder';
  var KEY = 'DG_2011_PREVIEW_' + code;

  function assetUrl(value) {
    value = String(value || '').trim();
    if (!value) return '';
    if (/^(?:blob:|data:|https?:\/\/|\/)/i.test(value)) return value;
    try { return new URL('../' + value.replace(/^\.\//, ''), window.location.href).href; }
    catch (e) { return '../' + value; }
  }

  function lines(value) {
    return String(value || '').split(/\r\n|\r|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function fromBuilder(p) {
    p = p || {};
    var base = window.GIFT2011_DATA || {};
    var recipient = String(p.recipient_name || '').trim() || 'thầy cô';
    var photos = (Array.isArray(p.photos) ? p.photos : []).filter(Boolean).map(assetUrl);
    var paragraphs = lines(p.message);
    var board = String(p.wishes || '').split(/[·\n\r|]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3);
    return {
      data: {
        letterTitle: String(p.popup_title || '').trim() || ('Gửi ' + recipient + ' – nhân ngày 20/11 🎉💕'),
        letterContent: paragraphs.length ? paragraphs : base.letterContent,
        letterSignature: String(p.sender_name || '').trim() || base.letterSignature,
        teacherPhoto1: photos[0] || null,
        teacherPhoto2: photos[1] || null,
        musicType: 'Sample',
        musicPath: assetUrl(p.music_url) || base.musicPath,
        customMusic: null
      },
      board: board
    };
  }

  // Áp dụng bản xem trước đã lưu (nếu có) trước khi cảnh khởi tạo.
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.data) {
      window.GIFT2011_DATA = saved.data;
      if (saved.board && saved.board.length) {
        document.addEventListener('DOMContentLoaded', function () {
          document.querySelectorAll('.text-line').forEach(function (el, i) {
            if (saved.board[i]) el.setAttribute('data-text', saved.board[i]);
          });
        });
      }
    }
  } catch (e) {}

  var timer = 0;
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || !event.data || event.data.type !== 'DG_LIVE_PREVIEW_UPDATE') return;
    var serialized = JSON.stringify(fromBuilder(event.data.payload));
    try { if (sessionStorage.getItem(KEY) === serialized) return; } catch (e) {}
    clearTimeout(timer);
    timer = setTimeout(function () {
      try { sessionStorage.setItem(KEY, serialized); } catch (e) {}
      window.location.reload();
    }, 500);
  });

  if (window.parent && window.parent !== window) {
    setTimeout(function () {
      window.parent.postMessage({ type: 'DG_PREVIEW_READY' }, window.location.origin);
    }, 0);
  }
})();
