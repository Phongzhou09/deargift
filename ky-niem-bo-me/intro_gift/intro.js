const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stars = [];
const explosions = [];
const shootingStars = [];
// fullText có thể được thay đổi bởi load-valentine-data.js
let fullText = ["Gửi Bố Mẹ"];
// Expose để load-valentine-data.js có thể thay đổi
if (typeof window !== 'undefined') {
    window.fullText = fullText;
}
const fontFamily = "Arial";

function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && vv.width && vv.height) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function isPortraitNarrowViewport() {
  const v = getViewportSize();
  return v.height > v.width && v.width <= 1024;
}

function isMobileLandscapeViewport() {
  const v = getViewportSize();
  return v.width <= 1024 && v.height < v.width;
}

function getIntroMaxTextWidth() {
  const w = canvas && canvas.width > 0 ? canvas.width : getViewportSize().width;
  if (isPortraitNarrowViewport()) {
    return w * 0.94;
  }
  return w * 0.86;
}

/** Trần cỡ chữ trước khi co để vừa khung (mỗi dòng = 1 phần tử fullText) */
function getIntroFontSizeCeiling() {
  const v = getViewportSize();
  const w = canvas && canvas.width > 0 ? canvas.width : v.width;
  if (isPortraitNarrowViewport()) {
    return Math.min(68, Math.round(w * 0.15));
  }
  if (isMobileLandscapeViewport()) {
    return 64;
  }
  return 100;
}

function getIntroFontSizeFallback() {
  const v = getViewportSize();
  const w = v.width || 360;
  if (isPortraitNarrowViewport()) {
    return Math.min(68, Math.round(w * 0.15));
  }
  if (isMobileLandscapeViewport()) {
    return 64;
  }
  return 100;
}

function getGraphemes(str) {
  try {
    if (window.Intl && Intl.Segmenter) {
      const seg = new Intl.Segmenter('vi', { granularity: 'grapheme' });
      return Array.from(seg.segment(String(str || '')), s => s.segment);
    }
  } catch (e) {}
  return Array.from(String(str || ''));
}

function greedyWrapWordsWithCtx(tempCtx, words, maxWidth) {
  const out = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? (line + ' ' + words[i]) : words[i];
    if (tempCtx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) out.push(line);
      line = words[i];
    }
  }
  if (line) out.push(line);
  return out;
}

/** Portrait: thử cắt 2 dòng, ưu tiên >=3 từ trên dòng đầu khi câu dài */
function findPreferredTwoLineWrap(tempCtx, words, maxWidth) {
  if (words.length < 2) return null;

  const preferredSplits = [];
  if (words.length >= 5) {
    preferredSplits.push(3, 4, 2);
  } else if (words.length >= 4) {
    preferredSplits.push(2, 3);
  } else {
    preferredSplits.push(1);
  }

  function trySplit(splitAt) {
    if (splitAt < 1 || splitAt >= words.length) return null;
    const line1 = words.slice(0, splitAt).join(' ');
    const line2 = words.slice(splitAt).join(' ');
    if (
      tempCtx.measureText(line1).width <= maxWidth &&
      tempCtx.measureText(line2).width <= maxWidth
    ) {
      return [line1, line2];
    }
    return null;
  }

  for (let i = 0; i < preferredSplits.length; i++) {
    const hit = trySplit(preferredSplits[i]);
    if (hit) return hit;
  }

  for (let splitAt = words.length - 1; splitAt >= 1; splitAt--) {
    if (preferredSplits.indexOf(splitAt) !== -1) continue;
    const hit = trySplit(splitAt);
    if (hit) return hit;
  }

  return null;
}

function portraitSegmentWrapIsAcceptable(tempCtx, segment, maxWidth) {
  const words = String(segment || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;

  const lines = wrapTextPortraitBalanced(tempCtx, segment, maxWidth);
  if (lines.length > 2) return false;
  if (lines.length === 2 && words.length >= 5) {
    const firstCount = lines[0].split(/\s+/).filter(Boolean).length;
    if (firstCount <= 2) return false;
  }
  return true;
}

/** Portrait: sau greedy wrap, gom từ dòng sau lên dòng đầu để tránh cắt quá sớm (vd. "Chúc em" → "Chúc em một") */
function refinePortraitWordWrap(tempCtx, lines, maxWidth) {
  lines = lines.map(function (l) { return String(l || '').trim(); }).filter(Boolean);
  if (lines.length < 2) return lines;

  const totalWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 0; i < lines.length - 1; i++) {
      const leftWords = lines[i].split(/\s+/).filter(Boolean);
      const rightWords = lines[i + 1].split(/\s+/).filter(Boolean);
      if (rightWords.length === 0) continue;

      const shortFirstLine = leftWords.length <= 2 && totalWords >= 4;
      if (!shortFirstLine) continue;

      const candidate = lines[i] + ' ' + rightWords[0];
      if (tempCtx.measureText(candidate).width <= maxWidth) {
        rightWords.shift();
        lines[i] = candidate;
        lines[i + 1] = rightWords.join(' ');
        if (!lines[i + 1]) lines.splice(i + 1, 1);
        changed = true;
        break;
      }
    }

    if (changed) continue;

    for (let i = 0; i < lines.length - 1; i++) {
      const candidate = lines[i] + ' ' + lines[i + 1];
      if (tempCtx.measureText(candidate).width <= maxWidth) {
        lines[i] = candidate;
        lines.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  return lines;
}

function wrapTextPortraitBalanced(tempCtx, text, maxWidth) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (tempCtx.measureText(s).width <= maxWidth) return [s];

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [s];

  if (words.length >= 4) {
    const twoLine = findPreferredTwoLineWrap(tempCtx, words, maxWidth);
    if (twoLine) return twoLine;
  }

  const greedy = greedyWrapWordsWithCtx(tempCtx, words, maxWidth);
  const stillTooLong = greedy.some(function (l) { return tempCtx.measureText(l).width > maxWidth; });
  if (stillTooLong) return greedy;

  return refinePortraitWordWrap(tempCtx, greedy, maxWidth);
}

function wrapTextToWidthWithCtx(tempCtx, text, maxWidth) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (tempCtx.measureText(s).width <= maxWidth) return [s];

  const hasSpaces = /\s/.test(s);
  if (hasSpaces) {
    const words = s.split(/\s+/).filter(Boolean);
    const out = greedyWrapWordsWithCtx(tempCtx, words, maxWidth);
    const stillTooLong = out.some(function(l) { return tempCtx.measureText(l).width > maxWidth; });
    if (!stillTooLong) return out;
  }

  const chars = getGraphemes(s);
  const out = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const next = line + chars[i];
    if (tempCtx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      out.push(line);
      line = chars[i];
    }
  }
  if (line) out.push(line);
  return out;
}

function getIntroTextParts() {
  const parts = (Array.isArray(fullText) ? fullText : [])
    .map(function (s) {
      return String(s || '').trim();
    })
    .filter(Boolean);
  if (parts.length === 0) {
    parts.push('Gửi Bố Mẹ');
  }
  return parts;
}

/** Portrait: luôn wrap theo từ từng segment; desktop: 1 dòng/segment nếu vừa, không thì wrap */
function buildIntroLinesForParts(tempCtx, parts, maxTextWidth, portraitWordWrap) {
  const lines = [];
  parts.forEach(function (segment) {
    if (portraitWordWrap) {
      wrapTextPortraitBalanced(tempCtx, segment, maxTextWidth).forEach(function (w) {
        lines.push(w);
      });
      return;
    }
    if (tempCtx.measureText(segment).width <= maxTextWidth) {
      lines.push(segment);
    } else {
      wrapTextToWidthWithCtx(tempCtx, segment, maxTextWidth).forEach(function (w) {
        lines.push(w);
      });
    }
  });
  return lines;
}

function estimateIntroBlockHeight(lineCount, fs, lh) {
  if (lineCount <= 0) return 0;
  return (lineCount - 1) * lh + fs;
}

/**
 * Desktop: co chữ để mỗi segment vừa 1 hàng.
 * Portrait: giữ chữ to, wrap theo từ xuống dòng; chỉ co khi block quá cao.
 */
function computeIntroFontSizeForCanvas() {
  const maxW = getIntroMaxTextWidth();
  if (maxW <= 0) {
    return getIntroFontSizeFallback();
  }

  const parts = getIntroTextParts();
  const tCtx = document.createElement('canvas').getContext('2d');
  let maxCandidate = getIntroFontSizeCeiling();

  if (isPortraitNarrowViewport()) {
    const minFont = 32;
    const maxBlockH = canvas.height * 0.48;

    for (let fs = maxCandidate; fs >= minFont; fs--) {
      tCtx.font = 'bold ' + fs + 'px ' + fontFamily;
      const lh = fs * 1.2;
      const lines = buildIntroLinesForParts(tCtx, parts, maxW, true);
      const blockH = estimateIntroBlockHeight(lines.length, fs, lh);
      if (blockH > maxBlockH) continue;

      var widthOk = true;
      for (var i = 0; i < lines.length; i++) {
        if (tCtx.measureText(lines[i]).width > maxW) {
          widthOk = false;
          break;
        }
      }
      if (!widthOk) continue;

      var wrapOk = true;
      for (var j = 0; j < parts.length; j++) {
        if (!portraitSegmentWrapIsAcceptable(tCtx, parts[j], maxW)) {
          wrapOk = false;
          break;
        }
      }
      if (wrapOk) return fs;
    }
    return minFont;
  }

  const minFont = 24;
  for (let fs = maxCandidate; fs >= minFont; fs--) {
    tCtx.font = 'bold ' + fs + 'px ' + fontFamily;
    var ok = true;
    for (var j = 0; j < parts.length; j++) {
      if (tCtx.measureText(parts[j]).width > maxW) {
        ok = false;
        break;
      }
    }
    if (ok) return fs;
  }
  return minFont;
}

function getIntroLineHeight(fs) {
  if (isPortraitNarrowViewport()) {
    return fs * 1.2;
  }
  if (isMobileLandscapeViewport()) {
    return fs * 1.4;
  }
  return fs * 1.2;
}

function getResponsiveDotSpacing() {
  if (isPortraitNarrowViewport()) {
    return Math.min(5, Math.max(3, Math.round(fontSize * 0.036)));
  }
  if (isMobileLandscapeViewport()) {
    return 5;
  }
  return 4;
}

function getResponsiveShootInterval() {
  if (isPortraitNarrowViewport()) {
    return 26;
  }
  if (isMobileLandscapeViewport()) {
    return 32;
  }
  return 22;
}

function getFlyingHeartDrawSize() {
  if (isPortraitNarrowViewport()) {
    return 10;
  }
  if (isMobileLandscapeViewport()) {
    return 12;
  }
  return 14;
}

let fontSize = getIntroFontSizeFallback();
let lineHeight = getIntroLineHeight(fontSize);
let bearX = 70;
let bearY = canvas.height - 80;
let dots = [];
let targetDotsQueue = [];
let currentCharIndex = 0;
let animationDone = false;
let introFinishedOnce = false;
let bookMode = false;
let shootIntervalId = null;
let rafId = null;
var buttonShowFallbackTimer = null; // Hiện nút tối đa sau vài giây nếu dot chưa "ổn định"

function showOpenBookButton() {
  if (buttonShowFallbackTimer) {
    clearTimeout(buttonShowFallbackTimer);
    buttonShowFallbackTimer = null;
  }
  var btn = document.getElementById('openBookBtn');
  if (!btn) return;
  btn.style.display = 'flex';
  btn.style.opacity = '0';
  requestAnimationFrame(function() {
    btn.style.transition = 'opacity 0.5s ease';
    btn.style.opacity = '1';
  });
  btn.onclick = function() {
    enterBookMode();
  };
  btn.ontouchend = function(e) {
    e.preventDefault();
    enterBookMode();
  };
}

function enterBookMode() {
  if (bookMode) return;
  bookMode = true;
  var openBookBtn = document.getElementById('openBookBtn');
  if (openBookBtn) {
    openBookBtn.style.opacity = '0';
    openBookBtn.style.pointerEvents = 'none';
  }
  document.body.classList.add('book-mode');

  // Dừng các loop animation để "xóa" hiệu ứng tim-ghép-chữ (CPU nhẹ hơn)
  if (shootIntervalId) {
    clearInterval(shootIntervalId);
    shootIntervalId = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Ẩn canvas luôn (nền intro vẫn giữ video + png)
  if (canvas) canvas.style.display = 'none';

  // Hiện cuốn sách
  const secondScreen = document.getElementById('secondScreen');
  const bookContent = document.querySelector('.book-content');
  if (secondScreen) {
    secondScreen.classList.add('is-visible');
    secondScreen.setAttribute('aria-hidden', 'false');
  }
  // Cho bìa vẽ xong rồi mới hiện các tờ bên trong, tránh chớp trang chữ/ảnh
  if (bookContent) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        bookContent.classList.add('ready');
      });
    });
  }

  // Khởi tạo page indicator (0 lần lật - chỉ mở bìa, chưa hiện indicator)
  setTimeout(function(){
    if (typeof updatePageIndicator === 'function') {
      updatePageIndicator(0);
    }
  }, 600);
}

// Load heart image with cache busting
const heartImage = new Image();
let heartImageLoaded = false;
const heartImagePath = "./assets/images/intro/heart_intro.png";
const heartCacheBuster = "?v=" + new Date().getTime();
heartImage.src = heartImagePath + heartCacheBuster;

heartImage.onload = function() {
  heartImageLoaded = true;
  // Show content after heart image is loaded
  showContent();
};

heartImage.onerror = function() {
  console.error('Failed to load heart image');
  // Still allow animation to proceed with emoji fallback
  heartImageLoaded = true;
  showContent();
};

function showContent() {
  const canvas = document.getElementById('canvas');
  const bear = document.getElementById('bear');
  const leftCupid = document.getElementById('leftCupid');
  const rightCupid = document.getElementById('rightCupid');
  const doubleHeart = document.getElementById('doubleHeart');
  const leftBottom = document.getElementById('leftBottom');
  const rightBottom = document.getElementById('rightBottom');
  
  if (canvas) canvas.classList.add('loaded');
  if (bear) bear.classList.add('loaded');
  if (leftCupid) leftCupid.classList.add('loaded');
  if (rightCupid) rightCupid.classList.add('loaded');
  if (doubleHeart) doubleHeart.classList.add('loaded');
  if (leftBottom) leftBottom.classList.add('loaded');
  if (rightBottom) rightBottom.classList.add('loaded');
}

var readyOverlayDismissed = false;

function dismissReadyOverlay() {
  if (readyOverlayDismissed) return;
  readyOverlayDismissed = true;
  var overlay = document.getElementById("readyToStartOverlay");
  if (overlay) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.4s ease";
    setTimeout(function() {
      overlay.style.display = "none";
    }, 400);
  }
  // Phát nhạc khi user đã tương tác (tránh browser chặn autoplay)
  window.userHasClickedReady = true;
  if (window.backgroundMusic) {
    window.backgroundMusic.play().catch(function(err) {
      console.warn("[Ready] Không thể phát nhạc:", err);
    });
  }
  // Reset intro và bắt đầu hiệu ứng bắn tim từ đầu
  resetIntro();
  startAnimation();
}

function checkOrientation() {
  // Khi đã vào book mode thì không hiện rotate notice/ready overlay nữa
  if (bookMode) return;

  const notice = document.getElementById("rotateNotice");
  const readyOverlay = document.getElementById("readyToStartOverlay");
  const video = document.getElementById("backgroundVideo");
  const leftCupid = document.getElementById("leftCupid");
  const rightCupid = document.getElementById("rightCupid");
  const doubleHeart = document.getElementById("doubleHeart");
  const leftBottom = document.getElementById("leftBottom");
  const rightBottom = document.getElementById("rightBottom");

  /* Tắt: bắt xoay ngang mới hiển thị intro (mobile dọc chỉ thấy rotate notice)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isPortrait = window.innerHeight > window.innerWidth;
  if (isMobile && isPortrait) {
    notice.style.display = "block";
    if (readyOverlay) readyOverlay.style.display = "none";
    canvas.style.display = "none";
    document.getElementById("bear").style.display = "none";
    if (video) video.style.display = "none";
    if (leftCupid) leftCupid.style.display = "none";
    if (rightCupid) rightCupid.style.display = "none";
    if (doubleHeart) doubleHeart.style.display = "none";
    if (leftBottom) leftBottom.style.display = "none";
    if (rightBottom) rightBottom.style.display = "none";
    return;
  }
  */

  notice.style.display = "none";
  canvas.style.display = "block";
  document.getElementById("bear").style.display = "block";
  if (video) video.style.display = "block";
  if (leftCupid) leftCupid.style.display = "block";
  if (rightCupid) rightCupid.style.display = "block";
  if (doubleHeart) doubleHeart.style.display = "block";
  if (leftBottom) leftBottom.style.display = "block";
  if (rightBottom) rightBottom.style.display = "block";
  // Hiện overlay Sẵn sàng (trừ khi user đã bấm rồi)
  if (readyOverlay && !readyOverlayDismissed) {
    readyOverlay.style.display = "flex";
    readyOverlay.style.opacity = "1";
  }
}

function resizeCanvas() {
  const viewport = getViewportSize();
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  if (isPortraitNarrowViewport()) {
    bearX = Math.round(canvas.width / 2);
    bearY = canvas.height - 54;
  } else {
    bearX = Math.round(canvas.width / 2);
    bearY = canvas.height - 80;
  }

  // Stars removed - using simple pink background
  checkOrientation();

  fontSize = computeIntroFontSizeForCanvas();
  lineHeight = getIntroLineHeight(fontSize);

  targetDotsQueue = [];
  currentCharIndex = 0;
  animationDone = false;
  // Trang nằm trong khung ẩn/tab nền có thể có kích thước 0 lúc tải;
  // getImageData sẽ ném lỗi. Sự kiện resize sẽ tạo lại khi có kích thước thật.
  if (canvas.width > 0 && canvas.height > 0) generateAllTargetDots();
}

function resetIntro() {
  if (bookMode) return;
  if (buttonShowFallbackTimer) {
    clearTimeout(buttonShowFallbackTimer);
    buttonShowFallbackTimer = null;
  }
  animationDone = false;
  dots = [];
  explosions.length = 0;
  introFinishedOnce = false;
  var openBookBtn = document.getElementById('openBookBtn');
  if (openBookBtn) {
    openBookBtn.style.display = 'none';
    openBookBtn.style.opacity = '0';
  }
  var bear = document.getElementById('bear');
  if (bear) {
    bear.src = "./assets/images/intro/shooting_heart.gif";
    delete bear.dataset.changed;
  }
  // Không gọi scheduleBearChange() ở đây nữa
  resizeCanvas();
}

var resizeDebounceTimer = null;
function onResizeOrOrientation() {
  if (bookMode) return;
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(function() {
    resetIntro();
  }, 150);
}

resizeCanvas();
window.addEventListener('resize', onResizeOrOrientation);
window.addEventListener('orientationchange', onResizeOrOrientation);

// Setup nút Sẵn sàng (tránh browser chặn nhạc autoplay)
(function setupReadyButton() {
  var btn = document.getElementById("readyToStartBtn");
  if (btn) {
    btn.onclick = function() { dismissReadyOverlay(); };
    btn.ontouchend = function(e) { e.preventDefault(); dismissReadyOverlay(); };
  }
})();

function createExplosion(x, y) {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    explosions.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60,
      opacity: 1
    });
  }
}

function drawStars() {
  for (let star of stars) {
    star.alpha += star.delta;
    if (star.alpha >= 1 || star.alpha <= 0) {
      star.delta = -star.delta;
    }

    ctx.save();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffe2a8";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createShootingStar() {
  const startX = Math.random() * canvas.width;
  const startY = Math.random() * canvas.height / 2;
  shootingStars.push({
    x: startX,
    y: startY,
    length: Math.random() * 300 + 100,
    speed: Math.random() * 10 + 6,
    angle: Math.PI / 4,
    opacity: 1
  });
}

function drawShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    const endX = s.x - Math.cos(s.angle) * s.length;
    const endY = s.y - Math.sin(s.angle) * s.length;

    const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
    gradient.addColorStop(0, `rgba(255, 226, 168, ${s.opacity})`);
    gradient.addColorStop(1, `rgba(255, 226, 168, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.opacity -= 0.01;

    if (s.opacity <= 0) {
      shootingStars.splice(i, 1);
    }
  }
}

function generateCharDots(char, x, y) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.font = `bold ${fontSize}px ${fontFamily}`;
  tempCtx.fillStyle = "#ff69b4";
  tempCtx.textAlign = "left";
  tempCtx.fillText(char, x, y);

  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  const charDots = [];

  const dotSpacing = getResponsiveDotSpacing();
  for (let y = 0; y < canvas.height; y += dotSpacing) {
    for (let x = 0; x < canvas.width; x += dotSpacing) {
      const index = (y * canvas.width + x) * 4;
      if (imageData[index + 3] > 128) {
        charDots.push({ x, y });
      }
    }
  }

  return charDots;
}

function generateAllTargetDots() {
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = `bold ${fontSize}px ${fontFamily}`;

  const maxTextWidth = getIntroMaxTextWidth();
  const parts = getIntroTextParts();
  const lines = buildIntroLinesForParts(
    tempCtx,
    parts,
    maxTextWidth,
    isPortraitNarrowViewport()
  );
  
  // Calculate total height of text container (from baseline of first line to baseline of last line)
  const totalTextHeight = (lines.length - 1) * lineHeight;
  // Center the entire text container vertically, then push down a bit
  // Baseline of first line = center of canvas - half of total text height + offset
  const verticalOffset = 10; // Push text down by 10px
  const startY = canvas.height / 2 - totalTextHeight / 2 + verticalOffset;

  lines.forEach((line, lineIndex) => {
    const lineWidth = tempCtx.measureText(line).width;
    let xCursor = (canvas.width - lineWidth) / 2;
    const y = startY + lineIndex * lineHeight;

    for (let char of line) {
      if (char === " ") {
        xCursor += tempCtx.measureText(" ").width;
        targetDotsQueue.push([]);
        continue;
      }

      const charDots = generateCharDots(char, xCursor, y);
      targetDotsQueue.push(charDots);
      xCursor += tempCtx.measureText(char).width;
    }
  });
}

function shootDot() {
  if (animationDone) return;

  while (
    currentCharIndex < targetDotsQueue.length &&
    targetDotsQueue[currentCharIndex].length === 0
  ) {
    currentCharIndex++;
  }

  const targetDots = targetDotsQueue[currentCharIndex];
  if (!targetDots || targetDots.length === 0) return;

  const batch = 10;
  var spawnJitterX = isPortraitNarrowViewport() ? 14 : 20;
  var spawnOffX = isPortraitNarrowViewport() ? 28 : 40;
  for (let i = 0; i < batch; i++) {
    const target = targetDots.shift();
    if (!target) return;
    // Đốm sáng bay lên nhẹ nhàng từ giữa đáy màn hình (không còn "bắn tim").
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
    const speed = 7 + Math.random() * 3;
    dots.push({
      x: bearX + (Math.random() - 0.5) * spawnJitterX * 4,
      y: bearY - 18 + Math.random() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetX: target.x,
      targetY: target.y
    });
  }

  if (targetDots.length === 0 && currentCharIndex < targetDotsQueue.length - 1) {
    currentCharIndex++;
  }
  
}

function animate() {
  if (bookMode) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dots.forEach(dot => {
    const dx = dot.targetX - dot.x;
    const dy = dot.targetY - dot.y;
    dot.vx += dx * 0.005; // Tăng lực hướng tâm để kéo về nhanh hơn
    dot.vy += dy * 0.005;
    dot.vx *= 0.92; // Tăng damping để giảm tốc độ nhanh hơn
    dot.vy *= 0.88;
    dot.x += dot.vx;
    dot.y += dot.vy;

    // Đốm sáng ấm (như ánh nến / đom đóm) thay cho trái tim bay.
    const r = getFlyingHeartDrawSize() * 0.42;
    const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, r);
    glow.addColorStop(0, "rgba(255, 244, 214, 1)");
    glow.addColorStop(0.3, "rgba(214, 120, 52, 0.95)");
    glow.addColorStop(1, "rgba(170, 82, 30, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
    p.opacity -= 0.015;

    ctx.globalAlpha = Math.max(p.opacity, 0);
    ctx.fillStyle = "#ffd08a";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.life <= 0 || p.opacity <= 0) {
      explosions.splice(i, 1);
    }
  }

  if (!animationDone && currentCharIndex >= targetDotsQueue.length) {
    var allSettled = dots.every(function (dot) {
      return Math.abs(dot.targetX - dot.x) < 18 && Math.abs(dot.targetY - dot.y) < 18;
    });
    if (allSettled) {
      animationDone = true;
      if (buttonShowFallbackTimer) {
        clearTimeout(buttonShowFallbackTimer);
        buttonShowFallbackTimer = null;
      }
      if (!introFinishedOnce) {
        introFinishedOnce = true;
        showOpenBookButton();
      }
    } else if (!buttonShowFallbackTimer) {
      // Fallback: hiện nút sau tối đa 2.5s kể từ lúc bắn hết chữ, không cần đợi dot dừng hẳn
      buttonShowFallbackTimer = setTimeout(function () {
        buttonShowFallbackTimer = null;
        if (animationDone || introFinishedOnce) return;
        animationDone = true;
        introFinishedOnce = true;
        showOpenBookButton();
      }, 2500);
    }
  }

  rafId = requestAnimationFrame(animate);
}

canvas.addEventListener("click", (e) => {
  createExplosion(e.clientX, e.clientY);
});
canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  if (touch) {
    createExplosion(touch.clientX, touch.clientY);
  }
});

// Wait for heart image to load AND overlay dismissed before starting animation
function startAnimation() {
  if (!heartImageLoaded && !heartImage.complete) {
    setTimeout(startAnimation, 50);
    return;
  }
  // Chỉ chạy khi user đã ấn Sẵn sàng (tránh chạy khi overlay đang hiển thị)
  if (!readyOverlayDismissed) {
    return;
  }
  if (shootIntervalId) return; // Đã chạy rồi
  
  // Chỉ bắt đầu timer thay đổi bear khi animation thực sự bắt đầu
  scheduleBearChange();
  shootIntervalId = setInterval(shootDot, getResponsiveShootInterval());
  animate();
}

// Start animation after heart image is loaded
startAnimation();

// Setup background video with cache busting
const backgroundVideo = document.getElementById("backgroundVideo");
const videoSource = document.getElementById("videoSource");
if (backgroundVideo && videoSource) {
  // Add cache busting parameter to force reload new video
  const videoPath = "";
  const cacheBuster = "?v=" + new Date().getTime();
  if (videoPath) videoSource.src = videoPath + cacheBuster;
  
  // Force reload video
  if (videoPath) backgroundVideo.load();
  
  backgroundVideo.addEventListener('loadeddata', () => {
    backgroundVideo.play().catch(err => {
      console.warn('Video autoplay prevented:', err);
    });
  });
  backgroundVideo.addEventListener('error', (e) => {
    console.error('Video loading error:', e);
  });

  // Chặn context menu (right-click)
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // Chặn long press (touch hold)
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_DURATION = 500; // 500ms
  const MOVE_THRESHOLD = 10; // 10px

  document.addEventListener('touchstart', function(e) {
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    // Reset nếu di chuyển quá nhiều
    if (touchStartTime > 0) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        touchStartTime = 0;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (touchStartTime > 0) {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration >= LONG_PRESS_DURATION) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      touchStartTime = 0;
    }
  });

  // Chặn text selection bằng cách chặn các event liên quan
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });

  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });
}

// Change bear image after shooting animation (estimate ~7s for shooting all hearts)
var bearChangeTimer = null;
function scheduleBearChange() {
  if (bearChangeTimer) clearTimeout(bearChangeTimer);
  bearChangeTimer = setTimeout(function() {
    bearChangeTimer = null;
    var bear = document.getElementById("bear");
    if (bear && !bear.dataset.changed) {
      bear.src = "./assets/images/intro/after_shooting.gif";
      bear.dataset.changed = "true";
    }
  }, 7000);  // 7000ms = 7 giây
}
