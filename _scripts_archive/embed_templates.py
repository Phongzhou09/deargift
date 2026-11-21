import json

with open('templates_data.json', 'r', encoding='utf-8') as f:
    tpl_data = json.load(f)

json_str = json.dumps(tpl_data, ensure_ascii=False)

with open('admin.html', 'r', encoding='utf-8') as f:
    admin_content = f.read()

# Replace let templatesData = []; with embedded templates
old_decl = 'let templatesData = [];'
new_decl = f'const EMBEDDED_TEMPLATES = {json_str};\n    let templatesData = [...EMBEDDED_TEMPLATES];'

if old_decl in admin_content:
    admin_content = admin_content.replace(old_decl, new_decl)
    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(admin_content)
    print("Successfully embedded templates into admin.html!")
else:
    print("Could not find old_decl in admin.html")
