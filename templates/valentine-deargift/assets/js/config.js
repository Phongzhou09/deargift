/**
 * CẤU HÌNH - Tạo từ config-editor.html
 * File này sẽ được tạo tự động khi download từ config-editor.html
 * Nếu không có file này, website sẽ dùng cấu hình mặc định
 */
(function(){
'use strict';
// Cấu hình mặc định - sẽ được override nếu có config từ config-editor hoặc __VAL_CONFIG
window.APP_CONFIG = (window.APP_CONFIG && Object.keys(window.APP_CONFIG).length > 0) ? window.APP_CONFIG : (window.__VAL_CONFIG || {});
window.HEART_MESSAGE_CONFIG = window.APP_CONFIG.heart || (window.__VAL_CONFIG && window.__VAL_CONFIG.heart) || {};
})();
