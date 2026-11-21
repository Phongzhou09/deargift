import json
import base64
import uuid
from datetime import datetime

def decode_jwt_payload(token):
    try:
        parts = token.split('.')
        if len(parts) >= 2:
            payload = parts[1]
            padded = payload + '=' * (-len(payload) % 4)
            data = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            return data
    except Exception:
        pass
    return None

def process_google_auth(data, users):
    credential = data.get('credential', '')
    jwt_data = decode_jwt_payload(credential) if credential else None
    
    if jwt_data:
        email = jwt_data.get('email', '').strip().lower()
        full_name = jwt_data.get('name', '').strip() or email.split('@')[0]
        google_id = jwt_data.get('sub', '')
        avatar = jwt_data.get('picture', '')
    else:
        email = data.get('email', credential).strip().lower()
        full_name = data.get('name') or data.get('full_name') or email.split('@')[0]
        google_id = str(uuid.uuid4().hex[:12])
        avatar = ''

    if not email or '@' not in email:
        return None, "Email Google không hợp lệ!"

    username = email.split('@')[0]
    # check if user exists
    user = next((u for u in users if u.get('email', '').lower() == email or u.get('username', '').lower() == username), None)
    if not user:
        user = {
            "id": f"u_gg_{google_id[:8]}",
            "username": username,
            "email": email,
            "full_name": full_name,
            "avatar": avatar,
            "provider": "google",
            "balance": 50000,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        users.append(user)
    else:
        # update name and provider
        user['full_name'] = full_name or user.get('full_name')
        user['provider'] = 'google'
        if avatar:
            user['avatar'] = avatar

    return user, None

# Test with JWT
sample_jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImtobmdoYW5nQGdtYWlsLmNvbSIsIm5hbWUiOiJLaGFjaCBIYW5nIEExIiwic3ViIjoiOTg3NjU0In0.sig'
users = []
user, err = process_google_auth({'credential': sample_jwt}, users)
print("JWT auth result:", user)

# Test with raw form email
user2, err2 = process_google_auth({'email': 'mycustomer@gmail.com', 'name': 'Tran Van B'}, users)
print("Direct email auth result:", user2)
