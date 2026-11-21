(function () {
    'use strict';

    if (window.DG_BUILDER_LANGUAGE !== 'en') return;

    var translations = {
        'Quay về bộ sưu tập': 'Back to templates',
        '✨ Thiết kế quà tặng': '✨ Gift designer',
        'KHÔNG GIAN BIÊN TẬP': 'GIFT DESIGN STUDIO',
        'Chọn một công cụ, nhập nội dung của bạn và xuất bản khi mọi thứ đã sẵn sàng.': 'Choose a tool, add your content, then publish when everything looks right.',
        'Tiến trình tạo quà': 'Gift creation progress',
        'Cá nhân hóa': 'Personalize',
        'Xem thử': 'Preview',
        'Xuất bản': 'Publish',
        'BIÊN TẬP NỘI DUNG': 'EDIT YOUR GIFT',
        'Tùy chỉnh từng chi tiết': 'Make every detail yours',
        'Mỗi mục chỉ hiển thị đúng những trường dữ liệu mà mẫu này sử dụng.': 'Only the fields used by this template are shown.',
        'PC': 'Desktop',
        'Điện thoại': 'Mobile',
        'Cập nhật': 'Refresh',
        'Xem trước tương tác của mẫu quà': 'Interactive gift preview',
        'Bản demo chạy code thật của mẫu này. Nội dung, ảnh và nhạc bạn đang chọn sẽ được đồng bộ để kiểm tra trước khi tạo quà.': 'This is a live preview. Your text, photos and music are synced here before you create the gift.',
        'Nội dung & trải nghiệm': 'Gift content & experience',
        'Màn tin nhắn': 'Message screen',
        '💬 Màn tin nhắn': '💬 Message screen',
        'Đang có': 'Included',
        'Đang có trong quà': 'Included in this gift',
        'Trái tim 3D': '3D heart',
        'Tùy chỉnh': 'Customize',
        'Quả cầu ảnh': 'Photo globe',
        'Chưa thêm': 'Not added',
        'Thư': 'Letter',
        'Lá thư': 'Love letter',
        'Chưa điền': 'Not filled in',
        'Màn mở khóa': 'Lock screen',
        'Cài đặt chung': 'General settings',
        'Nhạc nền': 'Background music',
        'Ảnh trái tim': 'Heart photos',
        'Ảnh kỷ niệm': 'Memory photos',
        'Ảnh rơi': 'Falling photos',
        'Ảnh Noel': 'Christmas photos',
        'Ảnh Album': 'Album photos',
        'Ảnh quả cầu': 'Globe photos',
        'Ảnh bó hoa': 'Bouquet photos',
        'Ảnh bay': 'Floating photos',
        '💗 Ảnh tạo hình trái tim 3D': '💗 3D heart photos',
        '🔮 Quả cầu ảnh': '🔮 Photo globe',
        '📸 Ảnh rơi': '📸 Falling photos',
        '📸 Ảnh Album': '📸 Album photos',
        '📸 Ảnh quả cầu 3D': '📸 3D globe photos',
        'Các ảnh sẽ ghép thành hình trái tim 3D rồi bung ra theo hiệu ứng của mẫu. Tối đa 20 ảnh.': 'Your photos form a 3D heart, then burst outward with the template effect. Up to 20 photos.',
        'Tối đa 10 ảnh. Bấm ảnh để đổi hoặc xóa; ảnh sẽ xuất hiện trong đoạn chat và hiệu ứng cuối.': 'Up to 10 photos. Tap a photo to replace or remove it; photos appear in the chat and final effect.',
        'Những bức ảnh này sẽ rơi bồng bềnh trong không gian. Tối đa 20 ảnh.': 'These photos float gently through the scene. Up to 20 photos.',
        'Các ảnh sẽ được hiển thị trong cuốn album 3D lật trang. Tối đa 20 ảnh.': 'Your photos appear in a page-turning 3D album. Up to 20 photos.',
        'Các ảnh sẽ xuất hiện trong phần quà tặng bí ẩn sau khi mở hộp quà Giáng Sinh. Tối đa 20 ảnh.': 'Your photos appear in the surprise after the Christmas gift box opens. Up to 20 photos.',
        'Ảnh sẽ hiển thị trong quả cầu 3D xoay theo nhạc. Tối đa 20 ảnh.': 'Your photos appear inside a 3D globe that rotates with the music. Up to 20 photos.',
        '📷 Chọn ảnh từ máy tính': '📷 Choose photos from your device',
        '🖼️ Dùng ảnh mặc định (Miễn phí)': '🖼️ Use default photos (Free)',
        '🦋 Ảnh hiệu ứng bay': '🦋 Floating effect photos',
        'Ảnh sẽ bay lơ lửng xung quanh màn hình tạo hiệu ứng lung linh. Tối đa 20 ảnh.': 'Photos float around the screen for a dreamy effect. Up to 20 photos.',
        'Thông tin': 'Details',
        'Vòng quay': 'Prize wheel',
        'Chữ & Trái tim': 'Words & heart',
        'Lời chúc & Hiệu ứng': 'Message & effects',
        '🎉 Cài đặt lời chúc & hiệu ứng mưa chữ': '🎉 Message & letter-rain settings',
        'Dùng cho lời chúc sinh nhật hoặc lời tỏ tình.': 'Use it for birthday wishes or a heartfelt confession.',
        'Chữ chạy ở nền': 'Background letter rain',
        'Màu mưa chữ 1': 'Letter-rain color 1',
        'Màu mưa chữ 2': 'Letter-rain color 2',
        'Lời chúc chính (ngăn cách từng dòng bằng dấu |)': 'Main message (separate each line with |)',
        'Sinh nhật: HAPPY|BIRTHDAY|TO|YOU|❤ · Tỏ tình: ANH|YÊU|EM|❤': 'Birthday: HAPPY|BIRTHDAY|TO|YOU|❤ · Love: I|LOVE|YOU|❤',
        'Màu chữ chính': 'Main text color',
        'Tên người nhận': 'Recipient name',
        'Ngày đặc biệt (không bắt buộc)': 'Special date (optional)',
        'Số tuổi hoặc con số kỷ niệm (không bắt buộc)': 'Age or anniversary number (optional)',
        'Nội dung lời chúc / lời tỏ tình trong hộp quà': 'Birthday wish or love message inside the gift box',
        'Hiển thị hiệu ứng trái tim rơi': 'Show falling-heart effect',
        'Chưa chọn': 'Not selected',
        'Khóa & QR': 'Lock & QR',
        'Đã tắt': 'Off',
        'Cần 4 số': 'Needs 4 digits',
        '1 câu': '1 question',
        '● Nội dung được đồng bộ vào bản xem thử.': '● Your content is synced to the live preview.',
        'Nội dung được đồng bộ vào bản xem thử.': 'Your content is synced to the live preview.',
        'Công cụ nội dung quà': 'Gift content tools',
        'Xem trước và xuất bản': 'Preview and publish',
        'Thu gọn': 'Collapse',
        'Tên hiển thị trong chat *': 'Chat display name *',
        'Ảnh đại diện': 'Profile photo',
        '📷 Chọn ảnh': '📷 Choose photo',
        'Xem trước ảnh đại diện': 'Profile photo preview',
        'Ảnh nền màn hình tin nhắn': 'Message screen wallpaper',
        '🖼️ Chọn ảnh nền khác': '🖼️ Choose a different wallpaper',
        'Xem trước ảnh nền': 'Wallpaper preview',
        'Ảnh dùng chung cho màn khóa và Messenger. Nên dùng ảnh dọc tỷ lệ khoảng 9:19.5; tệp chỉ được dùng cho nội dung món quà.': 'This image is used for both the lock screen and Messenger. A vertical image around 9:19.5 works best.',
        '🎨 Giao diện chat': '🎨 Chat theme',
        'Mặc định': 'Default',
        'Tình yêu': 'Love',
        'Cầu vồng': 'Rainbow',
        'Tin nhắn': 'Messages',
        'Có một điều này muốn nói với cậu...': 'There is something I want to tell you...',
        'Mình đã chuẩn bị một điều bất ngờ cho cậu 🥰': 'I prepared a little surprise for you 🥰',
        '＋ Thêm tin nhắn': '＋ Add message',
        'Giữa trái tim sẽ hiện gì?': 'What should appear inside the heart?',
        '◉ Đếm số ngày yêu': '◉ Count days together',
        'Tự tăng thêm mỗi ngày': 'Updates automatically every day',
        '○ Tự viết một dòng chữ': '○ Write your own message',
        'Ngày bắt đầu yêu': 'Relationship start date',
        'Dòng chữ giữa trái tim': 'Text inside the heart',
        'Đang Yêu': 'In Love',
        'Ảnh Anh': 'His photo',
        'Ảnh Em': 'Her photo',
        '📷 Thêm ảnh Anh': '📷 Add his photo',
        '📷 Thêm ảnh Em': '📷 Add her photo',
        '✨ Dùng lời thư mẫu': '✨ Use a sample letter',
        'Điền lời mẫu': 'Use sample',
        'Nội dung thư': 'Letter message',
        'Nội dung lá thư 💌': 'Letter message 💌',
        'Nội dung bức thư': 'Letter message',
        'Ngày sinh (VD: 1/1/2003)': 'Birthday (e.g. 1/1/2003)',
        'Chữ ký dưới thư': 'Letter signature',
        'Chữ hiệu ứng hạt 1 (VD: Chúc Mừng)': 'Particle text 1 (e.g. Congratulations)',
        'Chữ hiệu ứng hạt 2 (VD: Ngày Quốc Tế Phụ Nữ)': 'Particle text 2 (e.g. Happy Women’s Day)',
        'Lời chúc bay khi mở quà cuối (Mỗi dòng 1 câu)': 'Floating wishes in the final scene (one per line)',
        'Lời nhắn trên hộp quà': 'Message on the gift box',
        'gửi em yêu của anh': 'With all my love',
        'Ảnh sẽ xuất hiện trong hiệu ứng của mẫu quà này.': 'Your photos will appear in this template’s visual effects.',
        'Chọn ảnh từ máy tính': 'Choose photos from your device',
        'Dùng ảnh mặc định (Miễn phí)': 'Use default photos (Free)',
        'Ảnh bay trang trí': 'Decorative floating photos',
        'Thêm ảnh bay': 'Add floating photos',
        '📝 Thông tin người chơi': '📝 Player details',
        '🎡 Nội dung vòng quay': '🎡 Prize wheel content',
        '🌌 Chữ bay & trái tim hạt': '🌌 Floating words & particle heart',
        '💌 Lá thư tình cảm': '💌 Personal message',
        'Tên người nhận quà *': 'Recipient name *',
        'Tên này sẽ xuất hiện trên tiêu đề thư và nền 3D.': 'This name appears in the title and interactive scene.',
        'Tên này sẽ xuất hiện trong vòng quay.': 'This name appears in the prize wheel.',
        'Tên mặc định sẽ hiện ở giữa trái tim hạt.': 'This name appears in the center of the particle heart.',
        'Lời chúc sau khi hoàn thành 5 câu hỏi': 'Message shown after all 5 questions',
        'Chữ ký / Tên người gửi (ở cuối lá thư 💌)': 'Signature / sender name (shown at the end 💌)',
        'Chữ ký / Tên người gửi': 'Signature / sender name',
        'Lời nhắn tình cảm': 'Personal message',
        'Các câu chữ bay (mỗi dòng một câu)': 'Floating phrases (one per line)',
        'Chữ giữa trái tim': 'Text inside the heart',
        'Màu chữ và ảnh': 'Text and photo color',
        'Biểu tượng bay (cách nhau bằng dấu cách)': 'Floating symbols (separate with spaces)',
        'Hiệu ứng trái tim hạt khi nhấp đúp': 'Particle-heart effect on double click',
        'Nội dung câu hỏi': 'Question text',
        'Các lựa chọn': 'Answer choices',
        'Đáp án đúng': 'Correct answer',
        'Câu hỏi': 'Question',
        '❓ Soạn câu hỏi': '❓ Build your quiz',
        '+ Thêm câu hỏi': '+ Add question',
        'Xóa câu này': 'Remove question',
        'Ảnh minh họa (Tùy chọn):': 'Illustration (optional):',
        'Câu trả lời': 'Answer',
        'Đáp án đúng:': 'Correct answer:',
        '🎵 Chọn bài nhạc': '🎵 Choose music',
        'Miễn phí': 'Free',
        'Miễn Phí': 'Free',
        'Nhạc có sẵn': 'Music library',
        'Nhạc của bạn': 'Your music',
        '♫ Nhạc tuyển chọn': '♫ Curated music',
        'Xem thêm ▼': 'Show more ▼',
        'Chọn tệp': 'Choose file',
        'Khi chọn tệp tại đây, món quà sẽ sử dụng đúng tệp nhạc bạn đã chọn.': 'Your gift will use the exact audio track selected here.',
        '🔒 Màn hình mật khẩu': '🔒 Password screen',
        'Người nhận cần nhập mật khẩu riêng để mở thiệp. Bật tắt tùy ý.': 'Require a private passcode before the recipient can open the gift.',
        'Mật khẩu 4 số': '4-digit passcode',
        '🔳 Tạo Mã QR Chia Sẻ': '🔳 Create a shareable QR',
        'Bật để tạo ảnh QR gửi cho người nhận': 'Create a QR image to share with the recipient',
        'Mẫu mã QR:': 'QR design:',
        'Tim hồng': 'Pink heart',
        'Lá thư': 'Letter',
        'Dễ thương': 'Cute',
        'Bó hoa hồng': 'Rose bouquet',
        'Bó hoa tím': 'Purple bouquet',
        'Bó hoa hồng phấn': 'Pink bouquet',
        'Có một món quà cho bạn này!': 'A special gift is waiting for you!',
        'Hoa đỏ': 'Red flowers',
        'Hoa hồng': 'Pink flowers',
        'Hoa tím': 'Purple flowers',
        'Tùy chỉnh chữ trên ảnh QR:': 'Customize text on the QR image:',
        'Bản xem trước': 'Live preview',
        'Mở bản demo': 'Open full demo',
        'Đồng bộ vào demo': 'Synced to preview',
        '💗 Trái tim 3D': '💗 3D heart',
        '💌 Thư': '💌 Letter',
        'Màu chữ và ánh sáng': 'Text and glow color',
        'Giống luồng tương tác của bản mẫu Galaxy Viewer.': 'Matches the interactive flow of the Galaxy Viewer template.',
        'TRUNG TÂM XUẤT BẢN': 'PUBLISHING CENTER',
        'Bảng giá': 'Price summary',
        'Giá mẫu quà': 'Template price',
        'Ảnh đã thêm': 'Photos added',
        'Màn mật khẩu': 'Password screen',
        'Tạo mã QR': 'Create QR',
        'Hạn sử dụng': 'Link duration',
        'Tiền tip': 'Tip',
        'Giảm giá voucher': 'Voucher discount',
        'Tổng cộng': 'Total',
        '15 phút': '15 minutes',
        '15 ngày': '15 days',
        '1 năm': '1 year',
        'Vĩnh viễn': 'Lifetime',
        'Bắt đầu từ hôm nay. Hết hạn thì link/QR không thể truy cập.': 'Starts today. The link and QR stop working after expiry.',
        '🏷️ Mã giảm giá': '🏷️ Discount code',
        'Áp dụng': 'Apply',
        'Voucher đã lưu:': 'Saved vouchers:',
        'Bạn chưa lưu voucher nào': 'No saved vouchers',
        '☕ Ủng hộ tác giả': '☕ Support the creator',
        'DearGift được phát triển và duy trì với nhiều tâm huyết. Nếu bạn thích sản phẩm, một ly cà phê nhỏ sẽ giúp chúng tôi tiếp tục suy nghĩ ra nhiều ý tưởng hay hơn 🩷': 'DearGift is built and maintained with care. A small tip helps us keep creating thoughtful new experiences 🩷',
        'Tùy chọn': 'Custom',
        'SẴN SÀNG XUẤT BẢN': 'READY TO PUBLISH',
        'TRUNG TÂM XUẤT BẢN': 'PUBLISHING CENTER',
        'Tạo liên kết quà tặng': 'Create gift link',
        'Bạn sẽ xem trước món quà ở bước tiếp theo. Nếu đã thanh toán nhưng chưa thấy QR, bấm 📋 Đơn của tôi ở đầu trang.': 'You can preview the gift on the next step. If payment is complete but the QR has not appeared, open My orders.',
        '🎁 Tạo quà ngay': '🎁 Create gift now',
        'Quà chưa đầy đủ': 'Your gift is incomplete',
        'Bạn chưa thêm ảnh cho quả cầu 3D': 'You have not added photos for the 3D globe',
        'Thêm ảnh quả cầu 3D sẽ giúp món quà sinh động hơn.': 'Adding photos will make the 3D globe more personal.',
        '← Quay lại thêm': '← Go back and add photos',
        'Vẫn tiếp tục thanh toán': 'Continue anyway',
        'Đang tạo trang web quà tặng...': 'Creating your digital gift...',
        '✨ Đang tối ưu hình ảnh & hiệu ứng 3D...': '✨ Optimizing photos and 3D effects...',
        'Hệ thống đang xử lý và xuất bản món quà của bạn.': 'We are processing and publishing your gift.',
        'Vui lòng kiên nhẫn trong giây lát nhé! 💖': 'This will only take a moment 💖',
        'Tạo quà tặng thành công!': 'Gift created successfully!',
        'Món quà yêu thương của bạn đã sẵn sàng!': 'Your special gift is ready!',
        'Mã quà tặng:': 'Gift code:',
        'giây...': 'seconds...',
        '🚀 Xem món quà ngay': '🚀 View gift now',
        '💳 Nạp tiền tự động': '💳 Automatic payment',
        'Quét mã QR bằng app ngân hàng': 'Scan the QR with your banking app',
        'Số tiền cần chuyển': 'Amount to transfer',
        'Nội dung chuyển khoản': 'Transfer reference',
        'Đang chờ xác nhận...': 'Waiting for confirmation...',
        'Đóng': 'Close',
        '✓ Đã sao chép!': '✓ Copied!',
        'Mẫu quà Troll Tự Động': 'Ready-made prank gift',
        'Nạn nhân xấu số': 'My unsuspecting friend',
        '▣ PC': '▣ Desktop',
        '▯ Điện thoại': '▯ Mobile',
        '↻ Cập nhật': '↻ Refresh',
        '⏱ Hạn sử dụng': '⏱ Link duration',
        'ảnh': 'photo'
    };

    var placeholders = {
        'VD: Công chúa xinh đẹp nhất lòng anh': 'E.g. The most beautiful person in my heart',
        'VD: Vy Vy, Em Yêu, Mẹ Yêu...': 'E.g. Emma, My Love, Mom...',
        'VD: Chúc mừng em đã xuất sắc vượt qua các câu hỏi! Chúc em luôn hạnh phúc...': 'E.g. Amazing—you completed every question! Wishing you endless happiness...',
        'VD: Đức Huy, Anh Yêu, Người thương...': 'E.g. Alex, Your love, Someone special...',
        'Nhập lời yêu thương, tâm sự của bạn...': 'Write your heartfelt message here...',
        'VD: gửi em yêu của anh': 'E.g. With all my love',
        'Nhập mã voucher': 'Enter discount code',
        'Nhập số tiền (đ)': 'Enter an amount',
        'Tiêu đề (Để trống sẽ dùng mặc định)': 'Title (leave blank to use the default)',
        'Mô tả (Để trống sẽ dùng mặc định)': 'Description (leave blank to use the default)'
        ,'Nhập nội dung câu hỏi...': 'Enter your question...'
        ,'Đáp án A': 'Answer A'
        ,'Đáp án B': 'Answer B'
        ,'Đáp án C': 'Answer C'
        ,'Đáp án D': 'Answer D'
        ,'VD: Mây Mây': 'E.g. Emma'
        ,'VD: 15/08/2000 hoặc 14/02/2026': 'E.g. 15/08/2000 or 14/02/2026'
        ,'Nhập lời chúc sinh nhật hoặc lời tỏ tình bạn muốn gửi...': 'Write the birthday wish or love message you want to send...'
    };

    function preserveOuterWhitespace(original, replacement) {
        var leading = (original.match(/^\s*/) || [''])[0];
        var trailing = (original.match(/\s*$/) || [''])[0];
        return leading + replacement + trailing;
    }

    function translateString(value) {
        if (typeof value !== 'string') return value;
        var trimmed = value.trim();
        if (!trimmed) return value;
        if (Object.prototype.hasOwnProperty.call(translations, trimmed)) {
            return preserveOuterWhitespace(value, translations[trimmed]);
        }

        var translated = trimmed
            .replace(/^👀 Xem trước:\s*/, '👀 Preview: ')
            .replace(/^Ảnh đã thêm \((.*?)\)$/, 'Photos added ($1)')
            .replace(/\/\s*ảnh/g, '/ photo')
            .replace(/^Đã chọn (\d+) ảnh$/, '$1 photos selected')
            .replace(/^(\d+) ảnh$/, '$1 photos')
            .replace(/^Câu hỏi (\d+)$/, 'Question $1')
            .replace(/^Nhạc của bạn \((.*?)\)$/, 'Your music ($1)')
            .replace(/^Lỗi:\s*/, 'Error: ')
            .replace(/^Mã kiểm tra:\s*/, 'Reference: ')
            .replace(/^Tự động mở quà sau\s*/, 'Opening your gift in ')
            .replace(/^Áp dụng thành công!/, 'Applied successfully!')
            .replace(/^Phiên đăng nhập hết hạn, đang chuyển đến trang đăng nhập\.\.\.$/, 'Your session expired. Redirecting to sign in...')
            .replace(/^Tệp đang được xử lý\. Vui lòng đợi vài giây rồi tạo quà\.$/, 'Your files are still being prepared. Please wait a few seconds.')
            .replace(/^Không nhận được phản hồi\./, 'No response was received.')
            .replace(/^Đang chờ xác nhận\. Hệ thống tự động duyệt sau 1–2 phút\.$/, 'Waiting for confirmation. Payment is checked automatically within 1–2 minutes.')
            .replace(/^Thanh toán thành công!$/, 'Payment successful!')
            .replace(/^Quà tặng của bạn đã được kích hoạt\.$/, 'Your gift has been activated.')
            .replace(/^Đang chuyển đến trang quản lý\.\.\.$/, 'Redirecting to your dashboard...');

        return translated === trimmed ? value : preserveOuterWhitespace(value, translated);
    }

    function translateTextNodes(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            var next = translateString(root.nodeValue);
            if (next !== root.nodeValue) root.nodeValue = next;
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            var parent = node.parentElement;
            if (parent && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName)) continue;
            var translated = translateString(node.nodeValue);
            if (translated !== node.nodeValue) node.nodeValue = translated;
        }
    }

    function translateAttributes(root) {
        if (!root || !root.querySelectorAll) return;
        var elements = [];
        if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
        root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(function (element) { elements.push(element); });
        elements.forEach(function (element) {
            ['placeholder', 'title', 'aria-label', 'alt'].forEach(function (attribute) {
                if (!element.hasAttribute || !element.hasAttribute(attribute)) return;
                var current = element.getAttribute(attribute);
                var replacement = placeholders[current] || translateString(current);
                if (replacement !== current) element.setAttribute(attribute, replacement);
            });
        });
    }

    function translateDefaultValues(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('input[type="text"], textarea').forEach(function (field) {
            if (!field.value) return;
            var replacement = translations[field.value] || translateString(field.value);
            if (replacement !== field.value) field.value = replacement;
        });
    }

    function apply(root) {
        translateTextNodes(root || document.body);
        translateAttributes(root || document);
        translateDefaultValues(root || document);
        document.documentElement.lang = 'en';
    }

    apply(document.body);

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'characterData') {
                translateTextNodes(mutation.target);
                return;
            }
            mutation.addedNodes.forEach(function (node) {
                translateTextNodes(node);
                translateAttributes(node);
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.DGBuilderI18n = {
        translate: translateString,
        refresh: function () { apply(document.body); }
    };
})();
