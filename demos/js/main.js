const body = document.body;
const BOOK_IMAGE_SLOTS = Object.freeze([
  {
    url: "./assets/logo/happyBirthday.jpg",
    alt: "Ảnh album 1"
  },
  {
    url: "./assets/cover/bia_truoc.jpg",
    alt: "Ảnh album 2"
  },
  {
    url: "./assets/cover/backgroud.jpg",
    alt: "Ảnh album 3"
  },
  {
    url: "./assets/cover/backgroudIpad.jpg",
    alt: "Ảnh album 4"
  },
  {
    url: "./assets/cover/bia_sau.jpg",
    alt: "Ảnh album 5"
  },
  {
    url: "./assets/logo/happyBirthday.jpg",
    alt: "Ảnh album 6"
  }
]);
const BOOK_COVER_FRONT = Object.freeze({
  url: "./assets/cover/bia_truoc.jpg",
  alt: "Bìa trước album"
});
const BOOK_COVER_BACK = Object.freeze({
  url: "./assets/cover/bia_sau.jpg",
  alt: "Bìa sau album"
});
let bookImagesFromServer = null;
function syncBookImagesFromPreview() {
  var _a;
  const pd = window.__HB_PREVIEW_DATA || null;
  if (Array.isArray((_a = pd == null ? void 0 : pd.book) == null ? void 0 : _a.images)) {
    bookImagesFromServer = pd.book.images;
  } else {
    bookImagesFromServer = null;
  }
}
function normalizeBookImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((item, index) => {
    if (typeof item === "string") {
      return {
        url: item.trim(),
        alt: `Ảnh kỷ niệm ${index + 1}`
      };
    }
    if (item && typeof item === "object" && typeof item.url === "string") {
      return {
        url: item.url.trim(),
        alt: item.alt ? String(item.alt) : `Ảnh kỷ niệm ${index + 1}`
      };
    }
    return null;
  }).filter((item) => item && item.url);
}
function getBookImages() {
  const serverImages = normalizeBookImages(bookImagesFromServer);
  if (serverImages.length) return serverImages;
  return BOOK_IMAGE_SLOTS;
}
function buildSafeImageUrl(url) {
  return encodeURI(String(url).trim());
}
function ensureEvenImages(images) {
  const safe = Array.isArray(images) ? images.filter(Boolean) : [];
  if (safe.length === 0) return [];
  if (safe.length % 2 === 0) return safe;
  return [...safe, safe[safe.length - 1]];
}
function createBookPage(frontImage, backImage, pageIndex, pageCount) {
  const pageEl = document.createElement("div");
  pageEl.className = "page";
  pageEl.dataset.pageIndex = String(pageIndex);
  pageEl.style.setProperty("--i", pageIndex);
  const frontEl = document.createElement("div");
  frontEl.className = "front";
  const frontImg = document.createElement("img");
  frontImg.src = buildSafeImageUrl(frontImage.url);
  frontImg.alt = frontImage.alt || `Ảnh kỷ niệm ${pageIndex * 2 + 1}`;
  frontImg.loading = "lazy";
  frontImg.decoding = "async";
  frontEl.appendChild(frontImg);
  const backEl = document.createElement("div");
  backEl.className = "back";
  const backImg = document.createElement("img");
  backImg.src = buildSafeImageUrl(backImage.url);
  backImg.alt = backImage.alt || `Ảnh kỷ niệm ${pageIndex * 2 + 2}`;
  backImg.loading = "lazy";
  backImg.decoding = "async";
  backEl.appendChild(backImg);
  if (pageIndex === 0) frontEl.classList.add("cover");
  if (pageIndex === pageCount - 1) backEl.classList.add("cover");
  pageEl.append(frontEl, backEl);
  return pageEl;
}
function renderBook() {
  const bookRoot = document.getElementById("flip-book");
  if (!bookRoot) return;
  const endCta = document.getElementById("album-end-cta");
  if (endCta) endCta.hidden = true;
  const contentImages = ensureEvenImages(getBookImages());
  bookRoot.innerHTML = "";
  document.documentElement.style.setProperty(
    "--book-cover-image",
    `url("${buildSafeImageUrl(BOOK_COVER_FRONT.url)}")`
  );
  const faces = [BOOK_COVER_FRONT, ...contentImages, BOOK_COVER_BACK];
  const pageCount = Math.max(1, Math.ceil(faces.length / 2));
  bookRoot.dataset.pageCount = String(pageCount);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const frontImage = faces[pageIndex * 2] || BOOK_COVER_FRONT;
    const backImage = faces[pageIndex * 2 + 1] || BOOK_COVER_BACK;
    bookRoot.appendChild(
      createBookPage(frontImage, backImage, pageIndex, pageCount)
    );
  }
  initFlipBook(bookRoot);
  updateAlbumEndCtaVisibility();
}
function setBookImagesData(images) {
  bookImagesFromServer = images;
  renderBook();
}
window.setBookImagesData = setBookImagesData;
function getFlipBookProgress(elBook) {
  var _a, _b, _c, _d;
  const rawC = (_c = (_b = (_a = elBook == null ? void 0 : elBook.style) == null ? void 0 : _a.getPropertyValue("--c")) == null ? void 0 : _b.trim()) != null ? _c : "";
  const c = Number.parseInt(rawC, 10);
  const pageCount = Number.parseInt(((_d = elBook == null ? void 0 : elBook.dataset) == null ? void 0 : _d.pageCount) || "", 10);
  return {
    c: Number.isFinite(c) ? c : 0,
    pageCount: Number.isFinite(pageCount) ? pageCount : 0
  };
}
function updateAlbumEndCtaVisibility() {
  const btn = document.getElementById("album-end-cta");
  const book = document.getElementById("flip-book");
  if (!btn || !book) return;
  if (!body.classList.contains("scene-book")) {
    btn.hidden = true;
    return;
  }
  const { c, pageCount } = getFlipBookProgress(book);
  btn.hidden = !(pageCount > 0 && c === pageCount);
}
function initFlipBook(elBook) {
  if (!elBook) return;
  elBook.style.setProperty("--c", 0);
  if (elBook.dataset.flipBound === "1") return;
  elBook.dataset.flipBound = "1";
  elBook.addEventListener("click", (evt) => {
    if (evt.target.closest("a")) return;
    const pageEl = evt.target.closest(".page");
    if (!pageEl || !elBook.contains(pageEl)) return;
    const idx = Number.parseInt(pageEl.dataset.pageIndex || "", 10);
    if (!Number.isFinite(idx)) return;
    const curr = evt.target.closest(".back") ? idx : idx + 1;
    elBook.style.setProperty("--c", curr);
    updateAlbumEndCtaVisibility();
  });
}
const albumEndCta = document.getElementById("album-end-cta");
if (albumEndCta) {
  albumEndCta.addEventListener("click", () => {
    body.classList.remove("scene-book");
    body.classList.add("scene-letters");
    albumEndCta.hidden = true;
  });
}
const giftPanel = document.querySelector(".panel--giftbox");
const present = giftPanel == null ? void 0 : giftPanel.querySelector(".present");
const animateGiftEls = present ? present.querySelectorAll(".animate") : [];
const GIFT_TO_CAKE_DELAY_MS = 1e3;
let giftStoryStarted = false;
function setCakeBirthdayName(name) {
  const text = name == null ? "" : String(name);
  const el = document.getElementById("cake-birthday-name");
  if (el) el.textContent = text;
  const introEl = document.getElementById("intro-cake-birthday-name");
  if (introEl) introEl.textContent = text;
}
window.setCakeBirthdayName = setCakeBirthdayName;
function restartCakeSvg() {
  const svg = document.getElementById("cake");
  if (svg && typeof svg.setCurrentTime === "function") {
    try {
      svg.setCurrentTime(0);
    } catch (_) {
    }
  }
}
const cakePanel = document.querySelector(".panel--cake");
let cakePostUiRunId = 0;
function setupCakePostAnimUi() {
  if (!cakePanel) return;
  const runId = ++cakePostUiRunId;
  const stale = () => runId !== cakePostUiRunId;
  const btn = document.getElementById("cake-next-btn");
  const textBlock = cakePanel.querySelector(".text");
  const velas = cakePanel.querySelector(".velas");
  cakePanel.classList.remove("cake-candle-done", "cake-btn-ready");
  if (btn) {
    btn.tabIndex = -1;
    btn.setAttribute("aria-hidden", "true");
  }
  if (textBlock) {
    textBlock.setAttribute("aria-hidden", "true");
    textBlock.removeAttribute("aria-live");
  }
  const revealButton = () => {
    if (stale()) return;
    cakePanel.classList.add("cake-btn-ready");
    if (btn) {
      btn.removeAttribute("tabindex");
      btn.removeAttribute("aria-hidden");
    }
  };
  const beginCakeTypewriter = () => {
    if (stale() || cakePanel.classList.contains("cake-candle-done")) return;
    const h1 = cakePanel.querySelector(".text h1");
    const nameEl = document.getElementById("cake-birthday-name");
    if (!h1 || !nameEl) {
      cakePanel.classList.add("cake-candle-done");
      if (textBlock) {
        textBlock.removeAttribute("aria-hidden");
        textBlock.setAttribute("aria-live", "polite");
      }
      revealButton();
      return;
    }
    const titleFull = h1.textContent.trim();
    const nameFull = nameEl.textContent.trim();
    h1.textContent = "";
    nameEl.textContent = "";
    cakePanel.classList.add("cake-candle-done");
    if (textBlock) {
      textBlock.removeAttribute("aria-hidden");
      textBlock.setAttribute("aria-live", "polite");
    }
    const msChar = 52;
    const after = (fn, ms) => {
      window.setTimeout(() => {
        if (!stale()) fn();
      }, ms);
    };
    let ti = 0;
    const typeTitle = () => {
      if (stale()) return;
      h1.classList.add("cake-type-caret");
      if (ti < titleFull.length) {
        h1.textContent += titleFull.charAt(ti);
        ti += 1;
        after(typeTitle, msChar);
      } else {
        h1.classList.remove("cake-type-caret");
        after(typeName, 320);
      }
    };
    let ni = 0;
    const typeName = () => {
      if (stale()) return;
      nameEl.classList.add("cake-type-caret");
      if (ni < nameFull.length) {
        nameEl.textContent += nameFull.charAt(ni);
        ni += 1;
        after(typeName, msChar);
      } else {
        nameEl.classList.remove("cake-type-caret");
        revealButton();
      }
    };
    if (titleFull.length) typeTitle();
    else if (nameFull.length) typeName();
    else revealButton();
  };
  const onCandleEnd = (e) => {
    if (e.animationName !== "cake-candle-in") return;
    velas.removeEventListener("animationend", onCandleEnd);
    beginCakeTypewriter();
  };
  if (velas) {
    velas.style.animation = "none";
    void velas.offsetWidth;
    velas.style.removeProperty("animation");
    velas.addEventListener("animationend", onCandleEnd);
  }
  window.setTimeout(() => {
    if (stale()) return;
    velas == null ? void 0 : velas.removeEventListener("animationend", onCandleEnd);
    beginCakeTypewriter();
  }, 5800);
}
function openGiftAndShowCake() {
  if (giftStoryStarted) return;
  giftStoryStarted = true;
  animateGiftEls.forEach((item) => item.classList.add("run"));
  if (typeof confetti === "function") {
    confetti({
      origin: { x: 0.5, y: 0.55 },
      particleCount: 42,
      spread: 60,
      ticks: 55,
      zIndex: 100
    });
  }
  setTimeout(() => {
    body.classList.remove("scene-gift");
    body.classList.add("scene-cake");
    requestAnimationFrame(() => {
      restartCakeSvg();
      setupCakePostAnimUi();
    });
  }, GIFT_TO_CAKE_DELAY_MS);
  setTimeout(() => {
    animateGiftEls.forEach((item) => item.classList.remove("run"));
  }, 6e3);
}
const cakeNextBtn = document.getElementById("cake-next-btn");
if (cakeNextBtn) {
  cakeNextBtn.addEventListener("click", () => {
    body.classList.remove("scene-cake");
    body.classList.add("scene-book");
    renderBook();
  });
}
if (giftPanel && present) {
  giftPanel.addEventListener("click", () => {
    openGiftAndShowCake();
  });
  present.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGiftAndShowCake();
    }
  });
  present.setAttribute("tabindex", "0");
  present.setAttribute("role", "button");
  present.setAttribute("aria-label", "Mở hộp quà");
}
function runMainAfterGiftDataReady() {
  var _a;
  syncBookImagesFromPreview();
  const pd = window.__HB_PREVIEW_DATA || null;
  if ((_a = pd == null ? void 0 : pd.intro) == null ? void 0 : _a.recipientName) {
    setCakeBirthdayName(pd.intro.recipientName);
  }
  renderBook();
}
if (window.__HB_GIFT_LOAD_PROMISE) {
  window.__HB_GIFT_LOAD_PROMISE.finally(() => {
    runMainAfterGiftDataReady();
  });
} else {
  runMainAfterGiftDataReady();
}
