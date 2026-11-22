async function uploadAudioToR2(file, prefix) {
  if (typeof prefix === "undefined") prefix = "";
  if (typeof file === "string" && file.startsWith("data:")) {
    let dataURLtoFile2 = function(dataurl, filename) {
      const arr = dataurl.split(",");
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new File([u8arr], filename, { type: mime });
    };
    var dataURLtoFile = dataURLtoFile2;
    file = dataURLtoFile2(file, "upload.mp3");
  }
  const formData = new FormData();
  formData.append("audio", file);
  if (prefix) formData.append("prefix", prefix);
  const res = await fetch("https://api.deargift.online/api/r2/upload-audio", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (data.success && data.data && data.data.url) return data.data.url;
  throw new Error("Upload âm thanh thất bại");
}
if (typeof window !== "undefined") {
  window.uploadedMusicOptions = window.uploadedMusicOptions || [];
}
const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const closeModal = document.querySelector(".close");
let pages = [];
const applySettingsButton = document.getElementById("applySettings");
let settings = window.settings || {
  music: "./music/happy-birthday.mp3",
  countdown: 3,
  matrixText: "HAPPYBIRTHDAY",
  matrixColor1: "#ff69b4",
  matrixColor2: "#ff1493",
  sequence: "HAPPY|BIRTHDAY|TO|YOU|❤",
  sequenceColor: "#ff69b4",
  gift: "",
  pages: [],
  enableBook: false,
  enableHeart: false,
  isSave: false
};
window.lastIsSaveState = false;
const musicOptions = [
  { value: "./music/happy-birthday.mp3", label: "Happy Birthday (Miễn phí)" },
  { value: "./music/happybirthday.mp3", label: "Happy Birthday (Phiên bản 2)" },
  { value: "./music/happybirthday_domixi.mp3", label: "Happy Birthday (Độ Mixi)" },
  { value: "./music/happybirtday_uia.mp3", label: "Happy Birthday (Mèo UIA)" },
  { value: "./music/music.mp3", label: "Happy Birthday (Instrumental)" },
  { value: "./music/postcardnam.mp3", label: "Happy Birthday Podcast (Nam)" },
  { value: "./music/podcardnu.mp3", label: "Happy Birthday Podcast (Nữ)" },
  { value: "./music/givemeyourforever.mp3", label: "Give Me Your Forever" },
  { value: "./music/perfect.mp3", label: "Perfect" },
  { value: "./music/phepmau.mp3", label: "Phép màu" },
  { value: "./music/lambantraianhe.mp3", label: "Làm bạn trai anh nhé" },
  { value: "./music/denbenanh.mp3", label: "Đến bên anh" },
  { value: "./music/anhnangcuaanh.mp3", label: "Ánh nắng của anh" },
  { value: "./music/dunglamtraitimanhdau.mp3", label: "Đừng làm trái tim anh đau" },
  { value: "./music/buiphan.mp3", label: "Bụi phấn" },
  { value: "./music/buocnhevaotimanh.mp3", label: "Bước nhẹ vào tim anh" },
  { value: "./music/codoidieu.mp3", label: "Có đôi điều" },
  { value: "./music/coem.mp3", label: "Có em" },
  { value: "./music/emnay.mp3", label: "Em này" },
  { value: "./music/emlacogiaovungcao.mp3", label: "Em là cô giáo vùng cao" },
  { value: "./music/emlacogiaovungcaoremix.mp3", label: "Em là cô giáo vùng cao (Remix)" },
  { value: "./music/lathuguithay.mp3", label: "Lá thư gửi thầy" },
  { value: "./music/loithayco.mp3", label: "Lời thầy cô" },
  { value: "./music/nguoithay.mp3", label: "Người thầy" },
  { value: "./music/nguoigieomamxanh.mp3", label: "Người gieo mầm xanh" },
  { value: "./music/nguoidautien.mp3", label: "Người đầu tiên" },
  { value: "./music/motdoi.mp3", label: "Một đời" },
  { value: "./music/minhcungnhaudongbang.mp3", label: "Mình cùng nhau đóng băng" },
  { value: "./music/neunhucohaitraitim.mp3", label: "Nếu như có hai trái tim" },
  { value: "./music/ngayxuaay.mp3", label: "Ngày xưa ấy" },
  { value: "./music/Như 1 vì tinh tú.mp3", label: "Như 1 vì tinh tú" },
  { value: "./music/tinhyeudieuky.mp3", label: "Tình yêu diệu kỳ" },
  { value: "./music/trentinhbanduoitinhyeu.mp3", label: "Trên tình bạn dưới tình yêu" },
  { value: "./music/tungngayyeuem.mp3", label: "Từng ngày yêu em" },
  { value: "./music/yeuemratnhieu.mp3", label: "Yêu em rất nhiều" },
  { value: "./music/suynghitronganh.mp3", label: "Suy nghĩ trong anh" }
];
const gifOptions = [
  { value: "", label: "None" },
  { value: "./gif/happy.gif", label: "Gif1" },
  { value: "./gif/Cat Love GIF by KIKI.gif", label: "Gif2" },
  { value: "./gif/Happy-Birthday-GIF-by-BREAD-TR-unscreen.gif", label: "Gif3" },
  { value: "./gif/happy2.gif", label: "Gif4" },
  { value: "./gif/happy3.gif", label: "Gif5" }
];
const musicPreviewButton = document.getElementById("musicPreviewButton");
const musicPreviewStatus = document.getElementById("musicPreviewStatus");
const musicPreviewAudio = new Audio();
musicPreviewAudio.preload = "auto";
let currentPreviewTrack = "";
function getSelectedMusicLabel() {
  const musicSelect = document.getElementById("backgroundMusic");
  if (!musicSelect) return "";
  const selectedOption = musicSelect.options[musicSelect.selectedIndex];
  return selectedOption ? selectedOption.textContent : "";
}
function getIdlePreviewMessage() {
  const label = getSelectedMusicLabel();
  return label ? `Đã chọn: ${label}` : 'Chọn bài nhạc rồi nhấn "Nghe thử"';
}
function setMusicPreviewState({ message, isPlaying: isPlaying2 }) {
  if (musicPreviewButton) {
    musicPreviewButton.textContent = isPlaying2 ? "⏸ Dừng nghe thử" : "▶ Nghe thử";
    if (isPlaying2) {
      musicPreviewButton.classList.add("playing");
    } else {
      musicPreviewButton.classList.remove("playing");
    }
  }
  if (musicPreviewStatus && message) {
    musicPreviewStatus.textContent = message;
  }
}
function stopMusicPreview(customMessage) {
  musicPreviewAudio.pause();
  musicPreviewAudio.currentTime = 0;
  currentPreviewTrack = "";
  setMusicPreviewState({
    message: customMessage || getIdlePreviewMessage(),
    isPlaying: false
  });
}
function handleMusicPreview() {
  const musicSelect = document.getElementById("backgroundMusic");
  if (!musicSelect || !musicSelect.value) {
    setMusicPreviewState({
      message: "Vui lòng chọn một bài nhạc trước khi nghe thử",
      isPlaying: false
    });
    return;
  }
  const selectedSrc = musicSelect.value;
  const selectedLabel = getSelectedMusicLabel();
  if (currentPreviewTrack === selectedSrc && !musicPreviewAudio.paused) {
    stopMusicPreview();
    return;
  }
  currentPreviewTrack = selectedSrc;
  musicPreviewAudio.pause();
  musicPreviewAudio.currentTime = 0;
  musicPreviewAudio.src = selectedSrc;
  musicPreviewAudio.play().then(() => {
    setMusicPreviewState({
      message: `Đang phát: ${selectedLabel}`,
      isPlaying: true
    });
  }).catch((error) => {
    console.error("Không thể phát nhạc xem thử:", error);
    stopMusicPreview("Không phát được bản nghe thử. Vui lòng thử lại.");
  });
}
function attachMusicSelectChangeListener() {
  const musicSelect = document.getElementById("backgroundMusic");
  if (!musicSelect) return;
  musicSelect.onchange = () => {
    stopMusicPreview();
  };
}
if (musicPreviewButton) {
  musicPreviewButton.addEventListener("click", handleMusicPreview);
}
musicPreviewAudio.addEventListener("ended", () => stopMusicPreview());
musicPreviewAudio.addEventListener("pause", () => {
  if (musicPreviewAudio.currentTime === 0) {
    setMusicPreviewState({
      message: getIdlePreviewMessage(),
      isPlaying: false
    });
  }
});
musicPreviewAudio.addEventListener("error", () => {
  stopMusicPreview("Không phát được bản nghe thử. Vui lòng thử lại.");
});
stopMusicPreview();
function setupMusicModeSwitch() {
  const systemBlock = document.getElementById("musicSystemBlock");
  const fileBlock = document.getElementById("musicFileBlock");
  const switchToFile = document.getElementById("musicSwitchToFile");
  const switchToSystem = document.getElementById("musicSwitchToSystem");
  if (!systemBlock || !fileBlock) return;
  if (switchToFile) {
    switchToFile.addEventListener("click", function() {
      systemBlock.style.display = "none";
      fileBlock.style.display = "block";
    });
  }
  if (switchToSystem) {
    switchToSystem.addEventListener("click", function() {
      fileBlock.style.display = "none";
      systemBlock.style.display = "block";
    });
  }
}
function setupMusicUpload() {
  const musicUploadInput = document.getElementById("musicUploadInput");
  const musicUploadBtn = document.getElementById("musicUploadBtn");
  const systemBlock = document.getElementById("musicSystemBlock");
  const fileBlock = document.getElementById("musicFileBlock");
  if (!musicUploadBtn || !musicUploadInput) return;
  musicUploadBtn.addEventListener("click", () => musicUploadInput.click());
  musicUploadInput.addEventListener("change", async function() {
    const file = this.files && this.files[0];
    if (!file) return;
    const btn = musicUploadBtn;
    const origText = btn.textContent;
    try {
      btn.disabled = true;
      btn.textContent = "Đang tải lên...";
      const url = await uploadAudioToR2(file, "audio");
      const label = (file.name || "upload").replace(/\.[^/.]+$/, "") + " (Đã tải lên)";
      window.uploadedMusicOptions = window.uploadedMusicOptions || [];
      window.uploadedMusicOptions.push({ value: url, label });
      settings.music = url;
      if (typeof window.settings !== "undefined") window.settings.music = url;
      refreshMusicSelect();
      setMusicPreviewState({ message: "Đã lưu nhạc: " + label, isPlaying: false });
      if (fileBlock && systemBlock) {
        fileBlock.style.display = "none";
        systemBlock.style.display = "block";
      }
    } catch (e) {
      console.error("Upload audio:", e);
      setMusicPreviewState({ message: "Upload thất bại: " + (e.message || "Vui lòng thử lại"), isPlaying: false });
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
      musicUploadInput.value = "";
    }
  });
}
setupMusicModeSwitch();
setupMusicUpload();
const colorThemes = {
  pink: {
    matrixColor1: "#ff69b4",
    matrixColor2: "#ff1493",
    sequenceColor: "#ff69b4",
    name: "Hồng ngọt ngào"
  },
  blue: {
    matrixColor1: "#87ceeb",
    matrixColor2: "#4169e1",
    sequenceColor: "#1e90ff",
    name: "Xanh dương mát mẻ"
  },
  purple: {
    matrixColor1: "#dda0dd",
    matrixColor2: "#9370db",
    sequenceColor: "#8a2be2",
    name: "Tím mộng mơ"
  },
  custom: {
    matrixColor1: "#ffb6c1",
    matrixColor2: "#ffc0cb",
    sequenceColor: "#d39b9b",
    name: "Tùy chỉnh màu"
  }
};
function resetWebsiteState() {
  const book2 = document.getElementById("book");
  const bookContainer = document.querySelector(".book-container");
  const canvas = document.querySelector(".canvas");
  const matrixCanvas = document.getElementById("matrix-rain");
  const giftImageElement = document.getElementById("gift-image");
  const contentDisplay = document.getElementById("contentDisplay");
  const fireworkContainer = document.getElementById("fireworkContainer");
  const birthdayAudio = document.getElementById("birthdayAudio");
  S.initialized = false;
  if (typeof hideStars === "function") {
    hideStars();
  }
  if (book2) {
    book2.style.display = "none";
    book2.classList.remove("show");
  }
  if (bookContainer) {
    bookContainer.style.display = "none";
    bookContainer.classList.remove("show");
  }
  if (contentDisplay) {
    contentDisplay.classList.remove("show");
  }
  if (giftImageElement) {
    giftImageElement.style.display = "none";
    giftImageElement.style.animation = "";
  }
  if (fireworkContainer) {
    fireworkContainer.style.display = "none";
    fireworkContainer.style.opacity = "0";
    fireworkContainer.innerHTML = "";
  }
  const photos = document.querySelectorAll(".photo");
  photos.forEach((photo) => photo.remove());
  if (canvas) {
    canvas.style.display = "block";
  }
  if (matrixCanvas) {
    matrixCanvas.style.display = "block";
  }
  if (typeof currentPage !== "undefined") {
    currentPage = 0;
  }
  if (typeof isBookFinished !== "undefined") {
    isBookFinished = false;
  }
  if (typeof isFlipping !== "undefined") {
    isFlipping = false;
  }
  const allPages = document.querySelectorAll(".page");
  allPages.forEach((page) => {
    page.classList.remove("flipped", "flipping");
  });
  if (birthdayAudio && window.settings) {
    birthdayAudio.src = window.settings.music;
    if (typeof isPlaying !== "undefined" && isPlaying) {
      birthdayAudio.play().catch((error) => {
      });
    }
  }
  if (window.settings && typeof matrixChars !== "undefined") {
    matrixChars = window.settings.matrixText.split("");
    if (typeof matrixInterval !== "undefined" && matrixInterval) {
      clearInterval(matrixInterval);
      matrixInterval = null;
      if (matrixCanvas) {
        const matrixCtx = matrixCanvas.getContext("2d");
        matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      }
    }
    if (typeof initMatrixRain === "function") {
      initMatrixRain();
    }
  }
  if (giftImageElement && window.settings) {
    if (window.settings.gift && window.settings.gift !== "") {
      giftImageElement.src = window.settings.gift;
    } else {
      giftImageElement.src = "";
    }
  }
  if (window.settings && window.settings.pages) {
    pages = window.settings.pages;
    createPages();
  }
  if (typeof S !== "undefined" && S.UI && window.settings) {
    S.UI.reset(true);
    const sequence = `|#countdown ${window.settings.countdown}|${window.settings.sequence}|#gift|`;
    S.UI.simulate(sequence);
  }
}
function initializeDefaultSettings() {
  window.settings = window.settings || {
    music: "./music/happy-birthday.mp3",
    countdown: 3,
    matrixText: "HAPPYBIRTHDAY",
    matrixColor1: "#ff69b4",
    // Màu pink mặc định
    matrixColor2: "#ff1493",
    // Màu pink mặc định
    sequence: "HAPPY|BIRTHDAY|TO|YOU|❤ ",
    sequenceColor: "#ff69b4",
    // Màu pink mặc định
    gift: "../gif/Cat Love GIF by KIKI.gif",
    enableBook: false,
    enableHeart: false,
    isSave: false,
    colorTheme: "pink",
    pages: []
  };
  pages = window.settings.pages;
}
function applyLoadedSettings() {
  const settings2 = window.settings;
  const birthdayAudio = document.getElementById("birthdayAudio");
  if (birthdayAudio) {
    birthdayAudio.src = settings2.music;
  }
  const giftImageElement = document.getElementById("gift-image");
  if (giftImageElement && settings2.gift) {
    giftImageElement.src = settings2.gift;
  }
  matrixChars = settings2.matrixText.split("");
  if (matrixInterval) {
    clearInterval(matrixInterval);
    matrixInterval = null;
    const matrixCanvas = document.getElementById("matrix-rain");
    if (matrixCanvas) {
      const matrixCtx = matrixCanvas.getContext("2d");
      matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    }
  }
  initMatrixRain();
  createPages();
  S.UI.reset(true);
  const sequence = `|#countdown ${settings2.countdown}||${settings2.sequence}|#gift|`;
  S.UI.simulate(sequence);
}
settingsButton == null ? void 0 : settingsButton.addEventListener("click", () => {
  settingsModal.style.display = "block";
  populateModal();
});
closeModal == null ? void 0 : closeModal.addEventListener("click", () => {
  settingsModal.style.display = "none";
  stopMusicPreview();
});
function refreshMusicSelect() {
  const musicSelect = document.getElementById("backgroundMusic");
  if (!musicSelect) return;
  const uploaded = typeof window !== "undefined" && window.uploadedMusicOptions ? window.uploadedMusicOptions : [];
  const allOptions = [...musicOptions, ...uploaded];
  musicSelect.innerHTML = allOptions.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
  if (settings.music && allOptions.some((o) => o.value === settings.music)) {
    musicSelect.value = settings.music;
  } else if (allOptions.length) {
    musicSelect.value = allOptions[0].value;
    settings.music = allOptions[0].value;
  }
  attachMusicSelectChangeListener();
}
function populateModal() {
  stopMusicPreview();
  const musicSystemBlock = document.getElementById("musicSystemBlock");
  const musicFileBlock = document.getElementById("musicFileBlock");
  if (musicSystemBlock) musicSystemBlock.style.display = "block";
  if (musicFileBlock) musicFileBlock.style.display = "none";
  refreshMusicSelect();
  const musicSelect = document.getElementById("backgroundMusic");
  if (musicSelect && settings.music) musicSelect.value = settings.music;
  setMusicPreviewState({
    message: getIdlePreviewMessage(),
    isPlaying: false
  });
  const countdownSelect = document.getElementById("countdownTime");
  countdownSelect.value = settings.countdown;
  const enableBookSelect = document.getElementById("enableBook");
  enableBookSelect.value = settings.enableBook.toString();
  const enableHeartSelect = document.getElementById("enableHeart");
  enableHeartSelect.value = settings.enableHeart.toString();
  const isSaveCheckbox = document.getElementById("isSave");
  if (isSaveCheckbox) {
    const savedState = window.lastIsSaveState !== void 0 ? window.lastIsSaveState : settings.isSave;
    isSaveCheckbox.checked = savedState;
  }
  const giftSelect = document.getElementById("giftImage");
  giftSelect.innerHTML = gifOptions.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
  giftSelect.value = settings.gift;
  const matrixTextInput = document.getElementById("matrixText");
  matrixTextInput.value = settings.matrixText;
  const matrixColor1Input = document.getElementById("matrixColor1");
  matrixColor1Input.value = settings.matrixColor1;
  const matrixColor2Input = document.getElementById("matrixColor2");
  matrixColor2Input.value = settings.matrixColor2;
  const sequenceInput = document.getElementById("sequenceText");
  sequenceInput.value = settings.sequence;
  const sequenceColorInput = document.getElementById("sequenceColor");
  sequenceColorInput.value = settings.sequenceColor;
  const currentTheme = settings.colorTheme || detectCurrentColorTheme();
  const colorButtons = document.querySelectorAll(".color-theme-btn");
  colorButtons.forEach((button) => {
    button.addEventListener("click", function() {
      const theme = this.getAttribute("data-theme");
      handleColorThemeChange(theme);
    });
  });
  handleColorThemeChange(currentTheme);
  addCustomColorListeners();
  const pageConfigs = document.getElementById("pageConfigs");
  pageConfigs.innerHTML = "";
  enableBookSelect.addEventListener("change", function() {
    const bookSettingsSection2 = document.getElementById("bookSettingsSection");
    const enableHeartSelect2 = document.getElementById("enableHeart");
    if (this.value === "true") {
      bookSettingsSection2.style.display = "block";
      enableHeartSelect2.disabled = false;
    } else {
      bookSettingsSection2.style.display = "none";
      enableHeartSelect2.value = "false";
      enableHeartSelect2.disabled = true;
    }
    updatePricingFromModal();
  });
  settings.pages.forEach((page, index) => {
    const pageConfig = document.createElement("div");
    pageConfig.className = "page-config";
    const title = document.createElement("h3");
    if (index === 0) {
      title.textContent = t("pageTitleCover", { num: index + 1 });
    } else {
      title.textContent = t("pageTitle", { num: index + 1 });
    }
    pageConfig.appendChild(title);
    if (settings.pages.length > 1) {
      const closeBtn = document.createElement("p");
      closeBtn.className = "page-config-close";
      closeBtn.textContent = "×";
      closeBtn.onclick = () => removePage(index);
      pageConfig.appendChild(closeBtn);
    }
    const fileLabel = document.createElement("label");
    fileLabel.setAttribute("for", `pageImage${index}`);
    fileLabel.textContent = t("imageLabel");
    pageConfig.appendChild(fileLabel);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = `pageImage${index}`;
    fileInput.accept = "image/*";
    pageConfig.appendChild(fileInput);
    const imagePreview = document.createElement("img");
    imagePreview.id = `imagePreview${index}`;
    imagePreview.style.cssText = `
            max-width: 150px;
            max-height: 150px;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 4px;
            display: block;
            margin-bottom: 10px;
            margin-top: 10px;
        `;
    if (page.image) {
      imagePreview.src = page.image;
      imagePreview.alt = `Ảnh trang ${index + 1}`;
    } else {
      const placeholderText = index === 0 ? t("coverPlaceholder") : t("pagePlaceholder", { num: index + 1 });
      imagePreview.style.cssText += `
                display: flex;
                justify-content: center;
                align-items: center;
                width: 150px;
                height: 150px;
                background-color: #f0f0f0;
                font-size: 14px;
                color: #999;
                text-align: center;
            `;
      imagePreview.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2jGsGEgY8OzIOS6o25oPC90ZXh0Pjwvc3ZnPg==";
      imagePreview.alt = t("noImageAlt", { placeholder: placeholderText });
    }
    pageConfig.appendChild(imagePreview);
    if (page.selectedFile) {
      const dt = new DataTransfer();
      dt.items.add(page.selectedFile);
      fileInput.files = dt.files;
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.alt = `Ảnh mới cho trang ${index + 1}`;
      };
      reader.readAsDataURL(page.selectedFile);
    }
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e2) {
          imagePreview.src = e2.target.result;
          imagePreview.style.cssText = `
                        max-width: 150px;
                        max-height: 150px;
                        object-fit: cover;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        display: block;
                        margin-bottom: 10px;
                        margin-top: 10px;
                    `;
          imagePreview.alt = `Ảnh mới cho trang ${index + 1}`;
        };
        reader.readAsDataURL(file);
      } else {
        if (page.image && !page.selectedFile) {
          imagePreview.src = page.image;
          imagePreview.alt = `Ảnh hiện tại trang ${index + 1}`;
        } else {
          const placeholderText = index === 0 ? t("coverPlaceholder") : t("pagePlaceholder", { num: index + 1 });
          imagePreview.style.cssText += `
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 150px;
                        height: 150px;
                        background-color: #f0f0f0;
                        font-size: 14px;
                        color: #999;
                        text-align: center;
                    `;
          imagePreview.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2jGsGEgY8OzIOS6o25oPC90ZXh0Pjwvc3ZnPg==";
          imagePreview.alt = t("noImageAlt", { placeholder: placeholderText });
        }
      }
    });
    if (index >= 2 && index % 2 === 0) {
      const contentTextarea = document.createElement("textarea");
      contentTextarea.id = `pageContent${index}`;
      contentTextarea.placeholder = t("contentPlaceholder", { num: index + 1 });
      contentTextarea.rows = 4;
      contentTextarea.value = page.content || "";
      pageConfig.appendChild(contentTextarea);
    }
    pageConfigs.appendChild(pageConfig);
  });
  if (settings.pages.length < 19) {
    const addPageButton = document.createElement("button");
    addPageButton.textContent = t("addNewPage");
    addPageButton.onclick = addNewPage;
    addPageButton.style.cssText = `
                    background: linear-gradient(135deg, #4caf50, #45a049);
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-top: 10px;
                `;
    pageConfigs.appendChild(addPageButton);
  }
  matrixColor1Input.addEventListener("input", () => {
    const matrixColor1Preview = document.getElementById("matrixColor1Preview");
    if (matrixColor1Preview) {
      matrixColor1Preview.style.backgroundColor = matrixColor1Input.value;
    }
  });
  matrixColor2Input.addEventListener("input", () => {
    const matrixColor2Preview = document.getElementById("matrixColor2Preview");
    if (matrixColor2Preview) {
      matrixColor2Preview.style.backgroundColor = matrixColor2Input.value;
    }
  });
  sequenceColorInput.addEventListener("input", () => {
    const sequenceColorPreview = document.getElementById("sequenceColorPreview");
    if (sequenceColorPreview) {
      sequenceColorPreview.style.backgroundColor = sequenceColorInput.value;
    }
  });
  const bookSettingsSection = document.getElementById("bookSettingsSection");
  if (settings.enableBook) {
    bookSettingsSection.style.display = "block";
  } else {
    bookSettingsSection.style.display = "none";
  }
  if (window.pricingCalculator) {
    window.pricingCalculator.updateFromSettings(settings);
  }
  const fieldsToWatch = [
    "backgroundMusic",
    "enableBook",
    "enableHeart"
  ];
  fieldsToWatch.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("change", function() {
        updatePricingFromModal();
      });
    }
  });
  const isSaveField = document.getElementById("isSave");
  if (isSaveField) {
    isSaveField.addEventListener("change", function() {
      window.lastIsSaveState = this.checked;
      updatePricingFromModal();
      updateExpireDateDisplay();
    });
  }
  updatePricingFromModal();
  updateExpireDateDisplay();
  const allInputs = document.querySelectorAll('.modal-content input[type="text"], .modal-content textarea');
  allInputs.forEach((input) => {
    input.addEventListener("keydown", function(e) {
      if (e.key === " " || e.code === "Space") {
        e.stopPropagation();
        return true;
      }
    });
    input.addEventListener("input", function(e) {
      e.stopPropagation();
    });
  });
}
function addNewPage() {
  if (settings.pages.length < 20) {
    saveFormDataToSettings();
    settings.pages.push({ image: "", content: "" });
    populateModal();
    updatePricingFromModal();
  }
}
function removePage(index) {
  if (settings.pages.length > 1) {
    saveFormDataToSettings();
    settings.pages.splice(index, 1);
    populateModal();
    updatePricingFromModal();
  }
}
function handleColorThemeChange(selectedTheme) {
  const matrixColor1Input = document.getElementById("matrixColor1");
  const matrixColor2Input = document.getElementById("matrixColor2");
  const sequenceColorInput = document.getElementById("sequenceColor");
  const customColorSection = document.getElementById("customColorSection");
  const sequenceColorSection = document.getElementById("sequenceColorSection");
  settings.colorTheme = selectedTheme;
  const allButtons = document.querySelectorAll(".color-theme-btn");
  allButtons.forEach((btn) => btn.classList.remove("active"));
  const activeButton = document.querySelector(`[data-theme="${selectedTheme}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
  }
  if (selectedTheme === "custom") {
    customColorSection.style.display = "flex";
    sequenceColorSection.style.display = "block";
  } else {
    customColorSection.style.display = "none";
    sequenceColorSection.style.display = "none";
    const theme = colorThemes[selectedTheme];
    if (theme && matrixColor1Input && matrixColor2Input && sequenceColorInput) {
      matrixColor1Input.value = theme.matrixColor1;
      matrixColor2Input.value = theme.matrixColor2;
      sequenceColorInput.value = theme.sequenceColor;
      settings.matrixColor1 = theme.matrixColor1;
      settings.matrixColor2 = theme.matrixColor2;
      settings.sequenceColor = theme.sequenceColor;
      matrixColor1Input.dispatchEvent(new Event("input"));
      matrixColor2Input.dispatchEvent(new Event("input"));
      sequenceColorInput.dispatchEvent(new Event("input"));
    }
  }
}
function addCustomColorListeners() {
  const matrixColor1Input = document.getElementById("matrixColor1");
  const matrixColor2Input = document.getElementById("matrixColor2");
  const sequenceColorInput = document.getElementById("sequenceColor");
  if (matrixColor1Input) {
    matrixColor1Input.addEventListener("input", function() {
      if (settings.colorTheme === "custom") {
        settings.matrixColor1 = this.value;
        const matrixColor1Preview = document.getElementById("matrixColor1Preview");
        if (matrixColor1Preview) {
          matrixColor1Preview.style.backgroundColor = this.value;
        }
      }
    });
  }
  if (matrixColor2Input) {
    matrixColor2Input.addEventListener("input", function() {
      if (settings.colorTheme === "custom") {
        settings.matrixColor2 = this.value;
        const matrixColor2Preview = document.getElementById("matrixColor2Preview");
        if (matrixColor2Preview) {
          matrixColor2Preview.style.backgroundColor = this.value;
        }
      }
    });
  }
  if (sequenceColorInput) {
    sequenceColorInput.addEventListener("input", function() {
      if (settings.colorTheme === "custom") {
        settings.sequenceColor = this.value;
        const sequenceColorPreview = document.getElementById("sequenceColorPreview");
        if (sequenceColorPreview) {
          sequenceColorPreview.style.backgroundColor = this.value;
        }
      }
    });
  }
}
function detectCurrentColorTheme() {
  if (settings.colorTheme) {
    return settings.colorTheme;
  }
  const matrixColor1Input = document.getElementById("matrixColor1");
  const matrixColor2Input = document.getElementById("matrixColor2");
  const sequenceColorInput = document.getElementById("sequenceColor");
  if (matrixColor1Input && matrixColor2Input && sequenceColorInput) {
    const currentMatrix1 = matrixColor1Input.value;
    const currentMatrix2 = matrixColor2Input.value;
    const currentSequence = sequenceColorInput.value;
    for (const [themeKey, theme] of Object.entries(colorThemes)) {
      if (theme.matrixColor1 === currentMatrix1 && theme.matrixColor2 === currentMatrix2 && theme.sequenceColor === currentSequence) {
        return themeKey;
      }
    }
  }
  return "pink";
}
function saveFormDataToSettings() {
  try {
    const musicSelect = document.getElementById("backgroundMusic");
    if (musicSelect) settings.music = musicSelect.value;
    const countdownSelect = document.getElementById("countdownTime");
    if (countdownSelect) settings.countdown = parseInt(countdownSelect.value) || 3;
    const enableBookSelect = document.getElementById("enableBook");
    if (enableBookSelect) settings.enableBook = enableBookSelect.value === "true";
    const enableHeartSelect = document.getElementById("enableHeart");
    if (enableHeartSelect) settings.enableHeart = enableHeartSelect.value === "true";
    const isSaveCheckbox = document.getElementById("isSave");
    if (isSaveCheckbox) settings.isSave = isSaveCheckbox.checked;
    const giftSelect = document.getElementById("giftImage");
    if (giftSelect) settings.gift = giftSelect.value;
    const matrixTextInput = document.getElementById("matrixText");
    if (matrixTextInput) settings.matrixText = matrixTextInput.value;
    const matrixColor1Input = document.getElementById("matrixColor1");
    if (matrixColor1Input) settings.matrixColor1 = matrixColor1Input.value;
    const matrixColor2Input = document.getElementById("matrixColor2");
    if (matrixColor2Input) settings.matrixColor2 = matrixColor2Input.value;
    const sequenceInput = document.getElementById("sequenceText");
    if (sequenceInput) settings.sequence = sequenceInput.value;
    const sequenceColorInput = document.getElementById("sequenceColor");
    if (sequenceColorInput) settings.sequenceColor = sequenceColorInput.value;
    const activeButton = document.querySelector(".color-theme-btn.active");
    if (activeButton) {
      settings.colorTheme = activeButton.getAttribute("data-theme");
    }
    settings.pages.forEach((page, index) => {
      const fileInput = document.getElementById(`pageImage${index}`);
      const contentInput = document.getElementById(`pageContent${index}`);
      if (fileInput && fileInput.files.length > 0) {
        const newImageURL = URL.createObjectURL(fileInput.files[0]);
        settings.pages[index].image = newImageURL;
        settings.pages[index].selectedFile = fileInput.files[0];
      }
      if (contentInput) {
        settings.pages[index].content = contentInput.value;
      }
    });
  } catch (error) {
    console.error("Error saving form data:", error);
  }
}
function updatePricingFromModal() {
  var _a, _b, _c, _d;
  if (window.pricingCalculator) {
    const currentModalSettings = {
      music: ((_a = document.getElementById("backgroundMusic")) == null ? void 0 : _a.value) || "./music/happybirtday_uia.mp3",
      enableBook: ((_b = document.getElementById("enableBook")) == null ? void 0 : _b.value) === "true",
      enableHeart: ((_c = document.getElementById("enableHeart")) == null ? void 0 : _c.value) === "true",
      isSave: ((_d = document.getElementById("isSave")) == null ? void 0 : _d.checked) || false,
      pages: settings.pages || []
    };
    window.pricingCalculator.updateFromSettings(currentModalSettings);
  }
}
function updateExpireDateDisplay() {
  const isSaveCheckbox = document.getElementById("isSave");
  const expireDateElement = document.getElementById("expireDate");
  const expireContainer = expireDateElement == null ? void 0 : expireDateElement.parentElement;
  if (isSaveCheckbox && expireDateElement && expireContainer) {
    if (isSaveCheckbox.checked) {
      expireDateElement.textContent = t("saveForever");
      expireDateElement.style.color = "#4caf50";
      expireContainer.innerHTML = `⏳ ${t("expireText")} <b id="expireDate" style="color: #4caf50;">${t("saveForever")}</b>`;
    } else {
      expireDateElement.textContent = t("thirtyDays");
      expireDateElement.style.color = "";
      expireContainer.innerHTML = `⏳ ${t("expireText")} <b id="expireDate">${t("thirtyDays")}</b>`;
    }
  }
}
function createPages() {
  if (!book) return;
  book.innerHTML = "";
  const totalLogicalPages = pages.length;
  const totalPhysicalPages = Math.ceil(totalLogicalPages / 2);
  for (let physicalPageIndex = 0; physicalPageIndex < totalPhysicalPages; physicalPageIndex++) {
    const page = document.createElement("div");
    page.classList.add("page");
    page.dataset.page = physicalPageIndex;
    const frontLogicalIndex = physicalPageIndex * 2;
    const backLogicalIndex = frontLogicalIndex + 1;
    const front = document.createElement("div");
    front.classList.add("page-front");
    if (frontLogicalIndex < pages.length && pages[frontLogicalIndex]) {
      const frontPageData = pages[frontLogicalIndex];
      if (frontPageData.image) {
        const frontImg = document.createElement("img");
        frontImg.src = frontPageData.image;
        frontImg.onerror = function() {
          const placeholderText = frontLogicalIndex === 0 ? "Bìa Sách" : `Trang ${frontLogicalIndex + 1}`;
          this.src = createPlaceholderImage(placeholderText);
        };
        front.appendChild(frontImg);
      } else {
        front.classList.add("empty-page");
        front.textContent = t("emptyPage");
      }
    } else {
      front.classList.add("empty-page");
      front.textContent = t("emptyPage");
    }
    const back = document.createElement("div");
    back.classList.add("page-back");
    if (backLogicalIndex < pages.length && pages[backLogicalIndex]) {
      const backPageData = pages[backLogicalIndex];
      if (backPageData.image) {
        const backImg = document.createElement("img");
        backImg.src = backPageData.image;
        backImg.onerror = function() {
          const placeholderText = `Trang ${backLogicalIndex + 1}`;
          this.src = createPlaceholderImage(placeholderText);
        };
        back.appendChild(backImg);
      } else {
        back.classList.add("empty-page");
        back.textContent = t("emptyPage");
      }
    } else {
      const endImg = document.createElement("img");
      endImg.src = "./image/theend.jpg";
      endImg.onerror = function() {
        back.classList.add("empty-page");
        back.textContent = t("endOfBook");
      };
      back.appendChild(endImg);
    }
    page.appendChild(front);
    page.appendChild(back);
    book.appendChild(page);
    page.addEventListener("click", (e) => {
      if (!isFlipping) {
        const rect = page.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pageWidth = rect.width;
        if (clickX < pageWidth / 2 && page.classList.contains("flipped")) {
          prevPage();
        } else if (clickX >= pageWidth / 2 && !page.classList.contains("flipped")) {
          nextPage();
        }
      }
    });
  }
  photoUrls = pages.filter((page) => page.image).map((page) => page.image);
  if (typeof calculatePageZIndexes === "function") {
    calculatePageZIndexes();
  }
}
document.addEventListener("DOMContentLoaded", function() {
  var _a;
  if (window.giftPageMode) return;
  const book2 = document.getElementById("book");
  const bookContainer = document.querySelector(".book-container");
  if (book2) {
    book2.style.display = "none";
    book2.classList.remove("show");
  }
  if (bookContainer) {
    bookContainer.style.display = "none";
    bookContainer.classList.remove("show");
  }
  createPages();
  const websiteId = (_a = window.birthdayAPI) == null ? void 0 : _a.getWebsiteIdFromURL();
  if (websiteId) {
    const googleAuthContainer = document.getElementById("googleAuthContainer");
    if (googleAuthContainer) googleAuthContainer.style.display = "none";
    loadWebsiteFromServer();
  } else {
    initializeDefaultSettings();
    applyLoadedSettings();
    if (window.initializePricingCalculator) {
      window.initializePricingCalculator();
    }
    if (window.pricingCalculator) {
      window.pricingCalculator.updatePricing();
    }
    window.isWebsiteReady = true;
  }
});
function createLoadingUI() {
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "loadingOverlay";
  loadingOverlay.innerHTML = `
    <div class="loading-content">
        <div class="loading-spinner"></div>
        <h2>${t("loading")}</h2>
        <p>${t("waitingIsHappiness")}</p>
    </div>
`;
  const loadingStyles = document.createElement("style");
  loadingStyles.textContent = `
        #loadingOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-in-out;
        }
        
        .loading-content {
            text-align: center;
            color: white;
            padding: 20px;
        }
        
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 4px solid rgba(51, 10, 58, 0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
      .loading-content h2 {
        font-size: 24px;
        margin-bottom: 10px;
        font-family: 'Pacifico', Arial, sans-serif;
    }
    
    .loading-content p {
        font-size: 16px;
        opacity: 0.8;
        font-family: 'Pacifico', Arial, sans-serif;
    }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
  document.head.appendChild(loadingStyles);
  document.body.appendChild(loadingOverlay);
  return loadingOverlay;
}
function removeLoadingUI() {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    loadingOverlay.style.animation = "fadeOut 0.3s ease-in-out";
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
  }
}
window.isWebsiteReady = false;
async function loadWebsiteFromServer() {
  const websiteId = window.birthdayAPI.getWebsiteIdFromURL();
  if (!websiteId) {
    initializeDefaultSettings();
    applyLoadedSettings();
    window.isWebsiteReady = true;
    if (typeof startWebsite === "function") tryStartWebsiteWhenLandscape();
    ;
    return;
  }
  const settingsButton2 = document.getElementById("settingsButton");
  const settingsHint = document.getElementById("settingsHint");
  const pricingContainer = document.getElementById("pricingContainer");
  if (settingsButton2) {
    settingsButton2.style.display = "none";
  }
  if (settingsHint) {
    settingsHint.style.display = "none";
  }
  if (pricingContainer) {
    pricingContainer.style.display = "none";
  }
  const languageSwitchBtn = document.getElementById("langSwitchBtn");
  if (languageSwitchBtn) {
    languageSwitchBtn.style.display = "none";
  }
  const loadingOverlay = createLoadingUI();
  try {
    const result = await window.birthdayAPI.getBirthdayWebsiteByWebsiteId(websiteId);
    if (result.success && result.data) {
      const serverSettings = result.data.settings;
      const status = result.data.status;
      const copyrightElement = document.querySelector(".copyright");
      if (status === "PAID" && copyrightElement) {
        copyrightElement.style.display = "none";
      } else {
      }
      window.settings = {
        music: serverSettings.music || "./music/happybirtday_uia.mp3",
        countdown: serverSettings.countdown || 3,
        matrixText: serverSettings.matrixText || "HAPPYBIRTHDAY",
        matrixColor1: serverSettings.matrixColor1 || "#ffb6c1",
        matrixColor2: serverSettings.matrixColor2 || "#ffc0cb",
        sequence: serverSettings.sequence || "HAPPY|BIRTHDAY|TO|YOU|❤",
        sequenceColor: serverSettings.sequenceColor || "#d39b9b",
        gift: serverSettings.gift || "",
        // ✅ Sửa logic boolean - kiểm tra chính xác giá trị
        enableBook: serverSettings.enableBook === true,
        enableHeart: serverSettings.enableHeart === true,
        isSave: serverSettings.isSave === true || false,
        // Backward compatibility
        pages: serverSettings.pages || []
      };
      pages = window.settings.pages;
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      removeLoadingUI();
      resetWebsiteState();
      window.isWebsiteReady = true;
      if (typeof startWebsite === "function") tryStartWebsiteWhenLandscape();
      ;
    } else {
      throw new Error(result.error || "Không thể tải dữ liệu từ server");
    }
  } catch (error) {
    initializeDefaultSettings();
    applyLoadedSettings();
    window.isWebsiteReady = true;
    if (typeof startWebsite === "function") tryStartWebsiteWhenLandscape();
    ;
  }
}
if (applySettingsButton) {
  applySettingsButton.addEventListener("click", () => {
    var _a;
    const enableBookSelect = document.getElementById("enableBook");
    const isBookEnabled = enableBookSelect ? enableBookSelect.value === "true" : false;
    if (isBookEnabled) {
      if (settings.pages.length === 0) {
        alert("❌ Sách cần có trang!\n\nVui lòng thêm ít nhất 1 trang cho sách hoặc tắt tính năng sách.");
        return;
      }
    }
    const totalPages = settings.pages.length;
    if (totalPages > 1 && totalPages % 2 === 0) {
      alert(`❌ ${t("invalidPageStructure")}

${t("currentPages", { total: totalPages })}
${t("bookStructureGuide")}

${t("pleaseAddOrRemovePage")}`);
      return;
    }
    settings.music = document.getElementById("backgroundMusic").value;
    settings.countdown = parseInt(document.getElementById("countdownTime").value) || 3;
    settings.matrixText = document.getElementById("matrixText").value || "HAPPYBIRTHDAY";
    settings.matrixColor1 = document.getElementById("matrixColor1").value;
    settings.matrixColor2 = document.getElementById("matrixColor2").value;
    settings.sequence = document.getElementById("sequenceText").value || "HAPPY|BIRTHDAY|MY|CUTEE|LITTLE|SWARALI|❤ ";
    settings.sequenceColor = document.getElementById("sequenceColor").value;
    settings.gift = document.getElementById("giftImage").value;
    const activeButton = document.querySelector(".color-theme-btn.active");
    if (activeButton) {
      settings.colorTheme = activeButton.getAttribute("data-theme");
    }
    settings.enableBook = document.getElementById("enableBook").value === "true";
    settings.enableHeart = document.getElementById("enableHeart").value === "true";
    settings.isSave = ((_a = document.getElementById("isSave")) == null ? void 0 : _a.checked) || false;
    window.lastIsSaveState = settings.isSave;
    const newPages = [];
    settings.pages.forEach((page, index) => {
      const fileInput = document.getElementById(`pageImage${index}`);
      const contentInput = document.getElementById(`pageContent${index}`);
      const newPage = {};
      if (fileInput && fileInput.files.length > 0) {
        newPage.image = URL.createObjectURL(fileInput.files[0]);
      } else {
        newPage.image = page.image;
      }
      if (contentInput) {
        newPage.content = contentInput.value;
      }
      newPages.push(newPage);
    });
    settings.pages = newPages;
    if (window.pricingCalculator) {
      window.pricingCalculator.updateFromSettings(settings);
    }
    window.settings = settings;
    resetWebsiteState();
    stopMusicPreview();
    settingsModal.style.display = "none";
    if (typeof startWebsite === "function") {
      tryStartWebsiteWhenLandscape();
      ;
    }
  });
}
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}
const fullscreenBtn = document.getElementById("fullscreenBtn");
fullscreenBtn.style.zIndex = 9009999;
function updateFullscreenBtnVisibility() {
  if (fullscreenBtn && isAndroid() && !document.fullscreenElement) {
    fullscreenBtn.style.display = "block";
    if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
    fullscreenBtn.hideTimeout = setTimeout(() => {
      fullscreenBtn.style.display = "none";
    }, 2500);
  } else if (fullscreenBtn) {
    fullscreenBtn.style.display = "none";
    if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
  }
}
updateFullscreenBtnVisibility();
fullscreenBtn.onclick = function() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      elem.requestFullscreen();
    }
  } else {
    alert(t("fullscreenNotSupported"));
  }
  fullscreenBtn.style.display = "none";
  if (fullscreenBtn.hideTimeout) clearTimeout(fullscreenBtn.hideTimeout);
};
document.addEventListener("fullscreenchange", function() {
  updateFullscreenBtnVisibility();
});
function isLandscapeMode() {
  return window.innerWidth > window.innerHeight;
}
function tryStartWebsiteWhenLandscape() {
  if (window.isWebsiteReady && typeof startWebsite === "function") {
    if (isLandscapeMode()) {
      startWebsite();
    } else {
      window.addEventListener("resize", function onResize() {
        if (isLandscapeMode()) {
          startWebsite();
          window.removeEventListener("resize", onResize);
        }
      });
    }
  }
}
