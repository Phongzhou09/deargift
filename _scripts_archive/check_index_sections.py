with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

print("index.html has #y-tuong:", '#y-tuong' in c or 'id="y-tuong"' in c)
print("index.html has #danh-gia:", '#danh-gia' in c or 'id="danh-gia"' in c)
print("index.html length:", len(c))
