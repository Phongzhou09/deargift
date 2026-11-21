import json

def generate_live_preview_html(data):
    slug = data.get('slug', 'mon-qua-nho-2010')
    rec_name = data.get('recipient_name', 'Người thương') or 'Người thương'
    sender_name = data.get('sender_name', 'Nguyễn Văn Phong') or 'Nguyễn Văn Phong'
    message = data.get('message', 'Chúc bạn luôn hạnh phúc và ngập tràn niềm vui! ❤️')
    music = data.get('music', '/assets/music/givemeyourforever.mp3')
    password = data.get('password', '')
    
    photos_json = data.get('photos_json', '[]')
    try:
        photos = json.loads(photos_json) if isinstance(photos_json, str) else photos_json
    except Exception:
        photos = []
    
    if not photos:
        photos = [
            f"https://deargift.love/templates/{slug}/app/assets/demo/sphere-{i}.jpg" for i in range(6)
        ]

    config = {
        "appTitle": f"Món Quà Nhỏ - Dành riêng cho {rec_name} 💖",
        "appIcon": f"https://deargift.love/templates/{slug}/app/assets/images/icons/couple.png",
        "enableWebsiteInfo": True,
        "enablePasscode": bool(password),
        "passcode": str(password),
        "passcodeTitle": "Nhập mật khẩu",
        "passcodeSubtitle": "Gợi ý: Mật khẩu riêng tư của bạn",
        "enableMorphEffect": True,
        "morphTexts": [f"Gửi {rec_name}", "Một món quà nhỏ", "Dành riêng cho bạn", "Mãi bên nhau nhé"],
        "particleImage": f"https://deargift.love/templates/{slug}/app/assets/demo/particle.png",
        "particleImageShape": "heart",
        "particleColor": "",
        "heartName": rec_name,
        "enableSphere": True,
        "sphereImages": photos,
        "enableSphereFlyingImages": True,
        "flyingCaptions": [f"{rec_name} thật nhiều 💕", "Khoảnh khắc đẹp nhất ✨", "Mãi bên nhau nhé 🥰", "Luôn rạng rỡ nhé 🌸", "Cảm ơn vì tất cả 💖"],
        "enableLetter": True,
        "letter": {
            "title": f"Gửi {rec_name}!",
            "text": message,
            "image": photos[0] if photos else f"https://deargift.love/templates/{slug}/app/assets/demo/letter.png",
            "caption": "Khoảnh khắc đẹp của chúng mình ♥",
            "signature": f"{sender_name} ♥",
            "envColor": "night"
        },
        "bgMusic": music,
        "bgVolume": 0.55,
        "autoPlay": False,
        "recipientName": rec_name,
        "enableCalendar": True,
        "calendar": {"day": 21, "month": 11, "title": "Ngày Đặc Biệt Của Chúng Mình", "caption": f"Dành tặng {rec_name} ♥"},
        "enableBouquet": True,
        "bouquet": {"count": 9, "color": "red", "title": "Tặng bạn bó hoa không bao giờ tàn", "meaning": "Mãi mãi bên nhau", "subtitle": "Hoa thật rồi sẽ héo, nhưng bó hoa này sẽ nở mãi — như tình cảm chân thành dành cho bạn mỗi ngày."},
        "enableGiftBox": True,
        "giftBox": {"color": "pink", "message": f"Dành tặng {rec_name} món quà bất ngờ! ✨", "image": photos[min(1, len(photos)-1)] if photos else ""},
        "enableFinale": True,
        "finale": {"texts": ["Yêu Thương", "Mãi Bên Nhau"], "message": "Cảm ơn vì đã luôn ở bên nhau", "loveStart": "2024-02-14", "counterLabel": "Mình đã bên nhau"}
    }

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Món Quà Nhỏ VIP · Bó Hoa, Thẻ Cào &amp; Pháo Hoa 3D 🎁</title>
<link rel="stylesheet" href="/templates/_v3/assets/css/gift.css?v=1794023395">
<style>
body.tpl-body-{slug} {{ background: #0b0a12; overflow: hidden; margin:0; padding:0; }}
.gift-app-frame {{ position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 1; background: #0b0a12; }}
.gift-preview-flag {{ position: fixed; top: 12px; left: 12px; z-index: 999; background: #e8589a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; }}
</style>
</head>
<body class="gift-body tpl-body-{slug}">
<div class="gift-preview-flag">XEM THỬ</div>
<script>window.__GIFTTO_APP = {{"config": {json.dumps(config, ensure_ascii=False)}, "music": {json.dumps(music, ensure_ascii=False)}}};</script>
<iframe class="gift-app-frame" src="/templates/{slug}/app/index.html?id=deargift" allow="autoplay; fullscreen; clipboard-write; web-share" allowfullscreen></iframe>
<script src="/templates/_v3/assets/js/effects.js?v=1792591738"></script>
<script src="/templates/_v3/assets/js/gift.js?v=1792591738"></script>
</body>
</html>"""
    return html

sample_data = {
    "slug": "mon-qua-nho-2010",
    "recipient_name": "Bảo Ngọc",
    "photos_json": json.dumps(["blob:http://localhost:8000/photo1", "blob:http://localhost:8000/photo2"])
}
res = generate_live_preview_html(sample_data)
print("Preview HTML generated successfully, length:", len(res))
assert "Bảo Ngọc" in res
assert "blob:http://localhost:8000/photo1" in res
