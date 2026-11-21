from bs4 import BeautifulSoup

with open('live_home.html', 'r', encoding='utf-8') as f:
    live_soup = BeautifulSoup(f.read(), 'html.parser')

with open('index.html', 'r', encoding='utf-8') as f:
    local_soup = BeautifulSoup(f.read(), 'html.parser')

print('Live size:', len(str(live_soup)), 'Local size:', len(str(local_soup)))

live_sections = [s.get('class', [''])[0] for s in live_soup.find_all('section')]
local_sections = [s.get('class', [''])[0] for s in local_soup.find_all('section')]

print('Live sections:', live_sections)
print('Local sections:', local_sections)

# Check missing sections in local
missing = [s for s in live_sections if s not in local_sections]
print('Missing sections:', missing)

# Check scripts
live_scripts = [s.get('src') for s in live_soup.find_all('script') if s.get('src')]
local_scripts = [s.get('src') for s in local_soup.find_all('script') if s.get('src')]
print('Live script src:', live_scripts)
print('Local script src:', local_scripts)

# Check links
live_cards = len(live_soup.find_all('article', class_='tm-card'))
local_cards = len(local_soup.find_all('article', class_='tm-card'))
print(f'Featured cards: live={live_cards}, local={local_cards}')
