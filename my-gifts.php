<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bảng Điều Khiển Quản Lý Đơn Hàng & Món Quà Của Tôi · DearGift</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/footer-modern.css">
  <style>
    :root {
      --primary: #ff5d9e;
      --secondary: #9047ff;
      --bg: #faf7f9;
      --card-bg: #ffffff;
      --text-main: #2d2638;
      --text-muted: #7a7090;
      --border-color: #f1e6ee;
    }
    body {
      background: var(--bg);
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text-main);
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header-nav {
      background: #fff;
      border-bottom: 1px solid #fce7f3;
      padding: 14px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font-family: 'Baloo 2', cursive;
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-link-item {
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      transition: color 0.2s;
    }
    .nav-link-item:hover { color: var(--primary); }
    .btn-create-gift {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 10px 22px;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(255, 93, 158, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-create-gift:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 93, 158, 0.4);
    }
    .main-content {
      max-width: 1200px;
      margin: 32px auto;
      padding: 0 20px;
      flex: 1;
      width: 100%;
      box-sizing: border-box;
    }
    /* Stats Bar */
    .dashboard-header {
      background: linear-gradient(135deg, #fff0f5, #f5f0ff);
      border: 1px solid #fed7ea;
      border-radius: 24px;
      padding: 28px 32px;
      margin-bottom: 28px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .dashboard-title h1 {
      margin: 0 0 6px;
      font-size: 26px;
      font-weight: 800;
      color: #2b1d3a;
    }
    .dashboard-title p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.02);
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    .stat-info .stat-num {
      font-size: 24px;
      font-weight: 800;
      color: #2b1d3a;
      line-height: 1.2;
    }
    .stat-info .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
    }
    /* Toolbar */
    .toolbar-container {
      background: #fff;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: #f4eff5;
      border: none;
      padding: 8px 18px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 700;
      color: #5d536e;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-btn.active, .filter-btn:hover {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
    }
    .search-box {
      position: relative;
      min-width: 260px;
      flex: 1;
      max-width: 360px;
    }
    .search-box input {
      width: 100%;
      background: #f8f6f9;
      border: 1px solid #e7deea;
      padding: 10px 16px 10px 40px;
      border-radius: 50px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .search-box input:focus {
      border-color: var(--primary);
      background: #fff;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: #a39baa;
    }
    /* Gifts Grid */
    .gifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }
    .gift-card {
      background: #fff;
      border: 1px solid var(--border-color);
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s, box-shadow 0.25s;
    }
    .gift-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(255, 93, 158, 0.12);
    }
    .card-top {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f8f1f5;
    }
    .code-tag {
      font-size: 13px;
      font-weight: 800;
      color: var(--primary);
      background: #fff0f6;
      padding: 4px 12px;
      border-radius: 50px;
    }
    .badge-status {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 50px;
    }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .card-body {
      padding: 20px;
      flex: 1;
    }
    .gift-recipient {
      font-size: 18px;
      font-weight: 800;
      color: #2b1d3a;
      margin-bottom: 6px;
    }
    .gift-meta {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .gift-message-preview {
      background: #faf6f9;
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 13px;
      color: #554a65;
      line-height: 1.5;
      margin-bottom: 16px;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-actions {
      padding: 16px 20px;
      border-top: 1px solid #f8f1f5;
      background: #fdfbfd;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-act {
      flex: 1;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-view {
      background: #f3e8ff;
      color: #7e22ce;
    }
    .btn-view:hover { background: #e9d5ff; }
    .btn-copy {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .btn-copy:hover { background: #dcfce7; }
    .btn-pay {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
      box-shadow: 0 4px 12px rgba(255, 93, 158, 0.25);
    }
    .btn-pay:hover {
      box-shadow: 0 6px 16px rgba(255, 93, 158, 0.35);
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: #fff;
      border-radius: 24px;
      border: 1px solid var(--border-color);
      grid-column: 1 / -1;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header class="header-nav">
    <div class="header-container">
      <a href="index.html" class="brand-logo">
        <span>🎁 DearGift</span>
      </a>
      <div class="nav-links">
        <a href="index.html" class="nav-link-item">Trang chủ</a>
        <a href="templates.php" class="nav-link-item">Kho 52 Mẫu Quà</a>
        <a href="my-gifts.php" class="nav-link-item" style="color:var(--primary); font-weight:800;">📦 Quản lý Đơn & Quà</a>
        <a href="templates.php" class="btn-create-gift">+ Tạo quà mới</a>
      </div>
    </div>
  </header>

  <!-- MAIN -->
  <main class="main-content">
    <div class="dashboard-header">
      <div class="dashboard-title">
        <h1>Bảng Điều Khiển Quản Lý Đơn Hàng</h1>
        <p>Theo dõi tổng quan toàn bộ đơn quà đã tạo, đơn chờ thanh toán và các món quà đang hoạt động.</p>
      </div>
      <a href="templates.php" class="btn-create-gift">+ Tạo Thêm Món Quà</a>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce7f3; color:#ec4899;">📦</div>
        <div class="stat-info">
          <div class="stat-num" id="stat-total">0</div>
          <div class="stat-label">Tổng Đơn Đã Tạo</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fef3c7; color:#d97706;">⏳</div>
        <div class="stat-info">
          <div class="stat-num" id="stat-pending">0</div>
          <div class="stat-label">Chờ Thanh Toán</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7; color:#16a34a;">✨</div>
        <div class="stat-info">
          <div class="stat-num" id="stat-active">0</div>
          <div class="stat-label">Đang Hoạt Động</div>
        </div>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar-container">
      <div class="filter-tabs">
        <button class="filter-btn active" onclick="setFilter('all', this)">Tất Cả (<span id="count-all">0</span>)</button>
        <button class="filter-btn" onclick="setFilter('pending', this)">⏳ Chờ Thanh Toán (<span id="count-pending">0</span>)</button>
        <button class="filter-btn" onclick="setFilter('active', this)">✅ Đang Hoạt Động (<span id="count-active">0</span>)</button>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Tìm theo mã đơn (#DG...), tên người nhận..." oninput="handleSearch()">
      </div>
    </div>

    <!-- GIFTS LIST -->
    <div id="gifts-container" class="gifts-grid">
      <div class="empty-state">
        <div style="font-size:48px; margin-bottom:12px;">⏳</div>
        <div style="font-weight:700; color:var(--text-muted);">Đang tải danh sách đơn hàng...</div>
      </div>
    </div>
  </main>

  <!-- Modal Thanh Toán QR VietQR -->
  <div id="modal-pay-gift" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:16px;">
    <div style="background:#fff; border-radius:24px; max-width:380px; width:100%; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.25); text-align:center;">
      <div style="background:linear-gradient(135deg,var(--primary),var(--secondary)); padding:18px 24px; color:#fff;">
        <h3 style="margin:0 0 4px; font-size:20px; font-weight:800;">Quét Mã VietQR Mở Quà</h3>
        <p style="margin:0; font-size:13px; opacity:0.9;">Tự động xác nhận & mở quà sau 3 - 5 giây</p>
      </div>
      <div style="padding:24px;">
        <img id="modal-qr-img" src="" alt="VietQR" style="width:230px; height:230px; object-fit:contain; border-radius:16px; border:1px solid #f1e6ee; padding:6px; background:#fff; margin-bottom:14px;">
        <div style="background:#faf7f9; border-radius:14px; padding:12px 16px; font-size:13px; text-align:left; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:var(--text-muted);">Số tiền:</span>
            <span id="modal-qr-amount" style="font-weight:800; color:#16a34a; font-size:15px;">20.000đ</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Nội dung CK:</span>
            <span id="modal-qr-content" style="font-weight:800; color:#2b1d3a; font-family:monospace;">DEAR ...</span>
          </div>
        </div>
        <div id="modal-qr-status" style="font-size:13px; font-weight:700; color:#2563eb; background:#eff6ff; border-radius:50px; padding:8px 16px; margin-bottom:16px;">
          ⏳ Đang chờ xác nhận chuyển khoản...
        </div>
        <button type="button" onclick="closePayModal()" style="width:100%; background:#f1e6ee; border:none; border-radius:12px; padding:10px; font-size:14px; font-weight:700; color:#5d536e; cursor:pointer;">
          Đóng cửa sổ
        </button>
      </div>
    </div>
  </div>

  <script>
    var allGifts = [];
    var currentFilter = 'all';
    var payPollTimer = null;

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(function() {
        var toast = document.createElement('div');
        toast.textContent = '✓ Đã sao chép liên kết quà tặng!';
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#2d2638;color:#fff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:700;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2000);
      });
    }

    function openPayModal(shareCode, amount, content) {
      var amt = Number(amount) || 19000;
      var transContent = content || ('DEAR ' + shareCode);
      var qrUrl = 'https://img.vietqr.io/image/970422-2006999988836-compact2.png?amount=' + amt + '&addInfo=' + encodeURIComponent(transContent) + '&accountName=NGUYEN+VAN+PHONG';
      
      document.getElementById('modal-qr-img').src = qrUrl;
      document.getElementById('modal-qr-amount').textContent = amt.toLocaleString('vi-VN') + 'đ';
      document.getElementById('modal-qr-content').textContent = transContent;
      document.getElementById('modal-qr-status').innerHTML = '⏳ Đang chờ xác nhận chuyển khoản...';
      document.getElementById('modal-pay-gift').style.display = 'flex';

      startPayPolling(shareCode);
    }

    function closePayModal() {
      if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }
      document.getElementById('modal-pay-gift').style.display = 'none';
    }

    function startPayPolling(code) {
      if (payPollTimer) clearInterval(payPollTimer);
      payPollTimer = setInterval(function() {
        fetch('/ajax_check_payment_status.php?code=' + encodeURIComponent(code))
          .then(r => r.json())
          .then(res => {
            if (res.status === 'active' || res.paid) {
              clearInterval(payPollTimer);
              document.getElementById('modal-qr-status').innerHTML = '✅ Đã nhận tiền! Quà đã kích hoạt!';
              document.getElementById('modal-qr-status').style.background = '#dcfce7';
              document.getElementById('modal-qr-status').style.color = '#15803d';
              setTimeout(function() {
                closePayModal();
                fetchGifts();
              }, 1500);
            }
          }).catch(function(){});
      }, 2500);
    }

    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGifts();
    }

    function handleSearch() {
      renderGifts();
    }

    function fetchGifts() {
      fetch('/api/my-gifts')
        .then(r => r.json())
        .then(data => {
          allGifts = data.gifts || [];
          updateStats();
          renderGifts();
        })
        .catch(() => {
          allGifts = [];
          updateStats();
          renderGifts();
        });
    }

    function updateStats() {
      var total = allGifts.length;
      var pending = allGifts.filter(g => g.status === 'pending' || !g.paid).length;
      var active = allGifts.filter(g => g.status === 'active' || g.paid).length;

      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-pending').textContent = pending;
      document.getElementById('stat-active').textContent = active;

      document.getElementById('count-all').textContent = total;
      document.getElementById('count-pending').textContent = pending;
      document.getElementById('count-active').textContent = active;
    }

    function renderGifts() {
      var search = document.getElementById('search-input').value.trim().toLowerCase();
      var filtered = allGifts.filter(g => {
        var isPending = (g.status === 'pending' || !g.paid);
        if (currentFilter === 'pending' && !isPending) return false;
        if (currentFilter === 'active' && isPending) return false;

        if (search) {
          var code = (g.share_code || '').toLowerCase();
          var rec = (g.recipient_name || '').toLowerCase();
          var id = (g.id || '').toLowerCase();
          if (!code.includes(search) && !rec.includes(search) && !id.includes(search)) return false;
        }
        return true;
      });

      var container = document.getElementById('gifts-container');
      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div style="font-size:56px; margin-bottom:12px;">🔍</div>
            <h3 style="font-size:18px; font-weight:800; color:#2b1d3a; margin-bottom:8px;">Không tìm thấy đơn hàng nào!</h3>
            <p style="font-size:14px; color:var(--text-muted); margin-bottom:20px;">Thử đổi từ khóa tìm kiếm hoặc tạo một món quà mới nhé.</p>
            <a href="templates.php" class="btn-create-gift">+ Khám Phá Mẫu Quà</a>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(g => {
        var rec = g.recipient_name || 'Người thương';
        var isPending = (g.status === 'pending' || !g.paid);
        var shareCode = g.share_code || g.id || 'DG...';
        var viewUrl = window.location.origin + '/gift.php?uid=' + g.id;
        var dateStr = g.created_at ? new Date(g.created_at).toLocaleDateString('vi-VN') : 'Mới tạo';

        var badge = isPending
          ? '<span class="badge-status badge-pending">⏳ Chờ thanh toán</span>'
          : '<span class="badge-status badge-active">✅ Đang hoạt động</span>';

        var actionBtns = isPending
          ? `<button type="button" onclick="openPayModal('${shareCode}', ${g.amount || 19000}, '${g.transfer_content || ('DEAR ' + shareCode)}')" class="btn-act btn-pay">💳 Thanh Toán Ngay</button>
             <a href="${viewUrl}" target="_blank" class="btn-act btn-view">👁️ Xem Thử</a>`
          : `<a href="${viewUrl}" target="_blank" class="btn-act btn-view">🎁 Mở Xem Quà</a>
             <button type="button" onclick="copyToClipboard('${viewUrl}')" class="btn-act btn-copy">📋 Copy Link Quà</button>`;

        return `
          <div class="gift-card">
            <div class="card-top">
              <span class="code-tag">#${shareCode}</span>
              ${badge}
            </div>
            <div class="card-body">
              <div class="gift-recipient">Dành tặng: ${rec}</div>
              <div class="gift-meta">
                <span>📅 ${dateStr}</span>
                <span>•</span>
                <span>Mẫu: ${g.template_title || g.template_slug || 'Quà 3D'}</span>
              </div>
              <div class="gift-message-preview">
                "${g.letter_content || g.message || 'Chạm để khám phá hiệu ứng của món quà này...'}"
              </div>
            </div>
            <div class="card-actions">
              ${actionBtns}
            </div>
          </div>
        `;
      }).join('');
    }

    document.addEventListener('DOMContentLoaded', fetchGifts);
  </script>
</body>
</html>
