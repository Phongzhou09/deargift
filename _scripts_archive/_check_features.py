from bs4 import BeautifulSoup

with open("live_templates.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

print("Header buttons:")
header = soup.find("header", class_="site-header")
if header:
    for btn in header.find_all(["a", "button"]):
        print("  ", btn.name, btn.get("class"), btn.get_text(strip=True), btn.get("href"))

print("\nHero section:")
hero = soup.find("section", class_="tm-hero") or soup.find("div", class_="tm-hero")
if hero:
    print(hero.prettify()[:400])

print("\nMobile nav panel:")
mnav = soup.find(id="mobileNavPanel")
if mnav:
    print("Mobile nav exists, items:", len(mnav.find_all("a")))

print("\nFooter section:")
footer = soup.find("footer")
if footer:
    print("Footer columns:", len(footer.find_all(class_=lambda c: c and "col" in c)))
