import os

i18n_script = '''
<script id="dg-i18n-script">
(function() {
  const dict = {
    'Sản phẩm': 'Products',
    'Ý tưởng quà tặng': 'Gift Ideas',
    'Đánh giá': 'Reviews',
    'Về DearGift': 'About DearGift',
    'Đăng nhập': 'Sign in',
    'Đăng ký': 'Sign up',
    'Tạo tài khoản': 'Sign up',
    'Xem thử': 'Preview',
    'Tạo quà ngay': 'Create Gift',
    'Tất cả': 'All',
    'Sinh nhật': 'Birthday',
    'Tình yêu': 'Love',
    'Kỷ niệm': 'Anniversary',
    'Món Quà Nhỏ': 'Small Gift',
    'Bảng giá': 'Pricing',
    'Câu hỏi thường gặp': 'FAQ',
    'Liên hệ': 'Contact',
    'Gợi ý theo dịp': 'Occasion Ideas',
    'Cảm nhận người dùng': 'Testimonials',
    'Câu chuyện thương hiệu': 'Brand Story',
    'Hỗ trợ & góp ý': 'Support'
  };

  function applyLang(lang) {
    localStorage.setItem('deargift_lang', lang);
    const isEn = lang === 'en';

    // Update active class on switcher
    document.querySelectorAll('.dg-language-switch a, .auth-lang-switch a').forEach(el => {
      const elLang = el.getAttribute('lang') || el.innerText.trim().toLowerCase();
      if ((isEn && elLang.toLowerCase() === 'en') || (!isEn && elLang.toLowerCase() === 'vi')) {
        el.classList.add('is-active', 'active');
      } else {
        el.classList.remove('is-active', 'active');
      }
    });

    // Translate text nodes
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
      const val = node.nodeValue.trim();
      if (!isEn) {
        // Revert reverse dictionary
        for (const [vi, en] of Object.entries(dict)) {
          if (val === en) {
            node.nodeValue = node.nodeValue.replace(en, vi);
            break;
          }
        }
      } else {
        for (const [vi, en] of Object.entries(dict)) {
          if (val === vi) {
            node.nodeValue = node.nodeValue.replace(vi, en);
            break;
          }
        }
      }
    }
  }

  // Intercept click on lang switch
  document.addEventListener('click', function(e) {
    const target = e.target.closest('.dg-language-switch a, .auth-lang-switch a');
    if (!target) return;
    const lang = target.getAttribute('lang') || target.innerText.trim().toLowerCase();
    if (lang === 'en' || lang === 'vi') {
      e.preventDefault();
      applyLang(lang);
      const url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url.toString());
    }
  });

  // Check on load
  const params = new URLSearchParams(window.location.search);
  const currentLang = params.get('lang') || localStorage.getItem('deargift_lang') || 'vi';
  if (currentLang === 'en') {
    window.addEventListener('DOMContentLoaded', () => applyLang('en'));
  }
})();
</script>
'''

for target in ['templates.php', 'index.html', 'about.php', 'contact.php']:
    if not os.path.exists(target):
        continue
    with open(target, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    if 'id="dg-i18n-script"' not in c:
        c = c.replace('</body>', i18n_script + '\n</body>')
        with open(target, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Injected i18n switcher into {target}")
    else:
        print(f"Already in {target}")
