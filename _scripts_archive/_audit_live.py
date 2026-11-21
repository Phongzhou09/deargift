from bs4 import BeautifulSoup
import re

with open("live_templates.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

print("=== 1. PAGE TITLE & META ===")
print("Title:", soup.title.string if soup.title else "")

print("\n=== 2. NAVIGATION LINKS ===")
nav = soup.find("nav", class_="main-nav")
if nav:
    for a in nav.find_all("a"):
        print(f"  {a.get_text(strip=True)} -> {a.get('href')}")

print("\n=== 3. CATEGORIES ===")
cat_nav = soup.find("nav", class_="tm-categories")
if cat_nav:
    for a in cat_nav.find_all("a"):
        print(f"  {a.get_text(strip=True)} -> {a.get('href')}")

print("\n=== 4. SEARCH FORM ===")
sf = soup.find("form", class_="tm-search")
if sf:
    print("Action:", sf.get("action"), "Method:", sf.get("method"))
    for inp in sf.find_all("input"):
        print("  input:", inp.get("name"), inp.get("placeholder"), inp.get("value"))

print("\n=== 5. TEMPLATE CARDS ===")
cards = soup.find_all("article", class_="tm-card")
print("Total cards:", len(cards))
if cards:
    c = cards[0]
    print("Card 0 HTML snippet:")
    print(c.prettify()[:600])

print("\n=== 6. JAVASCRIPT FILES & SCRIPTS ===")
for s in soup.find_all("script"):
    src = s.get("src")
    if src:
        print("Script src:", src)
    else:
        text = s.string or ""
        print("Inline script length:", len(text), "starts with:", text.strip()[:60])
