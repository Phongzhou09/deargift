/**
 * app.js – Trung Thu Nguyệt Dạ
 * DearGift - Vanilla JS + Three.js
 * Không dùng React/Fiber – dùng Three.js CDN + Web Animations API
 */
(function () {
'use strict';

/* ───────────────────── CONFIG ───────────────────── */
var CFG = window.GIFT_CONFIG || {};
var ASSET = 'assets/';
var INTRO_ASSET = ASSET + 'intro/';
var NGUYET_THU  = ASSET + 'nguyet-thu/';

/* ───────── LIVE PREVIEW BRIDGE ─────────
 * Builder gửi dữ liệu qua postMessage. Lưu tạm trong sessionStorage rồi tải
 * lại scene để mọi texture WebGL, ảnh trái tim và Audio cùng nhận một config.
 */
var previewCode = new URLSearchParams(window.location.search).get('code') || 'builder';
var legacyPreviewStorageKey = 'DG_TT_PREVIEW_OVERRIDE_' + previewCode;
var previewStorageKey = 'DG_TT_PREVIEW_OVERRIDE_V2_' + previewCode;

function asPreviewAssetUrl(value) {
  value = String(value || '').trim();
  if (!value) return '';
  if (/^(?:blob:|data:|https?:\/\/|\/)/i.test(value)) return value;
  value = value.replace(/^\.\//, '').replace(/^\.\.\//, '');
  try { return new URL('../' + value, window.location.href).href; }
  catch (err) { return '../' + value; }
}

function previewList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(asPreviewAssetUrl) : [];
}

function previewWishes(value) {
  if (Array.isArray(value)) return value.map(String).map(function (s) { return s.trim(); }).filter(Boolean);
  return String(value || '').split(/[·\n\r|]+/u).map(function (s) { return s.trim(); }).filter(Boolean);
}

function configFromBuilder(payload) {
  payload = payload || {};
  var mainPhotos = previewList(payload.photos);
  var flyPhotos = previewList(payload.fly_photos);
  var scenePhotos = flyPhotos.length ? flyPhotos : (mainPhotos.length ? mainPhotos : (CFG.flyingImages || []));
  var wishes = previewWishes(payload.wishes);
  var message = String(payload.message || payload.popup_message || '').trim();
  var music = asPreviewAssetUrl(payload.music_url);
  return Object.assign({}, CFG, {
    recipient: String(payload.recipient_name || '').trim() || CFG.recipient,
    sender: String(payload.sender_name || '').trim() || CFG.sender,
    popupTitle: String(payload.popup_title || '').trim() || CFG.popupTitle,
    letter: { text: message || ((CFG.letter && CFG.letter.text) || '') },
    flyingTexts: wishes.length ? wishes : CFG.flyingTexts,
    flyingImages: scenePhotos,
    couplePhoto: mainPhotos[0] || scenePhotos[0] || CFG.couplePhoto,
    bgMusic: music || CFG.bgMusic,
    preview: true,
    previewMode: true,
    showIntro: true
  });
}

if (CFG.previewMode) {
  try {
    sessionStorage.removeItem(legacyPreviewStorageKey);
    var savedPreviewConfig = sessionStorage.getItem(previewStorageKey);
    if (savedPreviewConfig) {
      var parsedPreviewConfig = JSON.parse(savedPreviewConfig);
      if (parsedPreviewConfig && typeof parsedPreviewConfig === 'object') {
        delete parsedPreviewConfig.showIntro;
        CFG = Object.assign({}, CFG, parsedPreviewConfig, { showIntro: true });
        window.GIFT_CONFIG = CFG;
      }
    }
  } catch (err) {}

  var previewReloadTimer = 0;
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || !event.data || event.data.type !== 'DG_LIVE_PREVIEW_UPDATE') return;
    var nextConfig = configFromBuilder(event.data.payload);
    var serialized = JSON.stringify(nextConfig);
    try {
      if (sessionStorage.getItem(previewStorageKey) === serialized) return;
    } catch (err) {}
    window.clearTimeout(previewReloadTimer);
    previewReloadTimer = window.setTimeout(function () {
      try { sessionStorage.setItem(previewStorageKey, serialized); } catch (err) {}
      window.location.reload();
    }, 500);
  });

  if (window.parent && window.parent !== window) {
    window.setTimeout(function () {
      window.parent.postMessage({ type: 'DG_PREVIEW_READY' }, window.location.origin);
    }, 0);
  }
}

/* ───────────────────── DOM SETUP ───────────────────── */
var root = document.getElementById('root');

// Loading screen
var loadEl = document.createElement('div');
loadEl.className = 'mtb';
loadEl.innerHTML = '<div class="mtb-hop"><div class="mtb-icon">🌕</div><p class="mtb-tieude">Đang mở thiệp…</p><p class="mtb-mo">Chờ một chút, trăng đang lên.</p></div>';
root.appendChild(loadEl);

// Canvas cho Three.js scene
var canvas = document.createElement('canvas');
canvas.id = 'scene-canvas';
canvas.setAttribute('aria-hidden', 'true');
root.appendChild(canvas);

// Intro container (SVG poster)
var introEl = document.createElement('div');
introEl.className = 'intro';
root.appendChild(introEl);

// Topbar
var topbar = document.createElement('div');
topbar.className = 'topbar';
root.appendChild(topbar);

/* ───────────────────── MUSIC ───────────────────── */
var audio = null;
var muted = false;

var fadeToken = 0;
var pauseTimer = 0;
var pausedByHidden = false;

function initAudio() {
  if (audio) return;
  audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  if (CFG.bgMusic) audio.src = CFG.bgMusic;
  audio.addEventListener('play', updateMusicBtn);
  audio.addEventListener('pause', updateMusicBtn);
}

function fadeVolume(target, duration) {
  if (!audio) return;
  var token = ++fadeToken;
  var start = audio.volume;
  var t0 = performance.now();
  (function tick() {
    if (token !== fadeToken) return;
    var t = Math.min(1, (performance.now() - t0) / duration);
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * t * t * (3 - 2 * t)));
    if (t < 1) setTimeout(tick, 30);
  })();
}

function playMusic() {
  initAudio();
  if (muted) return;
  clearTimeout(pauseTimer);
  if (audio.paused) {
    audio.volume = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  }
  fadeVolume(0.55, 3000);
}

function toggleMusic() {
  initAudio();
  if (audio.paused || muted) {
    muted = false;
    playMusic();
  } else {
    muted = true;
    fadeVolume(0, 700);
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(function () { if (muted) audio.pause(); }, 700);
  }
  updateMusicBtn();
}

// Dừng nhạc khi tab bị ẩn / thu nhỏ, phát lại khi quay lại (nếu người xem chưa tắt).
document.addEventListener('visibilitychange', function () {
  if (!audio) return;
  if (document.hidden) {
    if (!audio.paused) { pausedByHidden = true; fadeToken++; clearTimeout(pauseTimer); audio.pause(); }
  } else if (pausedByHidden) {
    pausedByHidden = false;
    playMusic();
  }
});

var musicBtn;
function updateMusicBtn() {
  if (!musicBtn) return;
  var playing = audio && !audio.paused && !muted;
  musicBtn.innerHTML = playing
    ? '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>'
    : '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m17 9 5 6"/><path d="m22 9-5 6"/></svg>';
}

/* ───────────────────── INTRO – SVG POSTER (từ layout.json) ───────────────────── */
var NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  var n = document.createElementNS(NS, tag);
  for (var k in attrs) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(n);
  return n;
}
function rnd(a, b) { return a + Math.random() * (b - a); }

function boxFor(layer) {
  var p = layer.placement || {}, a = layer.asset || {};
  if (p.mode === 'box') return p.boxPx;
  var t = p.targetContentBoxPx, r = a.alphaContentRectPx;
  if (!t || !r) return { x: 0, y: 0, width: a.width || 1, height: a.height || 1 };
  if (p.mode === 'alpha-content-box-stretch') {
    var sx = t.width / r.width, sy = t.height / r.height;
    return { x: t.x - r.x * sx, y: t.y - r.y * sy, width: a.width * sx, height: a.height * sy };
  }
  var s = Math.min(t.width / r.width, t.height / r.height);
  return { x: t.x + (t.width - r.width * s) / 2 - r.x * s, y: t.y + (t.height - r.height * s) / 2 - r.y * s, width: a.width * s, height: a.height * s };
}

function animateLayer(node, layer, reduced) {
  if (reduced) return;
  var a = layer.animation || {}, p = a.preset;
  if (!p || !node.animate) return;
  var d = (Array.isArray(a.durationSeconds) ? rnd(a.durationSeconds[0], a.durationSeconds[1]) : (a.durationSeconds || 5)) * 1000;
  var delay = (a.delaySeconds || 0) * 1000;
  var opts = { duration: d, delay: delay, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' };
  var frames;
  if (p === 'lantern-float')   frames = [{ transform: 'translateY(' + a.translateYPx[0] + 'px) rotate(' + a.rotateDegrees[0] + 'deg)' }, { transform: 'translateY(' + a.translateYPx[1] + 'px) rotate(' + a.rotateDegrees[1] + 'deg)' }];
  else if (p === 'glow-pulse') frames = [{ transform: 'scale(' + a.scale[0] + ')', opacity: a.opacity[0] }, { transform: 'scale(' + a.scale[1] + ')', opacity: a.opacity[1] }];
  else if (p === 'twinkle')    frames = [{ opacity: a.opacity[1] }, { opacity: a.opacity[0] }];
  else if (p === 'slow-drift' || p === 'parallax-x' || p === 'cloud-drift') {
    var tx = a.translateXPx || [0, 0];
    frames = [{ transform: 'translateX(' + tx[0] + 'px)' }, { transform: 'translateX(' + tx[1] + 'px)' }];
  }
  else if (p === 'branch-sway') frames = [{ transform: 'rotate(' + a.rotateDegrees[0] + 'deg)' }, { transform: 'rotate(' + a.rotateDegrees[1] + 'deg)' }];
  else if (p === 'rabbit-breathe') frames = [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(' + a.translateYPx[1] + 'px) scale(' + a.scale[1] + ')' }];
  if (frames) node.animate(frames, opts);
}

var mainStarted = false;

function buildIntro(layout) {
  introEl.innerHTML = '';
  var m = layout.scene.referenceCanvas;
  var isDesktop = Number(layout.scene.referenceCanvas.aspectRatio || 0) > 1.2;
  introEl.classList.toggle('desktop', isDesktop);
  introEl.style.backgroundColor = layout.scene.backgroundColor || '#050a14';

  var poster = svgEl('svg', {
    class: 'poster ' + (isDesktop ? 'desktop' : 'mobile'),
    viewBox: m.viewBox,
    role: 'img',
    'aria-label': 'Thiệp Trung thu',
    preserveAspectRatio: isDesktop ? 'xMidYMid slice' : 'xMidYMid meet'
  }, introEl);

  var bgImgNode = null;
  var hintTextNode = null;
  var bBox = { x: 0, y: 0, width: m.width, height: m.height };

  function updateViewBox() {
    if (isDesktop) return;
    var W = m.width, H = m.height;
    var s = Math.min(innerWidth / W, innerHeight / H);
    var vw = innerWidth / s;
    var vh = innerHeight / s;
    var le = (layout.scene.portraitFocusY || H / 2) - vh / 2;
    if (vh >= H) {
      le = Math.max(H - vh, Math.min(0, le));
    }
    bBox = { x: (W - vw) / 2, y: le, width: vw, height: vh };
    poster.setAttribute('viewBox', bBox.x + ' ' + bBox.y + ' ' + vw + ' ' + vh);

    var hCfg = layout.scene.moonHint;
    if (hintTextNode && hCfg) {
      hintTextNode.setAttribute('x', String(bBox.x + vw / 2));
      hintTextNode.setAttribute('y', String(bBox.y + vh - (hCfg.screenBottomPx || 38) / s));
      hintTextNode.setAttribute('font-size', String((hCfg.screenFontPx || 14) / s));
    }
    if (bgImgNode) {
      bgImgNode.setAttribute('x', String(bBox.x));
      bgImgNode.setAttribute('y', String(bBox.y));
      bgImgNode.setAttribute('width', String(bBox.width));
      bgImgNode.setAttribute('height', String(bBox.height));
    }
  }

  // Defs
  var defs = svgEl('defs', {}, poster);
  var clip = svgEl('clipPath', { id: 'window-aperture', clipPathUnits: 'userSpaceOnUse' }, defs);
  if (layout.clipPaths && layout.clipPaths['window-aperture']) {
    svgEl('path', { d: layout.clipPaths['window-aperture'].d }, clip);
  }

  var rg = svgEl('radialGradient', { id: 'moon-halo-gradient' }, defs);
  svgEl('stop', { offset: '0%', 'stop-color': '#fff6d6', 'stop-opacity': '0.9' }, rg);
  svgEl('stop', { offset: '35%', 'stop-color': '#ffe7a8', 'stop-opacity': '0.45' }, rg);
  svgEl('stop', { offset: '70%', 'stop-color': '#ffd98a', 'stop-opacity': '0.12' }, rg);
  svgEl('stop', { offset: '100%', 'stop-color': '#ffd98a', 'stop-opacity': '0' }, rg);

  var filt = svgEl('filter', { id: 'moon-soft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  svgEl('feGaussianBlur', { stdDeviation: String(6 * m.width / 551) }, filt);

  var darkSkyGrad = svgEl('radialGradient', { id: 'dark-sky-gradient', cx: '32%', cy: '28%', r: '85%' }, defs);
  svgEl('stop', { offset: '0%', 'stop-color': '#171326' }, darkSkyGrad);
  svgEl('stop', { offset: '45%', 'stop-color': '#08070f' }, darkSkyGrad);
  svgEl('stop', { offset: '100%', 'stop-color': '#000000' }, darkSkyGrad);

  var layers = [].concat(layout.layers).sort(function (a, b) { return a.zIndex - b.zIndex; });
  var groups = {};
  var windowGroup = svgEl('g', { id: 'window-group' });
  var windowClipGroup = svgEl('g', { 'clip-path': 'url(#window-aperture)' }, windowGroup);
  var addedWindow = false;

  var moonLayer = layers.find(function (l) { return l.id === 'full-moon'; });
  var moonBox = moonLayer ? (moonLayer.placement.targetContentBoxPx || boxFor(moonLayer)) : null;
  var moonCx = moonBox ? moonBox.x + moonBox.width / 2 : 197.5;
  var moonCy = moonBox ? moonBox.y + moonBox.height / 2 : 157.5;
  var moonR  = moonBox ? Math.min(moonBox.width, moonBox.height) / 2 : 91;

  for (var li = 0; li < layers.length; li++) {
    var layer = layers[li];
    if (layer.group === 'particles') {
      var pg = svgEl('g', { id: 'g-' + layer.id }, poster);
      groups[layer.id] = pg;
      buildParticles(layer, pg, layout);
      continue;
    }
    var g = svgEl('g', { id: 'g-' + layer.id });
    var b = boxFor(layer);

    if (!isDesktop && layer.placement && layer.placement.mode === 'box' && layer.zIndex === 0) {
      bgImgNode = svgEl('image', {
        href: INTRO_ASSET + layer.file,
        x: bBox.x,
        y: bBox.y,
        width: bBox.width,
        height: bBox.height,
        preserveAspectRatio: 'xMidYMid slice',
        'data-layer': layer.id
      });
      g.appendChild(bgImgNode);
      groups[layer.id] = g;
      poster.appendChild(g);
      continue;
    }

    if (layer.id === 'night-sky') {
      svgEl('rect', {
        x: b.x - b.width,
        y: b.y - b.height,
        width: b.width * 3,
        height: b.height * 3,
        fill: 'url(#dark-sky-gradient)'
      }, g);
      g.appendChild(svgEl('image', { href: INTRO_ASSET + layer.file, x: b.x, y: b.y, width: b.width, height: b.height, preserveAspectRatio: 'none', 'data-layer': layer.id }));
    } else {
      g.appendChild(svgEl('image', { href: INTRO_ASSET + layer.file, x: b.x, y: b.y, width: b.width, height: b.height, preserveAspectRatio: 'none', 'data-layer': layer.id }));
    }

    groups[layer.id] = g;

    if (layer.group === 'window-content') {
      windowClipGroup.appendChild(g);
    } else if (layer.id === 'window-frame') {
      windowGroup.appendChild(g);
      poster.appendChild(windowGroup);
      addedWindow = true;
    } else {
      poster.appendChild(g);
    }

    if (layer.id !== 'full-moon') animateLayer(g, layer, false);
  }
  if (!addedWindow) poster.appendChild(windowGroup);

  // Big dim overlay
  var maxDim = Math.max(m.width, m.height) * 4;
  var introDim = svgEl('rect', {
    id: 'intro-dim',
    x: -maxDim,
    y: -maxDim,
    width: maxDim * 2 + m.width,
    height: maxDim * 2 + m.height,
    fill: '#1a0208',
    opacity: '0',
    'pointer-events': 'none'
  }, poster);

  // Moon UI
  var moonUI = svgEl('g', { id: 'moon-ui' }, poster);
  var moonHit = svgEl('circle', {
    class: 'moon-hit',
    cx: moonCx,
    cy: moonCy,
    r: moonR + 14,
    tabindex: '0',
    role: 'button',
    'aria-label': 'Ấn và giữ mặt trăng để mở thiệp'
  }, moonUI);

  var moonHalo = svgEl('circle', {
    class: 'moon-halo',
    cx: moonCx,
    cy: moonCy,
    r: moonR * 1.9,
    filter: 'url(#moon-soft)',
    'pointer-events': 'none'
  }, moonUI);
  moonHalo.style.transformOrigin = moonCx + 'px ' + moonCy + 'px';
  var haloAnim = moonHalo.animate(
    [{ opacity: 0.32, transform: 'scale(1)' }, { opacity: 0.55, transform: 'scale(1.06)' }],
    { duration: 3200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
  );

  var moonClipClone = svgEl('g', {
    'clip-path': 'url(#window-aperture)',
    opacity: '0',
    'pointer-events': 'none'
  }, moonUI);
  if (moonLayer) {
    var mb = boxFor(moonLayer);
    moonClipClone.appendChild(svgEl('image', { href: INTRO_ASSET + moonLayer.file, x: mb.x, y: mb.y, width: mb.width, height: mb.height, preserveAspectRatio: 'none' }));
  }
  moonClipClone.style.transformOrigin = moonCx + 'px ' + moonCy + 'px';

  var fullMoonG = groups['full-moon'];
  if (fullMoonG) fullMoonG.style.transformOrigin = moonCx + 'px ' + moonCy + 'px';

  // Moon hint
  var hintG = null;
  var hintCfg = layout.scene.moonHint;
  if (hintCfg && hintCfg.text) {
    hintG = svgEl('g', { class: 'moon-hint', 'pointer-events': 'none' }, moonUI);
    hintTextNode = svgEl('text', {
      x: hintCfg.centerX != null ? hintCfg.centerX : moonCx,
      y: hintCfg.baselineY != null ? hintCfg.baselineY : 0,
      'font-size': hintCfg.fontSizePx != null ? hintCfg.fontSizePx : 16,
      'text-anchor': 'middle'
    }, hintG);
    hintTextNode.textContent = hintCfg.text;
    hintTextNode.animate([{ opacity: 0.62 }, { opacity: 1 }], { duration: 2200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  }

  updateViewBox();
  window.addEventListener('resize', updateViewBox);

  // Entrance animations
  var unitL = m.height / 100;
  function enterAnim(node, xFrom, yFrom, delayMs, durMs) {
    if (!node || !node.parentNode) return;
    var wrap = svgEl('g', { class: 'intro-enter' });
    node.parentNode.insertBefore(wrap, node);
    wrap.appendChild(node);
    wrap.animate([
      { opacity: 0, transform: 'translate(' + xFrom + 'px, ' + yFrom + 'px)' },
      { opacity: 1, transform: 'translate(0px, 0px)' }
    ], { duration: durMs, delay: delayMs, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
  }

  var bgLayer = layers.find(function (l) { return l.zIndex === 0; });
  if (bgLayer && groups[bgLayer.id]) enterAnim(groups[bgLayer.id], 0, 0, 0, 850);
  enterAnim(windowGroup, 0, -2.2 * unitL, 120, 950);

  layers.forEach(function (l) {
    var sg = groups[l.id];
    if (!sg || l.zIndex === 0 || l.id === 'window-frame' || l.group === 'window-content') return;
    var lid = l.id;
    if (lid.startsWith('lantern')) enterAnim(sg, 0, 5.5 * unitL, 430, 1050);
    else if (lid.startsWith('cloud')) enterAnim(sg, (lid.includes('left') ? -4 : 4) * unitL, 0, 330, 1050);
    else if (lid.includes('branch')) enterAnim(sg, 0, 4.5 * unitL, 520, 1050);
    else if (lid === 'jade-rabbit') enterAnim(sg, 0, 2.8 * unitL, 700, 950);
    else if (l.group === 'particles') enterAnim(sg, 0, 0, 950, 800);
    else enterAnim(sg, 0, 0, 500, 900);
  });
  enterAnim(moonUI, 0, 0, 1020, 850);

  // ── Exact Hold Physics & Smooth Release Decay ──
  var isDone = false, isHolding = false;
  var holdProgressVal = 0; // ne (0 -> 1)
  var holdStartTime = 0;
  var rafId = 0;
  var HOLD_DURATION_MS = (moonLayer && moonLayer.interactive && moonLayer.interactive.holdDurationMs) || 1500;

  function updateVisuals() {
    if (holdProgressVal > 0) {
      if (haloAnim) haloAnim.cancel();
      moonHalo.style.opacity = String(0.4 + 0.6 * holdProgressVal);
      moonHalo.style.transform = 'scale(' + (1 + 0.9 * holdProgressVal) + ')';
    } else {
      moonHalo.style.opacity = '';
      moonHalo.style.transform = '';
    }
    introDim.setAttribute('opacity', String(0.6 * holdProgressVal));
    moonClipClone.setAttribute('opacity', String(holdProgressVal));

    var moonScaleStr = 'scale(' + (1 + 0.06 * holdProgressVal) + ')';
    moonHit.style.transform = moonScaleStr;
    if (fullMoonG) fullMoonG.style.transform = moonScaleStr;
    moonClipClone.style.transform = moonScaleStr;

    if (hintG) hintG.setAttribute('opacity', String(1 - holdProgressVal));
  }

  function loopTick(now) {
    if (isDone) return;
    if (isHolding) {
      holdProgressVal = Math.min(1, (now - holdStartTime) / HOLD_DURATION_MS);
    } else {
      holdProgressVal = Math.max(0, holdProgressVal - 0.04);
    }
    updateVisuals();

    if (isHolding && holdProgressVal >= 1) {
      finishTransition();
      return;
    }
    if (isHolding || holdProgressVal > 0) {
      rafId = requestAnimationFrame(loopTick);
    }
  }

  function onHoldBegin(e) {
    if (isDone || isHolding) return;
    if (e && e.preventDefault) e.preventDefault();
    isHolding = true;
    holdStartTime = performance.now() - holdProgressVal * HOLD_DURATION_MS;
    introEl.classList.add('holding');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loopTick);
    playMusic();
  }

  function onHoldCancel() {
    if (isDone || !isHolding) return;
    isHolding = false;
    introEl.classList.remove('holding');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loopTick);
  }

  function finishTransition() {
    isDone = true;
    isHolding = false;
    cancelAnimationFrame(rafId);
    introEl.classList.remove('holding');
    introEl.classList.add('done');

    moonUI.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
    introDim.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });

    var easeBezier = 'cubic-bezier(.4,0,.2,1)';
    var scaleL = m.width / 551;
    function exitFly(layerId, yDelta, dur, del) {
      var eg = groups[layerId];
      if (eg) {
        eg.getAnimations().forEach(function (a) { a.cancel(); });
        eg.animate([
          { transform: 'translateY(0px)', opacity: 1 },
          { transform: 'translateY(' + (yDelta * scaleL) + 'px)', opacity: 0 }
        ], { duration: dur, delay: del, easing: easeBezier, fill: 'forwards' });
      }
    }

    exitFly('lantern-large-over-frame', -260, 1500, 0);
    exitFly('lantern-medium-center', -220, 1400, 80);
    exitFly('lantern-medium', -220, 1400, 80);
    exitFly('lantern-small-right', -180, 1300, 160);
    exitFly('lantern-distant', -140, 1200, 220);
    exitFly('osmanthus-branch', 120, 1100, 0);
    exitFly('osmanthus-branch-desktop', 120, 1100, 0);
    exitFly('jade-rabbit', 120, 1100, 0);

    ['cloud-left', 'cloud-right', 'cloud-left-desktop', 'cloud-right-desktop'].forEach(function (cid) {
      exitFly(cid, 0, 700, 0);
    });
    layers.forEach(function (l) {
      if (l.group === 'particles' && groups[l.id]) {
        groups[l.id].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
      }
    });

    var redBg = groups['red-background'] || groups['desktop-background'];
    if (redBg) redBg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 700, fill: 'forwards' });
    introEl.animate([
      { backgroundColor: introEl.style.backgroundColor || '#050a14' },
      { backgroundColor: '#000' }
    ], { duration: 1200, delay: 500, fill: 'forwards' });
    introEl.animate([{ opacity: 1 }, { opacity: 1, offset: 0.42 }, { opacity: 0 }], { duration: 3000, easing: 'linear', fill: 'forwards' });

    // Smooth window aperture zoom
    var apertureBox = { x: 80, y: 50, width: 390, height: 400 };
    if (layout.clipPaths && layout.clipPaths['window-aperture']) {
      var dummyPath = document.createElementNS(NS, 'path');
      dummyPath.setAttribute('d', layout.clipPaths['window-aperture'].d);
      poster.appendChild(dummyPath);
      try {
        var bb = dummyPath.getBBox();
        if (bb && bb.width > 0) apertureBox = bb;
      } catch (err) {}
      dummyPath.remove();
    }
    var apCx = apertureBox.x + apertureBox.width / 2;
    var apCy = apertureBox.y + apertureBox.height / 2;
    var ctm = poster.getScreenCTM();
    var ctmScale = ctm ? ctm.a : 1;
    var zoomScale = Math.max(innerWidth / (apertureBox.width * ctmScale), innerHeight / (apertureBox.height * ctmScale)) * 1.25;

    var pt = poster.createSVGPoint();
    pt.x = innerWidth / 2;
    pt.y = innerHeight / 2;
    var targetSvgPt = ctm ? pt.matrixTransform(ctm.inverse()) : { x: apCx, y: apCy };

    windowGroup.style.transformOrigin = apCx + 'px ' + apCy + 'px';
    windowGroup.animate([
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: 'translate(' + (targetSvgPt.x - apCx) + 'px, ' + (targetSvgPt.y - apCy) + 'px) scale(' + zoomScale + ')' }
    ], { duration: 2000, delay: 350, easing: 'cubic-bezier(.55,0,.3,1)', fill: 'forwards' });

    if (groups['window-frame']) groups['window-frame'].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 900, fill: 'forwards' });
    windowClipGroup.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: 2000, delay: 900, fill: 'forwards' });

    setTimeout(startMain, 1000);
    setTimeout(function () {
      introEl.classList.add('done');
      window.removeEventListener('resize', updateViewBox);
    }, 3100);
  }

  // Pointer event listeners
  moonHit.addEventListener('pointerdown', onHoldBegin);
  window.addEventListener('pointerup', onHoldCancel);
  window.addEventListener('pointercancel', onHoldCancel);
  window.addEventListener('blur', onHoldCancel);
  moonHit.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  moonHit.addEventListener('keydown', function (e) {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) onHoldBegin(e);
  });
  moonHit.addEventListener('keyup', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') onHoldCancel();
  });
}

/* ───────── PARTICLES (hoa rơi) ───────── */
function buildParticles(layer, container, layout) {
  var r = layer.repeat, b = boxFor(layer);
  var count = r.recommendedCount || 10;
  var area = r.areaPx || { x: 0, y: 0, width: layout.scene.referenceCanvas.width, height: layout.scene.referenceCanvas.height };

  for (var i = 0; i < count; i++) {
    var g2 = svgEl('g', { class: 'particle' }, container);
    svgEl('image', { href: INTRO_ASSET + layer.file, x: -b.width / 2, y: -b.height / 2, width: b.width, height: b.height, preserveAspectRatio: 'none' }, g2);
    var px = area.x + Math.random() * area.width;
    var py = area.y + Math.random() * area.height;
    var sc2 = rnd(r.randomScale[0], r.randomScale[1]);
    var dx = -25 + Math.random() * 50, dy = 150 + Math.random() * 190;
    var rot = Math.random() * 320, dur = 5500 + Math.random() * 5000;
    g2.animate([
      { transform: 'translate(' + px + 'px,' + (py - 100) + 'px) scale(' + sc2 + ') rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + px + 'px,' + (py - 40) + 'px) scale(' + sc2 + ') rotate(' + rot * 0.1 + 'deg)', opacity: 0.9, offset: 0.15 },
      { transform: 'translate(' + (px + dx) + 'px,' + (py + dy) + 'px) scale(' + sc2 + ') rotate(' + rot + 'deg)', opacity: 0 }
    ], { duration: dur, delay: i * 430 - 7000, iterations: Infinity, easing: 'linear' });
  }
}

/* ───────────────────── THREE.JS MAIN SCENE ───────────────────── */
function startMain() {
  if (mainStarted) return;
  mainStarted = true;
  document.body.classList.add('main-started');
  if (loadEl && loadEl.remove) loadEl.remove();
  if (CFG.showIntro === false) {
    introEl.style.display = 'none';
  } else {
    setTimeout(function () {
      introEl.style.display = 'none';
    }, 1150);
  }
  buildTopbar();
  if (window.GiftoryCloneScene && typeof window.GiftoryCloneScene.init === 'function') {
    window.GiftoryCloneScene.init({ root: root, canvas: canvas, config: CFG, openLetter: openLetter, playMusic: playMusic });
  } else {
    console.error('Không tải được assets/giftory-scene.js – cảnh 3D không thể khởi tạo.');
  }
}

/* ───────────────────── TOPBAR BUTTONS ───────────────────── */
function buildTopbar() {
  topbar.innerHTML = '';

  var fullBtn = document.createElement('button');
  fullBtn.type = 'button';
  fullBtn.className = 'btn-fullscreen-toggle';
  fullBtn.setAttribute('aria-label', 'Toàn màn hình');
  fullBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  fullBtn.addEventListener('click', function () {
    if (!document.fullscreenElement) {
      var el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
  });
  topbar.appendChild(fullBtn);

  musicBtn = document.createElement('button');
  musicBtn.type = 'button';
  musicBtn.className = 'btn-audio-toggle';
  musicBtn.setAttribute('aria-label', 'Bật hoặc tắt nhạc');
  musicBtn.addEventListener('click', toggleMusic);
  topbar.appendChild(musicBtn);
  updateMusicBtn();
}

/* ───────────────────── LETTER MODAL (Nguyệt Thư) ───────────────────── */
var letterOpen = false;
var letterEl   = null;
var typedEl    = null, cursorEl = null;
var typeTimer  = null;

function openLetter() {
  if (letterOpen) return;
  letterOpen = true;
  if (!letterEl) buildLetterModal();
  letterEl.style.display = 'grid';
  requestAnimationFrame(function () {
    letterEl.classList.remove('nt-closing');
    letterEl.querySelector('.nt-dialog').classList.add('nt-san');
  });
  startTyping();
}
function closeLetter() {
  if (!letterOpen || !letterEl) return;
  letterOpen = false;
  letterEl.classList.add('nt-closing');
  letterEl.querySelector('.nt-dialog').classList.remove('nt-san');
  setTimeout(function () { letterEl.style.display = 'none'; }, 300);
}
function buildLetterModal() {
  letterEl = document.createElement('div');
  letterEl.className = 'nt-backdrop';
  letterEl.style.display = 'none';
  letterEl.setAttribute('role', 'dialog');
  letterEl.setAttribute('aria-modal', 'true');
  letterEl.setAttribute('aria-label', 'Lá thư gửi người thương');

  letterEl.innerHTML =
    '<section class="nt-dialog nt-giftory-letter">' +
      '<div class="nt-letter-glow" aria-hidden="true"></div>' +
      '<div class="nt-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<img class="nt-frame" src="' + NGUYET_THU + 'letter-frame-bunny.webp" alt="">' +
      '<h2 class="nt-title"></h2>' +
      '<div class="nt-letter" aria-live="polite"><div class="nt-letter-inner"><p class="nt-copy"><span class="nt-typed"></span><b class="nt-cursor" aria-hidden="true"></b></p></div></div>' +
      '<p class="nt-signature"></p>' +
      '<button class="nt-close" type="button" aria-label="Đóng lá thư"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.4 8.4 15.6 15.6M15.6 8.4 8.4 15.6"/></svg></button>' +
    '</section>';

  var title = letterEl.querySelector('.nt-title');
  var signature = letterEl.querySelector('.nt-signature');
  title.textContent = CFG.popupTitle || 'Gửi người thương';
  signature.textContent = CFG.sender ? '— ' + CFG.sender + ' —' : '';
  letterEl.querySelector('.nt-close').addEventListener('click', closeLetter);
  letterEl.addEventListener('click', function (e) { if (e.target === letterEl) closeLetter(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && letterOpen) closeLetter(); });
  typedEl  = letterEl.querySelector('.nt-typed');
  cursorEl = letterEl.querySelector('.nt-cursor');

  document.body.appendChild(letterEl);
}

function startTyping() {
  clearInterval(typeTimer);
  if (!typedEl) return;
  var text = (CFG.letter && CFG.letter.text) || '';
  var chars = Array.from(text);
  var msPerChar = chars.length ? Math.max(28, Math.min(42, 22000 / chars.length)) : 42;
  var i = 0;
  typedEl.textContent = '';
  if (cursorEl) cursorEl.hidden = false;
  var box = letterEl ? letterEl.querySelector('.nt-letter') : null;

  typeTimer = setInterval(function () {
    if (i < chars.length) {
      typedEl.textContent = chars.slice(0, ++i).join('');
      if (box) box.scrollTop = box.scrollHeight;
    } else {
      clearInterval(typeTimer);
      if (cursorEl) cursorEl.hidden = true;
    }
  }, msPerChar);
}

/* ───────────────────── INIT ───────────────────── */
var introLayoutFile = window.matchMedia('(min-aspect-ratio: 4/3)').matches ? 'layout.desktop.json' : 'layout.json';
fetch(INTRO_ASSET + introLayoutFile)
  .then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' on ' + r.url);
    return r.json();
  })
  .then(function (layout) {
    loadEl.remove && loadEl.remove();
    buildIntro(layout);
    initAudio();
    ['touchend','click','pointerup','keydown'].forEach(function (ev) {
      document.addEventListener(ev, function once() {
        document.removeEventListener(ev, once, true);
        initAudio();
      }, { once: true, capture: true });
    });
  })
  .catch(function (err) {
    console.warn('Intro layout fetch fallback:', err);
    loadEl.remove && loadEl.remove();
    introEl.classList.add('done');
    startMain();
  });

})();







