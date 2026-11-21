<?php
// Live preview endpoint for DearGift v3
header('Content-Type: text/html; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$slug = isset($_REQUEST['slug']) && !empty($_REQUEST['slug']) ? $_REQUEST['slug'] : 'mon-qua-nho-2010';
$recipientName = isset($_REQUEST['recipient_name']) && !empty($_REQUEST['recipient_name']) ? $_REQUEST['recipient_name'] : 'Người Thương';
$senderName = isset($_REQUEST['sender_name']) && !empty($_REQUEST['sender_name']) ? $_REQUEST['sender_name'] : 'Thương nhiều ♥';
$letterTitle = isset($_REQUEST['letter_title']) && !empty($_REQUEST['letter_title']) ? $_REQUEST['letter_title'] : 'Gửi người thương!';
$letterContent = isset($_REQUEST['letter_content']) && !empty($_REQUEST['letter_content']) ? $_REQUEST['letter_content'] : "Chẳng cần phải đợi đến một ngày lễ đặc biệt nào cả, vì mỗi ngày có bạn ở bên đều là một ngày thật đáng trân trọng.\n\nChúc bạn luôn bình an, rạng rỡ, ngập tràn niềm vui và luôn cảm nhận được thật nhiều yêu thương mỗi ngày nhé! ❤️";
$music = isset($_REQUEST['music']) && !empty($_REQUEST['music']) ? $_REQUEST['music'] : '/templates/mon-qua-nho-2010/app/assets/music/givemeyourforever.mp3';
$passcode = isset($_REQUEST['passcode']) ? $_REQUEST['passcode'] : (isset($_REQUEST['password_value']) ? $_REQUEST['password_value'] : '');

$photos = [];
if (!empty($_REQUEST['photos_json'])) {
    $decoded = json_decode($_REQUEST['photos_json'], true);
    if (is_array($decoded)) {
        $photos = $decoded;
    }
}
if (empty($photos)) {
    $photos = [
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-0.jpg",
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-1.jpg",
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-2.jpg",
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-3.jpg",
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-4.jpg",
        "/templates/mon-qua-nho-2010/app/assets/demo/sphere-5.jpg"
    ];
}
$letterImage = !empty($photos[0]) ? $photos[0] : "/templates/mon-qua-nho-2010/app/assets/demo/letter.png";
?>
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Xem Trước Món Quà Nhỏ · <?php echo htmlspecialchars($recipientName); ?> 🎁</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎁</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/templates/_v3/assets/css/gift.css">
<style>
body.tpl-body-mon-qua-nho-2010 { background: #0b0a12; overflow: hidden; margin: 0; padding: 0; }
body.tpl-body-mon-qua-nho-2010 .gift-stage { padding: 0; margin: 0; width: 100%; height: 100vh; }
.gift-app-frame { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 1; background: #0b0a12; }
.gift-preview-flag {
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(232, 88, 154, 0.9);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 14px;
    border-radius: 50px;
    z-index: 9999;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 12px rgba(232,88,154,0.35);
    pointer-events: none;
}
</style>
</head>
<body class="gift-body tpl-body-mon-qua-nho-2010">

<div class="gift-preview-flag">XEM TRƯỚC DEMO TRỰC TIẾP</div>

<main class="gift-stage">
<script>
window.__GIFTTO_APP = {
    "config": {
        "appTitle": "Món Quà Nhỏ - Dành riêng cho <?php echo addslashes($recipientName); ?> 💖",
        "appIcon": "/templates/mon-qua-nho-2010/app/assets/images/icons/couple.png",
        "enableWebsiteInfo": true,
        "enablePasscode": <?php echo !empty($passcode) ? 'true' : 'false'; ?>,
        "passcode": "<?php echo addslashes($passcode); ?>",
        "passcodeTitle": "Nhập mật khẩu",
        "passcodeSubtitle": "Gợi ý: Mật khẩu món quà",
        "enableMorphEffect": true,
        "morphTexts": [
            "Gửi <?php echo addslashes($recipientName); ?>",
            "Một món quà nhỏ",
            "Dành riêng cho bạn",
            "Mãi bên nhau nhé"
        ],
        "particleImage": "/templates/mon-qua-nho-2010/app/assets/demo/particle.png",
        "particleImageShape": "heart",
        "particleColor": "",
        "heartName": "<?php echo addslashes($recipientName); ?>",
        "enableSphere": true,
        "sphereImages": <?php echo json_encode($photos, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>,
        "enableSphereFlyingImages": true,
        "flyingCaptions": [
            "Thương thật nhiều 💕",
            "Khoảnh khắc đẹp nhất ✨",
            "Mãi bên nhau nhé 🥰",
            "Luôn rạng rỡ nhé 🌸",
            "Cảm ơn vì tất cả 💖"
        ],
        "enableLetter": true,
        "letter": {
            "title": "<?php echo addslashes($letterTitle); ?>",
            "text": <?php echo json_encode($letterContent, JSON_UNESCAPED_UNICODE); ?>,
            "image": "<?php echo addslashes($letterImage); ?>",
            "caption": "Khoảnh khắc đẹp của chúng mình ♥",
            "signature": "<?php echo addslashes($senderName); ?>",
            "envColor": "night"
        },
        "bgMusic": "<?php echo addslashes($music); ?>",
        "bgVolume": 0.55,
        "autoPlay": false,
        "recipientName": "<?php echo addslashes($recipientName); ?>",
        "enableCalendar": true,
        "calendar": {
            "day": 21,
            "month": 11,
            "title": "Ngày Đặc Biệt Của Chúng Mình",
            "caption": "Dành tặng <?php echo addslashes($recipientName); ?> ♥"
        },
        "enableBouquet": true,
        "bouquet": {
            "count": 9,
            "color": "red",
            "title": "Tặng bạn bó hoa không bao giờ tàn",
            "meaning": "Mãi mãi bên nhau",
            "subtitle": "Hoa thật rồi sẽ héo, nhưng bó hoa này sẽ nở mãi — như tình cảm chân thành dành cho bạn mỗi ngày."
        },
        "enableGiftBox": true,
        "giftBox": {
            "color": "pink",
            "message": "Một buổi hẹn đi ăn món ngon bạn thích vào cuối tuần này nhé! 🍲✨",
            "image": "/templates/mon-qua-nho-2010/app/assets/demo/giftbox.jpg"
        },
        "enableFinale": true,
        "finale": {
            "texts": ["Yêu Thương", "Mãi Bên Nhau"],
            "message": "Cảm ơn vì đã luôn ở bên nhau",
            "loveStart": "2024-02-14",
            "counterLabel": "Mình đã bên nhau"
        }
    },
    "music": "<?php echo addslashes($music); ?>"
};

// PostMessage listener for dynamic real-time updates
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'DG_LIVE_PREVIEW_UPDATE' && e.data.payload) {
        if (window.__GIFTTO_APP && window.__GIFTTO_APP.config) {
            var p = e.data.payload;
            if (p.recipientName) window.__GIFTTO_APP.config.recipientName = p.recipientName;
            if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
                window.__GIFTTO_APP.config.sphereImages = p.photos;
            }
        }
    }
});

// Signal parent builder frame that preview is loaded
try {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'DG_PREVIEW_READY' }, '*');
    }
} catch(e) {}
</script>
<iframe class="gift-app-frame" src="/templates/mon-qua-nho-2010/app/index.html?id=deargift" title="Món Quà Nhỏ VIP" allow="autoplay; fullscreen; clipboard-write; web-share" allowfullscreen></iframe>
</main>

<script src="/templates/_v3/assets/js/effects.js"></script>
<script src="/templates/_v3/assets/js/gift.js"></script>
</body>
</html>
