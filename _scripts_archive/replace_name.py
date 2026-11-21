import os

search_names = ["Bùi Minh Quyết", "Bùi Xuân Minh Quyết", "Bùi Minh Quyet", "Bui Minh Quyet"]
target_name = "Nguyễn Văn Phong"

count = 0
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith(('.html', '.php', '.js', '.json', '.txt', '.md')):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                modified = False
                for s in search_names:
                    if s in content:
                        content = content.replace(s, target_name)
                        modified = True
                
                if modified:
                    with open(p, 'w', encoding='utf-8') as file:
                        file.write(content)
                    print(f"Updated: {p}")
                    count += 1
            except Exception as e:
                pass

print(f"Total updated files: {count}")
