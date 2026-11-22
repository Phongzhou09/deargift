// Gift Page Script
(function() {
    // Đảm bảo body và html có pointer-events
    function checkBlockingElements() {
        document.body.style.pointerEvents = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
        
        // Xóa canvas từ trang trước nếu còn
        const canvas = document.querySelector('.canvas');
        if (canvas) {
            canvas.remove();
        }
    }
    
    // Function để set background image - luôn dùng background1.jpg cho tất cả thiết bị
    function setBackgroundImage() {
        const backgroundImg = document.querySelector('.gift-background');
        if (!backgroundImg) return;
        
        // Luôn dùng background1.jpg cho tất cả thiết bị
        if (backgroundImg.src && !backgroundImg.src.includes('background1.jpg')) {
            backgroundImg.src = (window.__XMAS_BASE||'')+'/assets/images/background1.jpg';
        } else if (!backgroundImg.src) {
            backgroundImg.src = (window.__XMAS_BASE||'')+'/assets/images/background1.jpg';
        }
    }
    
    // Đợi DOM sẵn sàng
    function initGiftPage() {
        // Set background image phù hợp với kích thước màn hình
        setBackgroundImage();
        
        // Lắng nghe resize để thay đổi background khi xoay màn hình hoặc resize
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                setBackgroundImage();
            }, 250); // Debounce 250ms
        });
        
        // Lấy tên người nhận từ settings (nếu có)
        const recipientName = (window.settings && window.settings.recipientName) || 'bạn';
        
        // ===== QUẢN LÝ SỰ KIỆN MỞ QUÀ =====
        const giftOpenManager = window.giftOpenManager = window.giftManager = {
            giftBox: null,
            giftContainer: null,
            letterModal: null,
            letterNextButton: null,
            isClickable: false,
            hasClicked: false,
            recipientName: recipientName,
            
            /**
             * Khởi tạo quản lý mở quà
             */
            init() {
                this.giftBox = document.querySelector('.gift-box-image');
                this.giftContainer = document.querySelector('.gift-falling-container');
                this.letterModal = document.getElementById('christmasLetterModal');
                this.letterNextButton = document.getElementById('letterNextButton');
                
                if (!this.giftBox || !this.giftContainer || !this.letterModal || !this.letterNextButton) {
                    // Retry sau 1 giây nếu không tìm thấy
                    setTimeout(() => this.init(), 1000);
                    return;
                }
                
                // Cập nhật thông tin trong bức thư
                this.updateLetterContent();
                
                // Check vipGift và ẩn button nếu không có
                this.checkAndHideVipButton();
                
                // Gắn event listener cho nút mũi tên
                this.letterNextButton.addEventListener('click', () => {
                    this.openGift();
                });
            
                // Gắn event listener cho nút đóng
                const closeButton = document.getElementById('letterCloseButton');
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        this.closeLetter();
                    });
                }
            
            // Gắn listener NGAY để không có "khoảng chết" — bấm là ăn.
            // Hộp quà mở được ngay khi rơi xong (animationend của giftFall),
            // fallback 4.6s phòng khi trình duyệt không bắn animationend.
            this.attachEventListeners();
            const makeReady = () => {
                if (this.isClickable) return;
                this.isClickable = true;
                this.giftContainer.classList.add('ready');
                // Gợi ý "chạm để mở" để người dùng biết hộp quà đã sẵn sàng.
                if (!document.getElementById('giftTapHint')) {
                    const hint = document.createElement('div');
                    hint.id = 'giftTapHint';
                    hint.textContent = '🎁 Chạm vào hộp quà để mở';
                    hint.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:60;'
                        + 'background:rgba(0,0,0,.45);color:#fff;padding:10px 18px;border-radius:999px;'
                        + 'font:600 15px/1.2 system-ui,-apple-system,sans-serif;white-space:nowrap;'
                        + 'pointer-events:none;backdrop-filter:blur(4px);animation:giftHintPulse 1.4s ease-in-out infinite;';
                    document.body.appendChild(hint);
                    if (!document.getElementById('giftTapHintCss')) {
                        const st = document.createElement('style');
                        st.id = 'giftTapHintCss';
                        st.textContent = '@keyframes giftHintPulse{0%,100%{opacity:.65;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.06)}}';
                        document.head.appendChild(st);
                    }
                }
            };
            this.giftContainer.addEventListener('animationend', makeReady, { once: true });
            setTimeout(makeReady, 4600);
            },
            
            /**
             * Check vipGift và ẩn button nếu vipGift = null
             */
            checkAndHideVipButton() {
                const giftData = window.giftChristmasData;
                
                // Nếu có giftData và vipGift = null thì ẩn button
                if (giftData && giftData.vipGift === null && this.letterNextButton) {
                    this.letterNextButton.style.display = 'none';
                }
            },
            
            /**
             * Kiểm tra xem có nên hiển thị button không (dựa trên vipGift)
             */
            shouldShowNextButton() {
                const giftData = window.giftChristmasData;
                // Chỉ hiển thị nếu vipGift không phải null
                return giftData && giftData.vipGift !== null;
            },
            
            /**
             * Cập nhật nội dung bức thư (tên người nhận, ngày tháng)
             */
            updateLetterContent() {
                // Lấy data từ window.giftChristmasData (đã fetch ở index.html)
                const giftData = window.giftChristmasData;
                
                if (giftData && giftData.letter) {
                    // Gán letter data vào modal
                    this.applyLetterData(giftData.letter);
                    return;
                }
                
                // Fallback: dùng data mặc định nếu không có GiftChristmas data
                const recipientNameEl = document.getElementById('letterRecipientName');
                if (recipientNameEl) {
                    recipientNameEl.textContent = this.recipientName;
                }
            },
            
            /**
             * Gắn tất cả event listeners cho hộp quà
             */
            attachEventListeners() {
                const clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleGiftClick(e);
                };
                
                // Click và touch events
                this.giftBox.addEventListener('click', clickHandler, { passive: false });
                this.giftBox.addEventListener('touchend', clickHandler, { passive: false });
                this.giftContainer.addEventListener('click', clickHandler, { passive: false });
                this.giftContainer.addEventListener('touchend', clickHandler, { passive: false });
                
                // Hover effects (chỉ trên desktop)
                this.giftBox.addEventListener('mouseenter', () => {
                    if (!this.hasClicked) {
                        this.giftBox.style.transform = 'translate(-50%, -50%) scale(1.1)';
                        this.giftBox.style.transition = 'transform 0.2s ease-out';
                    }
                });
                
                this.giftBox.addEventListener('mouseleave', () => {
                    if (!this.hasClicked) {
                        this.giftBox.style.transform = 'translate(-50%, -50%) scale(1)';
                    }
                });
            },
            
            /**
             * Xử lý sự kiện click/touch vào hộp quà
             */
            handleGiftClick(e) {
                if (!this.isClickable || this.hasClicked) {
                        return;
                    }
                
                this.hasClicked = true;

                // Ẩn gợi ý "chạm để mở"
                const hint = document.getElementById('giftTapHint');
                if (hint) hint.remove();

                // Thêm hiệu ứng khi click
                this.applyClickEffect();
                
                // Đợi một chút để hiệu ứng scale hoàn thành rồi hiển thị bức thư
                setTimeout(() => {
                    this.showLetter();
                }, 300);
            },
            
            /**
             * Đóng bức thư Giáng sinh
             */
            closeLetter() {
                if (this.letterModal) {
                    this.letterModal.classList.remove('show');
                    document.body.style.overflow = '';
                    
                    // Ẩn nút close
                    const closeButton = document.getElementById('letterCloseButton');
                    if (closeButton) {
                        closeButton.style.display = 'none';
                    }
                    
                    // Reset hasClicked để có thể mở lại thư
                    this.hasClicked = false;
                }
            },
            
            /**
             * Hiển thị bức thư Giáng sinh
             */
            showLetter() {
                if (this.letterModal) {
                    // Ẩn nội dung ngay lập tức trước khi hiển thị modal
                    const titleEl = document.querySelector('.letter-title');
                    const dateEl = document.querySelector('.letter-date');
                    const greetingEl = document.querySelector('.letter-greeting');
                    const textEls = document.querySelectorAll('.letter-text');
                    const signatureEl = document.querySelector('.letter-signature');
                    
                    // Ẩn tất cả nội dung ngay lập tức
                    [titleEl, dateEl, greetingEl, ...Array.from(textEls), signatureEl].forEach(el => {
                        if (el) {
                            el.style.opacity = '0';
                            el.style.visibility = 'hidden';
                        }
                    });
                    
                    // Hiển thị modal
                    this.letterModal.classList.add('show');
                    // Ngăn scroll body khi modal mở
                    document.body.style.overflow = 'hidden';
                    
                    // Hiển thị nút close
                    const closeButton = document.getElementById('letterCloseButton');
                    if (closeButton) {
                        closeButton.style.display = 'flex';
                    }
                    
                    // Bắt đầu typing effect ngay lập tức (không delay)
                    requestAnimationFrame(() => {
                        this.startTypingEffect();
                    });
                }
            },
            
            /**
             * Hiệu ứng typing writer cho lá thư
             */
            startTypingEffect() {
                // Kiểm tra xem đã có letter data chưa (đã được apply trong updateLetterContent)
                const giftData = window.giftChristmasData;
                if (giftData && giftData.letter) {
                    // Đã có data, sử dụng data đã gán để typing
                    this.startTypingWithLetterData(giftData.letter);
                    return;
                }
                
                // Fallback: dùng nội dung mặc định từ HTML
                this.startTypingWithDefaultContent();
            },
            
            /**
             * Typing animation với letter data từ GiftChristmas
             */
            startTypingWithLetterData(letter) {
                const titleEl = document.querySelector('.letter-title');
                const greetingEl = document.querySelector('.letter-greeting');
                const textEls = document.querySelectorAll('.letter-text');
                const signatureEl = document.querySelector('.letter-signature');
                
                // Chia content thành các đoạn
                const paragraphs = letter.content ? letter.content.split(/\n\n|\n/).filter(p => p.trim()) : [];
                
                // Lưu nội dung vào data attribute để typing
                const contents = {
                    title: '🎄 MERRY CHRISTMAS 🎄',
                    greeting: letter.greeting || '',
                    texts: paragraphs,
                    signature: letter.signature ? `Với tình yêu thương,<br><span class="signature-name">${letter.signature}</span>` : ''
                };
                
                // Xóa nội dung và chuẩn bị typing
                const allElements = [titleEl, greetingEl, ...Array.from(textEls), signatureEl].filter(el => el);
                allElements.forEach(el => {
                    if (el) {
                        el.innerHTML = '';
                        el.style.opacity = '0';
                        el.style.visibility = 'visible';
                        el.style.transition = 'none';
                    }
                });
                
                // Ẩn nút mũi tên
                const nextButton = document.getElementById('letterNextButton');
                if (nextButton) {
                    nextButton.style.opacity = '0';
                    nextButton.style.display = 'none';
                }
                
                const typingSpeed = 70;
                const elementsToType = [];
                
                if (titleEl && contents.title) {
                    elementsToType.push({ element: titleEl, text: contents.title });
                }
                if (greetingEl && contents.greeting) {
                    elementsToType.push({ element: greetingEl, text: contents.greeting });
                }
                contents.texts.forEach((text, index) => {
                    let textEl = textEls[index];
                    if (!textEl && index === 0) {
                        const letterBody = document.querySelector('.letter-body');
                        textEl = document.createElement('p');
                        textEl.className = 'letter-text';
                        letterBody.insertBefore(textEl, signatureEl);
                    }
                    if (textEl) {
                        elementsToType.push({ element: textEl, text: text });
                    }
                });
                if (signatureEl && contents.signature) {
                    elementsToType.push({ element: signatureEl, text: contents.signature, isLast: true });
                }
                
                // Type từng phần tử
                let currentIndex = 0;
                const typeNext = () => {
                    if (currentIndex >= elementsToType.length) {
                        // Chỉ hiển thị button nếu vipGift không phải null
                        if (nextButton && this.shouldShowNextButton()) {
                            nextButton.style.display = 'inline-flex';
                            setTimeout(() => {
                                nextButton.style.transition = 'opacity 0.5s ease-in';
                                nextButton.style.opacity = '1';
                            }, 100);
                        }
                        return;
                    }
                    
                    const current = elementsToType[currentIndex];
                    if (current.element) {
                        current.element.style.opacity = '1';
                    }
                    
                    this.typeText(current.element, current.text, typingSpeed, () => {
                        if (!current.isLast) {
                            currentIndex++;
                            typeNext();
                        } else {
                            // Chỉ hiển thị button nếu vipGift không phải null
                            if (nextButton && this.shouldShowNextButton()) {
                                nextButton.style.display = 'inline-flex';
                                setTimeout(() => {
                                    nextButton.style.transition = 'opacity 0.5s ease-in';
                                    nextButton.style.opacity = '1';
                                    
                                    // Scroll xuống hết để thấy toàn bộ button
                                    const scrollContainer = nextButton.closest('.letter-paper') || nextButton.closest('.letter-modal');
                                    if (scrollContainer) {
                                        setTimeout(() => {
                                            scrollContainer.scrollTo({
                                                top: scrollContainer.scrollHeight,
                                                behavior: 'smooth'
                                            });
                                        }, 200);
                                    }
                                }, 100);
                            }
                        }
                    });
                };
                
                typeNext();
            },
            
            /**
             * Typing animation với nội dung mặc định (fallback)
             */
            startTypingWithDefaultContent() {
                const titleEl = document.querySelector('.letter-title');
                const dateEl = document.querySelector('.letter-date');
                const greetingEl = document.querySelector('.letter-greeting');
                const textEls = document.querySelectorAll('.letter-text');
                const signatureEl = document.querySelector('.letter-signature');
                
                const contents = {
                    title: titleEl ? titleEl.innerHTML : '',
                    date: dateEl ? dateEl.innerHTML : '',
                    greeting: greetingEl ? greetingEl.innerHTML : '',
                    texts: Array.from(textEls).map(el => el.innerHTML),
                    signature: signatureEl ? signatureEl.innerHTML : ''
                };
                
                // Xóa nội dung ban đầu và thiết lập fade-in
                const allElements = [titleEl, dateEl, greetingEl, ...Array.from(textEls), signatureEl].filter(el => el);
                allElements.forEach(el => {
                    if (el) {
                        el.innerHTML = '';
                        el.style.opacity = '0';
                        el.style.visibility = 'visible';
                        el.style.transition = 'none';
                    }
                });
                
                // Ẩn nút mũi tên
                const nextButton = document.getElementById('letterNextButton');
                if (nextButton) {
                    nextButton.style.opacity = '0';
                    nextButton.style.display = 'none';
                }
                
                const typingSpeed = 70;
                const elementsToType = [];
                
                if (titleEl && contents.title) {
                    elementsToType.push({ element: titleEl, text: contents.title });
                }
                if (dateEl && contents.date) {
                    elementsToType.push({ element: dateEl, text: contents.date });
                }
                if (greetingEl && contents.greeting) {
                    elementsToType.push({ element: greetingEl, text: contents.greeting });
                }
                contents.texts.forEach((text, index) => {
                    if (textEls[index] && text) {
                        elementsToType.push({ element: textEls[index], text: text });
                    }
                });
                if (signatureEl && contents.signature) {
                    elementsToType.push({ element: signatureEl, text: contents.signature, isLast: true });
                }
                
                // Type từng phần tử
                let currentIndex = 0;
                const typeNext = () => {
                    if (currentIndex >= elementsToType.length) {
                        // Chỉ hiển thị button nếu vipGift không phải null
                        if (nextButton && this.shouldShowNextButton()) {
                            nextButton.style.display = 'inline-flex';
                            setTimeout(() => {
                                nextButton.style.transition = 'opacity 0.5s ease-in';
                                nextButton.style.opacity = '1';
                            }, 100);
                        }
                        return;
                    }
                    
                    const current = elementsToType[currentIndex];
                    if (current.element) {
                        current.element.style.opacity = '1';
                    }
                    
                    this.typeText(current.element, current.text, typingSpeed, () => {
                        if (!current.isLast) {
                            currentIndex++;
                            typeNext();
                        } else {
                            // Chỉ hiển thị button nếu vipGift không phải null
                            if (nextButton && this.shouldShowNextButton()) {
                                nextButton.style.display = 'inline-flex';
                                setTimeout(() => {
                                    nextButton.style.transition = 'opacity 0.5s ease-in';
                                    nextButton.style.opacity = '1';
                                    
                                    // Scroll xuống hết để thấy toàn bộ button
                                    const scrollContainer = nextButton.closest('.letter-paper') || nextButton.closest('.letter-modal');
                                    if (scrollContainer) {
                                        setTimeout(() => {
                                            scrollContainer.scrollTo({
                                                top: scrollContainer.scrollHeight,
                                                behavior: 'smooth'
                                            });
                                        }, 200);
                                    }
                                }, 100);
                            }
                        }
                    });
                };
                
                typeNext();
            },
            
            /**
             * Áp dụng letter data vào modal (chỉ lưu data, không gán trực tiếp)
             */
            applyLetterData(letter) {
                const greetingEl = document.querySelector('.letter-greeting');
                const textEls = document.querySelectorAll('.letter-text');
                const signatureEl = document.querySelector('.letter-signature');
                
                // Gán greeting (có thể chứa tên người nhận)
                if (greetingEl && letter.greeting) {
                    greetingEl.innerHTML = letter.greeting;
                }
                
                // Gán content (chia thành các đoạn)
                if (letter.content) {
                    // Chia content thành các đoạn (theo dấu xuống dòng hoặc dấu chấm)
                    const paragraphs = letter.content.split(/\n\n|\n/).filter(p => p.trim());
                    
                    // Xóa các text element cũ và tạo mới
                    textEls.forEach((el, index) => {
                        if (paragraphs[index]) {
                            el.innerHTML = paragraphs[index].trim();
                            el.style.display = 'block';
                        } else {
                            el.style.display = 'none';
                        }
                    });
                    
                    // Nếu có nhiều đoạn hơn số text element, tạo thêm
                    if (paragraphs.length > textEls.length) {
                        const letterBody = document.querySelector('.letter-body');
                        paragraphs.slice(textEls.length).forEach(paragraph => {
                            const newP = document.createElement('p');
                            newP.className = 'letter-text';
                            newP.innerHTML = paragraph.trim();
                            letterBody.insertBefore(newP, signatureEl);
                        });
                    }
                }
                
                // Gán signature
                if (signatureEl && letter.signature) {
                    signatureEl.innerHTML = `
                        Với tình yêu thương,<br>
                        <span class="signature-name">${letter.signature}</span>
                    `;
                }
            },
            
            /**
             * Áp dụng nội dung thư mặc định (fallback)
             */
            applyDefaultLetterContent() {
                const greetingEl = document.querySelector('.letter-greeting');
                const textEls = document.querySelectorAll('.letter-text');
                const signatureEl = document.querySelector('.letter-signature');
                
                const contents = {
                    title: titleEl ? titleEl.innerHTML : '',
                    date: dateEl ? dateEl.innerHTML : '',
                    greeting: greetingEl ? greetingEl.innerHTML : '',
                    texts: Array.from(textEls).map(el => el.innerHTML),
                    signature: signatureEl ? signatureEl.innerHTML : ''
                };
                
                // Xóa nội dung ban đầu và thiết lập fade-in tức thì (không transition)
                const allElements = [titleEl, dateEl, greetingEl, ...Array.from(textEls), signatureEl].filter(el => el);
                allElements.forEach(el => {
                    el.innerHTML = '';
                    el.style.opacity = '0';
                    el.style.visibility = 'visible'; // Hiển thị element nhưng opacity = 0
                    el.style.transition = 'none'; // Bỏ transition để hiện tức thì
                });
                
                // Ẩn nút mũi tên ban đầu
                const nextButton = document.getElementById('letterNextButton');
                if (nextButton) {
                    nextButton.style.opacity = '0';
                    nextButton.style.display = 'none';
                }
                
                const typingSpeed = 70; // milliseconds per word (tốc độ fade-in từng từ - nhanh hơn)
                const pauseBetweenElements = 0; // không nghỉ giữa các phần tử, chạy liên tục
                
                // Tạo chuỗi các phần tử cần type theo thứ tự
                const elementsToType = [];
                
                if (titleEl && contents.title) {
                    elementsToType.push({ element: titleEl, text: contents.title });
                }
                if (dateEl && contents.date) {
                    elementsToType.push({ element: dateEl, text: contents.date });
                }
                if (greetingEl && contents.greeting) {
                    elementsToType.push({ element: greetingEl, text: contents.greeting });
                }
                // Thêm các đoạn text
                contents.texts.forEach((text, index) => {
                    if (textEls[index] && text) {
                        elementsToType.push({ element: textEls[index], text: text });
                    }
                });
                // Thêm signature cuối cùng
                if (signatureEl && contents.signature) {
                    elementsToType.push({ 
                        element: signatureEl, 
                        text: contents.signature,
                        isLast: true 
                    });
                }
                
                // Type từng phần tử một, đợi phần tử trước hoàn thành
                let currentIndex = 0;
                
                const typeNext = () => {
                    if (currentIndex >= elementsToType.length) {
                        // Hoàn thành tất cả, chỉ hiển thị nút mũi tên nếu vipGift không phải null
                        if (nextButton && this.shouldShowNextButton()) {
                            nextButton.style.display = 'inline-flex';
                            setTimeout(() => {
                                nextButton.style.transition = 'opacity 0.5s ease-in';
                                nextButton.style.opacity = '1';
                            }, 100);
                        }
                        return;
                    }
                    
                    const current = elementsToType[currentIndex];
                    const isLast = current.isLast || false;
                    
                    // Fade in element và bắt đầu type ngay lập tức (không đợi fade-in xong)
                    if (current.element) {
                        // Trigger fade-in ngay lập tức
                        current.element.style.opacity = '1';
                    }
                    
                    // Type phần tử hiện tại ngay (không delay)
                    this.typeText(current.element, current.text, typingSpeed, () => {
                        // Sau khi hoàn thành, type phần tử tiếp theo ngay lập tức (không delay)
                        if (!isLast) {
                                currentIndex++;
                            typeNext(); // Gọi ngay, không setTimeout
                        } else {
                            // Đã type xong phần tử cuối, chỉ hiển thị button nếu vipGift không phải null
                            if (nextButton && this.shouldShowNextButton()) {
                                nextButton.style.display = 'inline-flex';
                                setTimeout(() => {
                                    nextButton.style.transition = 'opacity 0.5s ease-in';
                                    nextButton.style.opacity = '1';
                                    
                                    // Scroll xuống hết để thấy toàn bộ button
                                    const scrollContainer = nextButton.closest('.letter-paper') || nextButton.closest('.letter-modal');
                                    if (scrollContainer) {
                                        setTimeout(() => {
                                            scrollContainer.scrollTo({
                                                top: scrollContainer.scrollHeight,
                                                behavior: 'smooth'
                                            });
                                        }, 200);
                                    }
                                }, 100);
                            }
                        }
                    });
                };
                
                // Bắt đầu type phần tử đầu tiên ngay lập tức
                typeNext(); // Bỏ setTimeout, bắt đầu ngay
            },
            
            /**
             * Fade-in từng từ vào element
             */
            typeText(element, text, speed = 30, onComplete = null) {
                // Tách text thành các từ (bao gồm cả khoảng trắng và dấu câu)
                const words = [];
                let currentWord = '';
                let isInTag = false;
                
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                        
                        if (char === '<') {
                        if (currentWord) {
                            words.push({ type: 'word', content: currentWord });
                            currentWord = '';
                        }
                            isInTag = true;
                        currentWord = char;
                        } else if (isInTag) {
                        currentWord += char;
                            if (char === '>') {
                            words.push({ type: 'tag', content: currentWord });
                            currentWord = '';
                                isInTag = false;
                        }
                    } else if (char === ' ' || char === '\n' || char === '\t') {
                        if (currentWord) {
                            words.push({ type: 'word', content: currentWord });
                            currentWord = '';
                        }
                        words.push({ type: 'space', content: char });
                        } else {
                        currentWord += char;
                    }
                }
                
                // Thêm từ cuối cùng nếu còn
                if (currentWord) {
                    words.push({ type: 'word', content: currentWord });
                }
                
                // Tạo HTML với các span cho mỗi từ
                let html = '';
                words.forEach((word, index) => {
                    if (word.type === 'tag') {
                        html += word.content;
                    } else if (word.type === 'space') {
                        html += word.content;
                    } else {
                        html += `<span class="fade-word" style="opacity: 0; transition: opacity 0.35s ease-in-out;">${word.content}</span>`;
                    }
                });
                
                element.innerHTML = html;
                
                // Fade-in từng từ
                const wordSpans = element.querySelectorAll('.fade-word');
                let currentWordIndex = 0;
                
                // Tìm container có thể scroll (letter-paper hoặc letter-modal)
                const scrollContainer = element.closest('.letter-paper') || element.closest('.letter-modal');
                
                // Phát hiện mobile landscape: 
                // - User agent là mobile device (bắt được mobile landscape)
                // - HOẶC chiều cao < 600px (bắt được mobile landscape - màn hình ngắn)
                // Web đã bắt xoay ngang nên chỉ cần quan tâm landscape
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isMobile = isMobileDevice || window.innerHeight < 600;
                
                // Flag để track xem đang scroll hay không
                let isScrolling = false;
                let lastScrollTime = 0;
                // Trên mobile scroll thường xuyên hơn (100ms), desktop 300ms
                const scrollThrottle = isMobile ? 100 : 300;
                // Trên mobile scroll mỗi từ, desktop mỗi 5 từ
                const scrollInterval = isMobile ? 1 : 5;
                
                // Hàm scroll đến element một cách mượt mà
                const scrollToElement = (targetElement) => {
                    if (!scrollContainer || !targetElement || isScrolling) return;
                    
                    const now = Date.now();
                    if (now - lastScrollTime < scrollThrottle) return;
                    
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elementRect = targetElement.getBoundingClientRect();
                    
                    // Trên mobile: margin nhỏ hơn (50px), desktop: 100px
                    const margin = isMobile ? 50 : 100;
                    const isVisible = (
                        elementRect.top >= containerRect.top - margin &&
                        elementRect.bottom <= containerRect.bottom + margin
                    );
                    
                    // Nếu không trong viewport, scroll đến đó
                    if (!isVisible) {
                        isScrolling = true;
                        lastScrollTime = now;
                        
                        // Tính toán vị trí scroll (trên mobile padding nhỏ hơn)
                        const topPadding = isMobile ? 20 : 50;
                        const scrollOffset = elementRect.top - containerRect.top + scrollContainer.scrollTop - topPadding;
                        
                        // Scroll mượt mà
                        scrollContainer.scrollTo({
                            top: scrollOffset,
                            behavior: 'smooth'
                        });
                        
                        // Reset flag sau khi scroll xong (mobile nhanh hơn)
                        setTimeout(() => {
                            isScrolling = false;
                        }, isMobile ? 300 : 500);
                    }
                };
                
                const fadeNextWord = () => {
                    if (currentWordIndex < wordSpans.length) {
                        const span = wordSpans[currentWordIndex];
                        
                        // Fade-in từ
                        span.style.opacity = '1';
                        
                        // Trên mobile: scroll mỗi từ, desktop: scroll mỗi 5 từ
                        // Luôn scroll khi gần cuối (3 từ cuối)
                        if (currentWordIndex % scrollInterval === 0 || currentWordIndex >= wordSpans.length - 3) {
                            scrollToElement(span);
                        }
                        
                        currentWordIndex++;
                        
                        // Delay giữa các từ (tốc độ fade-in)
                        setTimeout(fadeNextWord, speed);
                    } else {
                        // Hoàn thành - scroll đến từ cuối cùng để đảm bảo
                        if (wordSpans.length > 0) {
                            const lastSpan = wordSpans[wordSpans.length - 1];
                            scrollToElement(lastSpan);
                        }
                        
                        if (onComplete) {
                            onComplete();
                        }
                    }
                };
                
                // Bắt đầu fade-in từ từ đầu tiên
                fadeNextWord();
            },
            
            /**
             * Áp dụng hiệu ứng khi click vào hộp quà
             */
            applyClickEffect() {
                this.giftBox.style.transform = 'translate(-50%, -50%) scale(1.2) rotate(10deg)';
                this.giftBox.style.transition = 'transform 0.3s ease-out';
                this.giftBox.style.filter = 'brightness(1.3) drop-shadow(0 15px 30px rgba(255, 215, 0, 0.8))';
            },
            
            /**
             * Mở quà - Load UI final gift vào trang hiện tại
             */
            openGift() {
                // Đóng modal bức thư trước
                if (this.letterModal) {
                    this.letterModal.classList.remove('show');
                    document.body.style.overflow = '';
                }
                
                // Ẩn tất cả các element hiện tại của gift page
                this.hideGiftPageElements();
                
                // Load UI final gift
                this.loadFinalGiftUI();
            },
            
            /**
             * Ẩn tất cả element của gift page
             */
            hideGiftPageElements() {
                // Ẩn background, santa, gift box
                const elementsToHide = [
                    '.gift-background',
                    '.santa-flying-container',
                    '.gift-falling-container'
                ];
                
                elementsToHide.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (element) {
                        element.style.opacity = '0';
                        element.style.transition = 'opacity 0.5s ease-out';
                        setTimeout(() => {
                            element.style.display = 'none';
                        }, 500);
                    }
                });
            },
            
            /**
             * Load UI của final gift vào trang hiện tại
             */
            loadFinalGiftUI() {
                // Lưu reference của audio element (không chỉ thông tin) để giữ nguyên, không bị khựng
                const christmasAudio = document.getElementById('christmasAudio');
                let audioElement = null;
                let audioWasPlaying = false;
                
                if (christmasAudio) {
                    // Lưu reference của element thật, không chỉ thông tin
                    audioElement = christmasAudio;
                    audioWasPlaying = !christmasAudio.paused;
                    
                    // Đảm bảo loop = true
                    audioElement.loop = true;
                }
                
                // Set body style cho final gift
                document.body.style.overflow = 'hidden';
                document.body.style.margin = '0';
                document.body.style.backgroundColor = '#000000';
                
                // Tạo container cho final gift UI
                const finalGiftContainer = document.createElement('div');
                finalGiftContainer.id = 'final-gift-container';
                finalGiftContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; opacity: 0; transition: opacity 0.5s ease-in; background-color: #000000;';
                
                // Đường dẫn assets (kiểm tra path)
                const currentPath = window.location.pathname;
                const assetsPath = (window.__XMAS_BASE||'')+'/assets';
                
                // Thêm các element cần thiết từ final_gift.html
                finalGiftContainer.innerHTML = `
                    <div id="text-container"></div>
                    <audio id="pop-sound">
                        <source src="${assetsPath}/christmas-tree/pop.mp3" type="audio/mpeg">
                    </audio>
                `;
                
                document.body.appendChild(finalGiftContainer);
                
                // Đảm bảo audio element vẫn tồn tại và tiếp tục phát (dùng lại element cũ, không tạo mới)
                if (audioElement) {
                    // Đảm bảo loop = true
                    audioElement.loop = true;
                    
                    // Audio element vẫn đang ở trong DOM, không cần move lại
                    // Chỉ cần đảm bảo nó vẫn phát nếu đang phát
                    if (audioWasPlaying && audioElement.paused) {
                        // Nếu bị pause, play lại
                        audioElement.play().catch(err => {
                            console.log('🎵 Audio autoplay prevented in final gift, will play on user interaction');
                            const playOnInteraction = () => {
                                audioElement.play().catch(() => {});
                                document.removeEventListener('click', playOnInteraction);
                                document.removeEventListener('touchstart', playOnInteraction);
                            };
                            document.addEventListener('click', playOnInteraction, { once: true });
                            document.addEventListener('touchstart', playOnInteraction, { once: true });
                        });
                    }
                    
                    console.log('🎵 Audio element preserved in final gift (no interruption)');
                }
                
                // Load CSS styles cho final gift
                this.loadFinalGiftStyles();
                
                // Load scripts và khởi tạo final gift
                setTimeout(() => {
                    finalGiftContainer.style.opacity = '1';
                    this.initFinalGiftScene();
                }, 100);
            },
            
            /**
             * Load CSS styles cho final gift
             */
            loadFinalGiftStyles() {
                // Xóa style cũ nếu có để tránh conflict
                const oldStyle = document.getElementById('final-gift-styles');
                if (oldStyle) {
                    oldStyle.remove();
                }
                
                // Tạo style tag cho final gift - đảm bảo inject sau cùng
                const style = document.createElement('style');
                style.id = 'final-gift-styles';
                // Đảm bảo style được append sau cùng để có độ ưu tiên cao
                style.textContent = `
                    body {
                        margin: 0;
                        overflow: hidden;
                        background-color: #000000;
                    }
                    canvas {
                        display: block;
                    }
                    #text-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        overflow: hidden;
                    }
                    .floating-text {
                        position: absolute;
                        font-family: "Dancing Script", "Great Vibes", "Playfair Display", cursive;
                        font-weight: 500;
                        font-size: 24px;
                        color: #FFFFFF;
                        width: 300px !important;
                        text-shadow: 0 0 20px rgba(91, 155, 213, 1), 0 0 40px rgba(91, 155, 213, 1), 0 0 60px rgba(91, 155, 213, 1), 0 0 80px rgba(91, 155, 213, 0.9), 0 0 100px rgba(91, 155, 213, 0.7);
                        transform: translate(-50%, -50%);
                        will-change: transform, opacity;
                        pointer-events: auto;
                        cursor: grab;
                        touch-action: none;
                        user-select: none;
                    }
                    .floating-image {
                        position: absolute;
                        width: 100px !important;
                        height: 100px !important;
                        object-fit: cover;
                        background: transparent;
                        box-shadow: 0 0 10px rgba(91, 155, 213, 0.6), 0 0 20px rgba(91, 155, 213, 0.4), 0 0 30px rgba(91, 155, 213, 0.3);
                        border: none;
                        pointer-events: auto;
                        cursor: grab;
                        border-radius: 5px;
                        transform: translate(-50%, -50%);
                        user-select: none;
                        will-change: transform, opacity;
                        -webkit-user-drag: none;
                        transition: transform 0.1s;
                        touch-action: none;
                    }
                    /* Desktop: phóng to ảnh (chỉ áp dụng cho desktop, không áp dụng cho mobile landscape) */
                    @media (min-width: 1024px) {
                        .floating-image {
                            width: 150px !important;
                            height: 150px !important;
                        }
                    }
                    .text-white {
                        color: white !important;
                    }
                    .btn-audio-toggle,
                    .btn-fullscreen-toggle {
                        background-color: transparent;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                    }
                `;
                // Append vào cuối head để đảm bảo override CSS khác
                document.head.appendChild(style);
                
                // Force reflow để đảm bảo CSS được áp dụng ngay
                void document.body.offsetHeight;
            },
            
            /**
             * Khởi tạo scene final gift (Three.js)
             */
            initFinalGiftScene() {
                // Load script final gift - sẽ gọi hàm initFinalGift từ file riêng hoặc inline
                // Tạm thời tạo một script tag để load logic
                this.loadFinalGiftScript();
            },
            
            /**
             * Load script final gift
             */
            loadFinalGiftScript() {
                // Kiểm tra xem import map đã có chưa
                if (!document.querySelector('script[type="importmap"]')) {
                    // Tạo import map cho Three.js
                    const importMap = document.createElement('script');
                    importMap.type = 'importmap';
                    importMap.textContent = JSON.stringify({
                        imports: {
                            "three": "https://unpkg.com/three@0.151.3/build/three.module.js",
                            "three/addons/": "https://unpkg.com/three@0.151.3/examples/jsm/",
                            "gsap": "https://unpkg.com/gsap@3.11.5/index.js"
                        }
                    });
                    document.head.appendChild(importMap);
                }
                
                // Load es-module-shims nếu chưa có
                if (!document.querySelector('script[src*="es-module-shims"]')) {
                    const shims = document.createElement('script');
                    shims.async = true;
                    shims.src = "https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js";
                    shims.onload = () => {
                        // Sau khi shims load xong, mới load script final gift
                        this.loadFinalGiftFromFile();
                    };
                    document.head.appendChild(shims);
                } else {
                    // Nếu đã có shims, load ngay
                    setTimeout(() => {
                        this.loadFinalGiftFromFile();
                    }, 100);
                }
                
                // Set data cho final gift từ window.giftChristmasData nếu có
                var userPhotos = (window.giftChristmasData && Array.isArray(window.giftChristmasData.photos) && window.giftChristmasData.photos.length > 0)
                    ? window.giftChristmasData.photos
                    : ((window.giftChristmasData && window.giftChristmasData.vipGift && Array.isArray(window.giftChristmasData.vipGift.images) && window.giftChristmasData.vipGift.images.length > 0)
                        ? window.giftChristmasData.vipGift.images
                        : []);
                
                if (!window.dataChristmasTree) {
                    window.dataChristmasTree = {
                        template: "christmas-tree",
                        data: {
                            title: "Merry Christmas",
                            type_music: "system",
                            music_id: "",
                            backgroundMusic: "",
                            messages: ["Giáng sinh vui vẻ", "Chúc em giáng sinh an lành", "Merry Christmas", "Noel vui vẻ", "Giáng sinh hạnh phúc", "Noel ấm áp"],
                            images: userPhotos
                        }
                    };
                } else if (userPhotos.length > 0) {
                    window.dataChristmasTree.data = window.dataChristmasTree.data || {};
                    window.dataChristmasTree.data.images = userPhotos;
                }
            },
            
            /**
             * Load script từ final_gift.html
             */
            async loadFinalGiftFromFile() {
                try {
                    // Đường dẫn đến final_gift.html
                    const currentPath = window.location.pathname;
                    let finalGiftPath;
                    
                    if (currentPath.includes('/gift/')) {
                        finalGiftPath = (window.__XMAS_BASE||'')+'/final_gift/final_gift.html';
                    } else {
                        finalGiftPath = (window.__XMAS_BASE||'')+'/final_gift/final_gift.html';
                    }
                    
                    if (window.__xv) finalGiftPath = window.__xv(finalGiftPath);
                    // Fetch HTML và extract script
                    const response = await fetch(finalGiftPath);
                    if (!response.ok) throw new Error('Không thể load final_gift.html');
                    
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Load Font Awesome nếu chưa có
                    if (!document.querySelector('link[href*="font-awesome"]')) {
                        const fontAwesome = document.createElement('link');
                        fontAwesome.rel = 'stylesheet';
                        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
                        document.head.appendChild(fontAwesome);
                    }
                    
                    // Load Google Fonts nếu chưa có
                    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
                        const fonts = document.createElement('link');
                        fonts.rel = 'stylesheet';
                        fonts.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;700&family=Dancing+Script:wght@400;500;600;700&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap';
                        document.head.appendChild(fonts);
                    }
                    
                    // Lấy container final gift để append script vào đó
                    const finalGiftContainer = document.getElementById('final-gift-container');
                    
                    // Load non-module scripts trước (data setup)
                    const regularScripts = doc.querySelectorAll('script:not([type="module"]):not([type="importmap"])');
                    regularScripts.forEach(script => {
                        if (script.textContent.trim() && !script.src) {
                            // Execute inline script ngay
                            const newScript = document.createElement('script');
                            newScript.textContent = script.textContent;
                            document.body.appendChild(newScript);
                        }
                    });
                    
                    // Đợi một chút để đảm bảo data đã được set
                    setTimeout(() => {
                        // Load và execute module scripts (phải load sau import map và shims)
                        const moduleScripts = doc.querySelectorAll('script[type="module"]');
                        moduleScripts.forEach(script => {
                            let scriptContent = script.textContent;
                            
                            // Sửa lại để renderer append vào final-gift-container thay vì body
                            if (finalGiftContainer) {
                                scriptContent = scriptContent.replace(
                                    /document\.body\.appendChild\(renderer\.domElement\)/g,
                                    'document.getElementById("final-gift-container").appendChild(renderer.domElement)'
                                );
                            }
                            
                            const newScript = document.createElement('script');
                            newScript.type = 'module';
                            newScript.textContent = scriptContent;
                            // Append vào body để script chạy đúng scope
                            document.body.appendChild(newScript);
                        });
                    }, 200);
                    
                } catch (error) {
                    console.error('Lỗi khi load final gift:', error);
                    alert('Không thể load trang quà. Vui lòng thử lại.');
                }
            }
        };
        
        // Khởi tạo quản lý mở quà
        giftOpenManager.init();
    }
    
    // Chạy kiểm tra và khởi tạo
    checkBlockingElements();
    
    // Chạy ngay nếu DOM đã sẵn sàng, nếu không thì đợi
    function init() {
        checkBlockingElements();
        initGiftPage();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM đã sẵn sàng, nhưng đợi một chút để đảm bảo các element đã render
        setTimeout(init, 100);
    }
})();
