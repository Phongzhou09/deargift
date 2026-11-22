/**
 * Photo Bouquet - 100% Authentic Clone
 * Kết hợp:
 * 1. Bó hoa nghệ thuật nở hoa & ảnh kỷ niệm (DearGift Photo Bouquet)
 * 2. Hiệu ứng Cơn Mưa Tình Yêu 3D (Love Rain) từ template id 38
 * 3. Hộp thoại phong thư 3D & lá thư tay hoa nghệ thuật
 */

const DATA = window.PB_DATA || {};
const urlParams = new URLSearchParams(location.search);

// Cấu hình tọa độ bó hoa gốc (1000 x 1280)
const BOUQUET_PARTS = [
  { asset: 'wrap-back-v2', x: 82, y: 125, width: 836, height: 1115, rotate: 0, z: 5, kind: 'back' },
  { asset: 'leaf-sprig', x: 48, y: 258, width: 310, height: 490, rotate: -26, z: 7, kind: 'foliage' },
  { asset: 'leaf-sprig', x: 658, y: 274, width: 300, height: 470, rotate: 24, z: 7, kind: 'foliage', flip: true },
  { asset: 'baby-breath', x: 96, y: 207, width: 246, height: 485, rotate: -13, z: 8, kind: 'foliage' },
  { asset: 'baby-breath', x: 658, y: 229, width: 246, height: 465, rotate: 15, z: 8, kind: 'foliage', flip: true },
  { asset: 'baby-breath', x: 330, y: 250, width: 175, height: 345, rotate: -10, z: 9, kind: 'infill', revealDelay: 750 },
  { asset: 'baby-breath', x: 523, y: 246, width: 202, height: 357, rotate: 15, z: 9, kind: 'infill', revealDelay: 950, flip: true },
  { asset: 'baby-breath', x: 435, y: 548, width: 210, height: 310, rotate: -5, z: 9, kind: 'infill', revealDelay: 1350 },
  { asset: 'rose-pink', x: 327, y: 429, width: 125, height: 140, rotate: -8, z: 10, kind: 'infill', revealDelay: 900 },
  { asset: 'rose-pink', x: 558, y: 463, width: 116, height: 128, rotate: 16, z: 10, kind: 'infill', revealDelay: 1100, flip: true },
  { asset: 'rose-pink', x: 145, y: 555, width: 236, height: 247, rotate: -17, z: 30, kind: 'flower' },
  { asset: 'rose-pink', x: 619, y: 548, width: 230, height: 241, rotate: 22, z: 30, kind: 'flower' },
  { asset: 'baby-breath', x: 155, y: 570, width: 180, height: 260, rotate: -15, z: 31, kind: 'flower' },
  { asset: 'rose-pink', x: 259, y: 661, width: 205, height: 220, rotate: -9, z: 32, kind: 'flower' },
  { asset: 'rose-ivory', x: 576, y: 664, width: 196, height: 202, rotate: 13, z: 32, kind: 'flower' },
  { asset: 'baby-breath', x: 432, y: 683, width: 136, height: 198, rotate: 4, z: 43, kind: 'flower' },
  { asset: 'wrap-front-v2', x: 60, y: 525, width: 880, height: 550, rotate: 0, z: 40, kind: 'front' },
  { asset: 'butterfly', x: 70, y: 150, width: 80, height: 75, rotate: -17, z: 48, kind: 'butterfly' },
  { asset: 'butterfly', x: 861, y: 257, width: 77, height: 72, rotate: 16, z: 48, kind: 'butterfly', flip: true }
];

const PORTRAIT_SLOTS = [
  { x: 374, y: 386, width: 252, height: 394, rotate: -1, z: 26 },
  { x: 176, y: 176, width: 240, height: 382, rotate: -6, z: 14 },
  { x: 584, y: 176, width: 240, height: 382, rotate:  6, z: 15 },
  { x: 378, y: 120, width: 244, height: 392, rotate:  0, z: 11 },
  { x: 139, y: 368, width: 240, height: 386, rotate: -8, z: 22 },
  { x: 621, y: 359, width: 240, height: 386, rotate:  8, z: 22 }
];

const BLOOM_FLOWERS = [
  { asset: 'rose-pink',  x: 296, y: 357, width: 350, height: 350, rotate: -3, z: 27 },
  { asset: 'rose-ivory', x: 144, y: 238, width: 310, height: 310, rotate: -14, z: 15 },
  { asset: 'rose-pink',  x: 574, y: 220, width: 310, height: 310, rotate: 12, z: 16, flip: true },
  { asset: 'rose-pink',  x: 294, y: 132, width: 326, height: 326, rotate: -4, z: 12 },
  { asset: 'rose-pink',  x: 107, y: 397, width: 310, height: 310, rotate: -13, z: 23 },
  { asset: 'rose-ivory', x: 591, y: 397, width: 298, height: 307, rotate: 13, z: 23 }
];

const Yn = [[0,0],[1000,0],[1000,650],[850,720],[700,780],[500,870],[300,780],[150,720],[0,650]];
function clipPolygon(e) {
  const n = -(e.rotate || 0) * Math.PI / 180;
  const t = e.width * 0.5;
  const a = e.height * 0.78;
  return `polygon(${Yn.map(([s, r]) => {
    const o = s - e.x - t;
    const l = r - e.y - a;
    return `${((o * Math.cos(n) - l * Math.sin(n) + t) / e.width * 100).toFixed(3)}% ${((o * Math.sin(n) + l * Math.cos(n) + a) / e.height * 100).toFixed(3)}%`;
  }).join(',')})`;
}

function applyPartStyle(el, p) {
  el.style.setProperty('--x', (p.x / 10) + '%');
  el.style.setProperty('--y', (p.y / 12.8) + '%');
  el.style.setProperty('--w', (p.width / 10) + '%');
  el.style.setProperty('--h', (p.height / 12.8) + '%');
  el.style.setProperty('--rotation', (p.rotate || 0) + 'deg');
  el.style.setProperty('--flip', p.flip ? -1 : 1);
  el.style.setProperty('--z', p.z);
}

// Quản lý âm thanh
const bgm = document.getElementById('bgm');
if (bgm && DATA.bgMusic) {
  bgm.src = DATA.bgMusic;
}

let isAudioPlaying = false;
function playAudio() {
  if (!bgm) return;
  if (isAudioPlaying && !bgm.paused) return;
  bgm.volume = 0;
  bgm.play().then(() => {
    isAudioPlaying = true;
    showTopbar();
    updateMusicBtn();
    fadeAudio(0.85, 1200);
  }).catch(() => {});
}

// Bật nhạc ngay khi người dùng chạm vào màn hình ở hiệu ứng 1
const onFirstInteractPlay = () => {
  if (!isAudioPlaying) {
    playAudio();
  }
};
['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, onFirstInteractPlay, { once: true, passive: true });
});

function pauseAudio() {
  if (!bgm) return;
  fadeAudio(0, 400, () => {
    bgm.pause();
    isAudioPlaying = false;
    updateMusicBtn();
  });
}

function fadeAudio(targetVol, duration, onComplete) {
  const startVol = bgm.volume;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    bgm.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * progress));
    if (progress < 1) requestAnimationFrame(tick);
    else if (onComplete) onComplete();
  };
  requestAnimationFrame(tick);
}

function updateMusicBtn() {
  const btn = document.getElementById('btnMusic');
  if (!btn) return;
  const icoOn = btn.querySelector('.music-ico-on');
  const icoOff = btn.querySelector('.music-ico-off');
  if (icoOn && icoOff) {
    icoOn.style.display = isAudioPlaying ? 'block' : 'none';
    icoOff.style.display = isAudioPlaying ? 'none' : 'block';
  }
}

// Xây dựng các lớp giao diện bó hoa
function buildBouquetLayers() {
  const artLayer = document.getElementById('bouquetArtLayer');
  const photoLayer = document.getElementById('bouquetPhotoLayer');
  const bloomLayer = document.getElementById('bouquetBloomLayer');

  // 1. Artwork
  BOUQUET_PARTS.forEach((p) => {
    const img = document.createElement('img');
    img.className = 'bouquet-part bouquet-art';
    img.dataset.kind = p.kind;
    if (p.revealDelay) img.dataset.revealDelay = p.revealDelay;
    applyPartStyle(img, p);
    img.src = `assets/bouquet-intro/${p.asset}.webp`;
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    artLayer.appendChild(img);
  });

  // 2. Photos
  const images = (DATA.bouquetImages && DATA.bouquetImages.length) ? DATA.bouquetImages : [];
  const cutouts = DATA.bouquetCutouts || [];

  PORTRAIT_SLOTS.forEach((slot, idx) => {
    const src = images[idx % images.length] || 'assets/letter-20-10/portrait.webp';
    const isCutout = cutouts.length > 0 ? (cutouts[idx % cutouts.length] === true) : true;

    const wrap = document.createElement('div');
    wrap.className = `bouquet-part bouquet-photo ${isCutout ? 'is-cutout' : 'is-card'}`;
    wrap.dataset.kind = 'portrait';
    applyPartStyle(wrap, slot);
    if (isCutout) {
      wrap.style.clipPath = clipPolygon(slot);
    } else {
      wrap.style.clipPath = 'none';
    }

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Ảnh kỷ niệm ${idx + 1} trong bó hoa`;
    img.draggable = false;
    img.decoding = 'async';

    wrap.appendChild(img);
    photoLayer.appendChild(wrap);
  });

  // 3. Bloom roses
  BLOOM_FLOWERS.forEach((flower) => {
    const img = document.createElement('img');
    img.className = 'bouquet-part bouquet-art bouquet-bloom';
    img.dataset.kind = 'bloom';
    applyPartStyle(img, flower);
    img.src = `assets/bouquet-intro/${flower.asset}.webp`;
    img.alt = '';
    img.draggable = false;
    bloomLayer.appendChild(img);
  });
}

let _pendingLivePreview = null;
let _onRevealFn = null;

// Khởi tạo vòng đời & tương tác bó hoa
function initBouquet() {
  const screen = document.getElementById('bouquetScreen');
  const stage = document.getElementById('bouquetStage');
  const bow = document.getElementById('bouquetBow');
  const revealBtn = document.getElementById('bouquetReveal');
  const hint = document.getElementById('bouquetHint');

  const photos = [...document.querySelectorAll('.bouquet-photo')];
  const blooms = [...document.querySelectorAll('.bouquet-bloom')];
  const allImgs = [...screen.querySelectorAll('img')];

  let loadedCount = 0;
  const totalImgs = allImgs.length;

  const onAllLoaded = () => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'none';
      loader.remove();
    }
    screen.dataset.phase = 'flowers';
    revealBtn.disabled = false;
    hint.textContent = 'Chạm vào bó hoa';
    updateStarFocus();
  };

  const updateStarFocus = () => {
    if (!stage || !screen || !window.StarField) return;
    const m = stage.getBoundingClientRect();
    const M = screen.getBoundingClientRect();
    if (!M.width || !M.height) return;
    window.StarField.setFocus(
      (m.left + m.width * 0.5 - M.left) / M.width,
      (m.top + m.height * 0.44 - M.top) / M.height,
      Math.max(m.width * 0.62, M.width * 0.15) / M.width,
      m.height * 0.48 / M.height
    );
  };
  window.addEventListener('resize', updateStarFocus);
  setTimeout(updateStarFocus, 200);

  allImgs.forEach((img) => {
    if (img.complete && img.naturalWidth) {
      loadedCount++;
      if (loadedCount >= totalImgs) onAllLoaded();
    } else {
      img.addEventListener('load', () => {
        loadedCount++;
        if (loadedCount >= totalImgs) onAllLoaded();
      });
      img.addEventListener('error', () => {
        loadedCount++;
        if (loadedCount >= totalImgs) onAllLoaded();
      });
    }
  });

  setTimeout(() => {
    if (screen.dataset.phase === 'loading') onAllLoaded();
  }, 2500);

  // Chạm bó hoa để bung hoa & ảnh
  const onReveal = async () => {
    if (screen.dataset.phase !== 'flowers') return;
    playAudio();
    screen.dataset.phase = 'revealing';
    revealBtn.disabled = true;
    revealBtn.hidden = true;
    hint.textContent = '';

    const delays = [1280, 240, 540, 80, 760, 960];
    const animPromises = [];

    blooms.forEach((bloom, idx) => {
      const flower = BLOOM_FLOWERS[idx];
      const flip = flower.flip ? -1 : 1;
      const delay = delays[idx] || 0;

      const p = bloom.animate([
        { opacity: 1, transform: `rotate(${flower.rotate}deg) scaleX(${flip}) scale(1)`, filter: 'blur(0) brightness(1)' },
        { opacity: 0.9, transform: `rotate(${flower.rotate - 3}deg) scaleX(${flip}) scale(1.08)`, filter: 'blur(1px) brightness(1.2)', offset: 0.3 },
        { opacity: 0, transform: `rotate(${flower.rotate + 5}deg) scaleX(${flip}) scale(0.88)`, filter: 'blur(7px) brightness(1.35)' }
      ], {
        duration: 920,
        delay: delay,
        easing: 'cubic-bezier(.22,.75,.25,1)',
        fill: 'both'
      }).finished;
      animPromises.push(p);
    });

    const m = stage.getBoundingClientRect().width / 1000;

    photos.forEach((photo, idx) => {
      const slot = PORTRAIT_SLOTS[idx];
      const flower = BLOOM_FLOWERS[idx];
      const delay = (delays[idx] || 0) + 160;

      const n = flower.asset === 'rose-pink';
      const fx = flower.width * (n ? (flower.flip ? 0.37 : 0.63) : 0.5);
      const fy = flower.height * 0.58;
      const sw = flower.width * 0.5;
      const sh = flower.height * 0.78;
      const rad = flower.rotate * Math.PI / 180;
      const centerX = flower.x + sw + (fx - sw) * Math.cos(rad) - (fy - sh) * Math.sin(rad);
      const centerY = flower.y + sh + (fx - sw) * Math.sin(rad) + (fy - sh) * Math.cos(rad);

      const s = 0.66;
      const dx = (centerX - slot.x - slot.width * 0.5) * m;
      const dy = (centerY - slot.y - slot.height * (0.78 + s * (0.22 - 0.78))) * m;

      const p = photo.animate([
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`, filter: 'blur(9px) brightness(1.25)', offset: 0 },
        { opacity: 0.72, transform: `translate(${dx * 0.24}px, ${dy * 0.24}px) rotate(${slot.rotate}deg) scale(0.94)`, filter: 'blur(2px) brightness(1.12)', offset: 0.52 },
        { opacity: 1, transform: `rotate(${slot.rotate}deg) scale(1)`, filter: 'blur(0) brightness(1)', offset: 1 }
      ], {
        duration: 1260,
        delay: delay,
        easing: 'cubic-bezier(.22,.75,.25,1)',
        fill: 'both'
      }).finished;
      animPromises.push(p);
    });

    document.querySelectorAll('[data-kind="infill"]').forEach((infill) => {
      const p = infill.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: 950,
        delay: Number(infill.dataset.revealDelay) || 750,
        fill: 'both'
      }).finished;
      animPromises.push(p);
    });

    await Promise.all(animPromises);

    screen.dataset.phase = 'ready';
    bow.disabled = false;
    hint.textContent = 'Ấn giữ bó hoa';
  };

  _onRevealFn = onReveal;
  revealBtn.addEventListener('click', onReveal);
  stage.addEventListener('click', () => {
    if (screen.dataset.phase === 'flowers') onReveal();
  });

  // Ấn giữ mở quà (500ms)
  let holdStart = 0;
  let holdRaf = null;
  let isHolding = false;

  const setProgress = (val) => {
    const clamped = Math.max(0, Math.min(1, val));
    screen.style.setProperty('--hold-progress', String(clamped));
    if (window.StarField) {
      window.StarField.setProgress(clamped);
    }
  };

  const startHold = (e) => {
    if (screen.dataset.phase !== 'ready') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    isHolding = true;
    holdStart = performance.now();
    screen.classList.add('is-holding');
    hint.textContent = 'Ấn giữ bó hoa';

    cancelAnimationFrame(holdRaf);
    const tick = (now) => {
      if (!isHolding) return;
      const progress = (now - holdStart) / 500;
      setProgress(progress);
      if (progress >= 1) {
        completeHold();
      } else {
        holdRaf = requestAnimationFrame(tick);
      }
    };
    holdRaf = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (!isHolding) return;
    isHolding = false;
    cancelAnimationFrame(holdRaf);
    screen.classList.remove('is-holding');
    if (screen.dataset.phase === 'ready') {
      hint.textContent = 'Ấn giữ bó hoa';
    }
    const curVal = parseFloat(screen.style.getPropertyValue('--hold-progress')) || 0;
    const startReset = performance.now();
    const resetTick = (now) => {
      const p = Math.min(1, (now - startReset) / 280);
      setProgress(curVal * Math.pow(1 - p, 2));
      if (p < 1) requestAnimationFrame(resetTick);
      else setProgress(0);
    };
    requestAnimationFrame(resetTick);
  };

  const completeHold = () => {
    isHolding = false;
    cancelAnimationFrame(holdRaf);
    setProgress(1);
    screen.classList.remove('is-holding');
    screen.dataset.phase = 'opening';
    bow.disabled = true;
    hint.textContent = '';

    if (window.StarField) {
      window.StarField.setIntroActive(false);
    }

    playAudio();

    const lrCanvas = document.getElementById('lr-canvas');
    if (lrCanvas) lrCanvas.classList.add('can-interact');

    // Khởi chạy Cơn Mưa Tình Yêu 3D (Love Rain) từ id 38
    window.__LR_WANT_START = true;
    if (window.LoveRain) {
      window.LoveRain.start();
    }

    setTimeout(() => {
      screen.style.display = 'none';
      showTopbar();
      scheduleLetterBtn();
    }, 1450);
  };

  stage.addEventListener('pointerdown', startHold);
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);

  if (urlParams.get('autostart') === '1') {
    screen.style.display = 'none';
    const loader = document.getElementById('loader');
    if (loader) loader.remove();
    playAudio();
    if (window.StarField) {
      window.StarField.setIntroActive(false);
    }
    const lrCanvas = document.getElementById('lr-canvas');
    if (lrCanvas) lrCanvas.classList.add('can-interact');
    window.__LR_WANT_START = true;
    if (window.LoveRain) {
      window.LoveRain.start();
    }
    showTopbar();
    scheduleLetterBtn();
  }
}

// Topbar điều khiển
let _topbarBound = false;
let _letterScheduled = false;

function showTopbar() {
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = 'flex';

  if (!_topbarBound) {
    _topbarBound = true;
    const btnMusic = document.getElementById('btnMusic');
    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        if (isAudioPlaying) pauseAudio();
        else playAudio();
      });
    }
  }
}

function scheduleLetterBtn() {
  if (_letterScheduled) return;
  _letterScheduled = true;
  if (DATA.enableLetter !== false) {
    setTimeout(() => {
      const btnLetter = document.getElementById('btnLetter');
      if (btnLetter) {
        btnLetter.style.display = 'grid';
        btnLetter.addEventListener('click', openLetterModal);
      }
    }, 5000);
  }
}

// Khởi tạo phong thư & lá thư hoa
function initLetter() {
  const letter = DATA.letter || {};
  const envelope = letter.envelope || {};

  const topText = envelope.topLine || 'Dành tặng em';
  const headText = envelope.headline || '20/10';
  const bottomText = envelope.bottomLine || 'Một chút yêu thương';

  const topbarEnvTop = document.getElementById('topbarEnvTop');
  const topbarEnvHead = document.getElementById('topbarEnvHead');
  const topbarEnvBottom = document.getElementById('topbarEnvBottom');
  if (topbarEnvTop) topbarEnvTop.textContent = topText;
  if (topbarEnvHead) topbarEnvHead.textContent = headText;
  if (topbarEnvBottom) topbarEnvBottom.textContent = bottomText;

  const envModalTop = document.getElementById('envModalTop');
  const envModalHead = document.getElementById('envModalHead');
  const envModalBottom = document.getElementById('envModalBottom');
  if (envModalTop) envModalTop.textContent = topText;
  if (envModalHead) envModalHead.textContent = headText;
  if (envModalBottom) envModalBottom.textContent = bottomText;

  const greetingEl = document.getElementById('letterGreetingText');
  const paragraphsEl = document.getElementById('letterParagraphs');
  const sigEl = document.getElementById('letterSigText');
  const photoImg = document.getElementById('letterPhotoImg');

  const rawText = (letter.text || '').trim();
  const parts = rawText.split(/\n\s*\n/).filter(Boolean);

  if (parts.length > 0) {
    if (parts[0].startsWith('Gửi') || parts[0].length < 40) {
      if (greetingEl) greetingEl.textContent = parts[0];
      parts.shift();
    } else {
      if (greetingEl) greetingEl.textContent = 'Gửi em';
    }
  }

  if (paragraphsEl) {
    paragraphsEl.innerHTML = '';
    parts.forEach((p) => {
      const para = document.createElement('p');
      para.textContent = p;
      paragraphsEl.appendChild(para);
    });
  }

  const sig = letter.signature || '';
  if (sigEl) sigEl.textContent = sig;

  const photoSrc = letter.photo || (DATA.bouquetImages && DATA.bouquetImages[0]) || 'assets/letter-20-10/portrait.webp';
  if (photoImg) photoImg.src = photoSrc;

  const flMain = document.getElementById('flMain');
  const giftScene = document.getElementById('giftScene');
  const envelopeEl = document.getElementById('envelopeEl');
  const letterPaper = document.getElementById('letterPaper');

  function updateFit() {
    if (!flMain || !giftScene || !envelopeEl || !letterPaper) return;
    // Lay the letter out at a readable width, then scale it down to the frame,
    // otherwise narrow screens squeeze the fixed-height paper into a thin strip.
    const artwork = flMain.querySelector('.fl-artwork');
    const cw = flMain.clientWidth || window.innerWidth;
    const designW = Math.max(cw, 360);
    if (artwork) artwork.style.width = `${designW}px`;
    const fw = envelopeEl.offsetWidth || 380;
    const fh = envelopeEl.offsetHeight || 240;
    const j = Math.round(fh * 0.23 + 12);
    const ee = fh + Math.min(fw * 0.16, 94) + 48;
    const te = Math.max(letterPaper.offsetHeight + j + 54, fh * 1.75 + 54);
    const hn = Math.min(1, cw / designW, (flMain.clientHeight || window.innerHeight) / Math.max(te, ee + 40));

    giftScene.style.setProperty('--paper-bottom', `${j}px`);
    giftScene.style.setProperty('--closed-height', `${ee}px`);
    giftScene.style.setProperty('--open-height', `${te}px`);
    flMain.style.setProperty('--letter-scale', String(hn));

    // Reserve the photo's area so the letter text wraps around it instead of under it.
    const copyEl = letterPaper.querySelector('.letter-copy');
    const photoEl = letterPaper.querySelector('.letter-photo');
    if (copyEl && photoEl) {
      const top = Math.max(0, photoEl.offsetTop - copyEl.offsetTop + 12);
      const width = Math.max(0, copyEl.offsetLeft + copyEl.offsetWidth - photoEl.offsetLeft - 6);
      letterPaper.style.setProperty('--copy-photo-top', `${top}px`);
      letterPaper.style.setProperty('--copy-photo-width', `${width}px`);
      letterPaper.style.setProperty('--copy-wrap-lines', String(Math.ceil((top + photoEl.offsetHeight) / 80)));
    }
    flMain.classList.add('is-fitted');
  }

  const envHit = document.getElementById('envelopeHit');
  const hintEl = document.querySelector('#giftControls .scene-hint');

  if (envHit && giftScene) {
    envHit.addEventListener('click', () => {
      if (giftScene.dataset.state !== 'closed') return;
      giftScene.dataset.state = 'opening';
      if (hintEl) hintEl.style.display = 'none';

      setTimeout(() => {
        giftScene.classList.add('flap-is-back');
        giftScene.dataset.state = 'open';
        updateFit();
      }, 400);
    });
  }

  const photoBtn = document.getElementById('letterPhotoBtn');
  if (photoBtn && giftScene) {
    photoBtn.addEventListener('click', () => {
      const isFocused = giftScene.dataset.focus === 'photo';
      giftScene.dataset.focus = isFocused ? 'letter' : 'photo';
      photoBtn.setAttribute('aria-pressed', !isFocused);
    });
  }

  const modal = document.getElementById('letterModal');
  const closeBtn = document.getElementById('btnLetterClose');
  if (modal && closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('fl-leaving');
      setTimeout(() => {
        modal.close();
        modal.classList.remove('fl-leaving');
      }, 420);
    });

    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) {
        modal.classList.add('fl-leaving');
        setTimeout(() => {
          modal.close();
          modal.classList.remove('fl-leaving');
        }, 420);
      }
    });
  }

  window.addEventListener('resize', updateFit);

  if (urlParams.get('letter') === '1') {
    const screen = document.getElementById('bouquetScreen');
    if (screen) screen.style.display = 'none';
    const loader = document.getElementById('loader');
    if (loader) loader.remove();
    window.__LR_WANT_START = true;
    if (window.LoveRain) {
      window.LoveRain.start();
    }
    showTopbar();
    setTimeout(() => {
      openLetterModal();
      updateFit();
      const envHit = document.getElementById('envelopeHit');
      if (envHit) envHit.click();
    }, 400);
  }
}

function openLetterModal() {
  const modal = document.getElementById('letterModal');
  if (!modal) return;
  modal.showModal();
  const flMain = document.getElementById('flMain');
  if (flMain) {
    flMain.classList.add('is-fitted');
  }
}
window.openLetterModal = openLetterModal;

// ==========================================
// Đồng bộ xem thử trực tiếp từ Builder
// ==========================================
function applyLivePreviewUpdate(payload) {
  if (!payload) return;
  _pendingLivePreview = payload;
  const screen = document.getElementById('bouquetScreen');
  const photos = payload.photos;

  if (Array.isArray(photos) && photos.length > 0) {
    const photoElems = document.querySelectorAll('#bouquetPhotoLayer .bouquet-photo img');
    photoElems.forEach((img, idx) => {
      img.src = photos[idx % photos.length];
    });

    const letterImg = document.getElementById('letterPhotoImg');
    if (letterImg) {
      letterImg.src = photos[0];
    }

    if (window.LR_CONFIG) {
      window.LR_CONFIG.photos = photos;
    }

    // Nếu bó hoa chưa bung hoa, tự động bung ngay để người dùng thấy ảnh
    if (screen && screen.dataset.phase === 'flowers' && typeof _onRevealFn === 'function') {
      _onRevealFn();
    }
  }

  // Chuyển đổi giữa chế độ Cắt Tách Nền (cutout) và Khung Ảnh Polaroid (card) cho từng ảnh
  if (Array.isArray(payload.cutouts) && payload.cutouts.length > 0) {
    const photoWraps = document.querySelectorAll('#bouquetPhotoLayer .bouquet-photo');
    photoWraps.forEach((wrap, idx) => {
      const isCutout = payload.cutouts[idx % payload.cutouts.length] === true;
      const slot = PORTRAIT_SLOTS[idx];
      if (isCutout) {
        wrap.classList.add('is-cutout');
        wrap.classList.remove('is-card');
        if (slot) wrap.style.clipPath = clipPolygon(slot);
      } else {
        wrap.classList.remove('is-cutout');
        wrap.classList.add('is-card');
        wrap.style.clipPath = 'none';
      }
    });
  } else if (payload.photo_style !== undefined) {
    const isCutout = payload.photo_style !== 'card';
    const photoWraps = document.querySelectorAll('#bouquetPhotoLayer .bouquet-photo');
    photoWraps.forEach((wrap, idx) => {
      const slot = PORTRAIT_SLOTS[idx];
      if (isCutout) {
        wrap.classList.add('is-cutout');
        wrap.classList.remove('is-card');
        if (slot) wrap.style.clipPath = clipPolygon(slot);
      } else {
        wrap.classList.remove('is-cutout');
        wrap.classList.add('is-card');
        wrap.style.clipPath = 'none';
      }
    });
  }

  // Cập nhật lời nhắn
  if (typeof payload.message === 'string') {
    const rawText = payload.message.trim();
    if (rawText) {
      const parts = rawText.split(/\n\s*\n/).filter(Boolean);
      const greetingEl = document.getElementById('letterGreetingText');
      const paragraphsEl = document.getElementById('letterParagraphs');
      if (parts.length > 0) {
        if (parts[0].startsWith('Gửi') || parts[0].length < 40) {
          if (greetingEl) greetingEl.textContent = parts[0];
          parts.shift();
        } else if (payload.recipient_name) {
          if (greetingEl) greetingEl.textContent = 'Gửi ' + payload.recipient_name;
        }
      }
      if (paragraphsEl) {
        paragraphsEl.innerHTML = '';
        parts.forEach((p) => {
          const para = document.createElement('p');
          para.textContent = p;
          paragraphsEl.appendChild(para);
        });
      }
      if (window.LR_CONFIG) {
        window.LR_CONFIG.texts = rawText.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  // Cập nhật ảnh lá thư nếu có ảnh tùy chỉnh
  if (payload.letter_photo) {
    const letterImg = document.getElementById('letterPhotoImg');
    if (letterImg) {
      letterImg.src = payload.letter_photo;
    }
  }

  // Cập nhật nội dung phong thư
  if (payload.envelope_top !== undefined) {
    const el = document.getElementById('envModalTop');
    if (el) el.textContent = payload.envelope_top;
  }
  if (payload.envelope_headline !== undefined && payload.envelope_headline !== '') {
    const el = document.getElementById('envModalHead');
    const topEl = document.getElementById('topbarEnvHead');
    if (el) el.textContent = payload.envelope_headline;
    if (topEl) topEl.textContent = payload.envelope_headline;
  } else if (payload.recipient_name) {
    const topbarEnvHead = document.getElementById('topbarEnvHead');
    const envModalHead = document.getElementById('envModalHead');
    if (topbarEnvHead) topbarEnvHead.textContent = payload.recipient_name;
    if (envModalHead) envModalHead.textContent = payload.recipient_name;
  }
  if (payload.envelope_bottom !== undefined) {
    const el = document.getElementById('envModalBottom');
    if (el) el.textContent = payload.envelope_bottom;
  }

  // Cập nhật người gửi
  if (payload.sender_name) {
    const sigEl = document.getElementById('letterSigText');
    if (sigEl) sigEl.textContent = payload.sender_name;
  }

  // Cập nhật âm nhạc
  if (payload.music_url && bgm && bgm.src !== payload.music_url) {
    bgm.src = payload.music_url;
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin && window.location.origin !== 'null') return;
  if (!event.data || event.data.type !== 'DG_LIVE_PREVIEW_UPDATE') return;
  applyLivePreviewUpdate(event.data.payload);
});

document.addEventListener('DOMContentLoaded', () => {
  buildBouquetLayers();
  initBouquet();
  initLetter();
  if (window.parent && window.parent !== window) {
    setTimeout(() => {
      window.parent.postMessage({ type: 'DG_PREVIEW_READY' }, window.location.origin);
    }, 150);
  }
});
