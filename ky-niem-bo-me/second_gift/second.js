var flip = document.querySelector('.book-content');
var uno = document.querySelectorAll('.book');

var contZindex = 2;
var customZindex = 1;

// Debug CTA (bật/tắt log)
var DEBUG_CTA = true;

// ===== Page indicator (số lần lật) =====
var currentFlip = 0; // Số lần lật hiện tại (0 = chưa lật, chỉ mở bìa)
var totalFlips = 3; // Tổng số lần lật có nội dung (không tính lần lật đến bìa sau)
var pageIndicator = document.getElementById('pageIndicator');
var currentPageEl = document.getElementById('currentPage');

// Hàm để cập nhật totalFlips từ bên ngoài (từ load-valentine-data.js)
function setTotalFlips(count) {
    totalFlips = count;
    // Cập nhật totalPages indicator nếu chưa được cập nhật
    const totalPagesEl = document.getElementById('totalPages');
    if (totalPagesEl && totalPagesEl.textContent !== String(count)) {
        totalPagesEl.textContent = count;
    }
}

// Expose hàm để có thể gọi từ bên ngoài
if (typeof window !== 'undefined') {
    window.setTotalFlips = setTotalFlips;
    window.totalFlips = totalFlips; // Expose biến để có thể đọc
}

function updatePageIndicator(flip) {
	currentFlip = flip;
	if (currentPageEl) {
		currentPageEl.textContent = currentFlip;
	}
	// Chỉ hiện indicator sau lần lật đầu tiên (khi flip >= 1)
	if (pageIndicator) {
		if (currentFlip >= 1) {
			// Hiện indicator sau khi lật xong
			setTimeout(function(){
				pageIndicator.classList.add('show');
			}, 600);
		} else {
			// Ẩn indicator khi chưa lật (chỉ mở bìa)
			pageIndicator.classList.remove('show');
		}
	}
}


// Hàm quản lý dịch book khi lật tờ cuối
function shiftBookFinal(direction, delay) {
	delay = delay || 500;
	setTimeout(function(){
		if (direction === 'right') {
			// Dịch thêm 128px sang phải
			flip.classList.remove("trnsf-reset", "trnsf");
			flip.classList.add("trnsf-final");
		} else if (direction === 'left') {
			// Dịch lại về vị trí trnsf (vị trí khi mở bìa)
			flip.classList.remove("trnsf-final", "trnsf-reset");
			flip.classList.add("trnsf");
		}
	}, delay);
}

// ===== Final CTA: doubleHeart và cupids trượt xuống, sau đó hiện giftBox riêng =====
var bookContent = document.querySelector('.book-content');
var doubleHeart = document.getElementById('doubleHeart');
var doubleHeartGlow = document.getElementById('doubleHeartGlow');
var giftBox = document.getElementById('giftBox');
var noFinalGiftImg = document.getElementById('noFinalGiftImg');
var giftBoxGlow = document.getElementById('giftBoxGlow');
var doubleHeartOriginalSrc = doubleHeart ? doubleHeart.getAttribute('src') : null;
var finalCtaTimers = [];
var dropAnim = null;

// ===== Cupids converge: leftCupid và rightCupid trượt chéo về giữa =====
var leftCupid = document.getElementById('leftCupid');
var rightCupid = document.getElementById('rightCupid');
var leftCupidAnim = null;
var rightCupidAnim = null;
var cupidsConverged = false;
var doubleHeartDropped = false;

function ctaSetTimeout(fn, ms) {
	var id = setTimeout(fn, ms);
	finalCtaTimers.push(id);
	return id;
}
function clearFinalCtaTimers() {
	while (finalCtaTimers.length) {
		clearTimeout(finalCtaTimers.pop());
	}
}

function clearDropAnim() {
	try {
		if (dropAnim) dropAnim.cancel();
	} catch (e) {}
	dropAnim = null;
}

function clearCupidsAnims() {
	try {
		if (leftCupidAnim) leftCupidAnim.cancel();
		if (rightCupidAnim) rightCupidAnim.cancel();
	} catch (e) {}
	leftCupidAnim = null;
	rightCupidAnim = null;
	cupidsConverged = false;
}

function resetFinalCta() {
	clearFinalCtaTimers();
	clearDropAnim();
	clearCupidsAnims();
	cupidsConverged = false;
	doubleHeartDropped = false;
	
	if (doubleHeart) {
		doubleHeart.classList.remove('cta-drop', 'cta-heart', 'fade-out', 'show');
		// clear inline fade overrides
		doubleHeart.style.opacity = '';
		doubleHeart.style.transition = '';
		doubleHeart.style.display = '';
		if (doubleHeartOriginalSrc) doubleHeart.setAttribute('src', doubleHeartOriginalSrc);
	}
	if (doubleHeartGlow) {
		doubleHeartGlow.classList.remove('show');
		doubleHeartGlow.style.display = 'none';
	}
	
	// Reset cupids về vị trí ban đầu
	if (leftCupid) {
		leftCupid.style.display = '';
		leftCupid.style.left = '';
		leftCupid.style.top = '';
		leftCupid.style.right = '';
		leftCupid.style.width = '';
		leftCupid.style.height = '';
		leftCupid.style.transform = '';
		leftCupid.style.transition = '';
		leftCupid.style.opacity = '';
		leftCupid.classList.remove('cupid-converge', 'cupid-fade-out');
	}
	if (rightCupid) {
		rightCupid.style.display = '';
		rightCupid.style.left = '';
		rightCupid.style.top = '';
		rightCupid.style.right = '';
		rightCupid.style.width = '';
		rightCupid.style.height = '';
		rightCupid.style.transform = '';
		rightCupid.style.transition = '';
		rightCupid.style.opacity = '';
		rightCupid.classList.remove('cupid-converge', 'cupid-fade-out');
	}
	
	// Ẩn giftBox và noFinalGiftImg
	if (giftBox) {
		giftBox.style.display = 'none';
		giftBox.classList.remove('show');
		giftBox.style.opacity = '';
		giftBox.style.transform = '';
		giftBox.style.transition = '';
	}
	if (noFinalGiftImg) {
		noFinalGiftImg.style.display = 'none';
		noFinalGiftImg.classList.remove('show');
		noFinalGiftImg.style.opacity = '';
		noFinalGiftImg.style.transform = '';
		noFinalGiftImg.style.transition = '';
		noFinalGiftImg.style.position = '';
		noFinalGiftImg.style.top = '';
		noFinalGiftImg.style.left = '';
		noFinalGiftImg.style.width = '';
		noFinalGiftImg.style.zIndex = '';
	}
	if (giftBoxGlow) {
		giftBoxGlow.style.display = 'none';
		giftBoxGlow.classList.remove('show');
		giftBoxGlow.style.opacity = '';
	}
	
	document.body.classList.remove('final-cta');
}

function showGiftBox() {
	// Bản ghi có món quà cuối enable=false → hiển thị no_finalgift.gif, không hiển thị gift-box
	var hasFinalGift = typeof window.hasFinalGift !== 'undefined' ? window.hasFinalGift : true;

	if (hasFinalGift && giftBox) {
		// Đặt giftBox ở giữa màn hình, chuẩn bị fade-in + scale-up
		giftBox.style.display = 'block';
		giftBox.style.position = 'fixed';
		giftBox.style.top = '50%';
		giftBox.style.left = '50%';
		giftBox.style.width = '320px';
		giftBox.style.height = 'auto';
		giftBox.style.zIndex = '120';
		giftBox.style.opacity = '0';
		giftBox.style.transform = 'translate(-50%, -50%) scale(0.5)';
		giftBox.style.transition = 'none';
		giftBox.style.cursor = 'pointer';
		giftBox.style.pointerEvents = 'auto';
		void giftBox.offsetWidth;

		giftBox.style.transition = 'opacity 1.5s ease, transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
		requestAnimationFrame(function(){
			requestAnimationFrame(function(){
				ctaSetTimeout(function(){
					giftBox.classList.add('show');
					giftBox.style.opacity = '1';
					giftBox.style.transform = 'translate(-50%, -50%) scale(1)';
				}, 50);
			});
		});

		if (giftBoxGlow) {
			giftBoxGlow.style.display = 'block';
			giftBoxGlow.style.position = 'fixed';
			giftBoxGlow.style.top = '50%';
			giftBoxGlow.style.left = '50%';
			giftBoxGlow.style.zIndex = '119';
			giftBoxGlow.style.opacity = '0';
			giftBoxGlow.style.transition = 'opacity 0.8s ease';
			void giftBoxGlow.offsetWidth;
			ctaSetTimeout(function(){
				giftBoxGlow.classList.add('show');
				giftBoxGlow.style.opacity = '1';
			}, 50);
		}
		return;
	}

	// enable=false: hiển thị no_finalgift.gif (không click vào load final)
	if (noFinalGiftImg) {
		noFinalGiftImg.style.display = 'block';
		noFinalGiftImg.style.position = 'fixed';
		noFinalGiftImg.style.top = '50%';
		noFinalGiftImg.style.left = '50%';
		noFinalGiftImg.style.width = 'min(520px, 85vw)';
		noFinalGiftImg.style.height = 'auto';
		noFinalGiftImg.style.zIndex = '120';
		noFinalGiftImg.style.opacity = '0';
		noFinalGiftImg.style.transform = 'translate(-50%, -50%) scale(0.5)';
		noFinalGiftImg.style.transition = 'none';
		noFinalGiftImg.style.pointerEvents = 'none';
		void noFinalGiftImg.offsetWidth;

		noFinalGiftImg.style.transition = 'opacity 1.5s ease, transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
		requestAnimationFrame(function(){
			requestAnimationFrame(function(){
				ctaSetTimeout(function(){
					noFinalGiftImg.classList.add('show');
					noFinalGiftImg.style.opacity = '1';
					noFinalGiftImg.style.transform = 'translate(-50%, -50%) scale(1)';
				}, 50);
			});
		});
	}
}

function startCupidsConverge() {
	if (!leftCupid || !rightCupid) return;

	// Reset để chạy lại animation từ đầu
	clearCupidsAnims();

	// ===== Left Cupid: từ góc trên trái → trượt chéo xuống về bên phải → giữa màn hình =====
	var leftRect = leftCupid.getBoundingClientRect();
	var rightRect = rightCupid.getBoundingClientRect();
	
	// Vị trí giữa màn hình (cùng với double heart)
	var centerX = window.innerWidth / 2;
	var centerY = window.innerHeight / 2;
	
	// Left cupid: từ góc trên trái → giữa màn hình (trượt chéo xuống về bên phải)
	var leftDx = centerX - leftRect.left - leftRect.width / 2;
	var leftDy = centerY - leftRect.top - leftRect.height / 2;
	
	// Right cupid: từ góc trên phải → giữa màn hình (trượt chéo xuống về bên trái)
	var rightDx = centerX - rightRect.left - rightRect.width / 2;
	var rightDy = centerY - rightRect.top - rightRect.height / 2;

	// Freeze vị trí hiện tại cho leftCupid
	leftCupid.style.left = leftRect.left + 'px';
	leftCupid.style.top = leftRect.top + 'px';
	leftCupid.style.right = '';
	leftCupid.style.width = leftRect.width + 'px';
	leftCupid.style.height = leftRect.height + 'px';
	leftCupid.style.transform = 'translate3d(0,0,0)';
	leftCupid.style.transition = 'none';
	leftCupid.classList.add('cupid-converge');
	void leftCupid.offsetWidth;

	// Freeze vị trí hiện tại cho rightCupid
	rightCupid.style.right = '';
	rightCupid.style.left = rightRect.left + 'px';
	rightCupid.style.top = rightRect.top + 'px';
	rightCupid.style.width = rightRect.width + 'px';
	rightCupid.style.height = rightRect.height + 'px';
	rightCupid.style.transform = 'translate3d(0,0,0)';
	rightCupid.style.transition = 'none';
	rightCupid.classList.add('cupid-converge');
	void rightCupid.offsetWidth;

	// Animate cả hai cùng lúc
	var animDuration = 1800; // Hơi lâu hơn double heart một chút để tạo hiệu ứng đẹp
	var animEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
	
	try {
		// Left cupid animation
		leftCupidAnim = leftCupid.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + leftDx + 'px,' + leftDy + 'px,0)' }
			],
			{ duration: animDuration, easing: animEasing, fill: 'forwards' }
		);

		// Right cupid animation
		rightCupidAnim = rightCupid.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + rightDx + 'px,' + rightDy + 'px,0)' }
			],
			{ duration: animDuration, easing: animEasing, fill: 'forwards' }
		);

		// Đếm số animation hoàn thành
		var completedCount = 0;
		var checkAllComplete = function() {
			completedCount++;
			if (completedCount === 2) {
				cupidsConverged = true;
				// Cleanup freeze styles
				leftCupid.style.left = '';
				leftCupid.style.top = '';
				leftCupid.style.width = '';
				leftCupid.style.height = '';
				leftCupid.style.transform = '';
				leftCupid.style.transition = '';
				
				rightCupid.style.left = '';
				rightCupid.style.top = '';
				rightCupid.style.width = '';
				rightCupid.style.height = '';
				rightCupid.style.transform = '';
				rightCupid.style.transition = '';
				
				// Đặt về giữa màn hình bằng CSS
				leftCupid.style.left = '50%';
				leftCupid.style.top = '50%';
				leftCupid.style.transform = 'translate(-50%, -50%)';
				
				rightCupid.style.left = '50%';
				rightCupid.style.top = '50%';
				rightCupid.style.transform = 'translate(-50%, -50%)';
				
				// Chỉ clear tham chiếu animation, KHÔNG gọi clearCupidsAnims() vì nó reset cupidsConverged = false
				leftCupidAnim = null;
				rightCupidAnim = null;
				
				// KHÔNG ẩn cupids ngay, đợi fade-out cùng doubleHeart
				checkAndFadeOutAll();
			}
		};

		leftCupidAnim.onfinish = checkAllComplete;
		rightCupidAnim.onfinish = checkAllComplete;
	} catch (e) {
		// Fallback nếu WAAPI không có
		if (DEBUG_CTA) console.warn('cupids converge WAAPI failed, using fallback:', e);
		cupidsConverged = true;
		// KHÔNG ẩn cupids ngay, đợi fade-out cùng doubleHeart
		checkAndFadeOutAll();
	}
}

function checkAndFadeOutAll() {
	// Chờ cả cupids và doubleHeart đều trượt xong rồi mới fade-out đồng thời
	// Kiểm tra: cupids đã tụ hợp xong VÀ doubleHeart đã trượt xong
	if (cupidsConverged && doubleHeartDropped && !dropAnim) {
		// Fade-out cả 3 cùng lúc
		fadeOutAllTogether();
	}
}

function fadeOutAllTogether() {
	// Fade-out cả 3: leftCupid, rightCupid, và doubleHeart cùng lúc
	var fadeDuration = 800; // 0.8s
	
	if (leftCupid) {
		leftCupid.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		leftCupid.style.opacity = '0';
		leftCupid.classList.add('cupid-fade-out');
	}
	if (rightCupid) {
		rightCupid.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		rightCupid.style.opacity = '0';
		rightCupid.classList.add('cupid-fade-out');
	}
	if (doubleHeart) {
		doubleHeart.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		doubleHeart.style.opacity = '0';
	}
	if (doubleHeartGlow) {
		doubleHeartGlow.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		doubleHeartGlow.style.opacity = '0';
	}
	
	// Sau khi fade-out xong, ẩn hoàn toàn và hiện giftBox
	ctaSetTimeout(function(){
		if (leftCupid) {
			leftCupid.style.display = 'none';
		}
		if (rightCupid) {
			rightCupid.style.display = 'none';
		}
		if (doubleHeart) {
			doubleHeart.style.display = 'none';
		}
		if (doubleHeartGlow) {
			doubleHeartGlow.style.display = 'none';
		}
		
		// Hiện giftBox sau khi fade-out xong
		showGiftBox();
	}, fadeDuration + 50); // Đợi fade out animation xong + buffer
}

function startFinalCtaDrop() {
	if (!doubleHeart) return;
	document.body.classList.add('final-cta');

	// reset để chạy lại animation từ đầu
	clearFinalCtaTimers();
	clearDropAnim();
	doubleHeart.classList.remove('cta-drop', 'cta-gift', 'cta-heart', 'fade-out', 'show');
	if (doubleHeartOriginalSrc) doubleHeart.setAttribute('src', doubleHeartOriginalSrc);
	// clear inline fade overrides
	doubleHeart.style.opacity = '';
	doubleHeart.style.transition = '';

	// ===== Slide to center dựa trên kích thước/position đang hiển thị =====
	var rect = doubleHeart.getBoundingClientRect();
	var targetLeft = (window.innerWidth - rect.width) / 2;
	var targetTop = (window.innerHeight - rect.height) / 2;
	var dx = targetLeft - rect.left;
	var dy = targetTop - rect.top;

	// Freeze đúng vị trí hiện tại bằng px + size đang hiển thị
	doubleHeart.style.left = rect.left + 'px';
	doubleHeart.style.top = rect.top + 'px';
	doubleHeart.style.width = rect.width + 'px';
	doubleHeart.style.height = rect.height + 'px';
	doubleHeart.style.transform = 'translate3d(0,0,0)';
	doubleHeart.style.transition = 'none';
	void doubleHeart.offsetWidth;


	// Animate bằng transform (mượt) nhưng mốc tính từ size/pos thật
	try {
		dropAnim = doubleHeart.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' }
			],
			{ duration: 1700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
		);
		dropAnim.onfinish = function(){
			// Cleanup freeze styles để quay về dùng CSS class (top/left 50%)
			doubleHeart.style.left = '';
			doubleHeart.style.top = '';
			doubleHeart.style.width = '';
			doubleHeart.style.height = '';
			doubleHeart.style.transform = '';
			doubleHeart.style.transition = '';
			clearDropAnim();
			
			// Đánh dấu doubleHeart đã trượt xong
			doubleHeartDropped = true;
			
			// Đặt doubleHeart ở giữa màn hình (để fade-out sau)
			doubleHeart.style.left = '50%';
			doubleHeart.style.top = '50%';
			doubleHeart.style.transform = 'translate(-50%, -50%)';
			doubleHeart.classList.add('cta-heart');
			
			// Kiểm tra xem cupids đã xong chưa, nếu rồi thì fade-out cùng nhau
			checkAndFadeOutAll();
		};
	} catch (e) {
		// Fallback: nếu WAAPI không có
		if (DEBUG_CTA) console.warn('drop(slide) WAAPI failed, using fallback:', e);
		doubleHeartDropped = true;
		// Đặt doubleHeart ở giữa màn hình
		if (doubleHeart) {
			doubleHeart.style.left = '50%';
			doubleHeart.style.top = '50%';
			doubleHeart.style.transform = 'translate(-50%, -50%)';
			doubleHeart.classList.add('cta-heart');
		}
		checkAndFadeOutAll();
	}
}

// Click vào gift-box để load final gift vào intro (chỉ khi có món quà cuối)
if (giftBox) {
	giftBox.addEventListener('click', function(){
		if (typeof window.hasFinalGift !== 'undefined' && !window.hasFinalGift) return;
		loadFinalScreen();
	});
}

// Loading progress animation
function startLoadingProgress() {
	var progressFill = document.getElementById('loadingProgressFill');
	if (!progressFill) return;
	
	// Reset progress
	progressFill.style.width = '0%';
	
	// Simulate progress (0% -> 90% trong lúc load) - nhanh hơn nữa
	var progress = 0;
	var progressInterval = setInterval(function() {
		progress += Math.random() * 30 + 20; // Tăng ngẫu nhiên 20-50% (nhanh hơn)
		if (progress > 90) {
			progress = 90; // Dừng ở 90% chờ final.js load xong
			clearInterval(progressInterval);
		}
		progressFill.style.width = progress + '%';
	}, 30); // Giảm từ 50ms xuống 30ms
	
	// Lưu interval để có thể clear sau
	window.loadingProgressInterval = progressInterval;
}

function completeLoadingProgress() {
	var progressFill = document.getElementById('loadingProgressFill');
	if (progressFill) {
		// Hoàn thành 100%
		progressFill.style.width = '100%';
		// Clear interval nếu còn chạy
		if (window.loadingProgressInterval) {
			clearInterval(window.loadingProgressInterval);
			window.loadingProgressInterval = null;
		}
	}
}

// Load final screen (HTML đã có sẵn trong index.html, chỉ cần load JS)
function loadFinalScreen() {
	var finalScreen = document.getElementById('finalScreen');
	var loadingScreen = document.getElementById('finalLoadingScreen');
	if (!finalScreen) return;
	
	// Hiện loading screen trước
	if (loadingScreen) {
		loadingScreen.style.display = 'flex';
		setTimeout(function(){
			loadingScreen.classList.add('show');
			// Bắt đầu animation progress bar
			startLoadingProgress();
		}, 30); // Giảm từ 50ms xuống 30ms
	}
	
	// Ẩn tất cả màn hình khác
	var introScreen = document.getElementById('introScreen');
	var secondScreen = document.getElementById('secondScreen');
	if (introScreen) introScreen.style.display = 'none';
	if (secondScreen) secondScreen.style.display = 'none';
	
	// Set data cho final.js (cần thiết cho final.js)
	if (!window.dataMemoryHeartLoveLoom) {
		window.dataMemoryHeartLoveLoom = {
			"template": "birthday-v2",
			"data": {
				"title": "Feliz Mes, Mi Amor Eterno",
				"messages": [],
				"images": ["./assets/images/final/anh.jpg"],
				"heartColor": "#e8a24a"
			}
		};
	}
	
	// Patch document.body.appendChild để append canvas vào finalScreen thay vì body
	var originalAppendChild = document.body.appendChild;
	var canvasAppended = false;
	var canvasElement = null;
	
	document.body.appendChild = function(element) {
		// Nếu là canvas và chưa append vào finalScreen
		if (element.tagName === 'CANVAS' && !canvasAppended) {
			canvasAppended = true;
			canvasElement = element;
			// Đảm bảo canvas có style đúng
			element.style.position = 'fixed';
			element.style.top = '0';
			element.style.left = '0';
			element.style.width = '100%';
			element.style.height = '100%';
			element.style.zIndex = '1';
			element.style.display = 'block';
			finalScreen.appendChild(element);
			return element;
		}
		// Các element khác append vào body như bình thường
		return originalAppendChild.call(document.body, element);
	};
	
	// Kiểm tra Three.js CDN trước khi load final.js
	fetch('https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js', { method: 'HEAD' })
		.then(function(response) {
			if (!response.ok) {
				throw new Error('CDN not accessible: ' + response.status);
			}
			loadFinalJS();
		})
		.catch(function(error) {
			// Vẫn thử load, có thể cache đã có
			loadFinalJS();
		});
	
	function loadFinalJS() {
		// Load final.js (module)
		var finalScript = document.createElement('script');
		finalScript.type = 'module';
		finalScript.src = './final_gift/final.js?v=' + (window.SWEET_ASSET_VERSION || '1');
		
		var scriptLoadTimeout = setTimeout(function() {
			alert('Hiệu ứng 3D đang tải chậm. Vui lòng kiểm tra kết nối mạng và thử lại.');
		}, 15000);
		
		// Load final.js sau khi inline scripts đã chạy
		finalScript.onload = function() {
			clearTimeout(scriptLoadTimeout);
			
			// Restore original appendChild sau khi canvas đã được append
			if (canvasAppended) {
				document.body.appendChild = originalAppendChild;
			}
			
			// Đảm bảo canvas được resize đúng nếu renderer đã được tạo
			if (canvasElement && window.innerWidth && window.innerHeight) {
				// Tìm renderer từ Three.js (nếu có)
				var canvas = finalScreen.querySelector('canvas');
				if (canvas && canvas.width !== window.innerWidth) {
					// Trigger resize event để final.js resize renderer
					window.dispatchEvent(new Event('resize'));
				}
			}
			
			// Hoàn thành progress bar
			completeLoadingProgress();
			
			// Ẩn loading ngay lập tức
			if (loadingScreen) {
				loadingScreen.classList.remove('show');
				loadingScreen.style.display = 'none';
			}
		};
		
		finalScript.onerror = function(e) {
			clearTimeout(scriptLoadTimeout);
			
			// Restore original appendChild
			document.body.appendChild = originalAppendChild;
			
			// Hiện thông báo lỗi chi tiết
			var errorMsg = 'Không thể tải hiệu ứng 3D.\n\n';
			errorMsg += 'Nguyên nhân có thể:\n';
			errorMsg += '- Kết nối mạng yếu\n';
			errorMsg += '- Trình duyệt chặn script\n';
			errorMsg += '- Phiên bản iOS/Safari quá cũ\n\n';
			errorMsg += 'Vui lòng:\n';
			errorMsg += '1. Kiểm tra kết nối WiFi/4G\n';
			errorMsg += '2. Tải lại trang (kéo xuống)\n';
			errorMsg += '3. Thử trình duyệt khác (Chrome/Safari)';
			
			alert(errorMsg);
		};
		
		document.body.appendChild(finalScript);
	}
	
	// Hiện finalScreen ngay (HTML đã có sẵn)
	finalScreen.classList.add('is-visible');
	finalScreen.setAttribute('aria-hidden', 'false');
}

function showFinalCta(show, delay) {
	delay = delay || 0;
	setTimeout(function(){
		if (show) {
			clearFinalCtaTimers();
			// Ẩn page indicator khi hiện gift box
			if (pageIndicator) {
				pageIndicator.classList.remove('show');
			}
			// Ẩn sách trước
			if (bookContent) {
				bookContent.classList.add('hide-for-gift');

				// Bắt đầu trượt xuống NGAY khi fade-out sách xong (không delay thủ công)
				var started = false;
				var startDropOnce = function(){
					if (started) return;
					started = true;
					// Bắt đầu cả cupids và double heart cùng lúc
					startCupidsConverge();
					startFinalCtaDrop();
				};
				var onEnd = function(ev){
					if (ev && ev.propertyName && ev.propertyName !== 'opacity') return;
					bookContent.removeEventListener('transitionend', onEnd);
					startDropOnce();
				};
				bookContent.addEventListener('transitionend', onEnd);
				// Fallback nếu transitionend không fire
				ctaSetTimeout(function(){
					bookContent.removeEventListener('transitionend', onEnd);
					startDropOnce();
				}, 900);
			} else {
				// Bắt đầu cả cupids và double heart cùng lúc
				startCupidsConverge();
				startFinalCtaDrop();
			}
		} else {
			// Ẩn CTA và hiện lại sách
			resetFinalCta();
			// Đợi CTA fade-out xong rồi mới hiện sách lại cho mượt
			setTimeout(function(){
				if (bookContent) bookContent.classList.remove('hide-for-gift');
				// Hiện lại page indicator
				if (pageIndicator) {
					pageIndicator.classList.add('show');
				}
			}, 850);
		}
	}, delay);
}

// Hàm để khởi tạo event listeners cho các book elements
function initializeBookFlip() {
	// Lấy lại danh sách book elements (có thể đã được tạo động)
	uno = document.querySelectorAll('.book');
	flip = document.querySelector('.book-content');
	
	// Reset z-index counters
	contZindex = 2;
	customZindex = 1;
	
	
	for (var i = 0; i < uno.length; i++) {
		uno[i].style.zIndex = customZindex;
		customZindex--;

		uno[i].addEventListener('click', function(e){

			var tgt = e.target;
			var unoThis = this;
			var frontEl = tgt.closest && tgt.closest('.face-front');
			var backEl = tgt.closest && tgt.closest('.face-back');
			var portadaEl = tgt.closest && tgt.closest('#portada');
			var trsfEl = tgt.closest && tgt.closest('#trsf');
			var portadaBackEl = unoThis.querySelector('#portada-back'); // Check xem có phải tờ cuối không

			unoThis.style.zIndex = contZindex;
			contZindex++;

			if (frontEl && unoThis.contains(frontEl)) {
				unoThis.style.zIndex = contZindex;
				contZindex +=20;
				setTimeout(function(){
					unoThis.style.transform = 'rotateY(-180deg)';
					// Nếu là tờ cuối (có portada-back), không tăng số lần lật (vì đó là bìa sau, không có nội dung)
					if (portadaBackEl) {
						// Không cập nhật số lần lật, vì đây là bìa sau (không có nội dung)
						shiftBookFinal('right', 500);
						// Sau khi trang cuối hiện ra: ẩn sách -> doubleHeart rơi xuống -> đổi thành gift-box
						showFinalCta(true, 1000);
					} else {
						// Tính toán số lần lật mới: lật từ front sang back = tăng 1 lần lật
						var newFlip = currentFlip + 1;
						if (newFlip <= totalFlips) {
							updatePageIndicator(newFlip);
						}
					}
				}, 500);
			}
			if (backEl && unoThis.contains(backEl)) {
				unoThis.style.zIndex = contZindex;
				contZindex +=20;

				// Nếu đang ở bìa sau (portada-back) thì cho CTA fade-out ngay khi click
				var isPortadaBack = tgt.closest && tgt.closest('#portada-back');
				if (isPortadaBack) {
					showFinalCta(false, 0);
				}

				setTimeout(function(){
					unoThis.style.transform = 'rotateY(0deg)';
					// Nếu là mặt sau tờ cuối (portada-back), dịch lại 128px về trái và không giảm số lần lật
					if (isPortadaBack) {
						shiftBookFinal('left', 500);
						// Giữ nguyên số lần lật là totalFlips (vì đang quay lại từ bìa sau)
						updatePageIndicator(totalFlips);
					} else {
						// Tính toán số lần lật mới: lật từ back sang front = giảm 1 lần lật
						var newFlip = currentFlip - 1;
						if (newFlip >= 0) {
							updatePageIndicator(newFlip);
						}
					}
				}, 500);
			}

			if (portadaEl) {
				flip.classList.remove("trnsf-reset");
				flip.classList.add("trnsf");
				// Đang ở bìa (chưa lật) = 0 lần lật
				updatePageIndicator(0);
			}
			if (trsfEl) {
				flip.classList.remove("trnsf");
				flip.classList.add("trnsf-reset");
				// Đã lật lần 1 (mặt sau bìa)
				updatePageIndicator(1);
			}

		});
	}
}

// Hàm để re-initialize (gọi lại khi book được tạo động)
function reinitializeBookFlip() {
	initializeBookFlip();
}

// Expose hàm để có thể gọi từ bên ngoài
if (typeof window !== 'undefined') {
	window.reinitializeBookFlip = reinitializeBookFlip;
}

// Khởi tạo lần đầu
initializeBookFlip();

