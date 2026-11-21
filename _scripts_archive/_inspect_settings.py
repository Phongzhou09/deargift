from bs4 import BeautifulSoup

with open("live_settings_authenticated.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

print("=== SETTINGS PAGE TITLE ===")
print(soup.title.string if soup.title else "No title")

print("\n=== HEADINGS ===")
for h in soup.find_all(["h1", "h2", "h3"]):
    print(" ", h.name, "->", h.get_text(strip=True))

print("\n=== FORMS ===")
for i, fm in enumerate(soup.find_all("form")):
    print(f"Form {i}: action={fm.get('action')} method={fm.get('method')}")
    for inp in fm.find_all(["input", "button", "select"]):
        print(f"   {inp.name}: name={inp.get('name')} type={inp.get('type')}")

print("\n=== BUTTONS & LINKS ===")
for a in soup.find_all("a"):
    cls = a.get("class", [])
    txt = a.get_text(strip=True)
    href = a.get("href")
    if txt and href:
        print(f"   Link: {txt} -> {href}")
