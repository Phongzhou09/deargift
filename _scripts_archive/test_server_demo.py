import urllib.request

try:
    resp = urllib.request.urlopen('http://localhost:8000/demo.php?id=69')
    print('GET /demo.php?id=69:', resp.status, len(resp.read()))
except Exception as e:
    print('Error /demo.php:', e)

try:
    resp = urllib.request.urlopen('http://localhost:8000/templates/mon-qua-nho-2010/app/index.html')
    print('GET /templates/.../index.html:', resp.status, len(resp.read()))
except Exception as e:
    print('Error /templates:', e)

try:
    resp = urllib.request.urlopen('http://localhost:8000/templates.php')
    print('GET /templates.php:', resp.status, len(resp.read()))
except Exception as e:
    print('Error /templates.php:', e)
