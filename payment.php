<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thanh toán hoá đơn quà tặng · DearGift</title>
<link rel="icon" href="assets/images/logo-heart-48.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/pink-premium.css">
<link rel="stylesheet" href="css/pastel-theme.css">
<link rel="stylesheet" href="css/footer-modern.css">
<script src="https://unpkg.com/lucide@latest"></script>
<style>
body { font-family: 'Be Vietnam Pro', sans-serif; background: #faf7f9; color: #3d3551; margin: 0; padding: 0; min-height: 100vh; }
.pay-wrap { max-width: 920px; margin: 32px auto 60px; padding: 0 16px; }
.pay-head {
    display: flex; align-items: center; gap: 16px; padding: 16px 20px; margin-bottom: 20px;
    background: #fff; border: 1px solid #f1e4ec; border-radius: 22px; box-shadow: 0 8px 26px rgba(61,53,81,.06);
}
.pay-head img { width: 68px; height: 68px; flex: none; border-radius: 16px; object-fit: cover; background: #3d3551; }
.pay-head__info { min-width: 0; flex: 1; }
.pay-head__title { margin: 0; font-size: 17px; font-weight: 800; color: #2f2740; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pay-head__meta { margin-top: 4px; font-size: 13px; color: #7a7090; }
.pay-head__meta b { font-family: monospace; color: #e8589a; font-weight: 800; font-size: 14px; }
.pay-status {
    display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 7px 14px; border-radius: 999px;
    background: #fff7e6; color: #b45309; font-size: 12.5px; font-weight: 800; border: 1px solid #fde3a7;
}
.pay-status.is-active { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.pay-status i { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; animation: payPulse 1.2s ease-in-out infinite; }
.pay-status.is-active i { background: #16a34a; animation: none; }
@keyframes payPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.7); } }

.pay-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.pay-step { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #fff; border: 1px solid #f1e4ec; border-radius: 16px; font-size: 13px; font-weight: 700; color: #4f4766; box-shadow: 0 4px 14px rgba(61,53,81,.03); }
.pay-step b { width: 26px; height: 26px; flex: none; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(135deg, #ff7eb3, #e8589a); color: #fff; font-size: 13px; }

.pay-grid { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
.pay-card { background: #fff; border: 1px solid #f1e4ec; border-radius: 24px; box-shadow: 0 10px 32px rgba(61,53,81,.06); }

.pay-qr { padding: 24px 20px; text-align: center; }
.pay-qr__frame {
    position: relative; display: inline-block; padding: 14px; border-radius: 22px;
    background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #ff7eb3, #9b5cf6) border-box;
    border: 3.5px solid transparent;
}
.pay-qr__frame img { display: block; width: 240px; height: 240px; max-width: 100%; border-radius: 12px; object-fit: contain; }
.pay-qr__badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 999px; background: #16a34a; color: #fff; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 6px 14px rgba(22,163,74,.3); }
.pay-qr__amount { margin-top: 18px; font-size: 13px; color: #7a7090; }
.pay-qr__amount strong { display: block; margin-top: 3px; font-size: 32px; line-height: 1.1; font-weight: 900; color: #e8589a; }
.pay-qr__dl { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 10px 18px; border-radius: 999px; border: 1.5px solid #f7c3da; color: #d6377f; font-size: 13px; font-weight: 800; text-decoration: none; background: #fff; transition: background .2s; }
.pay-qr__dl:hover { background: #fff3f8; }

.pay-info { padding: 22px; }
.pay-info h3 { margin: 0 0 16px; font-size: 16px; font-weight: 800; color: #2f2740; }
.pay-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px dashed #f0e4ee; }
.pay-row:first-of-type { border-top: 0; }
.pay-row__label { flex: none; font-size: 13px; color: #7a7090; font-weight: 600; }
.pay-row__val { display: flex; align-items: center; gap: 8px; min-width: 0; text-align: right; font-size: 14.5px; font-weight: 800; color: #2f2740; word-break: break-word; }
.pay-row--hl { margin: 8px -10px 0; padding: 14px 12px; border: 0; border-radius: 14px; background: #fff3f8; }
.pay-row--hl .pay-row__val { font-family: monospace; font-size: 18px; color: #d6377f; letter-spacing: .5px; }
.pay-copy { display: inline-flex; align-items: center; gap: 4px; flex: none; padding: 6px 10px; border-radius: 9px; border: 1px solid #ecdcf5; background: #fff; color: #7c5ce0; font-size: 11.5px; font-weight: 800; cursor: pointer; transition: background .2s; }
.pay-copy:hover { background: #f6f1ff; }
.pay-copy svg { width: 13px; height: 13px; }

.pay-note { display: flex; gap: 10px; margin-top: 16px; padding: 12px 16px; border-radius: 14px; background: #fff8e6; border: 1px solid #fde3a7; color: #92400e; font-size: 12.5px; line-height: 1.5; }
.pay-wait { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 16px; padding: 14px; border-radius: 14px; background: #f6f1ff; color: #5b3fd1; font-size: 13.5px; font-weight: 700; }
.pay-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid #d9ccff; border-top-color: #7c5ce0; animation: paySpin .8s linear infinite; }
@keyframes paySpin { to { transform: rotate(360deg); } }

.btn-confirm-now { width: 100%; margin-top: 14px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 50px; padding: 14px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(16,185,129,0.3); transition: transform .2s; }
.btn-confirm-now:hover { transform: scale(1.02); }

.pay-foot { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; font-size: 13.5px; font-weight: 700; }
.pay-foot a { color: #7a7090; text-decoration: none; }
.pay-foot a:hover { color: #d6377f; }

@media (max-width: 768px) {
    .pay-wrap { margin-top: 16px; }
    .pay-grid { grid-template-columns: 1fr; }
    .pay-steps { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .pay-step { flex-direction: column; justify-content: center; gap: 6px; padding: 9px 6px; text-align: center; font-size: 11.5px; line-height: 1.3; }
    .pay-head img { width: 54px; height: 54px; }
    .pay-head { flex-wrap: wrap; }
    .pay-status { order: 3; }
}
</style>
</head>
<body>

<header class="site-header">
    <div class="container" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; max-width:1100px; margin:0 auto;">
        <div style="display:flex; align-items:center; gap:20px;">
            <a href="/" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
                <img src="assets/images/logo-heart-48.png" alt="DearGift" width="32" height="32">
                <span style="font-size:20px; font-weight:800; color:#e8589a;">DearGift</span>
            </a>
            <nav style="display:flex; gap:16px;">
                <a href="templates.php" style="color:#7a7090; font-size:13.5px; font-weight:700; text-decoration:none;">Kho Mẫu</a>
                <a href="/#y-tuong" style="color:#7a7090; font-size:13.5px; font-weight:700; text-decoration:none;">Ý tưởng</a>
                <a href="/#danh-gia" style="color:#7a7090; font-size:13.5px; font-weight:700; text-decoration:none;">Đánh giá</a>
            </nav>
        </div>
        <div>
            <a href="my-gifts.php" style="display:inline-flex; align-items:center; gap:6px; background:#fff0f6; color:#e8589a; border:1px solid #ffd8e8; padding:7px 16px; border-radius:50px; font-size:13px; font-weight:700; text-decoration:none;">
                🎁 Quà của tôi
            </a>
        </div>
    </div>
</header>

<main class="pay-wrap">
    <!-- Tóm tắt đơn -->
    <div class="pay-head">
        <img id="pay-cover-img" src="templates/mon-qua-nho-2010/cover.webp" alt="Mẫu quà">
        <div class="pay-head__info">
            <h1 class="pay-head__title" id="pay-title">Món Quà Nhỏ 3D · 19/11 &amp; Mọi Dịp Đặc Biệt 🎁</h1>
            <div class="pay-head__meta">Mã đơn <b id="pay-code-display">#7FC3BDF0</b> · Gửi <span id="pay-recipient-display">Người thương</span></div>
        </div>
        <span class="pay-status" id="pay-status-badge"><i></i> <span id="pay-status-text">Chờ thanh toán</span></span>
    </div>

    <!-- Hướng dẫn 3 bước -->
    <div class="pay-steps">
        <div class="pay-step"><b>1</b> Mở app ngân hàng</div>
        <div class="pay-step"><b>2</b> Quét mã QR bên dưới</div>
        <div class="pay-step"><b>3</b> Chờ tự động xác nhận</div>
    </div>

    <div class="pay-grid">
        <!-- Mã QR -->
        <div class="pay-card pay-qr">
            <div class="pay-qr__frame">
                <span class="pay-qr__badge">⚡ Tự động duyệt</span>
                <img id="pay-qr-img" src="https://img.vietqr.io/image/970422-2006999988836-compact2.png?amount=20000&amp;addInfo=DEAR+7FC3BDF0&amp;accountName=NGUYEN+VAN+PHONG" alt="Mã QR chuyển khoản">
            </div>
            <div class="pay-qr__amount">Số tiền cần thanh toán<strong id="pay-amount-display">20.000đ</strong></div>
            <a class="pay-qr__dl" id="pay-qr-download" href="https://img.vietqr.io/image/970422-2006999988836-compact2.png?amount=20000&amp;addInfo=DEAR+7FC3BDF0&amp;accountName=NGUYEN+VAN+PHONG" download="DearGift-7FC3BDF0.png" target="_blank" rel="noopener">⬇ Tải mã QR</a>
        </div>

        <!-- Thông tin chuyển khoản -->
        <div class="pay-card pay-info">
            <h3>Hoặc chuyển khoản thủ công</h3>
            <div class="pay-row">
                <span class="pay-row__label">Ngân hàng</span>
                <span class="pay-row__val" id="pay-bank-name">MBBank</span>
            </div>
            <div class="pay-row">
                <span class="pay-row__label">Chủ tài khoản</span>
                <span class="pay-row__val" id="pay-account-name">NGUYEN VAN PHONG</span>
            </div>
            <div class="pay-row">
                <span class="pay-row__label">Số tài khoản</span>
                <span class="pay-row__val">
                    <span id="pay-account-number">2006999988836</span>
                    <button type="button" class="pay-copy" onclick="copyToClipboard('2006999988836')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Chép
                    </button>
                </span>
            </div>
            <div class="pay-row">
                <span class="pay-row__label">Số tiền</span>
                <span class="pay-row__val">
                    <span id="pay-amount-row">20.000đ</span>
                    <button type="button" class="pay-copy" id="btn-copy-amount" onclick="copyToClipboard('20000')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Chép
                    </button>
                </span>
            </div>
            <div class="pay-row pay-row--hl">
                <span class="pay-row__label">Nội dung CK</span>
                <span class="pay-row__val">
                    <span id="pay-content-row">DEAR 7FC3BDF0</span>
                    <button type="button" class="pay-copy" id="btn-copy-content" onclick="copyToClipboard('DEAR 7FC3BDF0')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Chép
                    </button>
                </span>
            </div>

            <div class="pay-note">
                <span>⚠️</span>
                <span>Ghi <strong>đúng nội dung chuyển khoản</strong> ở trên. Hệ thống sẽ tự xác nhận và kích hoạt quà sau 1–2 phút.</span>
            </div>
            
            <div class="pay-wait" id="pay-wait-box">
                <span class="pay-spinner"></span> Đang chờ hệ thống tự động xác nhận chuyển khoản…
            </div>

            <div class="pay-foot">
                <a href="gift-builder.php" id="link-back-edit">← Quay lại chỉnh sửa</a>
                <a href="my-gifts.php">Danh sách quà của tôi →</a>
            </div>
        </div>
    </div>
</main>

<script>
var urlParams = new URLSearchParams(window.location.search);
var giftCode = urlParams.get('code') || '7FC3BDF0';
var currentGiftId = null;

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        var toast = document.createElement('div');
        toast.textContent = '✓ Đã sao chép: ' + text;
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#3d3551;color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:99999;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 1800);
    }).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

function loadPaymentData() {
    fetch('/api/payment/details?code=' + encodeURIComponent(giftCode))
    .then(r => r.json())
    .then(res => {
        if (res && res.success && res.gift) {
            var g = res.gift;
            var b = res.bank || {};
            currentGiftId = g.id;

            document.getElementById('pay-code-display').textContent = '#' + (g.share_code || giftCode);
            document.getElementById('pay-recipient-display').textContent = g.recipient_name || 'Người thương';
            
            var amt = Number(g.amount) || 20000;
            var amtFormatted = amt.toLocaleString('vi-VN') + 'đ';
            document.getElementById('pay-amount-display').textContent = amtFormatted;
            document.getElementById('pay-amount-row').textContent = amtFormatted;
            document.getElementById('btn-copy-amount').setAttribute('onclick', "copyToClipboard('" + amt + "')");

            var transContent = g.transfer_content || ('DEAR ' + (g.share_code || giftCode));
            document.getElementById('pay-content-row').textContent = transContent;
            document.getElementById('btn-copy-content').setAttribute('onclick', "copyToClipboard('" + transContent + "')");

            var qrUrl = g.qr_url || ('https://img.vietqr.io/image/970422-2006999988836-compact2.png?amount=' + amt + '&addInfo=' + encodeURIComponent(transContent) + '&accountName=NGUYEN+VAN+PHONG');
            document.getElementById('pay-qr-img').src = qrUrl;
            document.getElementById('pay-qr-download').href = qrUrl;
            document.getElementById('pay-qr-download').download = 'DearGift-' + (g.share_code || giftCode) + '.png';

            if (b.account) document.getElementById('pay-account-number').textContent = b.account;
            if (b.account_name) document.getElementById('pay-account-name').textContent = b.account_name;
            if (b.name) document.getElementById('pay-bank-name').textContent = b.name;

            if (g.status === 'active' || g.paid) {
                markPaidSuccess(currentGiftId || g.id);
            }
        }
    }).catch(function() {});
}

function markPaidSuccess(giftId) {
    var statusBadge = document.getElementById('pay-status-badge');
    if (statusBadge) statusBadge.classList.add('is-active');
    var statusText = document.getElementById('pay-status-text');
    if (statusText) statusText.textContent = '✅ Đã kích hoạt';
    var targetUrl = '/gift.php?uid=' + (giftId || currentGiftId || giftCode);
    var waitBox = document.getElementById('pay-wait-box');
    if (waitBox) {
        waitBox.innerHTML = '✅ Đơn quà đã được kích hoạt thành công! <a href="' + targetUrl + '" style="display:inline-block; margin-top:8px; color:#e8589a; font-weight:800; text-decoration:underline;">Mở quà ngay ↗</a>';
        waitBox.style.background = '#dcfce7';
        waitBox.style.color = '#166534';
    }
    setTimeout(function() {
        window.location.href = targetUrl;
    }, 2000);
}

// Auto-polling for payment
var pollTimer = setInterval(function() {
    fetch('ajax_check_payment_status.php?code=' + encodeURIComponent(giftCode))
    .then(r => r.json())
    .then(res => {
        if (res.status === 'active') {
            clearInterval(pollTimer);
            markPaidSuccess(res.gift_id || currentGiftId || giftCode);
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
            overlay.innerHTML = `
                <div style="background:#fff;border-radius:28px;padding:40px 36px;text-align:center;max-width:320px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,0.2);">
                    <div style="font-size:64px;margin-bottom:12px;">✅</div>
                    <div style="font-size:22px;font-weight:800;color:#16a34a;margin-bottom:8px;">Thanh toán thành công!</div>
                    <div style="font-size:14px;color:#7a7090;line-height:1.6;margin-bottom:20px;">Quà tặng của bạn đã được kích hoạt.<br>Đang chuyển đến trang quà tặng...</div>
                    <div style="background:#dcfce7;border-radius:50px;height:6px;overflow:hidden;">
                        <div id="pay-progress" style="background:#16a34a;height:100%;width:0%;border-radius:50px;transition:width 2.2s linear;"></div>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            setTimeout(function() { document.getElementById('pay-progress').style.width = '100%'; }, 50);
            setTimeout(function() { 
                window.location.href = res.redirect || ('/gift.php?uid=' + (currentGiftId || giftCode)); 
            }, 2500);
        }
    }).catch(function() {});
}, 2500);

loadPaymentData();
</script>
</body>
</html>
