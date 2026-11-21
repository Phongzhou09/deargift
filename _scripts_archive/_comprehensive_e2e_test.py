import urllib.request
import json

BASE = "http://localhost:8000"

def get(path, headers={}):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status, r.read().decode('utf-8', errors='ignore')

def post_json(path, data, headers={}):
    h = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    h.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=json.dumps(data).encode('utf-8'), headers=h)
    with urllib.request.urlopen(req, timeout=5) as r:
        cookie = r.headers.get('Set-Cookie', '')
        return r.status, json.loads(r.read().decode('utf-8')), cookie

print("--- 1. Testing Page Serving ---")
pages = ['/', '/templates.php', '/login.html', '/login.php', '/register.html', '/register.php', '/settings.php', '/my-gifts.php', '/about.php', '/contact.php']
for p in pages:
    st, html = get(p)
    print(f"GET {p:16} -> Status {st}, Length {len(html)}")
    assert st == 200

print("\n--- 2. Testing Customer Registration ---")
st, res, cookie = post_json('/api/register', {
    "username": "hoangnam",
    "email": "hoangnam2026@gmail.com",
    "password": "pass_hoangnam",
    "full_name": "Lê Hoàng Nam"
})
print("Registered:", res.get('user', {}).get('full_name'), "Cookie:", cookie)
assert res['status'] == 'success'

print("\n--- 3. Testing Current Customer Session ---")
st, html = get('/api/me', headers={'Cookie': 'currentUser=hoangnam'})
data = json.loads(html)
print("Logged in as:", data.get('user', {}).get('full_name'), "Email:", data.get('user', {}).get('email'))
assert data['user']['username'] == 'hoangnam'
assert 'phong' not in data['user']['username']

print("\n--- 4. Testing Customer Google Sign-In ---")
st, res, cookie = post_json('/auth_google.php', {
    "email": "thuylinh.cute@gmail.com",
    "name": "Trần Thùy Linh"
})
print("Google Sign-In:", res.get('user', {}).get('full_name'), "Cookie:", cookie)
assert res['success'] is True
assert res['user']['username'] == 'thuylinh.cute'

print("\n--- 5. Testing Idea Submission ---")
st, res, _ = post_json('/api_submit_idea.php', {
    "name": "Trần Thùy Linh",
    "contact": "0912345678",
    "content": "Muốn thêm hiệu ứng cánh hoa anh đào rơi cho ngày 8/3"
})
print("Idea submit:", res.get('message'))
assert res['success'] is True

print("\n--- 6. Testing Review Submission ---")
st, res, _ = post_json('/api_submit_review.php', {
    "rating": 5,
    "content": "Thiệp 3D mở ra tuyệt đẹp, bạn gái mình thích lắm!"
}, headers={'Cookie': 'currentUser=thuylinh.cute'})
print("Review submit:", res.get('message'))
assert res['success'] is True

print("\n--- 7. Testing Gift Creation & VietQR MBBank ---")
st, res, _ = post_json('/api/gifts/create', {
    "recipient_name": "Bảo Ngọc",
    "letter_title": "Gửi em yêu!",
    "letter_content": "Mỗi ngày bên em là một ngày hạnh phúc đong đầy ❤️",
    "letter_signature": "Hoàng Nam",
    "template_id": "69",
    "music": "./assets/music/givemeyourforever.mp3"
})
print("Gift Created ID:", res.get('gift_id'))
print("Share Code:", res.get('share_code'))
print("Bank:", res.get('bank', {}).get('name'), res.get('bank', {}).get('account'), res.get('bank', {}).get('account_name'))
print("QR URL:", res.get('qr_url'))
assert res['bank']['account'] == '2006999988836'
assert res['bank']['account_name'] == 'NGUYEN VAN PHONG'

gift_id = res['gift_id']

print("\n--- 8. Testing Gift Custom Personalized View ---")
st, gift_html = get(f"/gift.php?uid={gift_id}")
print(f"GET /gift.php?uid={gift_id} -> Status {st}, Length {len(gift_html)}")
assert st == 200
assert 'Bảo Ngọc' in gift_html

print("\n=======================================================")
print("🎯 FULL E2E SUITE PASSED 100%! ALL FEATURES CONFIRMED!")
print("=======================================================")
