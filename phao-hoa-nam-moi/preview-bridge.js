/**
 * Cầu nối xem trước trực tiếp cho Builder (chỉ bật với quà demo preview_mode).
 * Builder gửi DG_LIVE_PREVIEW_UPDATE → lưu tạm vào sessionStorage → tải lại trang.
 */
(function () {
  'use strict';
  if (!window.NY_PREVIEW) return;

  var code = new URLSearchParams(window.location.search).get('code') || 'builder';
  var KEY = 'DG_NY_PREVIEW_' + code;

  function assetUrl(value) {
    value = String(value || '').trim();
    if (!value) return '';
    if (/^(?:blob:|data:|https?:\/\/|\/)/i.test(value)) return value;
    try { return new URL('../' + value.replace(/^\.\//, ''), window.location.href).href; }
    catch (e) { return '../' + value; }
  }

  function fromBuilder(p) {
    p = p || {};
    var base = window.NY_CONFIG || {};
    var y = parseInt(p.ny_year, 10);
    var year = (y >= 2000 && y <= 2100) ? y : (base.year || '');
    var lines = String(p.message || '').split(/\r\n|\r|\n/).map(function (s) { return s.trim().slice(0, 80); }).filter(Boolean).slice(0, 20);
    return {
      title: String(p.popup_title || '').trim() || ('HAPPY NEW YEAR ' + year),
      year: year,
      messages: lines,
      recipient: String(p.recipient_name || '').trim(),
      music: assetUrl(p.music_url) || base.music
    };
  }

  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.title) {
      window.NY_CONFIG = saved;
      document.addEventListener('DOMContentLoaded', function () {
        var audio = document.getElementById('fw-audio');
        if (audio && saved.music) audio.src = saved.music;
        var yr = document.querySelector('.fw-start__year');
        if (yr && saved.year) yr.textContent = saved.year;
        var to = document.querySelector('.fw-start__to');
        if (to) { to.querySelector('strong').textContent = saved.recipient || ''; to.hidden = !saved.recipient; }
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
