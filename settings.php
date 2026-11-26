<!DOCTYPE html>
<html lang="vi">
<head>
<script src="js/security.js?v=1794500000"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cài đặt & Bảo mật - DearGift</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/dashboard.css?v=1794032998">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        .settings-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
        }
        @media (min-width: 1024px) {
            .settings-grid { grid-template-columns: 1fr 1fr; }
        }
        .s-card {
            background-color: white;
            border: 1px solid #ffe4e6;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.01);
            margin-bottom: 24px;
        }
        .s-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #fff7ee;
        }
        .s-icon-box {
            width: 36px; height: 36px; border-radius: 10px; background-color: #fffaf3; color: #e8589a; display: flex; align-items: center; justify-content: center;
        }
        .s-row {
            display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #fff7ee;
        }
        .s-row:last-child { border-bottom: none; padding-bottom: 0; }
        
        .s-label { font-size: 14px; font-weight: 600; color: #3d3551; }
        .s-desc { font-size: 12px; color: #7a7090; margin-top: 4px; }
        .s-val { font-size: 14px; font-weight: 500; color: #3d3551; }
        .s-val-muted { font-size: 14px; color: #a79fb8; font-style: italic; }

        .form-input-s {
            width: 100%; padding: 8px 12px; border: 1px solid #eadff5; border-radius: 8px; font-size: 14px; font-family: inherit; color: #3d3551; background-color: #fff7ee; transition: all 0.2s; box-sizing: border-box; text-align: right;
        }
        .form-input-s:focus { outline: none; border-color: #e8589a; background-color: white; box-shadow: 0 0 0 3px rgba(240, 98, 146, 0.1); }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #eadff5; transition: .3s; border-radius: 24px;
        }
        .slider:before {
            position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .slider { background-color: #e8589a; }
        input:checked + .slider:before { transform: translateX(20px); }

        .modal-bg { display: none; position: fixed; top:0;right:0;bottom:0;left:0;inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center; }
        .modal-bg.active { display: flex; }
        .modal-content { background: white; padding: 24px; border-radius: 16px; max-width: 400px; width: 100%; }
        .modal-input { width: 100%; padding: 10px 12px; border: 1px solid #eadff5; border-radius: 8px; margin-bottom: 12px; box-sizing: border-box; }
    </style>
    <link rel="stylesheet" href="css/pastel-theme.css?v=1790426802">
</head>
<body class="user-app settings-page">

    <link rel="stylesheet" href="css/dashboard-shell.css?v=1795670001">
<!-- Sidebar Overlay for Mobile -->
<div id="sidebar_overlay" class="sidebar-overlay" onclick="toggleMobileSidebar()"></div>

<!-- ── LEFT SIDEBAR ── -->
<div id="dashboard_sidebar" class="sidebar">
    <button class="sidebar-close-btn" onclick="toggleMobileSidebar()">
        <i data-lucide="x" style="width: 24px; height: 24px;"></i>
    </button>

    <!-- Logo matching reference site -->
    <a href="index.php" class="sidebar-logo">
        <svg viewBox="0 0 24 24" width="36" height="36" style="flex-shrink: 0;" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#e8589a"/>
            <path d="M12 7a1.5 1.5 0 011.5 1.5c0 .6-.2 1.1-.7 1.4l.7 2.1h-3l.7-2.1c-.5-.3-.7-.8-.7-1.4A1.5 1.5 0 0112 7z" fill="white"/>
            <rect x="9" y="11" width="6" height="5" rx="1" fill="white"/>
            <line x1="12" y1="11" x2="12" y2="16" stroke="#e8589a" stroke-width="1.5"/>
            <line x1="9" y1="13.5" x2="15" y2="13.5" stroke="#e8589a" stroke-width="1.5"/>
        </svg>
        <div class="sidebar-text" style="display: flex; flex-direction: column;">
            <span style="font-weight: 850; font-size: 19px; color: #3d3551; letter-spacing: -0.5px; line-height: 1.2; font-family: 'Baloo 2', sans-serif;">Love<span style="color: #e8589a;">Gift</span><span style="color: #e8589a; font-size: 14px; margin-left: 2px;">❤️</span></span>
            <span style="font-size: 8px; color: #a79fb8; font-weight: 600; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.2px;">Create gifts, share love</span>
        </div>
    </a>

    <!-- Menu links -->
    <div class="sidebar-menu">
        <a href="my-gifts.php" class="menu-item ">
            <i data-lucide="layout-dashboard" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Tổng quan</span>
        </a>
        <a href="my-gifts.php?view=all" class="menu-item ">
            <i data-lucide="library" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Quà đã tạo</span>
        </a>
        <a href="orders.php" class="menu-item ">
            <i data-lucide="shopping-bag" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Đơn hàng</span>
        </a>
        <a href="transactions.php" class="menu-item ">
            <i data-lucide="credit-card" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Giao dịch</span>
        </a>
        <a href="support.php" class="menu-item ">
            <i data-lucide="help-circle" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Hỗ trợ</span>
        </a>
        <a href="settings.php" class="menu-item active">
            <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
            <span class="sidebar-text">Cài đặt</span>
        </a>
    </div>

    <!-- Ad Box -->
    <div class="sidebar-footer-card">
        <div style="display:flex;justify-content:center;margin-bottom:8px;">
            <div style="width:36px;height:36px;background-color:#ffe4e6;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                <i data-lucide="gift" style="width:20px;height:20px;color:#e8589a;"></i>
            </div>
        </div>
        <h4>Chia sẻ DearGift</h4>
        <p>Tạo những món quà 3D đầy bất ngờ dành tặng người thương.</p>
        <button onclick="window.location.href='templates.php'" class="btn btn-primary btn-sm" style="width: 100%; border-radius: 50px; padding: 8px 12px; font-size: 12px; font-weight: 700; background-color: #e8589a; border: none; box-shadow: 0 4px 10px rgba(244,63,94,0.2);">
            🎁 Tạo quà ngay
        </button>
    </div>

    <!-- Collapse trigger -->
    <div class="collapse-btn" onclick="toggleSidebarCollapse()">
        <i id="collapse_icon" data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
        <span id="collapse_text" class="sidebar-text">Collapse</span>
    </div>
</div>

<header class="workspace-topnav"></header>

<!-- Mobile Bottom Navigation -->
<div class="bottom-nav"></div>

<script>
    function toggleMobileSidebar() {
        document.getElementById('dashboard_sidebar').classList.toggle('open');
        document.getElementById('sidebar_overlay').classList.toggle('open');
        // Prevent body scrolling when sidebar is open
        if (document.getElementById('dashboard_sidebar').classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
</script>

    <link rel="stylesheet" href="css/settings-modern.css?v=1791567096">

    <div class="main-content">
        
        <!-- Top header action bar -->
<div class="top-header">
    <div style="display: flex; align-items: center; gap: 12px;">
        <button class="mobile-menu-btn" onclick="toggleMobileSidebar()" style="display: none; background: transparent; border: none; color: #3d3551; padding: 0; cursor: pointer;">
            <i data-lucide="menu" style="width: 24px; height: 24px;"></i>
        </button>
        <div>
                        <h1 style="font-size: 22px; font-weight: 800; color: #3d3551; letter-spacing: -0.5px; margin: 0;">Cài đặt &amp; Bảo mật</h1>
            <p style="font-size: 13.5px; color: #7a7090; margin-top: 2px; margin-bottom: 0;">Quản lý thông tin cá nhân và thiết lập tài khoản của bạn.</p>
        </div>
    </div>
    
    <div style="display: flex; align-items: center; gap: 12px;">
        <a href="index.html" class="btn btn-secondary btn-sm" style="border-radius: 50px; display: flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 13px; border-color: #fbcfe8; background-color: white; color: #e8589a; font-weight: 700; box-shadow: 0 2px 4px rgba(232,88,154,0.02);">
            <i data-lucide="home" style="width: 15px; height: 15px;"></i> Về trang chủ
        </a>
    </div>
</div>

                
        <nav class="settings-section-nav" aria-label="Các mục cài đặt">
            <a href="#profile-settings" class="active"><i data-lucide="user-round"></i><span>Hồ sơ</span></a>
            <a href="#notification-settings"><i data-lucide="bell"></i><span>Thông báo</span></a>
            <a href="#security-settings"><i data-lucide="shield-check"></i><span>Bảo mật</span></a>
            <a href="#danger-settings" class="danger"><i data-lucide="triangle-alert"></i><span>Vùng nguy hiểm</span></a>
        </nav>

        <div class="settings-grid">
            
            <!-- Left Column -->
            <div>
                <!-- Thông tin cá nhân -->
                <div class="s-card" id="profile-settings">
                    <div class="s-card-header">
                        <div class="s-icon-box"><i data-lucide="user" style="width: 18px; height: 18px;"></i></div>
                        <div>
                            <h3 style="font-size: 16px; font-weight: 800; color: #3d3551; margin: 0 0 2px 0;">Thông tin cá nhân</h3>
                            <p style="font-size: 12px; color: #7a7090; margin: 0;">Quản lý dữ liệu hiển thị trên hệ thống.</p>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 20px; padding-bottom: 20px; border-bottom: 1px solid #fff7ee; margin-bottom: 10px;">
                        <img data-user-avatar src="assets/images/logo-heart-180.png" alt="Avatar" referrerpolicy="no-referrer" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid #fffaf3; background-color: #fffaf3;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <strong class="user-display-name" style="font-size:15px;color:#3d3551;">Đang tải...</strong>
                            <span class="user-display-email" style="font-size:12.5px;color:#7a7090;"></span>
                        </div>
                    </div>

                    <form method="POST">
                        <input type="hidden" name="action" value="update_profile">
                        <div class="s-row">
                            <div style="width: 120px;">
                                <div class="s-label">Họ tên hiển thị</div>
                                <div class="s-desc">Hiển thị trên hồ sơ</div>
                            </div>
                            <div style="flex:1;"><input type="text" name="full_name" class="form-input-s" value="" required></div>
                        </div>
                        <div class="s-row">
                            <div style="width: 120px;">
                                <div class="s-label">Email</div>
                                <div class="s-desc">Không thể đổi</div>
                            </div>
                            <div class="s-val user-display-email"></div>
                        </div>
                        <div class="s-row">
                            <div style="width: 120px;"><div class="s-label">Số điện thoại</div></div>
                            <div style="flex:1;"><input type="text" name="phone" class="form-input-s" value="" placeholder="Chưa cập nhật"></div>
                        </div>
                        
                        <div style="margin-top: 24px; text-align: right;">
                            <button type="submit" class="btn btn-primary" style="padding: 10px 24px; border-radius: 12px; font-size: 14px;">Cập nhật thông tin</button>
                        </div>
                    </form>
                </div>

                <!-- Xóa tài khoản -->
                <div class="s-card" id="danger-settings" style="border-color: #fca5a5;">
                    <div class="s-card-header">
                        <div class="s-icon-box" style="background-color: #fee2e2; color: #ef4444;"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></div>
                        <div>
                            <h3 style="font-size: 16px; font-weight: 800; color: #ef4444; margin: 0 0 2px 0;">Xóa tài khoản</h3>
                            <p style="font-size: 12px; color: #7a7090; margin: 0;">Hành động này không thể hoàn tác.</p>
                        </div>
                    </div>
                    <p style="font-size: 13px; color: #3d3551; line-height: 1.5;">Bạn có chắc chắn muốn xóa tài khoản này? Toàn bộ dữ liệu quà tặng, giao dịch và voucher sẽ bị xóa vĩnh viễn và không thể khôi phục.</p>
                    <div style="margin-top: 16px;">
                        <button class="btn btn-primary" onclick="document.getElementById('deleteModal').classList.add('active')" style="background-color: white; color: #ef4444; border: 1px solid #ef4444; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;">Xóa tài khoản của tôi</button>
                    </div>
                </div>
            </div>

            <!-- Right Column -->
            <div>
                <!-- Cài đặt thông báo -->
                <div class="s-card" id="notification-settings">
                    <form method="POST" id="prefsForm">
                        <input type="hidden" name="csrf_token" value="86de16f51478ea79b1b37a3846e93480f8a436abf7af47c48058f82595ec3843">                        <input type="hidden" name="action" value="update_prefs">
                        <div class="s-card-header" style="justify-content: space-between;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="s-icon-box" style="background-color: #f0fdf4; color: #10b981;"><i data-lucide="bell" style="width: 18px; height: 18px;"></i></div>
                                <div>
                                    <h3 style="font-size: 16px; font-weight: 800; color: #3d3551; margin: 0 0 2px 0;">Cài đặt thông báo</h3>
                                    <p style="font-size: 12px; color: #7a7090; margin: 0;">Tùy chỉnh cách chúng tôi liên hệ.</p>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 12px;">Lưu</button>
                        </div>
                        <div class="s-row">
                            <div>
                                <div class="s-label">Thông báo Email</div>
                                <div class="s-desc">Nhận thông báo khi có đơn hàng, quà mới...</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" name="email_notif" checked onchange="document.getElementById('prefsForm').submit()">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="s-row">
                            <div>
                                <div class="s-label">Khuyến mãi & Voucher</div>
                                <div class="s-desc">Cập nhật các chương trình ưu đãi mới nhất.</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" name="promo_notif" checked onchange="document.getElementById('prefsForm').submit()">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="s-row">
                            <div>
                                <div class="s-label">Thông báo SMS</div>
                                <div class="s-desc">Nhận mã OTP và cảnh báo bảo mật qua SMS.</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" name="sms_notif"  onchange="document.getElementById('prefsForm').submit()">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </form>
                </div>

                <!-- Đăng nhập & Bảo mật -->
                <div class="s-card" id="security-settings">
                    <div class="s-card-header">
                        <div class="s-icon-box" style="background-color: #fff7ee; color: #7a7090;"><i data-lucide="shield" style="width: 18px; height: 18px;"></i></div>
                        <div>
                            <h3 style="font-size: 16px; font-weight: 800; color: #3d3551; margin: 0 0 2px 0;">Đăng nhập & Bảo mật</h3>
                            <p style="font-size: 12px; color: #7a7090; margin: 0;">Giữ tài khoản của bạn luôn an toàn.</p>
                        </div>
                    </div>
                    
                    <div class="s-row" style="opacity: 0.5; pointer-events: none;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png" width="24" height="24">
                            <div>
                                <div class="s-label">Liên kết Google (Đang bảo trì)</div>
                                <div class="s-desc" style="color: #7a7090;">Chưa liên kết</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 4px 12px; border-radius: 6px;">Liên kết</button>
                    </div>

                    <div class="s-row">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #7a7090;"><i data-lucide="key" style="width: 18px; height: 18px;"></i></div>
                            <div>
                                <div class="s-label">Mật khẩu</div>
                                <div class="s-desc">Đã thiết lập mật khẩu.</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pwModal').classList.add('active')" style="font-size: 12px; padding: 4px 12px; border-radius: 6px;">Đổi MK</button>
                    </div>

                    <div class="s-row" style="opacity: 0.5; pointer-events: none;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #7a7090;"><i data-lucide="smartphone" style="width: 18px; height: 18px;"></i></div>
                            <div>
                                <div class="s-label">Bảo mật 2 lớp (2FA) (Đang bảo trì)</div>
                                <div class="s-desc">Chưa cài đặt</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 4px 12px; border-radius: 6px;">Bật</button>
                    </div>

                    <div style="margin-top: 20px; text-align: center;">
                        <form method="POST" onsubmit="return confirm('Bạn có muốn đăng xuất khỏi tất cả thiết bị không?')">
                            <input type="hidden" name="csrf_token" value="86de16f51478ea79b1b37a3846e93480f8a436abf7af47c48058f82595ec3843">                            <input type="hidden" name="action" value="logout_all">
                            <button type="submit" class="btn btn-secondary" style="width: 100%; border-radius: 12px; font-size: 13px; font-weight: 600; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <i data-lucide="log-out" style="width: 14px; height: 14px;"></i> Đăng xuất phiên hiện tại
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>

    </div>

    <!-- Password Modal -->
    <div class="modal-bg" id="pwModal">
        <div class="modal-content">
            <h3 style="margin-top:0; font-size:18px; color:#3d3551; margin-bottom: 16px;">Đổi mật khẩu</h3>
            <form method="POST">
                <input type="hidden" name="csrf_token" value="86de16f51478ea79b1b37a3846e93480f8a436abf7af47c48058f82595ec3843">                <input type="hidden" name="action" value="change_password">
                                <input type="password" name="current_password" class="modal-input" placeholder="Mật khẩu hiện tại" required>
                                <input type="password" name="new_password" class="modal-input" placeholder="Mật khẩu mới" required>
                <div style="display: flex; gap: 12px; margin-top: 16px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('pwModal').classList.remove('active')" style="flex:1; padding:10px;">Hủy</button>
                    <button type="submit" class="btn btn-primary" style="flex:1; padding:10px;">Lưu mật khẩu</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete Account Modal -->
    <div class="modal-bg" id="deleteModal">
        <div class="modal-content">
            <h3 style="margin-top:0; font-size:18px; color:#ef4444; margin-bottom: 16px;">Xác nhận xóa tài khoản</h3>
            <p style="font-size: 14px; color: #3d3551;">Thao tác này là vĩnh viễn và không thể khôi phục. Mọi dữ liệu của bạn sẽ bị xóa sạch.</p>
            <form method="POST">
                <input type="hidden" name="csrf_token" value="86de16f51478ea79b1b37a3846e93480f8a436abf7af47c48058f82595ec3843">                <input type="hidden" name="action" value="delete_account">
                <input type="text" name="confirm_username" class="modal-input" placeholder="Nhập đúng tên đăng nhập" required autocomplete="off">
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('deleteModal').classList.remove('active')" style="flex:1; padding:10px;">Hủy</button>
                    <button type="submit" class="btn btn-primary" style="flex:1; padding:10px; background:#ef4444; border-color:#ef4444;">Xóa ngay</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function toggleSidebarCollapse() {
            document.getElementById('dashboard_sidebar').classList.toggle('collapsed');
            const isCollapsed = document.getElementById('dashboard_sidebar').classList.contains('collapsed');
            document.getElementById('collapse_icon').setAttribute('data-lucide', isCollapsed ? 'chevron-right' : 'chevron-left');
            lucide.createIcons();
        }
    </script>
    <script src="js/dashboard-workspace.js"></script>
    <script id="dg-settings-sync-script">
    DG.boot('settings', function(user) {
        var username = user.username || '';
        var fullName = user.full_name || username;
        var phone = user.phone || '';

        var fnInput = document.querySelector('input[name="full_name"]');
        if (fnInput) fnInput.value = fullName;

        var pInput = document.querySelector('input[name="phone"]');
        if (pInput) pInput.value = phone;

        var cInput = document.querySelector('input[name="confirm_username"]');
        if (cInput) cInput.placeholder = 'Nhập đúng tên đăng nhập: ' + username;

        document.querySelectorAll('form').forEach(function(form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                var act = (form.querySelector('input[name="action"]') || {}).value;

                if (act === 'update_profile') {
                    var newFullName = ((form.querySelector('input[name="full_name"]') || {}).value || fullName).trim();
                    var newPhone = ((form.querySelector('input[name="phone"]') || {}).value || '').trim();
                    fetch('/settings.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({action: 'update_profile', full_name: newFullName, phone: newPhone})
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res && res.success && res.user) {
                            user = res.user;
                            fullName = user.full_name || username;
                            localStorage.setItem('deargift_user', JSON.stringify(user));
                            localStorage.setItem('deargift_customer', JSON.stringify(user));
                            document.querySelectorAll('.user-display-name, .dg-account-name, .dg-menu-name').forEach(function(el) {
                                el.textContent = fullName;
                            });
                            DG.toast('✓ Cập nhật hồ sơ thành công!');
                        } else {
                            DG.toast((res && res.message) || 'Cập nhật hồ sơ thất bại!', true);
                        }
                    })
                    .catch(function() { DG.toast('Lỗi kết nối khi lưu hồ sơ.', true); });
                } else if (act === 'change_password') {
                    var newPwd = (form.querySelector('input[name="new_password"]') || {}).value;
                    if (!newPwd || newPwd.length < 6) {
                        DG.toast('Mật khẩu mới phải có ít nhất 6 ký tự!', true);
                        return;
                    }
                    fetch('/settings.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({action: 'change_password', new_password: newPwd})
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res && res.success) {
                            form.reset();
                            document.getElementById('pwModal').classList.remove('active');
                            DG.toast('✓ Đổi mật khẩu thành công!');
                        } else {
                            DG.toast((res && res.message) || 'Đổi mật khẩu thất bại!', true);
                        }
                    })
                    .catch(function() { DG.toast('Lỗi kết nối khi đổi mật khẩu.', true); });
                } else if (act === 'delete_account') {
                    var confirmVal = ((form.querySelector('input[name="confirm_username"]') || {}).value || '').trim();
                    if (confirmVal !== username) {
                        DG.toast('Tên đăng nhập xác nhận không khớp!', true);
                        return;
                    }
                    fetch('/settings.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({action: 'delete_account'})
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res && res.success) {
                            localStorage.removeItem('deargift_user');
                            localStorage.removeItem('deargift_customer');
                            document.cookie = 'currentUser=; path=/; max-age=0';
                            window.location.href = 'index.html';
                        } else {
                            DG.toast((res && res.message) || 'Không thể xóa tài khoản.', true);
                        }
                    })
                    .catch(function() { DG.toast('Lỗi kết nối.', true); });
                } else if (act === 'logout_all') {
                    DG.logout();
                } else {
                    DG.toast('✓ Đã lưu cài đặt!');
                }
            });
        });
    });
    </script>
</body>
</html>

