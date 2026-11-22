/*
 * DearGift bridge — nạp TRƯỚC mọi script Next.js của app (xem view.php của mẫu).
 *
 * App chạy trong iframe cùng origin; trang mẹ (view.php) đặt window.__GIFTTO_APP = {
 *   settings: {...}   // dữ liệu kiểu "API settings" mà app vốn tự fetch theo ?id=
 *   cake:     {...}   // riêng mẫu bánh kem: nội dung nạp vào ExperienceProvider
 * }
 * Cầu nối trả dữ liệu đó thay cho API gốc, nên không cần máy chủ riêng cho app.
 */
(function () {
    var cfg = null;
    try {
        if (window.parent && window.parent !== window) cfg = window.parent.__GIFTTO_APP || null;
    } catch (e) { /* khác origin → dùng nội dung mặc định của app */ }
    if (!cfg) cfg = window.__GIFTTO_APP || null;
    window.__GIFTTO_APP = cfg;

    // --- API cài đặt của site gốc (…/api/gift-settings/:id, …/api/settings/:id) ------------
    // LUÔN chặn, kể cả khi không có dữ liệu: app không bao giờ gọi ra máy chủ của site gốc.
    // Không có cài đặt → success:false → app dùng nội dung mặc định của nó.
    if (window.fetch) {
        var origFetch = window.fetch;
        var defaultSettings = {};
        var currentSettings = (cfg && cfg.settings) ? Object.assign({}, defaultSettings, cfg.settings) : defaultSettings;
        var body = JSON.stringify({ success: true, data: { settings: currentSettings } });
        // Trả dữ liệu khi trang đã đọc xong HTML: vài trang fetch ngay trong <head> rồi ghi
        // vào phần tử nằm cuối trang — API thật chậm nên kịp, trả tức thì thì phần tử chưa có.
        // Chờ readyState rời 'loading' (trước khi chạy script defer/module), KHÔNG chờ
        // DOMContentLoaded: trang có module top-level await chính dữ liệu này sẽ bị treo.
        var parsed = new Promise(function (resolve) {
            if (document.readyState !== 'loading') return resolve();
            document.addEventListener('readystatechange', function h() {
                if (document.readyState === 'loading') return;
                document.removeEventListener('readystatechange', h);
                resolve();
            });
        });
        window.fetch = function (input) {
            var u = typeof input === 'string' ? input : (input && input.url) || '';
            if (/gift-settings\/|\/api\/settings\//.test(u)) {
                return parsed.then(function () {
                    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
                });
            }
            return origFetch.apply(this, arguments);
        };
    }
    if (!cfg) return;

    // Lời chúc khách viết là tiếng Việt → ẩn nút đổi ngôn ngữ (đổi sang thứ tiếng khác
    // chỉ dịch phần chữ mẫu, còn tên/lá thư vẫn tiếng Việt → lẫn lộn).
    var css = document.createElement('style');
    css.textContent = '[class*="LanguageProvider-module"],button[aria-haspopup="listbox"][title="Ngôn ngữ"]{display:none!important}';
    document.head.appendChild(css);

    // --- Bánh kem: vá giá trị ExperienceProvider -------------------------------------------
    // Nội dung gốc xưng "Tớ" – "Cậu". Có tên riêng thì thay đúng hai từ đó (nguyên từ),
    // giống bước thay tên lúc build của app gốc.
    var c = cfg.cake;
    window.__GIFTTO_PATCH = function (v) {
        if (!c || !v || !v.contents || !v.contents.vi) return v;
        var vi = JSON.parse(JSON.stringify(v.contents.vi));
        var rx = function (w) { return new RegExp('(?<![\\p{L}\\p{M}])' + w + '(?![\\p{L}\\p{M}])', 'gu'); };
        var swaps = [];
        if (c.receiverName) swaps.push([rx('[Cc]ậu'), c.receiverName]);
        if (c.senderName) swaps.push([rx('[Tt]ớ'), c.senderName]);
        var walk = function (x) {
            if (typeof x === 'string') {
                for (var i = 0; i < swaps.length; i++) x = x.replace(swaps[i][0], swaps[i][1]);
                return x;
            }
            if (Array.isArray(x)) return x.map(walk);
            if (x && typeof x === 'object') { for (var k in x) x[k] = walk(x[k]); }
            return x;
        };
        vi = walk(vi);
        if (c.receiverName) vi.receiverName = c.receiverName;
        if (c.senderName) vi.senderName = c.senderName;
        if (c.day && c.month) { vi.opening.day = c.day; vi.opening.month = c.month; }
        if (c.letterBody) vi.letter.body = c.letterBody;
        if (c.wishOptions && c.wishOptions.length) vi.wish.options = c.wishOptions;

        var images = Object.assign({}, v.images);
        if (c.photos && c.photos.length) {
            images.girls = c.photos.slice(0, 8);
            images.letterPhoto = c.photos[c.photos.length - 1];
        }
        // Nội dung khách viết là tiếng Việt → chỉ giữ bản vi.
        return { locale: 'vi', contents: { vi: vi }, images: images, music: c.music || v.music };
    };
})();
