with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

import re
idea_code = re.findall(r'function submitIdeaBtn[\s\S]*?^}', c, re.M)
if idea_code:
    print("--- SUBMIT IDEA BTN ---")
    print(idea_code[0])

review_code = re.findall(r'function submitReview[\s\S]*?^}', c, re.M)
if review_code:
    print("\n--- SUBMIT REVIEW ---")
    print(review_code[0])
