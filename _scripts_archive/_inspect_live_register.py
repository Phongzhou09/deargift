import urllib.request
from bs4 import BeautifulSoup

req = urllib.request.Request('https://deargift.love/register.php', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')

print("--- FORMS IN DEARGIFT.LOVE/REGISTER.PHP ---")
for f in soup.find_all('form'):
    print(f"Action: {f.get('action')}, Method: {f.get('method')}")
    for inp in f.find_all(['input', 'button']):
        print(f"  {inp.name} name={inp.get('name')} type={inp.get('type')} value={inp.get('value')}")

idx = html.find('handleGoogleLoginResponse')
if idx == -1:
    idx = html.find('g_id_onload')
if idx != -1:
    print("\n--- GOOGLE SECTION IN REGISTER.PHP ---")
    print(html[idx-200:idx+800])
else:
    print("No g_id_onload found directly in register.php")
