with open('login.html', 'r', encoding='utf-8') as f:
    login_html = f.read()

with open('register.html', 'r', encoding='utf-8') as f:
    register_html = f.read()

print("--- LOGIN.HTML GOOGLE SIGN-IN SECTION ---")
for line in login_html.splitlines():
    if 'google' in line.lower() or 'oauth' in line.lower() or 'handleCustomer' in line:
        print(line)

print("\n--- REGISTER.HTML GOOGLE SIGN-IN SECTION ---")
for line in register_html.splitlines():
    if 'google' in line.lower() or 'oauth' in line.lower() or 'handleCustomer' in line:
        print(line)
