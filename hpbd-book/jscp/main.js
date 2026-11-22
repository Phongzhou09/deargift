const SOCKET_CONFIG = {
  TIMEOUT: 2e4,
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1e3,
  PAYMENT_TIMEOUT: 3e5
};
class SocketManager {
  constructor() {
    this.socket = null;
    this.currentOrder = null;
    this.eventHandlers = /* @__PURE__ */ new Map();
    this.isConnected = false;
  }
  /**
   * Khởi tạo WebSocket connection
   */
  init() {
    try {
      this.socket = io(`https://api.deargift.online`, {
        transports: ["websocket", "polling"],
        timeout: SOCKET_CONFIG.TIMEOUT,
        reconnection: true,
        reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
        reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS
      });
      this._setupEventListeners();
      return this.socket;
    } catch (error) {
      console.error("Lỗi khởi tạo WebSocket:", error);
      return null;
    }
  }
  /**
   * Thiết lập event listeners
   */
  _setupEventListeners() {
    if (!this.socket) return;
    this.socket.on("connect", () => {
      this.isConnected = true;
      this._handleReconnection();
    });
    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });
    this.socket.on("connect_error", (error) => {
      console.error("🔌 WebSocket connection error:", error);
      this.isConnected = false;
    });
  }
  /**
   * Xử lý kết nối lại khi reconnect
   */
  _handleReconnection() {
    const currentOrderCode = localStorage.getItem("current_order_code");
    const isPaymentInProgress = localStorage.getItem("payment_in_progress") === "true";
    if (currentOrderCode && isPaymentInProgress) {
      this.joinOrder(currentOrderCode);
    }
  }
  /**
   * Join vào room theo dõi order
   */
  joinOrder(orderCode) {
    if (!this.socket || !this.isConnected) {
      console.error("❌ Socket chưa kết nối");
      return false;
    }
    if (this.currentOrder && this.currentOrder !== orderCode) {
      this.leaveOrder(this.currentOrder);
    }
    this.socket.emit("join-order", orderCode);
    this.currentOrder = orderCode;
    return true;
  }
  /**
   * Leave khỏi room
   */
  leaveOrder(orderCode) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("leave-order", orderCode);
    if (this.currentOrder === orderCode) {
      this.currentOrder = null;
    }
  }
  /**
   * Đăng ký event handler với cleanup
   */
  on(event, handler) {
    if (!this.socket) return;
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    this.socket.on(event, handler);
  }
  /**
   * Remove event handler
   */
  off(event, handler) {
    if (!this.socket) return;
    this.socket.off(event, handler);
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  /**
   * Cleanup tất cả event handlers
   */
  cleanup() {
    if (!this.socket) return;
    for (const [event, handlers] of this.eventHandlers) {
      handlers.forEach((handler) => {
        this.socket.off(event, handler);
      });
    }
    this.eventHandlers.clear();
    if (this.currentOrder) {
      this.leaveOrder(this.currentOrder);
    }
    this.socket.disconnect();
    this.socket = null;
    this.currentOrder = null;
    this.isConnected = false;
  }
  /**
   * Kiểm tra trạng thái kết nối
   */
  isSocketConnected() {
    return this.socket && this.isConnected;
  }
}
const socketManager = new SocketManager();
function initWebSocket() {
  const socket = socketManager.init();
  window.socket = socketManager.socket;
  return socket;
}
function cleanupPaymentState(orderCode, showError = false) {
  localStorage.removeItem("payment_in_progress");
  localStorage.removeItem("current_order_code");
  if (socketManager.currentOrder === orderCode) {
    socketManager.leaveOrder(orderCode);
  }
}
if (typeof window !== "undefined") {
  window.socketManager = socketManager;
  window.initWebSocket = initWebSocket;
  window.cleanupPaymentState = cleanupPaymentState;
  window.hidePolarBar = function() {
    if (window.__polarBarEl && window.__polarBarEl.parentNode) {
      window.__polarBarEl.parentNode.removeChild(window.__polarBarEl);
      window.__polarBarEl = null;
    }
    window.__polarPopup = null;
    window.__polarCheckoutUrl = null;
  };
}
class PricingCalculator {
  constructor() {
    this.basePrices = {
      defaultMusic: 0,
      // Nhạc nền mặc định miễn phí
      customMusic: 5e3,
      // Nhạc nền tùy chỉnh +5k
      bookEnabled: 2e4,
      // Sách được bật +20k
      extraPage: 3e3,
      // Mỗi trang thêm (>10 trang) +3k
      heartEffect: 5e3,
      // Hiệu ứng trái tim +5k
      saveForever: 2e4
      // Lưu QR vĩnh viễn +20k
    };
    this.defaultSettings = {
      music: "./music/happy-birthday.mp3",
      enableBook: false,
      enableHeart: false,
      isSave: false,
      pages: []
    };
    this.selectedVoucher = null;
    this.vouchers = [];
    this.createPricingUI();
    this.initializeVoucherSystem();
    this.updatePricing();
  }
  createPricingUI() {
    const pricingContainer = document.createElement("div");
    pricingContainer.id = "pricingContainer";
    pricingContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg,rgb(8, 26, 28),rgb(26, 73, 74));
            color: white;
            padding: 15px 20px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(61, 193, 213, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        `;
    pricingContainer.innerHTML = `
    <div class = "pricing-header" style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 18px; margin-right: 8px;">💰</span>
        <strong style="font-size: 16px;">${t("pricingTitle")}</strong>
    </div>
    <div id="pricingDetails"></div>
    <!-- Voucher Section -->
    <div id="voucherSection" style="
        border-top: 1px solid rgba(255,255,255,0.3);
        margin-top: 10px;
        padding-top: 10px;
        display: none;
    ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; margin-right: 8px;">🎫</span>
            <strong style="font-size: 14px;">${t("voucher")}</strong>
        </div>
        <div id="voucherList" style="
            max-height: 120px;
            overflow-y: auto;
            margin-bottom: 8px;
            font-size: 12px;
        "></div>
        <div id="voucherResult" style="
            padding: 6px 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            font-size: 12px;
            color: #4caf50;
            display: none;
        "></div>
    </div>
    <div style="margin: 10px 0;" class = "pricing-tip">
        <label for="tipAmount" style="font-size: 14px; color: #fff;">${t("tip")}</label>
        <input id="tipAmount" type="number" min="0" value="0" style="
            width: 80px;
            margin-left: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
            font-size: 14px;
        ">
    </div>
    <!-- Payment Method Section -->
    <div id="paymentMethodSection" style="
        border-top: 1px solid rgba(255,255,255,0.3);
        margin-top: 10px;
        padding-top: 10px;
        display: none;
    ">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; margin-right: 8px;">💳</span>
            <strong style="font-size: 14px;">${t("paymentMethod")}</strong>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- PayOS Option -->
            <div class="payment-method-container" data-method="PAYOS" style="
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.05);
            ">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; margin: 0;">
                    <input type="radio" name="paymentMethod" value="PAYOS" checked style="
                        margin-right: 10px;
                        transform: scale(1.2);
                    ">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <span style="margin-right: 8px; font-size: 16px;">🏦</span>
                            <strong style="font-size: 13px;">${t("bankPayment")}</strong>
                        </div>
                        <div style="
                            font-size: 11px;
                            color: rgba(255,255,255,0.7);
                            font-style: italic;
                        ">${t("bankPaymentDesc")}</div>
                    </div>
                </label>
            </div>
            
            <!-- Polar Option (thanh toán quốc tế) -->
            <div class="payment-method-container" data-method="POLAR" style="
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(255,255,255,0.05);
            ">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; margin: 0;">
                    <input type="radio" name="paymentMethod" value="POLAR" style="
                        margin-right: 10px;
                        transform: scale(1.2);
                    ">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <span style="margin-right: 8px; font-size: 16px;">🌐</span>
                            <strong style="font-size: 13px;">${t("polarPayment")}</strong>
                        </div>
                        <div style="
                            font-size: 11px;
                            color: rgba(255,255,255,0.7);
                            font-style: italic;
                        ">${t("polarPaymentDesc")}</div>
                    </div>
                </label>
            </div>
        </div>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.3); margin-top: 10px; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <strong style="font-size: 16px;">${t("total")}</strong>
            <strong id="totalPrice" style="font-size: 18px; color: #ffeb3b;">0đ</strong>
        </div>
        <button id="actionButton" style="
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        ">${t("createWebsite")}</button>
    </div>
    <button id="togglePricing" style="
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        color: red;
        font-size: 18px;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        opacity: 0.7;
    ">−</button>
`;
    document.body.appendChild(pricingContainer);
    const toggleBtn = document.getElementById("togglePricing");
    const pricingDetails = document.getElementById("pricingDetails");
    const voucherSection = document.getElementById("voucherSection");
    const paymentMethodSection = document.getElementById("paymentMethodSection");
    let isCollapsed = false;
    const tipInput = document.getElementById("tipAmount");
    if (tipInput) {
      tipInput.addEventListener("input", () => {
        if (!window.settings) window.settings = {};
        window.settings.tip = parseInt(tipInput.value) || 0;
        this.updatePricing();
      });
    }
    toggleBtn.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        pricingDetails.style.display = "none";
        voucherSection.style.display = "none";
        paymentMethodSection.style.display = "none";
        pricingContainer.style.padding = "10px 20px";
        toggleBtn.textContent = "+";
      } else {
        pricingDetails.style.display = "block";
        if (localStorage.getItem("user_uid")) {
          voucherSection.style.display = "block";
        }
        if (this.currentTotal > 0) {
          paymentMethodSection.style.display = "block";
        }
        pricingContainer.style.padding = "15px 20px";
        toggleBtn.textContent = "−";
      }
    });
    const actionButton = document.getElementById("actionButton");
    actionButton.addEventListener("click", () => {
      this.handleActionButton();
    });
    setTimeout(() => {
      this.setupPaymentMethodSelection();
    }, 100);
    const mediaQuery = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
    const adjustForLandscape = (e) => {
      if (e.matches) {
        pricingContainer.style.cssText += `
                    bottom: 10px;
                    left: 10px;
                    padding: 8px 12px;
                    font-size: 12px;
                    max-width: 200px;
                `;
      } else {
        pricingContainer.style.cssText = pricingContainer.style.cssText.replace(
          /bottom: 10px;|left: 10px;|padding: 8px 12px;|font-size: 12px;|max-width: 200px;/g,
          ""
        );
      }
    };
    mediaQuery.addListener(adjustForLandscape);
    adjustForLandscape(mediaQuery);
  }
  // ✅ Initialize voucher system
  initializeVoucherSystem() {
    const savedUID = localStorage.getItem("user_uid");
    if (savedUID) {
      const voucherSection = document.getElementById("voucherSection");
      if (voucherSection) {
        voucherSection.style.display = "block";
      }
      this.loadUserVouchers();
    } else {
    }
    const voucherList = document.getElementById("voucherList");
    if (voucherList) {
      voucherList.addEventListener("change", (e) => {
        if (e.target.name === "voucher") {
          this.handleVoucherChange(e);
        }
      });
    }
  }
  // Setup payment method selection with hover effects
  setupPaymentMethodSelection() {
    const paymentMethodContainers = document.querySelectorAll(".payment-method-container");
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    let updateTimeout = null;
    const updateVisualState = () => {
      paymentMethodContainers.forEach((container, index) => {
        const radio = paymentMethodRadios[index];
        if (radio.checked) {
          container.style.border = "2px solid #4caf50";
          container.style.background = "rgba(76, 175, 80, 0.1)";
          container.style.transform = "translateY(0)";
        } else {
          container.style.border = "2px solid rgba(255,255,255,0.3)";
          container.style.background = "rgba(255,255,255,0.05)";
          container.style.transform = "translateY(0)";
        }
      });
    };
    const updatePricingWithDebounce = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(() => {
        this.updatePricing();
      }, 100);
    };
    paymentMethodContainers.forEach((container, index) => {
      const radio = paymentMethodRadios[index];
      container.addEventListener("click", (e) => {
        if (e.target.type === "radio" || e.target.tagName === "LABEL") {
          return;
        }
        radio.checked = true;
        updateVisualState();
        updatePricingWithDebounce();
      });
      container.addEventListener("mouseenter", () => {
        if (!radio.checked) {
          container.style.border = "2px solid rgba(255,255,255,0.5)";
          container.style.background = "rgba(255,255,255,0.1)";
          container.style.transform = "translateY(-1px)";
        }
      });
      container.addEventListener("mouseleave", () => {
        if (!radio.checked) {
          container.style.border = "2px solid rgba(255,255,255,0.3)";
          container.style.background = "rgba(255,255,255,0.05)";
          container.style.transform = "translateY(0)";
        }
      });
      radio.addEventListener("change", () => {
        updateVisualState();
        updatePricingWithDebounce();
      });
    });
    updateVisualState();
  }
  // Load user vouchers
  async loadUserVouchers() {
    const voucherList = document.getElementById("voucherList");
    const voucherResult = document.getElementById("voucherResult");
    if (!voucherList) {
      console.error("🎫 [VOUCHER LOAD] voucherList element not found");
      return;
    }
    voucherList.innerHTML = "Đang tải voucher...";
    if (voucherResult) voucherResult.style.display = "none";
    this.selectedVoucher = null;
    this.vouchers = [];
    const uid = localStorage.getItem("user_uid");
    if (!uid) {
      voucherList.innerHTML = `<span style="color:#e53935;">${t("needLoginVoucher")}</span>`;
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const res = await fetch(`https://api.deargift.online/api/vouchers/saved/${uid}`, { headers });
      const data = await res.json();
      if (!data.success) {
        console.error("🎫 [VOUCHER LOAD] API returned error:", data.message);
        voucherList.innerHTML = `<span style="color:#e53935;">${data.message}</span>`;
        return;
      }
      if (!data.data || !data.data.length) {
        voucherList.innerHTML = `<span style="color:#888;">${t("noVoucher")}</span>`;
        return;
      }
      this.vouchers = data.data;
      voucherList.innerHTML = this.vouchers.map((v, idx) => `
    <div class="voucher-item" data-idx="${idx}" style="
        padding: 6px 8px;
        margin: 4px 0;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
        <input class="checkbox" type="checkbox" name="voucher" id="voucher_${idx}" style="margin-right: 8px;">
        <label for="voucher_${idx}" style="cursor: pointer; font-size: 11px;">
            <strong>${v.code}</strong> - ${t("voucherApplied", { code: v.code, discount: v.discountValue })}<br>
            <span style="color: #ccc;">HSD: ${new Date(v.expiredAt).toLocaleDateString()}</span>
        </label>
    </div>
`).join("");
      this.updatePricing();
    } catch (err) {
      console.error("🎫 [VOUCHER LOAD] Error loading vouchers:", err);
      voucherList.innerHTML = '<span style="color:#e53935;">Không thể tải voucher!</span>';
    }
  }
  // Handle voucher selection
  handleVoucherChange(e) {
    const voucherList = document.getElementById("voucherList");
    const voucherResult = document.getElementById("voucherResult");
    if (!voucherList || !this.vouchers) return;
    const checkboxes = voucherList.querySelectorAll('input[name="voucher"]');
    const idx = Array.from(checkboxes).findIndex((cb) => cb === e.target);
    if (e.target.checked) {
      checkboxes.forEach((cb, i) => cb.checked = i === idx);
      this.selectedVoucher = this.vouchers[idx];
      if (voucherResult) {
        voucherResult.innerHTML = t("voucherApplied", { code: this.selectedVoucher.code, discount: this.selectedVoucher.discountValue });
        voucherResult.style.display = "block";
      }
    } else {
      this.selectedVoucher = null;
      if (voucherResult) {
        voucherResult.style.display = "none";
      }
    }
    this.updatePricing();
  }
  // Clear vouchers
  clearVouchers() {
    this.selectedVoucher = null;
    this.vouchers = [];
    const voucherSection = document.getElementById("voucherSection");
    const voucherResult = document.getElementById("voucherResult");
    const voucherList = document.getElementById("voucherList");
    if (voucherSection) voucherSection.style.display = "none";
    if (voucherResult) voucherResult.style.display = "none";
    if (voucherList) voucherList.innerHTML = "";
    this.updatePricing();
  }
  calculatePrice(currentSettings) {
    const items = [];
    let total = 0;
    const isCustomMusic = currentSettings.music !== "./music/happy-birthday.mp3";
    if (isCustomMusic) {
      items.push({
        name: "Nhạc nền tùy chỉnh",
        price: this.basePrices.customMusic,
        icon: "🎵"
      });
      total += this.basePrices.customMusic;
    }
    if (currentSettings.enableBook) {
      items.push({
        name: "Sách kỷ niệm",
        price: this.basePrices.bookEnabled,
        icon: "📖"
      });
      total += this.basePrices.bookEnabled;
      const totalPages = currentSettings.pages ? currentSettings.pages.length : 0;
      if (totalPages > 10) {
        const extraPages = totalPages - 10;
        const extraPagesCost = extraPages * this.basePrices.extraPage;
        items.push({
          name: `Trang thêm (${extraPages} trang)`,
          price: extraPagesCost,
          icon: "📄"
        });
        total += extraPagesCost;
      }
      if (currentSettings.enableHeart) {
        items.push({
          name: "Hiệu ứng trái tim (trong sách)",
          price: this.basePrices.heartEffect,
          icon: "💕"
        });
        total += this.basePrices.heartEffect;
      }
    }
    if (currentSettings.isSave) {
      items.push({
        name: "Lưu QR vĩnh viễn",
        price: this.basePrices.saveForever,
        icon: "🔒"
      });
      total += this.basePrices.saveForever;
    }
    let discount = 0;
    let finalPrice = total;
    if (this.selectedVoucher && total > 0) {
      discount = Math.round(total * this.selectedVoucher.discountValue / 100);
      finalPrice = total - discount;
      items.push({
        name: `Voucher ${this.selectedVoucher.code} (-${this.selectedVoucher.discountValue}%)`,
        price: -discount,
        icon: "🎫"
      });
    }
    const tip = currentSettings.tip ? parseInt(currentSettings.tip) : 0;
    if (tip > 0) {
      items.push({
        name: "Tip cho tác giả",
        price: tip,
        icon: "💸"
      });
      total += tip;
      finalPrice += tip;
    }
    return { items, total, discount, finalPrice };
  }
  formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0
    }).format(price);
  }
  formatPriceUSD(price) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0
    }).format(price);
  }
  updatePricing(currentSettings = null) {
    const settingsToUse = currentSettings || window.settings || this.defaultSettings;
    const pricingDetails = document.getElementById("pricingDetails");
    const totalPrice = document.getElementById("totalPrice");
    const actionButton = document.getElementById("actionButton");
    const tipInput = document.getElementById("tipAmount");
    const paymentMethodSection = document.getElementById("paymentMethodSection");
    if (!pricingDetails || !totalPrice || !actionButton) return;
    if (tipInput) {
      settingsToUse.tip = parseInt(tipInput.value) || 0;
    }
    const selectedPaymentMethod = this.getSelectedPaymentMethod();
    const pricing = this.calculatePrice(settingsToUse);
    if (pricing.items.length === 0) {
      pricingDetails.innerHTML = `
        <div style="text-align: center; opacity: 0.8; font-style: italic;">
            ${t("defaultConfig")}
        </div>
    `;
    } else {
      pricingDetails.innerHTML = pricing.items.map((item) => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 5px 0;">
            <span style="display: flex; align-items: center;">
                <span style="margin-right: 5px;">${item.icon}</span>
                <span>${t(item.name) || item.name}</span>
            </span>
            <span style="font-weight: bold; color: ${item.price < 0 ? "#4caf50" : "#ffeb3b"};">
                ${item.price < 0 ? "" : "+"}${this.formatPrice(item.price)}
            </span>
        </div>
    `).join("");
    }
    const finalPrice = pricing.finalPrice !== void 0 ? pricing.finalPrice : pricing.total;
    const polarNotice = document.getElementById("polarNotice");
    if (selectedPaymentMethod === "POLAR" && finalPrice > 0) {
      const basePolarAmount = 7;
      const tipAmount = settingsToUse.tip ? parseInt(settingsToUse.tip) : 0;
      const tipInUSD = tipAmount > 0 ? tipAmount : 0;
      const totalPolarAmount = basePolarAmount + tipInUSD;
      totalPrice.textContent = this.formatPriceUSD(totalPolarAmount);
      if (polarNotice) polarNotice.remove();
    } else {
      totalPrice.textContent = this.formatPrice(finalPrice);
      if (polarNotice) polarNotice.remove();
    }
    if (finalPrice > 0) {
      totalPrice.style.color = "#ff9800";
      actionButton.textContent = t("payAndCreate");
      actionButton.style.cssText += `
        background: linear-gradient(135deg, #ff9800, #ffc107);
        color: white;
    `;
      if (paymentMethodSection) {
        paymentMethodSection.style.display = "block";
        if (!this.paymentMethodSetup) {
          setTimeout(() => {
            this.setupPaymentMethodSelection();
            this.paymentMethodSetup = true;
          }, 50);
        }
      }
    } else {
      totalPrice.style.color = "#4caf50";
      actionButton.textContent = t("createWebsite");
      actionButton.style.cssText += `
        background: linear-gradient(135deg, #4caf50, #66bb6a);
        color: white;
    `;
      if (paymentMethodSection) {
        paymentMethodSection.style.display = "none";
        this.paymentMethodSetup = false;
      }
    }
    this.currentTotal = finalPrice;
    this.originalTotal = pricing.total;
  }
  // Lấy phương thức thanh toán được chọn
  getSelectedPaymentMethod() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    return selectedMethod ? selectedMethod.value : "PAYOS";
  }
  // Xử lý khi click nút action - Luôn tạo free
  async handleActionButton() {
    const actionButton = document.getElementById("actionButton");
    const originalText = actionButton.textContent;
    actionButton.disabled = true;
    actionButton.style.opacity = "0.7";
    try {
      const userUid = localStorage.getItem("user_uid");
      if (!userUid) {
        this.showNotification(t("needLogin"), "error");
        return;
      }
      const selectedPaymentMethod = this.getSelectedPaymentMethod();
      if (selectedPaymentMethod === "POLAR") {
        const basePolarAmount = 7;
        const tipInput = document.getElementById("tipAmount");
        const tipAmount = tipInput ? parseInt(tipInput.value) || 0 : 0;
        const totalUSD = basePolarAmount + (tipAmount > 0 ? tipAmount : 0);
        if (totalUSD < 1) {
          this.showNotification("❌ Số tiền thanh toán tối thiểu là 1 USD!", "error");
          return;
        }
      } else if (this.currentTotal > 0 && this.currentTotal < 1e4) {
        this.showNotification("❌ Số tiền thanh toán tối thiểu là 10.000 VNĐ!", "error");
        return;
      }
      if (this.currentTotal > 0) {
        actionButton.textContent = "⏳ Đang xử lý thanh toán...";
        await this.handlePaidCreation();
      } else {
        actionButton.textContent = "⏳ Đang tạo...";
        await this.handleFreeCreation();
      }
    } catch (error) {
      console.error("Error in handleActionButton:", error);
      this.showNotification("❌ Có lỗi xảy ra!", "error");
    } finally {
      actionButton.disabled = false;
      actionButton.textContent = originalText;
      actionButton.style.opacity = "1";
    }
  }
  // Xử lý tạo free
  async handleFreeCreation() {
    var _a, _b;
    try {
      let settingsToUse = this.getCurrentSettingsFromModal() || window.settings || this.defaultSettings;
      if (settingsToUse.enableBook) {
        const totalPages = ((_a = settingsToUse.pages) == null ? void 0 : _a.length) || 0;
        if (totalPages > 1 && totalPages % 2 === 0) {
          this.showNotification(`❌ Cấu trúc trang không hợp lệ! Hiện tại có ${totalPages} trang. Vui lòng thêm hoặc xóa 1 trang để tạo cấu trúc hợp lệ.`, "error");
          return;
        }
      }
      const orderCode = this.generateOrderCode();
      let progressNotification = null;
      if (settingsToUse.enableBook && ((_b = settingsToUse.pages) == null ? void 0 : _b.length) > 0) {
        progressNotification = this.showProgressNotification("📤 Đang upload ảnh trang sách...");
      }
      const completeSettings = this.prepareCompleteSettings(settingsToUse);
      if (progressNotification) {
        this.updateProgressNotification(progressNotification, "🌐 Đang tạo website...");
      }
      const websiteResult = await window.birthdayAPI.createBirthdayWebsite(completeSettings, "Free");
      if (!websiteResult.success) {
        throw new Error(websiteResult.error || "Không thể tạo website");
      }
      if (progressNotification) {
        this.updateProgressNotification(progressNotification, "📦 Đang tạo sản phẩm...");
      }
      const productData = this.createProductData(websiteResult.websiteId, orderCode, "FREE", 0);
      const productResult = await this.createProduct(productData);
      if (this.selectedVoucher) {
        if (progressNotification) {
          this.updateProgressNotification(progressNotification, "🎫 Đang áp dụng voucher...");
        }
        await this.applyVoucher(orderCode);
      }
      if (progressNotification) {
        this.removeProgressNotification(progressNotification);
      }
      this.showSuccessResult(websiteResult.websiteId, 0);
      this.finishCreation();
    } catch (error) {
      console.error("❌ [CATCH ERROR] Error creating website:", error);
      console.error("❌ [CATCH ERROR] Error stack:", error.stack);
      this.showNotification("❌ Lỗi khi tạo website: " + error.message, "error");
    }
  }
  // ✅ Thêm hàm xử lý thanh toán
  async handlePaidCreation() {
    var _a, _b;
    try {
      let settingsToUse = this.getCurrentSettingsFromModal() || window.settings || this.defaultSettings;
      if (window.lastIsSaveState !== void 0) {
        settingsToUse.isSave = window.lastIsSaveState;
      }
      if (settingsToUse.enableBook) {
        const totalPages = ((_a = settingsToUse.pages) == null ? void 0 : _a.length) || 0;
        if (totalPages > 1 && totalPages % 2 === 0) {
          this.showNotification(`❌ Cấu trúc trang không hợp lệ! Hiện tại có ${totalPages} trang. Vui lòng thêm hoặc xóa 1 trang để tạo cấu trúc hợp lệ.`, "error");
          return;
        }
      }
      const orderCode = this.generateOrderCode();
      let progressNotification = null;
      if (settingsToUse.enableBook && ((_b = settingsToUse.pages) == null ? void 0 : _b.length) > 0) {
        progressNotification = this.showProgressNotification("📤 Đang upload ảnh trang sách...");
      }
      const completeSettings = this.prepareCompleteSettings(settingsToUse);
      if (progressNotification) {
        this.updateProgressNotification(progressNotification, "🌐 Đang tạo website...");
      }
      const websiteResult = await window.birthdayAPI.createBirthdayWebsite(completeSettings, "PAID");
      if (!websiteResult.success) {
        throw new Error(websiteResult.error || "Không thể tạo website");
      }
      if (progressNotification) {
        this.updateProgressNotification(progressNotification, "📦 Đang tạo sản phẩm...");
      }
      const productData = this.createProductData(websiteResult.websiteId, orderCode, "PENDING", this.originalTotal);
      const productResult = await this.createProduct(productData);
      let finalPrice = this.originalTotal;
      if (this.selectedVoucher) {
        if (progressNotification) {
          this.updateProgressNotification(progressNotification, "🎫 Đang áp dụng voucher...");
        }
        try {
          await this.applyVoucher(orderCode);
          finalPrice = this.currentTotal;
        } catch (error) {
          console.error("Lỗi áp dụng voucher:", error);
          this.showNotification("⚠️ Lỗi áp dụng voucher, tiếp tục thanh toán với giá gốc", "warning");
        }
      }
      if (progressNotification) {
        this.removeProgressNotification(progressNotification);
      }
      if (finalPrice > 0) {
        const paymentMethod = this.getSelectedPaymentMethod();
        await this.processPayment(orderCode, finalPrice, websiteResult.websiteId, paymentMethod);
      } else {
        this.showSuccessResult(websiteResult.websiteId, 0);
        this.finishCreation();
      }
    } catch (error) {
      console.error("❌ [PAID CATCH] Error in paid creation:", error);
      this.showNotification("❌ Lỗi thanh toán: " + error.message, "error");
    }
  }
  // Tạo orderCode unique
  generateOrderCode() {
    const firstDigit = Math.floor(1 + Math.random() * 9);
    const orderCode = firstDigit.toString() + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900);
    return orderCode;
  }
  // Chuẩn bị settings hoàn chỉnh
  prepareCompleteSettings(settingsToUse) {
    const completeSettings = {
      music: settingsToUse.music || "./music/happybirtday_uia.mp3",
      countdown: settingsToUse.countdown || 3,
      matrixText: settingsToUse.matrixText || "HAPPYBIRTHDAY",
      matrixColor1: settingsToUse.matrixColor1 || "#ffb6c1",
      matrixColor2: settingsToUse.matrixColor2 || "#ffc0cb",
      sequence: settingsToUse.sequence || "HAPPY|BIRTHDAY|MY|CUTEE|LITTLE|SWARALI|❤",
      sequenceColor: settingsToUse.sequenceColor || "#d39b9b",
      gift: settingsToUse.gift || "",
      enableBook: settingsToUse.enableBook !== void 0 ? settingsToUse.enableBook : false,
      enableHeart: settingsToUse.enableHeart !== void 0 ? settingsToUse.enableHeart : false,
      isSave: settingsToUse.isSave !== void 0 ? settingsToUse.isSave : false,
      pages: settingsToUse.pages || []
    };
    return completeSettings;
  }
  // Tạo dữ liệu sản phẩm
  createProductData(websiteId, orderCode, status, price) {
    const userUid = localStorage.getItem("user_uid");
    const productLink = window.location.origin + window.location.pathname + "?websiteId=" + websiteId;
    return {
      uid: userUid,
      orderCode: orderCode.toString(),
      name: "Birthday Website",
      type: "Birthday",
      price,
      images: "https://cdn.deargift.online/uploads/Screenshot%202025-07-08%20123133.png",
      linkproduct: productLink,
      configId: websiteId,
      status,
      createdAt: /* @__PURE__ */ new Date()
    };
  }
  // Tạo sản phẩm
  async createProduct(productData) {
    try {
      const res = await fetch("https://api.deargift.online/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || "Lỗi khi tạo sản phẩm");
      }
    } catch (error) {
      throw new Error("Lỗi khi tạo sản phẩm: " + error.message);
    }
  }
  // Áp dụng voucher
  async applyVoucher(orderCode) {
    try {
      const userUid = localStorage.getItem("user_uid");
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const voucherRes = await fetch("https://api.deargift.online/api/vouchers/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({
          uid: userUid,
          code: this.selectedVoucher.code,
          orderCode: orderCode.toString()
        })
      });
      const voucherData = await voucherRes.json();
      if (!voucherData.success) {
        throw new Error(voucherData.message || "Áp dụng voucher thất bại!");
      }
      this.showNotification("✅ Áp dụng voucher thành công!", "success");
      return voucherData;
    } catch (error) {
      console.error("❌ [VOUCHER] Error applying voucher:", error);
      throw error;
    }
  }
  // Xử lý thanh toán
  async processPayment(orderCode, amount, websiteId, paymentMethod = "PAYOS") {
    var _a, _b, _c, _d, _e;
    try {
      const userUid = localStorage.getItem("user_uid");
      const customerEmail = localStorage.getItem("user_email") || "";
      let finalAmount = amount;
      if (paymentMethod === "POLAR") {
        const basePolarAmount = 7;
        const tipInput = document.getElementById("tipAmount");
        const tipAmount = tipInput ? parseInt(tipInput.value) || 0 : 0;
        finalAmount = basePolarAmount + (tipAmount > 0 ? tipAmount : 0);
        if (finalAmount < 1) finalAmount = 1;
      }
      const paymentData = {
        amount: finalAmount,
        description: "Birthday Website",
        orderCode: Number(orderCode),
        uid: userUid,
        customerEmail,
        paymentMethod
      };
      localStorage.setItem("current_order_code", orderCode);
      const paymentMethodText = paymentMethod === "POLAR" ? "POLAR" : "PAYOS";
      this.showNotification(`🔄 Đang chuyển đến trang thanh toán ${paymentMethodText}...`, "info");
      const paymentRes = await fetch("https://api.deargift.online/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData)
      });
      const paymentResult = await paymentRes.json();
      const checkoutUrl = ((_a = paymentResult.data) == null ? void 0 : _a.checkoutUrl) || ((_b = paymentResult.data) == null ? void 0 : _b.paymentUrl) || paymentResult.checkoutUrl || paymentResult.paymentUrl;
      const isSuccess = paymentResult.code === "00" && checkoutUrl;
      let backendMessage = paymentResult.desc || paymentResult.message || ((_c = paymentResult.data) == null ? void 0 : _c.message) || paymentResult.error;
      if (!backendMessage && paymentResult.details) {
        const d = paymentResult.details;
        if (d.detail && Array.isArray(d.detail) && d.detail[0]) backendMessage = typeof d.detail[0] === "string" ? d.detail[0] : d.detail[0].msg || d.detail[0].message || d.error || JSON.stringify(d.detail[0]);
        else if (d.error) backendMessage = d.error;
      }
      if (!backendMessage) backendMessage = "Không nhận được URL thanh toán";
      if (!isSuccess) {
        console.error("❌ [PAYMENT] Backend lỗi:", paymentResult.error || paymentResult.details, paymentResult);
        throw new Error(backendMessage);
      }
      if (((_d = paymentResult.data) == null ? void 0 : _d.isExistingOrder) && ((_e = paymentResult.data) == null ? void 0 : _e.orderCode)) {
        const oldOrderCode = paymentResult.data.orderCode;
        localStorage.setItem("current_order_code", oldOrderCode);
        orderCode = oldOrderCode;
      }
      if (paymentMethod === "POLAR") {
        this.showPolarPayment(checkoutUrl, websiteId, amount, orderCode);
      } else {
        this.showPaymentModal(checkoutUrl, websiteId, amount);
      }
    } catch (error) {
      throw new Error("Lỗi xử lý thanh toán: " + error.message);
    }
  }
  showPaymentModal(checkoutUrl, websiteId, amount) {
    const orderCodeForCtx = localStorage.getItem("current_order_code");
    window.__lastPaymentContext = { websiteId, amount, orderCode: orderCodeForCtx };
    var self = this;
    window.onPaymentSuccess = function(oc, data) {
      var ctx = window.__lastPaymentContext;
      if (!ctx || String(ctx.orderCode) !== String(oc)) return;
      window.cleanupPaymentState(oc, false);
      self.showSuccessResult(ctx.websiteId, ctx.amount);
      self.finishCreation();
      window.__lastPaymentContext = null;
    };
    let paymentModal = document.getElementById("paymentModal");
    if (!paymentModal) {
      paymentModal = document.createElement("div");
      paymentModal.id = "paymentModal";
      paymentModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        `;
      paymentModal.innerHTML = `
            <div style="position:relative; margin: 5% auto; width: 90%; max-width: 800px; background:white; padding:20px; border-radius:10px;">
                <button id="paymentModalClose" style="position:absolute;top:10px;right:10px;">✖</button>
                <iframe id="paymentIframe" style="width:100%; height:600px; border:none;"></iframe>
            </div>
        `;
      document.body.appendChild(paymentModal);
    }
    const closeBtn = paymentModal.querySelector("#paymentModalClose");
    const iframe = paymentModal.querySelector("#paymentIframe");
    if (iframe) iframe.src = checkoutUrl;
    paymentModal.style.display = "block";
    if (closeBtn) {
      closeBtn.onclick = () => {
        paymentModal.style.display = "none";
      };
    }
    if (!window.socketManager || !window.socketManager.isSocketConnected()) {
      window.initWebSocket();
    }
    const orderCode = localStorage.getItem("current_order_code") || this.generateOrderCode();
    localStorage.setItem("payment_in_progress", "true");
    localStorage.setItem("current_order_code", orderCode);
    return new Promise((resolve, reject) => {
      let iframeLoaded = false;
      let wsMessageReceived = false;
      const checkAndProcessResult = () => {
        if (iframeLoaded && wsMessageReceived) {
        }
      };
      iframe.onload = () => {
        iframeLoaded = true;
        checkAndProcessResult();
      };
      iframe.onerror = () => {
      };
      iframe.onbeforeunload = () => {
      };
      if (window.socketManager && window.socketManager.isSocketConnected()) {
        window.socketManager.joinOrder(orderCode);
        const paymentStatusHandler = (data) => {
          if (String(data.orderCode) === String(orderCode)) {
            wsMessageReceived = true;
            if (data.status === "PAID") {
              window.cleanupPaymentState(orderCode, false);
              paymentModal.style.display = "none";
              this.showSuccessResult(websiteId, amount);
              this.finishCreation();
              window.socketManager.off("payment_status_update", paymentStatusHandler);
              resolve();
            } else if (data.status === "CANCELLED") {
              window.cleanupPaymentState(orderCode, false);
              paymentModal.style.display = "none";
              this.showNotification("Thanh toán đã bị hủy", "warning");
              window.socketManager.off("payment_status_update", paymentStatusHandler);
              reject(new Error("Thanh toán bị hủy"));
            } else if (data.status === "failed") {
              window.cleanupPaymentState(orderCode, false);
              paymentModal.style.display = "none";
              this.showNotification("❌ Thanh toán thất bại. Vui lòng thử lại.", "error");
              window.socketManager.off("payment_status_update", paymentStatusHandler);
              reject(new Error(data.message || "Thanh toán thất bại!"));
            }
          } else {
          }
        };
        window.socketManager.on("payment_status_update", paymentStatusHandler);
      } else {
        console.error("❌ WebSocket chưa được khởi tạo!");
        reject(new Error("WebSocket connection error!"));
      }
      setTimeout(() => {
        if (!wsMessageReceived) {
          window.cleanupPaymentState(orderCode, false);
          this.showNotification("Timeout - Không thể xác định trạng thái thanh toán!", "warning");
          reject(new Error("Timeout - Không thể xác định trạng thái thanh toán!"));
        }
      }, 3e5);
    });
  }
  showPolarPayment(checkoutUrl, websiteId, amount, orderCode) {
    orderCode = orderCode || localStorage.getItem("current_order_code") || this.generateOrderCode();
    localStorage.setItem("payment_in_progress", "true");
    localStorage.setItem("current_order_code", orderCode);
    window.__polarCheckoutUrl = checkoutUrl;
    window.__lastPaymentContext = { websiteId, amount, orderCode };
    var self = this;
    window.onPaymentSuccess = function(oc, data) {
      var ctx = window.__lastPaymentContext;
      if (!ctx || String(ctx.orderCode) !== String(oc)) return;
      window.cleanupPaymentState(oc, false);
      self.showSuccessResult(ctx.websiteId, ctx.amount);
      self.finishCreation();
      window.__lastPaymentContext = null;
      window.__polarCheckoutUrl = null;
      window.__polarPopup = null;
    };
    var popupName = "polar_checkout_" + Date.now();
    var popup = window.open(checkoutUrl, popupName, "width=520,height=700,scrollbars=yes");
    if (!popup) {
      window.open(checkoutUrl, "_blank");
    } else {
      window.__polarPopup = popup;
      popup.focus();
    }
    this.showPolarBar(checkoutUrl, popupName);
  }
  showPolarBar(checkoutUrl, popupName) {
    if (window.__polarBarEl) return;
    var bar = document.createElement("div");
    bar.id = "polarBar";
    bar.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(0,0,0,0.85);color:#fff;padding:12px 20px;border-radius:12px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:14px;";
    bar.innerHTML = "<span>" + (typeof t !== "undefined" ? t("polar_window_hidden") : "Cửa sổ thanh toán bị ẩn?") + '</span><button type="button" id="polarOpenBtn" style="padding:8px 16px;border-radius:8px;border:none;background:#6c63ff;color:#fff;cursor:pointer;font-weight:600;">' + (typeof t !== "undefined" ? t("polar_open_window") : "Mở cửa sổ thanh toán") + "</button>";
    document.body.appendChild(bar);
    window.__polarBarEl = bar;
    var btn = document.getElementById("polarOpenBtn");
    if (btn) {
      btn.onclick = function() {
        if (window.__polarPopup && !window.__polarPopup.closed) {
          window.__polarPopup.focus();
        } else if (window.__polarCheckoutUrl) {
          var name = "polar_checkout_" + Date.now();
          window.__polarPopup = window.open(window.__polarCheckoutUrl, name, "width=520,height=700,scrollbars=yes");
          if (window.__polarPopup) window.__polarPopup.focus();
        }
      };
    }
  }
  hidePolarBar() {
    if (window.__polarBarEl && window.__polarBarEl.parentNode) {
      window.__polarBarEl.parentNode.removeChild(window.__polarBarEl);
      window.__polarBarEl = null;
    }
    window.__polarPopup = null;
    window.__polarCheckoutUrl = null;
  }
  showSuccessResult(websiteId, price) {
    const shareableURL = window.birthdayAPI.createShareableURL(websiteId);
    const selectedPaymentMethod = this.getSelectedPaymentMethod();
    let priceText;
    if (price > 0) {
      if (selectedPaymentMethod === "POLAR") {
        const basePolarAmount = 7;
        const tipInput = document.getElementById("tipAmount");
        const tipAmount = tipInput ? parseInt(tipInput.value) || 0 : 0;
        const totalPolarAmount = basePolarAmount + (tipAmount > 0 ? tipAmount : 0);
        priceText = `<span style="color:#6c63ff;font-weight:bold;">${this.formatPriceUSD(totalPolarAmount)}</span>`;
      } else {
        priceText = `<span style="color:#6c63ff;font-weight:bold;">${price.toLocaleString()} VNĐ</span>`;
      }
    } else {
      priceText = `<span style="color:#4caf50;font-weight:bold;">${t("free")}</span>`;
    }
    this.showNotification("🎉 Tạo website thành công!", "success");
    this.showShareSection(websiteId);
    const successNotification = document.createElement("div");
    successNotification.className = "success-notification-popup";
    successNotification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10006;
        max-width: 400px;
        text-align: center;
    `;
    successNotification.innerHTML = `
    <h3 style="color: #4caf50; margin-bottom: 15px;">${t("createSuccess")}</h3>
    <div style="margin-bottom: 15px;">
        <strong>${t("price")}</strong> ${priceText}
    </div>
    <div style="margin-bottom: 15px;">
        <strong>${t("shareLink")}</strong>
        <div style="
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            word-break: break-all;
            font-size: 12px;
            margin-top: 5px;
        ">${shareableURL}</div>
    </div>
    <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="copySuccessLinkBtn" style="
            background: #2196f3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        ">${t("copyLink")}</button>
        <button id="openSuccessLinkBtn" style="
            background: #4caf50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        ">${t("viewWebsite")}</button>
          <button id="heartQrBtn" style="
        background: #ff4081;
        color: #fff;
       padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
    ">${t("heartQr")}</button>
        <button id="closeSuccessNotificationBtn" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
        ">${t("close")}</button>
       
    </div>
    <div style="margin-top: 22px; padding: 14px 10px 8px 10px; background: linear-gradient(90deg,#f9fafc,#f3e7fa 70%); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <img src="https://cdn-icons-png.flaticon.com/512/3046/3046125.png" alt="TikTok" style="width:28px;height:28px;">
            <span style="font-size: 15px; color: #222; font-weight: 500;">
                ${t("thanks")}
            </span>
        </div>
        <a href="https://www.tiktok.com/@iamtritoan?is_from_webapp=1&sender_device=pc" target="_blank" style="
            display: inline-block;
            margin-top: 4px;
            background: linear-gradient(90deg,#ff0050,#00f2ea 80%);
            color: #fff;
            font-weight: bold;
            padding: 8px 18px;
            border-radius: 30px;
            text-decoration: none;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: background 0.2s;
        " onmouseover="this.style.background='#00f2ea'" onmouseout="this.style.background='linear-gradient(90deg,#ff0050,#00f2ea 80%)'">
            ${t("tiktokBtn")}
        </a>
    </div>
   
`;
    const heartQrBtn = successNotification.querySelector("#heartQrBtn");
    if (heartQrBtn) {
      heartQrBtn.onclick = () => {
        navigator.clipboard.writeText(shareableURL).then(() => {
          this.showNotification(t("heartQrCopy"), "success");
          window.open("https://deargift.online/heartqr.html", "_blank");
        }).catch(() => {
          window.open("https://deargift.online/heartqr.html", "_blank");
        });
      };
    }
    document.body.appendChild(successNotification);
    const copyBtn = successNotification.querySelector("#copySuccessLinkBtn");
    const openBtn = successNotification.querySelector("#openSuccessLinkBtn");
    const closeBtn = successNotification.querySelector("#closeSuccessNotificationBtn");
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(shareableURL).then(() => {
          this.showNotification(t("copySuccess"), "success");
        });
      };
    }
    if (openBtn) {
      openBtn.onclick = () => {
        window.open(shareableURL, "_blank");
      };
    }
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (successNotification.parentNode) {
          successNotification.parentNode.removeChild(successNotification);
        }
      };
    }
  }
  // Hoàn thành quá trình tạo
  finishCreation() {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.display = "none";
    }
    if (typeof startWebsite === "function") {
      startWebsite();
    }
  }
  getCurrentSettingsFromModal() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const settingsModal = document.getElementById("settingsModal");
    if (!settingsModal || settingsModal.style.display === "none") {
    }
    try {
      const isSaveElement = document.getElementById("isSave");
      const isSaveValue = (isSaveElement == null ? void 0 : isSaveElement.checked) || window.lastIsSaveState || false;
      const modalSettings = {
        music: ((_a = document.getElementById("backgroundMusic")) == null ? void 0 : _a.value) || "./music/happybirtday_uia.mp3",
        countdown: parseInt((_b = document.getElementById("countdownTime")) == null ? void 0 : _b.value) || 3,
        matrixText: ((_c = document.getElementById("matrixText")) == null ? void 0 : _c.value) || "HAPPYBIRTHDAY",
        matrixColor1: ((_d = document.getElementById("matrixColor1")) == null ? void 0 : _d.value) || "#ffb6c1",
        matrixColor2: ((_e = document.getElementById("matrixColor2")) == null ? void 0 : _e.value) || "#ffc0cb",
        sequence: ((_f = document.getElementById("sequenceText")) == null ? void 0 : _f.value) || "HAPPY|BIRTHDAY|MY|CUTEE|LITTLE|SWARALI|❤",
        sequenceColor: ((_g = document.getElementById("sequenceColor")) == null ? void 0 : _g.value) || "#d39b9b",
        gift: ((_h = document.getElementById("giftImage")) == null ? void 0 : _h.value) || "",
        enableBook: ((_i = document.getElementById("enableBook")) == null ? void 0 : _i.value) === "true",
        enableHeart: ((_j = document.getElementById("enableHeart")) == null ? void 0 : _j.value) === "true",
        isSave: isSaveValue,
        pages: this.getPagesFromModal()
      };
      return modalSettings;
    } catch (error) {
      console.error("❌ [DEBUG] Error in getCurrentSettingsFromModal:", error);
      return null;
    }
  }
  // Thêm function để lấy pages từ modal
  getPagesFromModal() {
    var _a;
    try {
      const pages = [];
      const modalSettings = window.settings || this.defaultSettings;
      const currentPages = modalSettings.pages || [];
      currentPages.forEach((page, index) => {
        const fileInput = document.getElementById(`pageImage${index}`);
        const contentInput = document.getElementById(`pageContent${index}`);
        const newPage = {};
        if (fileInput && fileInput.files.length > 0) {
          newPage.image = URL.createObjectURL(fileInput.files[0]);
        } else {
          newPage.image = page.image;
        }
        if (contentInput) {
          newPage.content = contentInput.value;
        } else {
          newPage.content = page.content || "";
        }
        pages.push(newPage);
      });
      return pages;
    } catch (error) {
      console.error("❌ [PAGES ERROR] Error getting pages from modal:", error);
      return ((_a = window.settings) == null ? void 0 : _a.pages) || this.defaultSettings.pages || [];
    }
  }
  // Hiển thị section chia sẻ
  showShareSection(websiteId) {
    const shareSection = document.getElementById("shareSection");
    const shareURL = document.getElementById("shareURL");
    if (shareSection && shareURL) {
      const shareableURL = window.birthdayAPI.createShareableURL(websiteId);
      shareURL.value = shareableURL;
      shareSection.style.display = "block";
      shareSection.style.animation = "slideIn 0.3s ease";
    }
  }
  // Sao chép URL chia sẻ
  copyShareURL() {
    const shareURL = document.getElementById("shareURL");
    const copyButton = document.getElementById("copyButton");
    if (shareURL) {
      shareURL.select();
      shareURL.setSelectionRange(0, 99999);
      try {
        navigator.clipboard.writeText(shareURL.value).then(() => {
          copyButton.textContent = "✅ Đã sao chép!";
          this.showNotification("📋 Đã sao chép link vào clipboard!", "success");
          setTimeout(() => {
            copyButton.textContent = "📋 Sao chép link";
          }, 2e3);
        }).catch(() => {
          document.execCommand("copy");
          copyButton.textContent = "✅ Đã sao chép!";
          this.showNotification("📋 Đã sao chép link vào clipboard!", "success");
          setTimeout(() => {
            copyButton.textContent = "📋 Sao chép link";
          }, 2e3);
        });
      } catch (err) {
        console.error("Copy failed:", err);
        this.showNotification("❌ Không thể sao chép link!", "error");
      }
    }
  }
  // Hiển thị thông báo
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999990004;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;
    switch (type) {
      case "success":
        notification.style.background = "linear-gradient(135deg, #4caf50, #66bb6a)";
        break;
      case "error":
        notification.style.background = "linear-gradient(135deg, #f44336, #e57373)";
        break;
      default:
        notification.style.background = "linear-gradient(135deg, #2196f3, #64b5f6)";
    }
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3e3);
  }
  // Phương thức để cập nhật giá từ bên ngoài
  updateFromSettings(newSettings) {
    this.updatePricing(newSettings);
  }
  // Hiển thị progress notification
  showProgressNotification(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10005;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            background: linear-gradient(135deg, #2196f3, #64b5f6);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
    notification.innerHTML = `
            <div style="
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>${message}</span>
        `;
    document.body.appendChild(notification);
    return notification;
  }
  // Cập nhật progress notification
  updateProgressNotification(notification, message) {
    if (notification) {
      const span = notification.querySelector("span");
      if (span) {
        span.textContent = message;
      }
    }
  }
  // Xóa progress notification
  removeProgressNotification(notification) {
    if (notification && notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }
}
let pricingCalculator;
function initializePricingCalculator() {
  if (!pricingCalculator) {
    pricingCalculator = new PricingCalculator();
    window.pricingCalculator = pricingCalculator;
  }
}
window.initializePricingCalculator = initializePricingCalculator;
document.addEventListener("DOMContentLoaded", function() {
  const settingsHint = document.getElementById("settingsHint");
  if (settingsHint) {
    setTimeout(() => {
      settingsHint.style.display = "none";
    }, 3e3);
  }
  if (!window.giftPageMode && window.initWebSocket) {
    window.initWebSocket();
    const currentOrderCode = localStorage.getItem("current_order_code");
    const isPaymentInProgress = localStorage.getItem("payment_in_progress") === "true";
    if (currentOrderCode && isPaymentInProgress && window.socketManager) {
      setTimeout(() => {
        if (window.socketManager.isSocketConnected()) {
          window.socketManager.joinOrder(currentOrderCode);
          window.socketManager.on("payment_status_update", (data) => {
            if (data.status === "PAID" && data.orderCode === currentOrderCode) {
              window.cleanupPaymentState(currentOrderCode);
              if (window.pricingCalculator) {
                window.pricingCalculator.showSuccessResult(data.websiteId || "unknown", data.amount || 0);
              }
            }
          });
        } else {
          setTimeout(() => {
            if (window.socketManager.isSocketConnected()) {
              window.socketManager.joinOrder(currentOrderCode);
            }
          }, 2e3);
        }
      }, 1e3);
    }
  }
});
