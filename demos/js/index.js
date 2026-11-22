  // Wrap toàn bộ script trong IIFE để tránh lỗi duplicate declaration
  (function() {
    'use strict';


    // ===== OVERLAY & AUDIO LOGIC =====
    var orientationOverlay = document.getElementById('orientationOverlay');
    var btnDaHieu = document.getElementById('btnDaHieu');
    var audio = document.getElementById('audio-para-ti');

    // Cờ: user đã bấm "Đã hiểu" nhưng data chưa về
    var pendingPlay = false;

    function setAudioSrc(data) {
      if (!audio || !data) return;
      if (data.musicType === 'Sample' && data.musicPath) {
        audio.src = data.musicPath;
      } else if (data.musicType === 'Custom' && data.customMusic) {
        // customMusic có thể là URL hoặc base64 data URL
        audio.src = data.customMusic;
      }
    }

    function playAudio() {
      if (!audio || !audio.src || audio.src === window.location.href) return;
      audio.play().catch(function() {
        // Autoplay bị block – không làm gì, user đã click nên thường ok
      });
    }

    if (btnDaHieu) {
      btnDaHieu.addEventListener('click', function() {
        if (orientationOverlay) orientationOverlay.style.display = 'none';
        // Play nhạc
        if (audio && audio.src && audio.src !== window.location.href) {
          playAudio();
        } else {
          pendingPlay = true;
        }
        // Khởi động lại toàn bộ hiệu ứng từ đầu
        if (typeof startExperience === 'function') startExperience();
      });
    }

    // ===== GIFT DATA =====
    // DearGift: dữ liệu quà do PHP nhúng sẵn vào window.GIFT83_DATA (không gọi API ngoài).

    // Khai báo trước ở outer scope để button click handler gọi được
    // (function declarations inside try{} block-scoped trong strict mode)
    var applyGiftDataToLetter;
    var startExperience;

    function onGiftDataLoaded(data) {
      window.gift83Data = data;
      // Intro text: bản ghi cũ (không có introText) → mặc định; có chữ → gán; rỗng → set rỗng (không hiện câu chúc).
      try {
        var introTextEl = document.querySelector('.intro__text');
        if (introTextEl && data) {
          if (!('introText' in data)) {
            introTextEl.textContent = "Happy Women's Day 8/3";
          } else {
            introTextEl.textContent = String(data.introText || '').trim();
          }
        }
      } catch (e) {}
      setAudioSrc(data);
      if (pendingPlay) {
        pendingPlay = false;
        playAudio();
      }
      if (typeof applyGiftDataToLetter === 'function') applyGiftDataToLetter(data);
    }

    if (window.GIFT83_DATA) onGiftDataLoaded(window.GIFT83_DATA);

    try {
  // Generar partículas blancas animadas que suben desde abajo
  function randomBetween(a, b) {
    return Math.random() * (b - a) + a;
  }
  function createParticles() {
    const particlesContainer = document.querySelector('.particles');
      if (!particlesContainer) {
        console.error('❌ [Tulipanes] Không tìm thấy .particles container!');
        return;
      }
    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      // Posición horizontal aleatoria
      p.style.left = randomBetween(0, 100) + 'vw';
      // Tamaño aleatorio
      const size = randomBetween(0.5, 1.5);
      p.style.width = size + 'vmin';
      p.style.height = size + 'vmin';
      // Duración y retardo aleatorio
      const duration = randomBetween(3, 7);
      const delay = randomBetween(0, 5);
      p.style.animationDuration = duration + 's';
      p.style.animationDelay = delay + 's';
      // Opacidad aleatoria
      p.style.opacity = randomBetween(0.4, 0.9);
      particlesContainer.appendChild(p);
    }
  }
    
  createParticles();
    
  // Đọc gift83Data từ window (nếu có sẵn, hoặc sẽ được set bởi fetch ở trên)
  var gift83Data = window.gift83Data || null;

  // Các phần tử hiệu ứng
  var introEl = document.getElementById('intro');
  var ramoEl = document.querySelector('.ramo');
  var ramoImg = ramoEl ? ramoEl.querySelector('img') : null;

  function showRamoAndRest() {
    if (ramoEl) ramoEl.classList.add('ramo--visible');
    document.querySelectorAll('.rabbit').forEach(function(rabbit) {
      rabbit.classList.add('rabbit--visible');
    });
    var letterEl = document.querySelector('.letter');
    if (letterEl) letterEl.classList.add('letter--visible');
  }

  function tryShowBouquet() {
    if (ramoImg && ramoImg.complete) {
      showRamoAndRest();
    } else if (ramoImg) {
      ramoImg.addEventListener('load', showRamoAndRest);
      ramoImg.addEventListener('error', showRamoAndRest);
      setTimeout(showRamoAndRest, 8000);
    } else {
      showRamoAndRest();
    }
  }

  // Gán vào biến đã khai báo ở outer scope để button click handler gọi được
  startExperience = function() {
    // 1. Đảm bảo các class hiển thị chưa được set (reset sạch)
    if (ramoEl) ramoEl.classList.remove('ramo--visible');
    document.querySelectorAll('.rabbit').forEach(function(r) { r.classList.remove('rabbit--visible'); });
    var letterEl = document.querySelector('.letter');
    if (letterEl) letterEl.classList.remove('letter--visible');
    if (introEl) introEl.classList.remove('is-done');

    // 2. Xóa not-loaded, nhưng giữ hoa pause thêm 0.5s
    var flowersEl = document.querySelector('.flowers');
    if (flowersEl) flowersEl.classList.add('flowers--paused');
    document.body.classList.remove('not-loaded');
    setTimeout(function() {
      if (flowersEl) flowersEl.classList.remove('flowers--paused');
    }, 500);

    // 3. Bó hoa hiện sau 3.5s (độc lập với intro)
    setTimeout(function() {
      tryShowBouquet();
    }, 3500);

    // 4. Intro fade out sau 6s (độc lập với bó hoa)
    setTimeout(function() {
      if (introEl) introEl.classList.add('is-done');
    }, 6000);
  }

    // Modal thư: click phong bì mở, có tiêu đề + nội dung
    var letterEnvelope = document.querySelector('.letter-envelope, .letter');
    var letterModal = document.getElementById('letterModal');
    var letterCloseBtn = document.getElementById('letterClose');
    var letterTitleEl = document.getElementById('letterTitle');
    var letterContentEl = document.getElementById('letterContent');
    var letterModalFooter = document.getElementById('letterModalFooter');
    var letterBtnContinue = document.getElementById('letterBtnContinue');
    var photoFloatContainer = document.getElementById('photoFloatContainer');

    var letterData = {
      title: 'Gửi người tôi yêu thương nhất',
      content: 'Hôm nay, tôi muốn gửi đến bạn những lời chân thành từ tận đáy lòng. Mỗi ngày trôi qua, tôi đều cảm thấy may mắn vì có bạn bên cạnh.',
      signature: 'Người yêu bạn ❤️',
      flyingImages: [],
      hasVipPhotos: false
    };

    // Gán hàm vào biến đã khai báo ở outer scope để onGiftDataLoaded dùng được
    applyGiftDataToLetter = function(data) {
      if (!data) return;
      if (data.letterTitle) letterData.title = data.letterTitle;
      if (data.letterContent != null) {
        letterData.content = Array.isArray(data.letterContent)
          ? data.letterContent.join('\n\n')
          : String(data.letterContent);
      }
      if (data.letterSignature) letterData.signature = data.letterSignature;
      // vipPhotos dùng làm ảnh bay nếu có
      if (data.vipPhotos && Array.isArray(data.vipPhotos) && data.vipPhotos.length > 0) {
        letterData.flyingImages = data.vipPhotos;
        letterData.hasVipPhotos = true;
      } else if (data.flyingImages && Array.isArray(data.flyingImages) && data.flyingImages.length > 0) {
        letterData.flyingImages = data.flyingImages;
        letterData.hasVipPhotos = true;
      }
    };

    // Áp dụng ngay nếu data đã có (ví dụ từ window.gift83Data set trước)
    if (gift83Data) applyGiftDataToLetter(gift83Data);

    var letterTypingTimeout = null;

    /** Lặp theo grapheme (emoji 1 đơn vị). chars = Array.from(text) gọi từ ngoài để tránh vỡ icon/emoji (surrogate pair). */
    function typeChar(chars, index, el, onDone) {
      if (index >= chars.length) {
        if (onDone) onDone();
        return;
      }
      var ch = chars[index];
      if (ch === '\n') {
        el.appendChild(document.createElement('br'));
      } else {
        el.appendChild(document.createTextNode(ch));
      }
      if (letterModal && letterModal.classList.contains('is-open')) {
        el.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }
      var delay = ch.length > 1 || (ch.codePointAt && ch.codePointAt(0) > 0xFFFF)
        ? 50
        : (/[.,!?;:]/.test(ch) ? 70 : (ch === ' ' ? 32 : 28));
      letterTypingTimeout = setTimeout(function() {
        typeChar(chars, index + 1, el, onDone);
      }, delay);
    }

    function openLetterModal() {
      if (letterModal) letterModal.classList.add('is-open');
      if (letterTitleEl) letterTitleEl.textContent = '';
      if (letterContentEl) letterContentEl.innerHTML = '';
      if (letterModalFooter) letterModalFooter.style.display = 'none';

      function runTyping() {
        var titleDone = false;
        function onTitleDone() {
          titleDone = true;
          if (letterContentEl) {
            var paragraphs = letterData.content.split(/\n\n+/);
            var paraIndex = 0;
            function typeNextParagraph() {
              if (paraIndex >= paragraphs.length) {
                if (letterData.signature) {
                  var sigWrap = document.createElement('p');
                  sigWrap.className = 'letter-modal__signature-wrap';
                  sigWrap.style.margin = '20px 0 0 0';
                  var sigEl = document.createElement('span');
                  sigEl.className = 'letter-modal__signature';
                  letterContentEl.appendChild(sigWrap);
                  sigWrap.appendChild(sigEl);
                  typeChar(Array.from(letterData.signature), 0, sigEl, function() {
                    if (letterModalFooter && letterData.hasVipPhotos) letterModalFooter.style.display = 'block';
                  });
                } else {
                  if (letterModalFooter && letterData.hasVipPhotos) letterModalFooter.style.display = 'block';
                }
                return;
              }
              var p = document.createElement('p');
              p.style.margin = '0 0 12px 0';
              letterContentEl.appendChild(p);
              var paraText = paragraphs[paraIndex].replace(/\n/g, '\n');
              typeChar(Array.from(paraText), 0, p, function() {
                paraIndex++;
                typeNextParagraph();
              });
            }
            typeNextParagraph();
          }
        }
        if (letterTitleEl && letterData.title) {
          typeChar(Array.from(letterData.title), 0, letterTitleEl, onTitleDone);
        } else {
          onTitleDone();
        }
      }
      setTimeout(runTyping, 80);
    }

    function closeLetterModal() {
      if (letterTypingTimeout) {
        clearTimeout(letterTypingTimeout);
        letterTypingTimeout = null;
      }
      if (letterModal) letterModal.classList.remove('is-open');
    }

    if (letterEnvelope) {
      letterEnvelope.addEventListener('click', function(e) {
        e.preventDefault();
        openLetterModal();
      });
    }
    if (letterCloseBtn) letterCloseBtn.addEventListener('click', closeLetterModal);
    if (letterModal) {
      letterModal.querySelector('.letter-modal__backdrop').addEventListener('click', closeLetterModal);
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && letterModal && letterModal.classList.contains('is-open')) {
        closeLetterModal();
      }
    });

    var flyingInterval = null;

    // Zone pool: shuffle + xoay vòng để trải đều vị trí
    var shuffledZones = [];
    var zonePointer = 0;

    function nextZone() {
      if (zonePointer >= shuffledZones.length) {
        shuffledZones = shuffleArray([0,1,2,3,4,5,6,7,8,9]);
        zonePointer = 0;
      }
      return shuffledZones[zonePointer++];
    }

    // Theo dõi vùng đã dùng gần đây để tránh ảnh đè nhau (giữ lại để dùng nếu cần)
    var recentZones = [];

    // Shuffle + xoay vòng ảnh (option 2)
    var shuffledUrls = [];
    var urlPointer = 0;

    function shuffleArray(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function nextUrl(urls) {
      // Nếu danh sách thay đổi hoặc hết vòng → shuffle lại
      if (shuffledUrls.length !== urls.length || urlPointer >= shuffledUrls.length) {
        shuffledUrls = shuffleArray(urls);
        urlPointer = 0;
      }
      return shuffledUrls[urlPointer++];
    }

    function addFlyingBatch() {
      if (!photoFloatContainer || !photoFloatContainer.classList.contains('is-active')) return;
      var defaultUrls = ['./assets/images/wrapper_flower.png'];
      var urls = letterData.flyingImages && letterData.flyingImages.length > 0 ? letterData.flyingImages : defaultUrls;
      var count = 2 + Math.floor(Math.random() * 2); // 2-3 ảnh/đợt

      for (var b = 0; b < count; b++) {
        var zone = nextZone();
        // Vị trí trong zone: zone*10% + random trong 7% (tránh sát mép zone)
        var leftPct = zone * 10 + 1.5 + Math.random() * 7;
        leftPct = Math.min(Math.max(leftPct, 2), 88);

        var url = nextUrl(urls);
        var wrap = document.createElement('div');
        wrap.className = 'photo-float';
        wrap.style.left = leftPct + '%';
        wrap.style.animationDuration = (7 + Math.random() * 4) + 's';
        wrap.style.animationDelay = '0s';
        wrap.style.setProperty('--float-rotate', (Math.random() * 30 - 15) + 'deg');
        var img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        wrap.appendChild(img);
        wrap.addEventListener('animationend', function() {
          if (this.parentNode) this.parentNode.removeChild(this);
        });
        photoFloatContainer.appendChild(wrap);
      }

    }

    function startFlyingPhotos() {
      closeLetterModal();
      document.body.classList.add('content-hidden');
      if (photoFloatContainer) photoFloatContainer.classList.add('is-active');
      photoFloatContainer.innerHTML = '';
      recentZones = [];
      shuffledUrls = [];
      urlPointer = 0;
      shuffledZones = [];
      zonePointer = 0;
      if (flyingInterval) clearInterval(flyingInterval);
      addFlyingBatch();
      flyingInterval = setInterval(addFlyingBatch, 2000);
    }
    if (letterBtnContinue) letterBtnContinue.addEventListener('click', startFlyingPhotos);
  
    } catch (error) {
      console.error('❌ [Tulipanes] LỖI TRONG SCRIPT:', error);
      console.error('❌ [Tulipanes] Error stack:', error.stack);
        }
  })(); // Đóng IIFE