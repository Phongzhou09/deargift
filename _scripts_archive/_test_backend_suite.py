import urllib.request
import json

BASE = "http://localhost:8000"

def get(path, headers={}):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status, json.loads(r.read().decode('utf-8'))

def post(path, data, headers={}):
    h = {'Content-Type': 'application/json'}
    h.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=json.dumps(data).encode('utf-8'), headers=h)
    with urllib.request.urlopen(req, timeout=5) as r:
        cookies = r.headers.get('Set-Cookie', '')
        return r.status, json.loads(r.read().decode('utf-8')), cookies

print("1. Testing GET /api/me (guest):")
status, res = get('/api/me')
print("Status:", status, "Response:", res)
assert res['logged_in'] is False

print("\n2. Testing POST /api/register:")
status, res, cookie = post('/api/register', {
    "username": "customer_auto_1",
    "email": "customer1@gmail.com",
    "password": "password123",
    "full_name": "Khách Hàng Tự Động 1"
})
print("Status:", status, "Cookie:", cookie, "User:", res.get('user', {}).get('username'))
assert res['user']['username'] == 'customer_auto_1'

print("\n3. Testing GET /api/me with Cookie:")
status, res = get('/api/me', headers={'Cookie': 'currentUser=customer_auto_1'})
print("Status:", status, "Logged in as:", res.get('user', {}).get('full_name'))
assert res['user']['username'] == 'customer_auto_1'

print("\n4. Testing POST /auth_google.php:")
status, res, cookie = post('/auth_google.php', {
    "email": "individual.user@gmail.com",
    "name": "Nguyễn Thị Mai Linh"
})
print("Status:", status, "Cookie:", cookie, "User:", res.get('user', {}).get('full_name'))
assert res['user']['username'] == 'individual.user'

print("\n5. Testing POST /api_submit_idea.php:")
status, res, _ = post('/api_submit_idea.php', {
    "name": "Mai Linh",
    "contact": "0987654321",
    "content": "Thêm mẫu quà 3D vũ trụ phát nhạc sinh nhật!"
})
print("Status:", status, "Success:", res.get('success'), "Msg:", res.get('message'))
assert res['success'] is True

print("\n6. Testing POST /api_submit_review.php:")
status, res, _ = post('/api_submit_review.php', {
    "rating": 5,
    "content": "Trang web tuyệt vời, bạn gái mình thích lắm!"
}, headers={'Cookie': 'currentUser=individual.user'})
print("Status:", status, "Success:", res.get('success'), "Msg:", res.get('message'))
assert res['success'] is True

print("\n7. Testing POST /settings.php profile update:")
status, res, _ = post('/settings.php', {
    "action": "update_profile",
    "full_name": "Nguyễn Thị Mai Linh (VIP)",
    "phone": "0912345678"
}, headers={'Cookie': 'currentUser=individual.user'})
print("Status:", status, "Success:", res.get('success'), "Updated name:", res.get('user', {}).get('full_name'))

print("\n🎉 ALL BACKEND ENDPOINTS PASSED FLAWLESSLY!")
