/**
 * Cầu nối xem trước trực tiếp cho Builder (chỉ bật với quà demo preview_mode).
 * Builder gửi DG_LIVE_PREVIEW_UPDATE → lưu tạm vào sessionStorage → tải lại trang.
 */
(function () {
  'use strict';
  if (!window.GIFT83_PREVIEW) return;

  var code = new URLSearchParams(window.location.search).get('code') || 'builder';
  var KEY = 'DG_83_PREVIEW_' + code;

  function assetUrl(value) {
    value = String(value || '').trim();
    if (!value) return '';
    if (/^(?:blob:|data:|https?:\/\/|\/)/i.test(value)) return value;
    try { return new URL('../' + value.replace(/^\.\//, ''), window.location.href).href; }
    catch (e) { return '../' + value; }
  }

  function fromBuilder(p) {
    p = p || {};
    var base = window.GIFT83_DATA || {};
    var recipient = String(p.recipient_name || '').trim();
    var paragraphs = String(p.message || '').split(/\r\n|\r|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return {
      introText: String(p.wishes || '').trim() || "Happy Women's Day 8/3",
      letterTitle: String(p.popup_title || '').trim() || (recipient ? 'Gửi ' + recipient + ',' : base.letterTitle),
      letterContent: paragraphs.length ? paragraphs : base.letterContent,
      letterSignature: String(p.sender_name || '').trim() || base.letterSignature,
      vipPhotos: (Array.isArray(p.photos) ? p.photos : []).filter(Boolean).map(assetUrl).slice(0, 20),
      musicType: 'Sample',
      musicPath: assetUrl(p.music_url) || base.musicPath,
      customMusic: null
    };
  }

  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.letterTitle) {
      window.GIFT83_DATA = saved;
      document.addEventListener('DOMContentLoaded', function () {
        var intro = document.querySelector('.intro__text');
        if (intro) intro.textContent = saved.introText || '';
      });
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
