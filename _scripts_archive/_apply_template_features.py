from bs4 import BeautifulSoup
import json
import re

with open('category_mapping.json', 'r', encoding='utf-8') as f:
    cat_map = json.load(f)

tpl_to_cats = {}
for cid, info in cat_map.items():
    for tid in info['template_ids']:
        tpl_to_cats.setdefault(str(tid), set()).add(str(cid))
        tpl_to_cats[str(tid)].add("1")

with open('templates.php', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

cards = soup.find_all('article', class_='tm-card')
for card in cards:
    link = card.find('a', href=re.compile(r'id=(\d+)'))
    tid = None
    if link:
        m = re.search(r'id=(\d+)', link['href'])
        if m: tid = m.group(1)
    
    if tid:
        card['data-template-id'] = str(tid)
        cids = sorted(list(tpl_to_cats.get(str(tid), {'1'})), key=int)
        card['data-category-ids'] = ','.join(cids)
    else:
        card['data-category-ids'] = '1'

# Search & Filter Engine Script
filter_script_code = """
<script id="dg-category-filter-engine">
(function() {
    'use strict';

    function removeVietnameseTones(str) {
        if (!str) return '';
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/\\u0300|\\u0301|\\u0303|\\u0309|\\u0323/g, "");
        str = str.replace(/\\u02C6|\\u031B|\\u0306/g, "");
        return str.trim();
    }

    var categoryNames = {
        '1': 'Tất cả mẫu quà',
        '2': 'Mẫu quà Valentine',
        '3': 'Mẫu quà Sinh nhật',
        '4': 'Mẫu quà Ngày Phụ Nữ',
        '5': 'Mẫu quà Ngày Nhà Giáo',
        '6': 'Mẫu quà Lễ hội & Kỷ niệm',
        '7': 'Mẫu quà Tết & Năm mới',
        '8': 'Mẫu quà Trải nghiệm 3D',
        '9': 'Mẫu quà Tình yêu',
        '10': 'Mẫu quà Mọi dịp'
    };

    function filterTemplates(catId, searchQuery) {
        catId = String(catId || '1');
        var qNorm = removeVietnameseTones(searchQuery || '');
        var cards = document.querySelectorAll('.tm-card');
        var visibleCount = 0;

        cards.forEach(function(card) {
            var cardCats = (card.getAttribute('data-category-ids') || '1').split(',');
            var matchCat = (catId === '1' || catId === 'all') ? true : cardCats.indexOf(catId) !== -1;

            var matchSearch = true;
            if (qNorm) {
                var cardText = removeVietnameseTones(card.innerText || '');
                matchSearch = cardText.indexOf(qNorm) !== -1;
            }

            if (matchCat && matchSearch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Update category tab active state
        document.querySelectorAll('.tm-category').forEach(function(btn) {
            var href = btn.getAttribute('href') || '';
            var m = href.match(/categoryId=(\\d+)/);
            var btnCatId = m ? m[1] : '1';
            if (btnCatId === catId) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });

        // Update section heading
        var headingTitle = document.querySelector('.tm-filter-head strong') || document.querySelector('.tm-section-head h2');
        if (headingTitle) {
            var catName = categoryNames[catId] || 'Bộ sưu tập mẫu quà';
            if (qNorm) {
                headingTitle.textContent = 'Kết quả tìm kiếm "' + searchQuery + '" (' + visibleCount + ')';
            } else {
                headingTitle.textContent = catName + ' (' + visibleCount + ')';
            }
        }

        // Handle empty state
        var container = document.querySelector('.tm-cards-grid') || document.querySelector('.tm-collection .container');
        var emptyEl = document.getElementById('tm-search-empty');
        if (visibleCount === 0) {
            if (!emptyEl && container) {
                emptyEl = document.createElement('div');
                emptyEl.id = 'tm-search-empty';
                emptyEl.style.cssText = 'text-align:center; padding:60px 20px; grid-column:1/-1; background:#fff; border-radius:20px; border:1px dashed #f0c0cc; margin:20px 0;';
                emptyEl.innerHTML = '<div style="font-size:48px; margin-bottom:12px;">🔍</div><h3 style="font-size:18px; font-weight:800; color:#3d3551; margin-bottom:6px;">Không tìm thấy mẫu quà phù hợp</h3><p style="font-size:13px; color:#7a7090; margin-bottom:18px;">Thử tìm kiếm với từ khóa khác như "sinh nhật", "valentine", "3d", "hoa", "galaxy"...</p><button type="button" onclick="resetFilter()" style="padding:10px 22px; border-radius:50px; background:linear-gradient(135deg,#e8589a,#e8589a); color:#fff; border:none; font-weight:700; font-size:13px; cursor:pointer;">Xem tất cả mẫu quà</button>';
                container.appendChild(emptyEl);
            }
            if (emptyEl) emptyEl.style.display = 'block';
        } else {
            if (emptyEl) emptyEl.style.display = 'none';
        }
    }

    window.resetFilter = function() {
        var inp = document.querySelector('input[name="search"]');
        if (inp) inp.value = '';
        filterTemplates('1', '');
        history.pushState(null, '', 'templates.php');
    };

    // Category click handler
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.tm-category');
        if (!btn) return;
        e.preventDefault();
        var href = btn.getAttribute('href') || '';
        var m = href.match(/categoryId=(\\d+)/);
        var catId = m ? m[1] : '1';
        var searchInput = document.querySelector('input[name="search"]');
        var q = searchInput ? searchInput.value.trim() : '';

        filterTemplates(catId, q);

        var newUrl = catId === '1' ? 'templates.php' : ('templates.php?categoryId=' + catId);
        if (q) newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + 'search=' + encodeURIComponent(q);
        history.pushState(null, '', newUrl);
    });

    // Live search handler
    var searchTimer = null;
    document.addEventListener('input', function(e) {
        var inp = e.target.closest('input[name="search"]');
        if (!inp) return;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            var activeBtn = document.querySelector('.tm-category.is-active');
            var m = activeBtn ? (activeBtn.getAttribute('href') || '').match(/categoryId=(\\d+)/) : null;
            var catId = m ? m[1] : '1';
            filterTemplates(catId, inp.value.trim());
        }, 150);
    });

    // Prevent search form reload
    var searchForm = document.querySelector('form.tm-search');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var inp = searchForm.querySelector('input[name="search"]');
            var q = inp ? inp.value.trim() : '';
            var activeBtn = document.querySelector('.tm-category.is-active');
            var m = activeBtn ? (activeBtn.getAttribute('href') || '').match(/categoryId=(\\d+)/) : null;
            var catId = m ? m[1] : '1';
            filterTemplates(catId, q);
        });
    }

    // Run on load
    document.addEventListener('DOMContentLoaded', function() {
        var params = new URLSearchParams(window.location.search);
        var catId = params.get('categoryId') || '1';
        var searchQ = params.get('search') || '';
        if (searchQ) {
            var inp = document.querySelector('input[name="search"]');
            if (inp) inp.value = searchQ;
        }
        if (catId !== '1' || searchQ) {
            filterTemplates(catId, searchQ);
        }
    });
})();
</script>
"""

# Replace or append the script
html_output = str(soup)
if 'id="dg-category-filter-engine"' in html_output:
    html_output = re.sub(r'<script id="dg-category-filter-engine">.*?</script>', filter_script_code, html_output, flags=re.DOTALL)
else:
    html_output = html_output.replace('</body>', filter_script_code + '\n</body>')

with open('templates.php', 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Applied category filter & live search engine to templates.php!")
