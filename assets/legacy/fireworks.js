/**
 * Pháo hoa chúc mừng năm mới – DearGift
 * Canvas 2D, dựng lại theo video mẫu: đếm ngược 23:59:55 → 00:00:00, sau đó bắn pháo
 * (tròn, trái tim, ngôi sao, quạt mặt đất, hàng ngang finale) kèm lời chúc lần lượt.
 *
 * Mốc thời gian (giây) tính từ lúc bắt đầu đếm ngược, trùng với file nhạc gốc.
 */
(function () {
  'use strict';

  var CFG = window.NY_CONFIG || {};
  var TITLE = String(CFG.title || 'HAPPY NEW YEAR');
  var MESSAGES = (Array.isArray(CFG.messages) && CFG.messages.length ? CFG.messages : [
    'Chúc bạn một năm mới', 'Sức khỏe dồi dào', 'Thành công rực rỡ', 'Hạnh phúc tràn đầy',
    'An khang thịnh vượng', 'Vạn sự như ý', 'Mọi điều tốt đẹp sẽ đến', 'Gia đình hạnh phúc viên mãn',
    'Bạn bè luôn bên cạnh', 'Ước mơ thành hiện thực', 'Niềm vui nối tiếp niềm vui', 'Chúc mọi người năm mới vui vẻ!'
  ]).slice(0, 20);

  var COUNTDOWN_END = 5.0;     // 00:00:00
  var SHOW_START = 5.4;        // pháo đầu tiên được bắn lên
  var TITLE_AT = 7.0;          // tiêu đề HAPPY NEW YEAR
  var MSG_START = 8.8;         // lời chúc đầu tiên
  var MSG_STEP = 1.37;         // mỗi lời chúc hiển thị ~1.37s (đo từ video)
  var TRACK_END = 40.5;        // hết file nhạc
  var LOOP_FROM = 6.0;         // lặp lại phần pháo (không lặp đếm ngược)

  var canvas = document.getElementById('fw-canvas');
  var ctx = canvas.getContext('2d');
  var clockEl = document.getElementById('fw-clock');
  var textEl = document.getElementById('fw-text');
  var audio = document.getElementById('fw-audio');

  var W = 0, H = 0, DPR = 1, S = 1;
  var LOW = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;
  var MAX_PARTICLES = LOW ? 3400 : 7500;
  var BIG = 1.3; // phóng to mọi quả nổ cho hoành tráng

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Tỉ lệ theo video 1280×720; màn dọc dùng cạnh ngắn để pháo không tràn khung.
    S = Math.max(0.5, Math.min(W / 1280, H / 720, Math.min(W, H) / 560));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ───────────────────────── màu & tiện ích ───────────────────────── */
  var C = {
    red: [255, 46, 74], green: [60, 255, 110], blue: [70, 140, 255], purple: [200, 70, 255],
    pink: [255, 90, 200], gold: [255, 205, 70], white: [255, 250, 240], orange: [255, 150, 60],
    cyan: [90, 230, 255], magenta: [240, 60, 220]
  };
  C.silver = [225, 230, 255]; C.amber = [255, 170, 40]; C.lime = [170, 255, 70]; C.rose = [255, 70, 130];
  var PALETTE = [C.red, C.green, C.blue, C.purple, C.pink, C.gold, C.white, C.magenta, C.cyan, C.amber, C.lime, C.rose];
  var GOLDS = [C.gold, C.amber, [255, 220, 140]];
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mix(c, k) { return [Math.min(255, c[0] + (255 - c[0]) * k), Math.min(255, c[1] + (255 - c[1]) * k), Math.min(255, c[2] + (255 - c[2]) * k)]; }

  /* ───────────────────────── hạt & pháo thăng ───────────────────────── */
  var parts = [];   // hạt sáng
  var rockets = []; // pháo đang bay lên
  var flashes = []; // chớp sáng tâm nổ
  var sky = [0, 0, 0], skyTarget = [0, 0, 0];

  function spark(o) {
    if (parts.length >= MAX_PARTICLES) return null;
    var p = {
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      c: o.c || C.white, life: o.life || 1.6, age: 0,
      drag: o.drag == null ? 2.2 : o.drag, g: o.g == null ? 70 : o.g,
      w: o.w || 1.7, streak: o.streak == null ? 0.034 : o.streak,
      glitter: o.glitter || 0, twinkle: !!o.twinkle, shape: o.shape || 0,
      rot: Math.random() * 6.28, alpha: o.alpha == null ? 1 : o.alpha, delay: o.delay || 0,
      // Vệt đuôi thật: nhớ vài vị trí gần nhất → tia dài từ tâm như video.
      tail: o.tail || 0, hx: null, hy: null, ht: 0,
      c2: o.c2 || null, changeAt: o.changeAt || 0.5,      // cúc đổi màu giữa chừng
      split: o.split || 0, splitAt: o.splitAt || 0.45,     // chẻ tia (crossette)
      trailGlitter: o.trailGlitter || 0                     // đuôi kim tuyến (liễu, cọ)
    };
    if (p.tail) { p.hx = [o.x]; p.hy = [o.y]; }
    parts.push(p);
    return p;
  }

  function flash(x, y, c, r) {
    flashes.push({ x: x, y: y, c: c, r: r, age: 0, life: 0.32 });
    skyTarget[0] += c[0] * 0.09; skyTarget[1] += c[1] * 0.07; skyTarget[2] += c[2] * 0.09;
  }

  function launch(x, targetY, type, opts) {
    opts = opts || {};
    var h = Math.max(60, H - targetY);
    // Gia tốc theo chiều cao màn hình → thời gian bay (và lúc nổ) giống nhau trên mọi màn hình, khớp nhạc.
    var g = 520 * H / 720;
    rockets.push({
      x: x, y: H + 6, vx: rnd(-12, 12) * S, vy: -Math.sqrt(2 * g * h), g: g,
      c: opts.rocketColor || pick(PALETTE), type: type, opts: opts, trailT: 0
    });
  }

  /* ───────────────────────── các kiểu nổ ───────────────────────── */
  // Hình cầu (peony / chrysanthemum): phân bố trên mặt cầu chiếu 2D → mép dày như video.
  function peony(x, y, o) {
    o = o || {};
    var n = Math.round((o.n || rnd(190, 260)) * (LOW ? 0.6 : 1));
    var R = (o.r || rnd(95, 150)) * S * BIG;
    var cols = o.colors || [pick(PALETTE), Math.random() < 0.55 ? pick(PALETTE) : null].filter(Boolean);
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, k = Math.sqrt(1 - u * u);
      var sp = R * 1.55 * (o.flat ? 1 : k) * rnd(0.92, 1.04);
      var c = cols[i % cols.length];
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: Math.random() < 0.18 ? mix(c, 0.6) : c,
        life: rnd(1.4, 2.0) * (o.lifeK || 1), glitter: o.glitter || 0, twinkle: o.twinkle || Math.random() < 0.12,
        w: o.dots ? 2.4 : 2, streak: o.dots ? 0.012 : 0, tail: o.dots ? 0 : 6, drag: 1.55 });
    }
    dust(x, y, R, cols[0], o.dust == null ? 26 : o.dust);
    flash(x, y, cols[0], R * 0.45);
  }

  function ring(x, y, o) {
    o = o || {};
    var n = LOW ? 46 : 64, R = (o.r || rnd(80, 120)) * S * BIG, c = o.c || pick(PALETTE);
    var tilt = rnd(0.35, 1), rot = Math.random() * Math.PI;
    for (var i = 0; i < n; i++) {
      var th = i / n * Math.PI * 2, px = Math.cos(th), py = Math.sin(th) * tilt;
      var vx = px * Math.cos(rot) - py * Math.sin(rot), vy = px * Math.sin(rot) + py * Math.cos(rot);
      spark({ x: x, y: y, vx: vx * R * 2.2, vy: vy * R * 2.2, c: c, life: rnd(1.4, 1.8), w: 1.8 });
    }
    flash(x, y, c, R * 0.4);
  }

  // Trái tim: điểm theo đường cong trái tim, vận tốc tỉ lệ vị trí → nở thành đúng hình.
  function heartPoint(t) {
    var hx = 16 * Math.pow(Math.sin(t), 3);
    var hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [hx / 17, hy / 17];
  }
  function heart(x, y, o) {
    o = o || {};
    var R = (o.r || rnd(70, 95)) * S * BIG, c = o.c || (Math.random() < 0.6 ? C.red : C.pink);
    var n = Math.round((o.fill ? 170 : 120) * (LOW ? 0.75 : 1));
    for (var i = 0; i < n; i++) {
      var p = heartPoint(Math.random() * Math.PI * 2);
      var k = o.fill ? Math.sqrt(Math.random()) : rnd(0.96, 1.02);
      spark({ x: x, y: y, vx: p[0] * k * R * 4, vy: p[1] * k * R * 4, c: Math.random() < 0.2 ? mix(c, 0.55) : c,
        life: rnd(1.7, 2.2), g: 18, drag: 4, w: o.fill ? 1.5 : 1.7, streak: 0.022, twinkle: Math.random() < 0.25 });
    }
    flash(x, y, c, R * 0.35);
  }

  // Ngôi sao 5 cánh vàng: lõi dày hạt kim tuyến + viền sáng.
  function starPoly(outer, inner) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? inner : outer, a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function inPoly(pt, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  var STAR = starPoly(1, 0.46);
  function star(x, y, o) {
    o = o || {};
    var R = (o.r || rnd(80, 110)) * S * BIG, c = o.c || [255, 188, 52];
    var fillN = Math.round((o.big ? 1100 : 700) * (LOW ? 0.5 : 1)), edgeN = Math.round(220 * (LOW ? 0.6 : 1));
    for (var i = 0; i < fillN; i++) {
      var pt;
      do { pt = [rnd(-1, 1), rnd(-1, 1)]; } while (!inPoly(pt, STAR));
      spark({ x: x, y: y, vx: pt[0] * R * 3.6, vy: pt[1] * R * 3.6, c: Math.random() < 0.18 ? mix(c, 0.35) : c,
        life: rnd(2.0, 2.6), g: 10, drag: 3.6, w: 1.6, streak: 0.02, twinkle: true, alpha: 0.95 });
    }
    for (var e = 0; e < edgeN; e++) {
      var s = (e / edgeN) * 10, a = STAR[Math.floor(s) % 10], b = STAR[(Math.floor(s) + 1) % 10], f = s - Math.floor(s);
      spark({ x: x, y: y, vx: (a[0] + (b[0] - a[0]) * f) * R * 3.6, vy: (a[1] + (b[1] - a[1]) * f) * R * 3.6,
        c: mix(c, 0.15), life: rnd(2.0, 2.5), g: 10, drag: 3.6, w: 1.6, streak: 0.03, twinkle: true });
    }
    flash(x, y, c, R * 0.5);
  }

  // Pháo nổ ra hạt hình ngôi sao nhỏ (khung giây 14 của video).
  function stellar(x, y, o) {
    o = o || {};
    var n = LOW ? 45 : 70, R = (o.r || rnd(110, 150)) * S * BIG, c = o.c || C.gold;
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = R * 2.2 * Math.sqrt(1 - u * u);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(1.8, 2.3), shape: 1, w: 5.2, streak: 0, g: 40 });
    }
    flash(x, y, c, R * 0.4);
  }

  // Tim nhỏ đặc màu hồng tím.
  function miniHeart(x, y, o) {
    heart(x, y, { r: (o && o.r) || rnd(22, 30), c: (o && o.c) || pick([C.magenta, C.pink]), fill: true });
  }

  // Quạt mặt đất: tâm nằm dưới mép màn hình, tia nhiều màu xoè lên.
  function fan(x, o) {
    o = o || {};
    // Vòng cung lớn trải ngang màn hình, tâm nằm sâu dưới mép dưới (như giây 17/27/37 của video).
    var n = LOW ? 80 : 130, y = H * 1.45, R = Math.max(W * 0.62, H * 0.95);
    for (var i = 0; i < n; i++) {
      var th = rnd(-Math.PI * 0.93, -Math.PI * 0.07), sp = R * 2.6 * rnd(0.86, 1.02);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: pick(PALETTE), life: rnd(1.3, 1.7), streak: 0, tail: 2, w: 2, g: 60, drag: 2.6 });
    }
    skyTarget[0] += 10; skyTarget[1] += 10; skyTarget[2] += 8;
  }

  // Nổ nhỏ trắng lách tách.
  function crackle(x, y) {
    for (var i = 0; i < (LOW ? 14 : 22); i++) {
      var th = Math.random() * Math.PI * 2, sp = rnd(40, 90) * S * 2.2;
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: C.white, life: rnd(0.5, 0.8), w: 1.6, streak: 0.05 });
    }
    flash(x, y, C.white, 16 * S);
  }

  // Bụi mờ lơ lửng sau khi nổ (lớp chấm li ti trong video).
  function dust(x, y, R, c, n) {
    n = Math.round(n * (LOW ? 0.5 : 1));
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, sp = R * rnd(0.3, 1.1);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(2.2, 3.2), drag: 1.6, g: 16, w: 1.1, streak: 0, alpha: 0.45, twinkle: true });
    }
  }

  /* ───── Các kiểu pháo hoa như các màn bắn pháo hoa ở Việt Nam ───── */

  // Liễu vàng rủ ("cánh dù"): tia vàng dài, rơi chậm, đuôi kim tuyến lấp lánh.
  function willow(x, y, o) {
    o = o || {};
    var n = Math.round((o.n || 150) * (LOW ? 0.55 : 1)), R = (o.r || rnd(130, 175)) * S * BIG, c = o.c || pick(GOLDS);
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = R * 1.45 * Math.sqrt(1 - u * u) * rnd(0.9, 1.05);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(3.0, 4.2), drag: 1.25, g: 55,
        w: 1.7, streak: 0, tail: 9, trailGlitter: 0.35, alpha: 0.95 });
    }
    flash(x, y, c, R * 0.55);
  }

  // Cúc đổi màu: nở một màu rồi chuyển sang màu khác giữa chừng.
  function chrysanthemum(x, y, o) {
    o = o || {};
    var n = Math.round((o.n || 230) * (LOW ? 0.6 : 1)), R = (o.r || rnd(120, 165)) * S * BIG;
    var c1 = o.c || pick(PALETTE), c2 = o.c2 || pick(PALETTE.filter(function (k) { return k !== c1; }));
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = R * 1.5 * Math.sqrt(1 - u * u) * rnd(0.93, 1.03);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c1, c2: c2, changeAt: rnd(0.38, 0.5),
        life: rnd(1.9, 2.5), drag: 1.5, w: 2, streak: 0, tail: 6, twinkle: Math.random() < 0.15 });
    }
    dust(x, y, R, c2, 24);
    flash(x, y, c1, R * 0.5);
  }

  // Nhiều tầng có nhụy: vỏ ngoài một màu, nhụy trong màu khác.
  function multiLayer(x, y, o) {
    o = o || {};
    var R = o.r || rnd(125, 165);
    var outer = o.c || pick(PALETTE), inner = o.c2 || pick([C.white, C.gold, C.cyan, C.lime]);
    peony(x, y, { r: R, colors: [outer], n: 210, dust: 18 });
    peony(x, y, { r: R * 0.45, colors: [inner], n: 90, dust: 0, lifeK: 0.9 });
    if (Math.random() < 0.5) ring(x, y, { r: R * 0.75, c: mix(outer, 0.4) });
  }

  // Chẻ tia (crossette): mỗi tia bay ra rồi tách thành 4 tia nhỏ.
  function crossette(x, y, o) {
    o = o || {};
    var n = LOW ? 14 : 22, R = (o.r || rnd(95, 130)) * S * BIG, c = o.c || pick([C.gold, C.silver, C.amber, C.cyan]);
    for (var i = 0; i < n; i++) {
      var th = i / n * Math.PI * 2 + rnd(-0.1, 0.1), sp = R * 1.6;
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(1.6, 2.0), drag: 1.6,
        w: 2.4, tail: 5, split: 4, splitAt: rnd(0.32, 0.42) });
    }
    flash(x, y, c, R * 0.4);
  }

  // Cọ dừa: ít tia dày, đuôi dài vàng kim, cong xuống như tàu lá.
  function palm(x, y, o) {
    o = o || {};
    var n = LOW ? 9 : 13, R = (o.r || rnd(120, 160)) * S * BIG, c = o.c || pick(GOLDS);
    for (var i = 0; i < n; i++) {
      var th = i / n * Math.PI * 2 + rnd(-0.12, 0.12), sp = R * 1.7 * rnd(0.9, 1.05);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(2.4, 3.0), drag: 1.1, g: 70,
        w: 3.6, tail: 12, trailGlitter: 0.6 });
    }
    peony(x, y, { r: 40, colors: [C.white], n: 60, dust: 0, lifeK: 0.6 });
  }

  // Kim tuyến vàng (brocade): dày đặc, lấp lánh rơi chậm như mưa vàng.
  function brocade(x, y, o) {
    o = o || {};
    var n = Math.round((o.n || 260) * (LOW ? 0.55 : 1)), R = (o.r || rnd(130, 170)) * S * BIG, c = o.c || pick(GOLDS);
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = R * 1.4 * Math.sqrt(1 - u * u);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: Math.random() < 0.3 ? C.white : c, life: rnd(2.6, 3.4),
        drag: 1.35, g: 40, w: 1.6, streak: 0.018, glitter: 1, twinkle: true });
    }
    flash(x, y, c, R * 0.6);
  }

  // Nhấp nháy trắng bạc (strobe).
  function strobe(x, y, o) {
    o = o || {};
    var n = Math.round(180 * (LOW ? 0.55 : 1)), R = (o.r || rnd(110, 150)) * S * BIG, c = o.c || C.silver;
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = R * 1.45 * Math.sqrt(1 - u * u);
      spark({ x: x, y: y, vx: Math.cos(th) * sp, vy: Math.sin(th) * sp, c: c, life: rnd(2.2, 3.0), drag: 1.7, g: 30,
        w: 2.4, streak: 0, twinkle: true, alpha: 1 });
    }
    flash(x, y, c, R * 0.45);
  }

  var BURST = { peony: peony, ring: ring, heart: heart, star: star, stellar: stellar, mini: miniHeart, crackle: crackle,
    willow: willow, chrys: chrysanthemum, layer: multiLayer, crossette: crossette, palm: palm, brocade: brocade, strobe: strobe };
  function burst(type, x, y, opts) { (BURST[type] || peony)(x, y, opts); }

  /* ───────────────────────── kịch bản theo video ───────────────────────── */
  // [giây, hành động]. x/y theo tỉ lệ màn hình (0..1). Pháo thăng tự bay tới y rồi nổ.
  // Mốc thời gian trong kịch bản là lúc NỔ (khớp video) → tự bắn sớm hơn đúng bằng thời gian bay.
  function flightTime(y) { return Math.sqrt(2 * (1 - y) * 720 / 520); }
  function L(x, y, type, opts) { var fn = function () { launch(x * W, y * H, type, opts); }; fn.lead = flightTime(y); return fn; }
  function B(x, y, type, opts) { return function () { burst(type, x * W, y * H, opts); }; }
  function F(x, o) { return function () { fan(x * W, o); }; }
  function ROW(y, n, opts) {
    var fn = function () {
      for (var i = 0; i < n; i++) {
        (function (i) {
          setTimeout(function () {
            launch((0.04 + 0.92 * (i + 0.5) / n + rnd(-0.02, 0.02)) * W, (y + rnd(-0.07, 0.07)) * H, 'peony', { r: rnd(70, 105), dust: 10 });
          }, i * 45);
        })(i);
      }
    };
    fn.lead = flightTime(y);
    return fn;
  }

  var SCRIPT = [
    [5.4, L(0.15, 0.62, 'crackle')], [5.7, L(0.48, 0.52, 'peony', { r: 70 })], [6.0, L(0.52, 0.55, 'crackle')],
    [6.3, L(0.87, 0.6, 'peony', { r: 60 })], [6.8, L(0.35, 0.45, 'peony', { r: 70 })], [7.2, L(0.62, 0.4, 'crackle')],
    [7.6, L(0.44, 0.34, 'peony')], [8.1, L(0.72, 0.5, 'peony', { r: 80 })], [8.5, L(0.2, 0.55, 'ring')],
    [9.2, L(0.45, 0.18, 'peony', { colors: [C.green, C.white] })], [9.3, L(0.52, 0.2, 'peony', { colors: [C.white] })],
    [9.4, L(0.2, 0.5, 'mini', { c: C.purple })], [9.6, L(0.8, 0.5, 'peony', { r: 70, colors: [C.blue] })],
    [10.3, L(0.24, 0.45, 'stellar', { r: 40 })], [10.5, L(0.66, 0.25, 'peony', { r: 150, colors: [C.green, C.purple] })],
    [10.9, L(0.87, 0.5, 'peony', { colors: [C.blue, C.purple] })],
    [11.4, L(0.44, 0.2, 'peony', { colors: [C.red, C.white] })], [11.5, L(0.56, 0.22, 'peony', { colors: [C.green] })],
    [11.8, L(0.2, 0.55, 'peony', { r: 70, colors: [C.blue, C.white] })], [11.9, L(0.3, 0.52, 'star', { r: 70 })],
    [12.2, L(0.81, 0.53, 'peony', { r: 70, colors: [C.purple, C.white] })], [12.4, L(0.32, 0.49, 'mini')], [12.6, L(0.39, 0.51, 'mini')],
    [12.9, L(0.55, 0.28, 'peony', { r: 160, colors: [C.pink, C.purple] })], [13.1, L(0.25, 0.53, 'peony', { r: 110, colors: [C.purple, C.blue] })],
    [13.3, L(0.6, 0.5, 'heart', { r: 28, c: C.red })], [13.5, L(0.25, 0.5, 'star', { r: 55 })], [13.6, L(0.68, 0.55, 'peony', { r: 90, colors: [C.pink, C.red] })],
    [13.9, L(0.72, 0.28, 'stellar')], [14.0, L(0.62, 0.35, 'heart', { r: 75, c: C.red })], [14.1, L(0.54, 0.37, 'peony', { r: 55, colors: [C.pink, C.gold] })],
    [14.2, L(0.37, 0.52, 'peony', { r: 75, colors: [C.white, C.purple] })],
    [15.0, L(0.2, 0.35, 'peony', { r: 70, colors: [C.red, C.pink] })], [15.1, L(0.1, 0.72, 'mini', { c: C.magenta })], [15.4, L(0.78, 0.5, 'peony', { r: 50, colors: [C.magenta] })],
    [15.9, L(0.35, 0.25, 'peony', { colors: [C.green] })], [16.0, L(0.49, 0.22, 'peony', { colors: [C.purple, C.blue] })], [16.1, L(0.62, 0.25, 'peony', { colors: [C.gold, C.green] })],
    [16.9, F(0.52)], [17.2, L(0.3, 0.3, 'peony', { r: 60 })], [17.4, L(0.75, 0.3, 'peony', { r: 70, colors: [C.blue] })],
    [17.8, ROW(0.16, 9)], [18.1, L(0.25, 0.5, 'heart', { r: 45 })], [18.3, L(0.5, 0.2, 'ring', { r: 90, c: C.purple })],
    [18.8, L(0.33, 0.25, 'peony', { r: 70, colors: [C.purple] })], [19.0, L(0.6, 0.35, 'heart', { r: 70, c: C.red })], [19.2, L(0.42, 0.44, 'peony', { r: 55, colors: [C.green, C.gold] })],
    [19.9, L(0.45, 0.2, 'peony', { r: 150, colors: [C.purple, C.pink] })], [20.2, L(0.66, 0.3, 'crackle')],
    [20.6, ROW(0.22, 13)], [21.1, L(0.35, 0.3, 'peony', { r: 50, colors: [C.gold] })], [21.3, L(0.63, 0.35, 'peony', { r: 55, colors: [C.green] })],
    [21.9, L(0.5, 0.14, 'peony', { r: 150, colors: [C.green, C.cyan] })], [22.1, L(0.25, 0.4, 'peony', { r: 110, colors: [C.green] })], [22.3, L(0.75, 0.42, 'peony', { r: 90, colors: [C.pink] })],
    [22.8, ROW(0.45, 9)], [23.2, L(0.42, 0.44, 'star', { r: 35 })], [23.3, L(0.58, 0.44, 'star', { r: 35 })],
    [23.9, L(0.2, 0.3, 'peony', { r: 130 })], [24.0, L(0.4, 0.5, 'star', { r: 75 })], [24.2, L(0.58, 0.52, 'star', { r: 70 })], [24.3, L(0.62, 0.62, 'star', { r: 55 })],
    [24.9, L(0.48, 0.22, 'peony', { r: 110, colors: [C.green] })], [25.2, L(0.2, 0.55, 'peony', { r: 55, colors: [C.gold, C.white] })], [25.4, L(0.8, 0.48, 'peony', { r: 70, colors: [C.purple, C.white] })],
    [26.0, L(0.47, 0.2, 'peony', { r: 150, colors: [C.green, C.gold], lifeK: 1.3, glitter: 1 })], [26.4, L(0.48, 0.2, 'peony', { r: 40, colors: [C.gold] })],
    [26.8, F(0.5)], [27.0, L(0.46, 0.25, 'peony', { r: 190, colors: [C.gold], lifeK: 1.4, dust: 60, dots: true, n: 150 })], [27.3, L(0.63, 0.5, 'crackle')],
    [27.9, L(0.28, 0.3, 'peony', { r: 70, colors: [C.green, C.gold] })], [28.0, L(0.36, 0.34, 'heart', { r: 35 })], [28.1, L(0.46, 0.25, 'peony', { r: 55, colors: [C.red] })],
    [28.7, L(0.4, 0.3, 'heart', { r: 60, c: C.red })], [28.9, L(0.75, 0.45, 'peony', { r: 90, colors: [C.blue, C.white] })], [29.0, L(0.3, 0.45, 'peony', { r: 100, colors: [C.purple] })],
    [29.6, L(0.22, 0.28, 'peony', { r: 55, colors: [C.white] })], [29.7, L(0.33, 0.28, 'peony', { r: 55, colors: [C.gold] })], [29.8, L(0.22, 0.42, 'heart', { r: 40 })],
    [29.9, L(0.62, 0.45, 'peony', { r: 80, colors: [C.gold, C.green] })],
    [30.6, ROW(0.2, 12)], [31.0, L(0.49, 0.36, 'heart', { r: 20, c: C.pink })],
    [31.7, L(0.55, 0.2, 'peony', { r: 130, colors: [C.gold, C.white] })], [31.8, L(0.55, 0.3, 'heart', { r: 45 })], [32.0, L(0.2, 0.5, 'peony', { r: 70, colors: [C.purple] })], [32.2, L(0.8, 0.52, 'peony', { r: 70, colors: [C.red] })],
    [32.7, L(0.5, 0.2, 'peony', { r: 70, colors: [C.white] })], [32.9, L(0.64, 0.33, 'mini', { c: C.pink })], [33.1, ROW(0.5, 8)],
    [33.7, L(0.5, 0.28, 'peony', { r: 150, colors: [C.blue, C.white] })], [33.9, L(0.62, 0.35, 'heart', { r: 45 })], [34.0, L(0.3, 0.46, 'peony', { r: 90, colors: [C.pink, C.purple] })], [34.1, L(0.68, 0.48, 'peony', { r: 85, colors: [C.green, C.gold] })],
    [34.8, L(0.5, 0.22, 'peony', { r: 60, colors: [C.green] })], [34.9, L(0.5, 0.35, 'mini', { c: C.red })], [35.1, L(0.25, 0.45, 'peony', { r: 55 })], [35.2, L(0.75, 0.45, 'peony', { r: 55 })],
    [35.8, L(0.5, 0.2, 'peony', { r: 140, colors: [C.green, C.pink] })], [36.0, ROW(0.46, 11)],
    [36.8, L(0.5, 0.22, 'peony', { r: 70, colors: [C.purple] })], [36.9, L(0.5, 0.22, 'star', { r: 35 })], [37.0, F(0.5)], [37.2, L(0.75, 0.3, 'peony', { r: 100, colors: [C.gold] })],
    [37.8, L(0.5, 0.18, 'peony', { r: 150, colors: [C.purple] })], [38.0, L(0.5, 0.22, 'star', { r: 115, big: true })], [38.2, L(0.66, 0.4, 'peony', { r: 130, colors: [C.green, C.red] })],
    [38.3, L(0.25, 0.5, 'peony', { r: 150, colors: [C.gold], lifeK: 1.4, dust: 50, dots: true })],
    [39.6, L(0.42, 0.52, 'peony', { r: 40, colors: [C.purple] })], [39.8, L(0.62, 0.52, 'peony', { r: 40, colors: [C.blue] })]
  ].map(function (e) { return [Math.max(SHOW_START - 0.4, e[0] - (e[1].lead || 0)), e[1]]; })
   .sort(function (a, b) { return a[0] - b[0]; });

  /* ───────────────────────── chữ: đồng hồ & lời chúc ───────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var textQueue = [{ t: TITLE_AT, end: MSG_START - 0.05, s: TITLE, title: true }];
  MESSAGES.forEach(function (m, i) {
    var t0 = MSG_START + i * MSG_STEP;
    textQueue.push({ t: t0, end: t0 + MSG_STEP - 0.05, s: m });
  });
  var shownText = null;
  function renderText(t, firstPass) {
    // Đồng hồ đếm ngược
    if (t < COUNTDOWN_END + 0.9) {
      var left = Math.max(0, Math.ceil(COUNTDOWN_END - t - 1e-6));
      var label = left > 0 ? '23:59:' + pad(60 - left) : '00:00:00';
      if (clockEl.textContent !== label) clockEl.textContent = label;
      clockEl.style.opacity = t < COUNTDOWN_END + 0.3 ? 1 : Math.max(0, 1 - (t - COUNTDOWN_END - 0.3) / 0.6);
    } else if (clockEl.style.opacity !== '0') {
      clockEl.style.opacity = 0;
    }
    // Lời chúc (chỉ lần phát đầu tiên, giống video)
    var cur = null;
    if (firstPass) for (var i = 0; i < textQueue.length; i++) { var q = textQueue[i]; if (t >= q.t && t < q.end) { cur = q; break; } }
    if (cur !== shownText) {
      shownText = cur;
      if (cur) { textEl.textContent = cur.s; textEl.classList.toggle('is-title', !!cur.title); }
    }
    if (cur) {
      var fi = Math.min(1, (t - cur.t) / 0.35), fo = Math.min(1, (cur.end - t) / 0.3);
      textEl.style.opacity = Math.max(0, Math.min(fi, fo));
    } else {
      textEl.style.opacity = 0;
    }
  }

  /* ───────────────────────── vòng lặp ───────────────────────── */
  var started = false, t = 0, cursor = 0, firstPass = true, last = 0, useAudioClock = false;
  var autoT = 0;

  function update(dt) {
    // pháo thăng
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      r.trailT += dt;
      while (r.trailT > 0.016) {
        r.trailT -= 0.016;
        spark({ x: r.x + rnd(-1, 1), y: r.y, vx: rnd(-8, 8), vy: rnd(10, 40), c: mix(r.c, 0.3), life: rnd(0.35, 0.7), drag: 3, g: 30, w: 1.1, streak: 0.02, alpha: 0.6 });
      }
      if (r.vy >= -55 * H / 720) {
        rockets.splice(i, 1);
        burst(r.type, r.x, r.y, r.opts);
      }
    }
    // hạt
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(j, 1); continue; }
      var d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.g * S * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.tail) {
        p.ht += dt;
        if (p.ht >= 0.028) { p.ht = 0; p.hx.push(p.x); p.hy.push(p.y); if (p.hx.length > p.tail) { p.hx.shift(); p.hy.shift(); } }
      }
      if (p.c2 && p.age >= p.life * p.changeAt) { p.c = p.c2; p.c2 = null; }
      if (p.split && p.age >= p.life * p.splitAt) {
        for (var q = 0; q < p.split; q++) {
          var a2 = q / p.split * Math.PI * 2 + Math.PI / 4, sp2 = 95 * S;
          spark({ x: p.x, y: p.y, vx: Math.cos(a2) * sp2 + p.vx * 0.3, vy: Math.sin(a2) * sp2 + p.vy * 0.3, c: mix(p.c, 0.25),
            life: rnd(0.8, 1.1), drag: 2.2, w: 1.6, tail: 4 });
        }
        parts.splice(j, 1); continue;
      }
      if (p.trailGlitter && Math.random() < p.trailGlitter) {
        spark({ x: p.x, y: p.y, vx: rnd(-6, 6), vy: rnd(0, 18), c: mix(p.c, 0.35), life: rnd(0.5, 1.1), w: 1, streak: 0, alpha: 0.6, drag: 2.5, g: 25, twinkle: true });
      }
      if (p.glitter && Math.random() < 0.08) {
        spark({ x: p.x, y: p.y, vx: rnd(-10, 10), vy: rnd(-5, 20), c: C.gold, life: rnd(0.4, 0.9), w: 1, streak: 0, alpha: 0.7, drag: 2 });
      }
    }
    for (var k = flashes.length - 1; k >= 0; k--) { flashes[k].age += dt; if (flashes[k].age > flashes[k].life) flashes.splice(k, 1); }
    // bầu trời ửng màu rồi tắt dần
    var kd = Math.exp(-2.2 * dt);
    for (var c = 0; c < 3; c++) {
      skyTarget[c] = Math.min(60, skyTarget[c] * kd);
      sky[c] += (skyTarget[c] - sky[c]) * Math.min(1, dt * 6);
    }
  }

  function drawStarGlyph(x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.45 : r, a = rot + i * Math.PI / 5;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function draw(dt) {
    // nền: phủ màu trời với độ mờ → hạt để lại vệt ngắn như video
    var fade = 1 - Math.pow(0.62, dt * 60);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(' + (sky[0] * 0.55 | 0) + ',' + (sky[1] * 0.45 | 0) + ',' + (sky[2] * 0.5 | 0) + ',' + fade.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], lifeK = 1 - p.age / p.life;
      var a = p.alpha * Math.min(1, lifeK * 1.6);
      if (p.twinkle) a *= 0.45 + 0.55 * Math.random();
      if (a <= 0.02) continue;
      var col = 'rgba(' + (p.c[0] | 0) + ',' + (p.c[1] | 0) + ',' + (p.c[2] | 0) + ',' + a.toFixed(3) + ')';
      if (p.shape === 1) {
        ctx.fillStyle = col; drawStarGlyph(p.x, p.y, p.w * S * (0.6 + 0.4 * lifeK), p.rot += 0.02);
        continue;
      }
      if (p.tail) {
        ctx.strokeStyle = col; ctx.lineWidth = p.w * S;
        ctx.beginPath(); ctx.moveTo(p.hx[0], p.hy[0]); ctx.lineTo(p.x, p.y); ctx.stroke();
        continue;
      }
      var len = p.streak;
      if (len > 0) {
        ctx.strokeStyle = col; ctx.lineWidth = p.w * S;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * len, p.y - p.vy * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else {
        ctx.fillStyle = col; ctx.fillRect(p.x - p.w * S / 2, p.y - p.w * S / 2, p.w * S, p.w * S);
      }
    }
    // đầu pháo thăng
    for (var r = 0; r < rockets.length; r++) {
      var rk = rockets[r];
      ctx.strokeStyle = 'rgba(' + rk.c.join(',') + ',0.95)'; ctx.lineWidth = 2 * S;
      ctx.beginPath(); ctx.moveTo(rk.x, rk.y); ctx.lineTo(rk.x - rk.vx * 0.03, rk.y - rk.vy * 0.03); ctx.stroke();
    }
    // chớp sáng tâm nổ
    for (var f = 0; f < flashes.length; f++) {
      var fl = flashes[f], k = 1 - fl.age / fl.life;
      var g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.r);
      g.addColorStop(0, 'rgba(255,255,245,' + (0.85 * k).toFixed(3) + ')');
      g.addColorStop(0.25, 'rgba(' + fl.c.join(',') + ',' + (0.35 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(fl.x - fl.r, fl.y - fl.r, fl.r * 2, fl.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Sau khi hết kịch bản: bắn ngẫu nhiên liên tục (và mỗi vòng nhạc lặp lại kịch bản pháo).
  // Luôn bắn liên tục: lớp pháo nền chạy song song kịch bản, sau kịch bản bắn dày hơn,
  // và cứ ~25s lại có một loạt bắn dồn dập (finale) như màn bắn pháo hoa đêm giao thừa.
  var AUTO_TYPES = ['peony', 'chrys', 'chrys', 'layer', 'willow', 'willow', 'brocade', 'crossette', 'palm',
    'strobe', 'ring', 'heart', 'star', 'stellar', 'crackle', 'peony'];
  var salvoT = 22, salvoLeft = 0, salvoGap = 0;
  function autoShow(dt, dense) {
    autoT -= dt;
    if (autoT <= 0) {
      autoT = dense ? rnd(0.28, 0.6) : rnd(0.9, 1.6);
      launch(rnd(0.1, 0.9) * W, rnd(0.12, 0.5) * H, pick(AUTO_TYPES), {});
      if (dense && Math.random() < 0.3) launch(rnd(0.1, 0.9) * W, rnd(0.15, 0.45) * H, pick(AUTO_TYPES), {});
    }
    salvoT -= dt;
    if (salvoT <= 0 && salvoLeft === 0) { salvoLeft = (LOW ? 10 : 16) + ((Math.random() * 4) | 0); salvoGap = 0; }
    if (salvoLeft > 0) {
      salvoGap -= dt;
      if (salvoGap <= 0) {
        salvoGap = rnd(0.08, 0.18);
        launch((0.08 + 0.84 * Math.random()) * W, rnd(0.1, 0.4) * H, pick(['willow', 'brocade', 'chrys', 'layer', 'peony', 'strobe', 'palm']), {});
        salvoLeft--;
        if (salvoLeft === 0) { salvoT = rnd(22, 28); fan(W * 0.5); }
      }
    }
  }

  function currentTime(dt) {
    if (useAudioClock && audio && !audio.paused && isFinite(audio.currentTime)) {
      var at = audio.currentTime + (firstPass ? 0 : 0);
      // audio.currentTime cập nhật thưa → nội suy bằng dt nhưng không để lệch quá 0.2s
      var next = t + dt;
      return Math.abs(next - at) > 0.2 ? at : next;
    }
    return t + dt;
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    requestAnimationFrame(frame);
  }

  function step(dt) {
    if (started) {
      var nt = currentTime(dt);
      if (nt < t - 1) { // nhạc vừa lặp về LOOP_FROM
        cursor = 0; firstPass = false;
        while (cursor < SCRIPT.length && SCRIPT[cursor][0] < nt) cursor++;
      }
      t = nt;
      if (!useAudioClock && t > TRACK_END) { t = LOOP_FROM; firstPass = false; cursor = 0; while (cursor < SCRIPT.length && SCRIPT[cursor][0] < t) cursor++; }
      while (cursor < SCRIPT.length && SCRIPT[cursor][0] <= t) { SCRIPT[cursor][1](); cursor++; }
      if (t > SHOW_START + 2) autoShow(dt, !firstPass || cursor >= SCRIPT.length);
      renderText(t, firstPass);
    }
    update(dt);
    draw(dt);
  }
  requestAnimationFrame(function (n) { last = n; frame(n); });

  /* ───────────────────────── nhạc & điều khiển ───────────────────────── */
  if (audio) {
    audio.addEventListener('ended', function () {
      audio.currentTime = LOOP_FROM;
      audio.play().catch(function () {});
    });
  }

  window.NYFireworks = {
    start: function () {
      if (started) return;
      started = true; t = 0; cursor = 0;
      if (audio) {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.then) p.then(function () { useAudioClock = true; }).catch(function () { useAudioClock = false; });
        else useAudioClock = true;
      }
    },
    // Nhảy tới trước mốc 3s (kiểm thử): gọi advance(3) để dựng đúng cảnh tại mốc.
    seek: function (sec) {
      started = true; t = Math.max(0, sec - 3);
      cursor = 0; while (cursor < SCRIPT.length && SCRIPT[cursor][0] < t) cursor++;
      if (audio && isFinite(sec)) { try { audio.currentTime = t; } catch (e) {} }
    },
    // Mô phỏng nhanh `sec` giây (kiểm thử khi trình duyệt không vẽ đủ khung hình).
    advance: function (sec) { var n = Math.round(sec * 60); var au = useAudioClock; useAudioClock = false; for (var i = 0; i < n; i++) step(1 / 60); useAudioClock = au; },
    // Chạm vào bầu trời để bắn thêm pháo
    fireAt: function (x, y) {
      if (!started) return;
      launch(x, Math.min(y, H * 0.75), pick(['peony', 'heart', 'star', 'willow', 'chrys', 'layer', 'crossette', 'brocade', 'palm']), {});
    }
  };

  canvas.addEventListener('pointerdown', function (e) { window.NYFireworks.fireAt(e.clientX, e.clientY); });
})();
