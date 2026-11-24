(function() {
  "use strict";
  function init(o) {
    var T = window.THREE;
    if (!T || !o || !o.canvas) return;
    var root = o.root, canvas = o.canvas, cfg = o.config || {}, open = o.openLetter || function() {
    }, music = o.playMusic || function() {
    };
    var mobile = Math.min(innerWidth, innerHeight) < 700, portrait = innerWidth / innerHeight < 0.8, dpr = Math.min(devicePixelRatio || 1, mobile ? 1.55 : 1.9);
    root.querySelectorAll(".giftory-stage-ui").forEach(function(e) {
      e.remove();
    });
    var R = new T.WebGLRenderer({ canvas, alpha: false, antialias: !mobile, powerPreference: "high-performance" });
    R.setPixelRatio(dpr);
    R.setSize(innerWidth, innerHeight);
    R.setClearColor(0, 1);
    if (T.sRGBEncoding) R.outputEncoding = T.sRGBEncoding;
    if (T.SRGBColorSpace) R.outputColorSpace = T.SRGBColorSpace;
    R.toneMapping = T.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.05;
    var S = new T.Scene();
    S.background = new T.Color(459777);
    S.fog = new T.FogExp2(1707267, 26e-4);
    var C = new T.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 3e3);
    function camera() {
      portrait = innerWidth / innerHeight < 0.8;
      C.aspect = innerWidth / innerHeight;
      C.position.set(0, 14, portrait ? 120 : 80);
      C.up.set(0, 1, 0);
      C.lookAt(0, 0, 0);
      C.updateProjectionMatrix();
    }
    camera();
    S.add(new T.AmbientLight(16756794, 0.92));
    var kl = new T.PointLight(16753951, 3.2, 280, 1.2);
    kl.position.set(0, 12, 18);
    S.add(kl);
    var rl = new T.PointLight(16767608, 2.4, 220, 1.2);
    rl.position.set(-10, 14, -5);
    S.add(rl);
    function radial() {
      var c = document.createElement("canvas");
      c.width = c.height = 128;
      var x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 63);
      g.addColorStop(0, "rgba(255,250,190,1)");
      g.addColorStop(0.18, "rgba(255,166,32,.7)");
      g.addColorStop(1, "rgba(255,90,0,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      return new T.CanvasTexture(c);
    }
    var glow = radial();
    function field(n, ground2) {
      var p = new Float32Array(n * 3), co = new Float32Array(n * 3);
      for (var i2 = 0; i2 < n; i2++) {
        var x = (Math.random() - 0.5) * (ground2 ? 600 : 400), z = ground2 ? -400 + Math.random() * 500 : -200 + Math.random() * 300, y2 = ground2 ? -8 + Math.sin(x * 0.04) * 0.5 + Math.random() * 0.5 : -4 + Math.random() * 80, h = Math.random();
        p[i2 * 3] = x;
        p[i2 * 3 + 1] = y2;
        p[i2 * 3 + 2] = z;
        co[i2 * 3] = 1;
        co[i2 * 3 + 1] = 0.43 + h * 0.43;
        co[i2 * 3 + 2] = 0.03 + h * 0.18;
      }
      var g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(p, 3));
      g.setAttribute("color", new T.BufferAttribute(co, 3));
      var m = new T.PointsMaterial({ size: ground2 ? mobile ? 0.55 : 0.45 : 0.3, map: glow, vertexColors: true, transparent: true, opacity: ground2 ? 0.96 : 0.72, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
      var q = new T.Points(g, m);
      S.add(q);
      return q;
    }
    var ground = field(mobile ? 5200 : 10800, true), sky = field(mobile ? 1e3 : 2100, false);
    var dn = mobile ? 9e3 : 26e3, dp = new Float32Array(dn * 3), dSeed = new Float32Array(dn), dBand = new Float32Array(dn);
    for (var i = 0; i < dn; i++) {
      var r = 10 + 35 * Math.random(), a = Math.random() * Math.PI * 2;
      dp[i * 3] = Math.cos(a) * r;
      dp[i * 3 + 1] = -14 + (Math.random() - 0.5) * 5;
      dp[i * 3 + 2] = Math.sin(a) * r;
      dSeed[i] = 1e3 * Math.random();
      dBand[i] = (r - 10) / 35;
    }
    var dg = new T.BufferGeometry();
    dg.setAttribute("position", new T.BufferAttribute(dp, 3));
    dg.setAttribute("aSeed", new T.BufferAttribute(dSeed, 1));
    dg.setAttribute("aBand", new T.BufferAttribute(dBand, 1));
    var vortexVS = "uniform float time;uniform float uAssemble;attribute float aSeed;attribute float aBand;varying float vBand;varying float vAlpha;vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}void main(){vec3 p=position;float disp=1.0-uAssemble;float expand=1.0+disp*(2.8+sin(aSeed*0.1)*1.4);float swirl=disp*(4.2+aBand*3.8);p.xz=rot(p.xz,swirl)*expand;p.y+=disp*(sin(aSeed*2.0)*32.0);float r=length(p.xz);float speed=(14.5/max(16.0,r*r));float angle=-time*speed;vec2 xz=rot(p.xz,angle);float breathe=1.0+0.011*sin(time*0.8+aSeed);p.xz=xz*breathe;p.y*=(1.0+0.2*sin(time*1.4+aSeed*2.0+r*0.2));vec4 mvp=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvp;gl_PointSize=(38.0/-mvp.z)*(1.0-aBand*0.4)*(0.35+0.65*uAssemble);vBand=aBand;vAlpha=(0.28+0.35*sin(time*3.0+aSeed))*smoothstep(0.01,0.25,uAssemble+0.05);}";
    var vortexFS = "uniform vec3 uColorA;uniform vec3 uColorB;varying float vBand;varying float vAlpha;void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float glow=pow(max(0.0,1.0-d*2.0),2.2);vec3 col=mix(uColorA,uColorB,vBand);gl_FragColor=vec4(col*1.4,glow*vAlpha);}";
    var diskMat = new T.ShaderMaterial({ uniforms: { time: { value: 0 }, uAssemble: { value: 0 }, uColorA: { value: new T.Color(16764757) }, uColorB: { value: new T.Color(16736264) } }, vertexShader: vortexVS, fragmentShader: vortexFS, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    var disk = new T.Points(dg, diskMat);
    S.add(disk);
    var ribbonVS = "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
    var ribbonFS = "uniform float time;varying vec2 vUv;float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hs(i),hs(i+vec2(1.0,0.0)),f.x),mix(hs(i+vec2(0.0,1.0)),hs(i+vec2(1.0,1.0)),f.x),f.y);}float fb(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*ns(p);p=p*2.07+vec2(3.1,1.7);a*=0.5;}return v;}float spine(float x,float t){float g=smoothstep(0.0,0.35,x);return 0.5+g*(0.16*sin(x*5.2-t*0.42)+0.07*sin(x*10.5+t*0.63+1.3)+0.05*sin(x*2.3+t*0.27+2.1))-0.04*x;}void main(){float x=vUv.x,t=time;float c=spine(x,t);float spread=0.035+0.09*x+0.06*x*x;float sum=0.0;for(int i=0;i<7;i++){float fi=float(i);float o=(fi-3.0)/3.0;float wob=0.035*x*sin(x*(7.0+fi*1.3)-t*(0.5+fi*0.07)+fi*2.1);float cy=c+o*spread+wob;float w=0.011+0.02*x+0.004*abs(o);float d=(vUv.y-cy)/w;float flow=fb(vec2(x*16.0-t*(1.1+fi*0.12)+fi*5.3,fi*1.7));float bright=(0.25+1.1*smoothstep(0.25,0.8,flow))*(1.0-0.35*abs(o));sum+=exp(-d*d)*bright;}float hw=0.1+0.12*x;float hd=(vUv.y-c)/hw;float haze=exp(-hd*hd)*(0.3+0.4*fb(vec2(x*5.0-t*0.35,vUv.y*6.0+t*0.1)));float grain=0.85+0.3*ns(vec2(x*420.0,vUv.y*160.0));float lf=smoothstep(0.0,0.07,x)*smoothstep(1.0,0.86,x)*(1.15-0.35*x);float I=(sum*0.5*grain+haze)*lf;vec3 col=mix(vec3(0.62,0.38,0.1),vec3(1.0,0.82,0.46),clamp(sum*0.55,0.0,1.0));col=mix(col,vec3(1.0,0.95,0.78),clamp(sum*sum*0.08,0.0,0.6));gl_FragColor=vec4(col*I,clamp(I,0.0,1.0));}";
    var ribbonMat = new T.ShaderMaterial({ uniforms: { time: { value: 0 } }, vertexShader: ribbonVS, fragmentShader: ribbonFS, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false, fog: false });
    var au = new T.Mesh(new T.PlaneGeometry(1, 1, 1, 1), ribbonMat);
    au.renderOrder = -5;
    au.frustumCulled = false;
    S.add(C);
    C.add(au);
    function layoutRibbon() {
      var dist = 140, vh = 2 * dist * Math.tan(C.fov * Math.PI / 360), vw = vh * C.aspect;
      au.position.set(vw * (portrait ? 0.06 : 0.035), vh * (portrait ? 0.3 : 0.29), -dist);
      au.scale.set(vw * (portrait ? 1.25 : 1.08), vh * (portrait ? 0.4 : 0.5), 1);
    }
    layoutRibbon();
    var cg = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 16751896, transparent: true, opacity: 0.52, blending: T.AdditiveBlending, depthWrite: false }));
    cg.position.set(0, 0, 0);
    cg.scale.set(70, 70, 1);
    cg.renderOrder = -1;
    S.add(cg);
    var decor = document.createElement("div");
    decor.className = "giftory-stage-ui giftory-celestial-decor";
    decor.innerHTML = '<img class="gc-moon gc-left" src="assets/mid_autumn_moon_center.png"><img class="gc-moon gc-right" src="assets/mid_autumn_moon_center.png">';
    root.appendChild(decor);
    function heartShape() {
      var s = new T.Shape();
      s.moveTo(5, 5);
      s.bezierCurveTo(5, 4.5, 1, 0, 0, 0);
      s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
      s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
      s.bezierCurveTo(12, 15.4, 15, 11, 15, 7);
      s.bezierCurveTo(15, 7, 15, 0, 9, 0);
      s.bezierCurveTo(8, 0, 5, 4.5, 5, 5);
      return s;
    }
    function uv(g) {
      g.computeBoundingBox();
      var b = g.boundingBox, p = g.attributes.position, u = new Float32Array(p.count * 2), w = b.max.x - b.min.x, h = b.max.y - b.min.y;
      for (var i2 = 0; i2 < p.count; i2++) {
        u[i2 * 2] = (p.getX(i2) - b.min.x) / w;
        u[i2 * 2 + 1] = (p.getY(i2) - b.min.y) / h;
      }
      g.setAttribute("uv", new T.BufferAttribute(u, 2));
      return g;
    }
    function photo(url, done) {
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function() {
        var c = document.createElement("canvas");
        c.width = c.height = 1024;
        var x = c.getContext("2d"), sc = Math.max(1024 / im.naturalWidth, 1024 / im.naturalHeight), w = im.naturalWidth * sc, h = im.naturalHeight * sc;
        x.fillStyle = "#1a0902";
        x.fillRect(0, 0, 1024, 1024);
        x.drawImage(im, (1024 - w) / 2, (1024 - h) / 2, w, h);
        var g = x.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, "rgba(255,201,92,.06)");
        g.addColorStop(0.72, "rgba(255,120,0,0)");
        g.addColorStop(1, "rgba(20,3,0,.28)");
        x.fillStyle = g;
        x.fillRect(0, 0, 1024, 1024);
        var t = new T.CanvasTexture(c);
        if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
        done(t);
      };
      im.onerror = function() {
        var fb = "assets/couple/couple.webp";
        if (url.indexOf(fb) < 0) photo(fb, done);
        else done(null);
      };
      im.src = url;
    }
    var heart = new T.Group();
    heart.position.set(0, 0, 0);
    heart.scale.setScalar(1);
    S.add(heart);
    var hs = heartShape();
    var ex = new T.ExtrudeGeometry(hs, { depth: 4, bevelEnabled: true, bevelSegments: mobile ? 16 : 32, steps: 2, bevelSize: 1, bevelThickness: 4, curveSegments: 48 });
    ex.center();
    ex.rotateX(Math.PI);
    ex.scale(1.75, 1.75, 1.75);
    var glassMat = new T.ShaderMaterial({ uniforms: { uOpacity: { value: 0 }, time: { value: 0 } }, vertexShader: "varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}", fragmentShader: "uniform float uOpacity;uniform float time;varying vec3 vN;varying vec3 vV;void main(){float f=1.0-abs(dot(normalize(vN),normalize(vV)));float rim=pow(f,3.2);float edge=pow(f,9.0);vec3 col=mix(vec3(1.0,0.86,0.62),vec3(1.0,0.98,0.94),edge);float a=(0.035+rim*0.75+edge*0.9)*uOpacity;gl_FragColor=vec4(col*(0.9+0.25*sin(time*1.7)),a);}", transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
    var core = new T.Mesh(ex, glassMat);
    core.renderOrder = 4;
    heart.add(core);
    var ex2 = new T.ExtrudeGeometry(hs, { depth: 4, bevelEnabled: true, bevelSegments: mobile ? 16 : 32, steps: 2, bevelSize: 1, bevelThickness: 4, curveSegments: 48 });
    ex2.center();
    ex2.rotateX(Math.PI);
    ex2.scale(2.25, 2.25, 2.25);
    var shell1 = new T.Mesh(ex2, new T.MeshBasicMaterial({ visible: false }));
    function auraTexture() {
      var c = document.createElement("canvas");
      c.width = c.height = 512;
      var x = c.getContext("2d");
      x.translate(256, 262);
      x.scale(15.5, -15.5);
      x.translate(-4.5, -9.5);
      var pts2 = hs.getSpacedPoints(240);
      function path() {
        x.beginPath();
        pts2.forEach(function(p, i2) {
          i2 ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y);
        });
        x.closePath();
      }
      x.lineJoin = "round";
      [[3.2, "rgba(255,120,10,.22)", 2.2], [1.6, "rgba(255,170,40,.55)", 1.1], [0.55, "rgba(255,236,170,1)", 0.45]].forEach(function(l) {
        x.save();
        x.shadowColor = l[1];
        x.shadowBlur = l[2] * 15.5 * 2.2;
        x.strokeStyle = l[1];
        x.lineWidth = l[0];
        path();
        x.stroke();
        x.restore();
      });
      return new T.CanvasTexture(c);
    }
    var auraMat = new T.ShaderMaterial({ uniforms: { uMap: { value: auraTexture() }, time: { value: 0 }, uOpacity: { value: 0 } }, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}", fragmentShader: "uniform sampler2D uMap;uniform float time;uniform float uOpacity;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fb(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=0.5;}return v;}void main(){vec2 uv=vUv;vec2 q=uv*6.0+vec2(0.0,-time*0.9);float d1=fb(q),d2=fb(q+vec2(5.2,1.3)-time*0.25);uv+=(vec2(d1,d2)-0.5)*0.11;vec4 t=texture2D(uMap,uv);float flick=smoothstep(0.3,0.85,fb(uv*7.0+vec2(time*0.4,-time*1.6)))*1.7;float a=t.a*flick*uOpacity;vec3 col=mix(vec3(1.0,0.45,0.05),vec3(1.0,0.86,0.45),clamp(t.r*t.g*1.4,0.0,1.0));gl_FragColor=vec4(col*a*0.85,a);}", transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
    var auraSize = 33 * 1.75 * 1.6, auraA = new T.Mesh(new T.PlaneGeometry(auraSize, auraSize), auraMat);
    auraA.renderOrder = 5;
    heart.add(auraA);
    var auraB = new T.Mesh(new T.PlaneGeometry(auraSize, auraSize), auraMat);
    auraB.position.z = -3;
    auraB.scale.setScalar(1.06);
    auraB.renderOrder = 5;
    heart.add(auraB);
    var auraC = new T.Mesh(new T.PlaneGeometry(auraSize, auraSize), auraMat);
    auraC.position.z = 3;
    auraC.scale.setScalar(0.97);
    auraC.renderOrder = 5;
    heart.add(auraC);
    var fg = new T.ShapeGeometry(hs, 48);
    fg.center();
    fg.rotateX(Math.PI);
    fg.scale(1.75, 1.75, 1.75);
    uv(fg);
    var faceZ = (4 / 2 + 4) * 1.75 - 1.2;
    var pm = new T.MeshBasicMaterial({ color: 16766880, transparent: true, opacity: 0.95, side: T.BackSide, toneMapped: false }), pf = new T.Mesh(fg, pm);
    pf.position.z = faceZ;
    pf.renderOrder = 3;
    heart.add(pf);
    var bm = pm.clone(), pb = new T.Mesh(fg.clone(), bm);
    pb.position.z = -faceZ;
    pb.rotation.y = Math.PI;
    pb.renderOrder = 3;
    heart.add(pb);
    photo(cfg.flyingImages && cfg.flyingImages[0] || cfg.couplePhoto || "assets/couple/couple.webp", function(t) {
      if (!t) return;
      pm.map = t;
      bm.map = t;
      pm.color.setHex(16773596);
      bm.color.setHex(16773596);
      pm.needsUpdate = bm.needsUpdate = true;
    });
    var pts = hs.getSpacedPoints(180).map(function(p) {
      var v = new T.Vector3(p.x - 4.5, -(p.y - 9.5), 0);
      v.multiplyScalar(1.75);
      return v;
    });
    pts.push(pts[0].clone());
    function outline(sc, op, col) {
      var l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
      l.scale.setScalar(sc);
      heart.add(l);
      return l;
    }
    var oa = outline(1.1, 0.5, 16774886), ob = outline(1.13, 0.2, 16766874), oc = outline(1.2, 0, 16758059), od = outline(1.26, 0, 16735488);
    var ec = mobile ? 820 : 1650, epos = new Float32Array(ec * 3), emeta = [];
    for (var ei = 0; ei < ec; ei++) {
      var a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 12, y = -14 + Math.random() * 30;
      epos[ei * 3] = Math.cos(a) * r;
      epos[ei * 3 + 1] = y;
      epos[ei * 3 + 2] = Math.sin(a) * r;
      emeta.push({ a, r, y, v: 0.3 + Math.random() * 0.8 });
    }
    function heartTex() {
      var c = document.createElement("canvas");
      c.width = c.height = 64;
      var x = c.getContext("2d");
      x.translate(32, 36);
      x.scale(2.3, -2.3);
      x.translate(-4.5, -9.5);
      x.shadowColor = "rgba(255,190,70,.9)";
      x.shadowBlur = 10;
      x.fillStyle = "#ffd27a";
      x.beginPath();
      hs.getSpacedPoints(60).forEach(function(p, i2) {
        i2 ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y);
      });
      x.fill();
      return new T.CanvasTexture(c);
    }
    var hcN = mobile ? 70 : 130, hcPos = new Float32Array(hcN * 3), hcMeta = [];
    for (var hi = 0; hi < hcN; hi++) {
      hcMeta.push({ a: Math.random() * Math.PI * 2, r: 16 + Math.random() * 34, y: -10 + Math.random() * 34, v: (0.08 + Math.random() * 0.22) * (Math.random() < 0.5 ? -1 : 1), b: Math.random() * 6 });
    }
    var hcG = new T.BufferGeometry();
    hcG.setAttribute("position", new T.BufferAttribute(hcPos, 3));
    var hcMat = new T.PointsMaterial({ map: heartTex(), color: 16761178, size: mobile ? 1.7 : 1.35, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    var hChips = new T.Points(hcG, hcMat);
    S.add(hChips);
    function bokehTex() {
      var c = document.createElement("canvas");
      c.width = c.height = 128;
      var x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
      g.addColorStop(0, "rgba(255,214,140,.9)");
      g.addColorStop(0.55, "rgba(255,170,60,.55)");
      g.addColorStop(0.85, "rgba(255,140,30,.25)");
      g.addColorStop(1, "rgba(255,120,0,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      return new T.CanvasTexture(c);
    }
    var bkN = mobile ? 26 : 48, bkPos = new Float32Array(bkN * 3), bkMeta = [];
    for (var bi = 0; bi < bkN; bi++) {
      var ba = Math.random() * Math.PI * 2, br = 30 + Math.random() * 120;
      bkMeta.push({ x: Math.cos(ba) * br, y: -8 + Math.random() * 70, z: Math.sin(ba) * br, p: Math.random() * 6 });
    }
    var bkG = new T.BufferGeometry();
    bkG.setAttribute("position", new T.BufferAttribute(bkPos, 3));
    var bkMat = new T.PointsMaterial({ map: bokehTex(), color: 16757318, size: mobile ? 6 : 4.6, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    var bokeh = new T.Points(bkG, bkMat);
    S.add(bokeh);
    var hzC = document.createElement("canvas");
    hzC.width = hzC.height = 256;
    var hzX = hzC.getContext("2d"), hzG = hzX.createRadialGradient(128, 128, 0, 128, 128, 128);
    hzG.addColorStop(0, "rgba(120,70,22,.16)");
    hzG.addColorStop(0.45, "rgba(80,44,12,.08)");
    hzG.addColorStop(1, "rgba(40,20,4,0)");
    hzX.fillStyle = hzG;
    hzX.fillRect(0, 0, 256, 256);
    var haze = new T.Mesh(new T.PlaneGeometry(520, 520), new T.MeshBasicMaterial({ map: new T.CanvasTexture(hzC), transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }));
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = -16;
    haze.renderOrder = -2;
    S.add(haze);
    var eg = new T.BufferGeometry();
    eg.setAttribute("position", new T.BufferAttribute(epos, 3));
    var emb = new T.Points(eg, new T.PointsMaterial({ color: 16751387, size: mobile ? 0.8 : 0.6, map: glow, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    S.add(emb);
    function ringTexture(text, radius, height) {
      var fontFamily = '"Noto Sans","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif';
      var probe = document.createElement("canvas").getContext("2d");
      probe.font = "bold 100px " + fontFamily;
      var charRatio = probe.measureText(text).width / 100;
      var circumference = 2 * Math.PI * radius;
      var repeats = Math.round(circumference / (0.8 * height * charRatio * 1.02));
      if (repeats < 1) repeats = 1;
      var tileW = Math.min(Math.ceil(circumference / repeats / height * 256), Math.min(8192, R.capabilities.maxTextureSize || 4096));
      var c = document.createElement("canvas");
      c.width = tileW;
      c.height = 256;
      var x = c.getContext("2d");
      var fontSize = Math.min(Math.floor(0.98 * tileW / charRatio), 230);
      x.clearRect(0, 0, tileW, 256);
      x.font = "bold " + fontSize + "px " + fontFamily;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.shadowColor = "rgba(255,200,80,0.9)";
      x.shadowBlur = fontSize * 0.22;
      x.fillStyle = "#FFFFFF";
      x.fillText(text, tileW / 2, 128);
      x.shadowBlur = 0;
      x.fillText(text, tileW / 2, 128);
      var t = new T.CanvasTexture(c);
      t.wrapS = T.RepeatWrapping;
      t.wrapT = T.ClampToEdgeWrapping;
      t.repeat.set(repeats, 1);
      if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      t.needsUpdate = true;
      t.userData = { repeats };
      return t;
    }
    var VERT = "varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
    var FRAG = "uniform sampler2D uMap;uniform vec3 uColor;uniform float uBaseOpacity;uniform float uProgress;uniform float uOffset;uniform float uRepeats;uniform float time;varying vec2 vUv;void main(){if(uProgress<=0.001)discard;float frontier=uProgress-vUv.x;if(frontier<-0.002)discard;vec2 textUv=vec2(vUv.x*uRepeats+uOffset,vUv.y);vec4 tex=texture2D(uMap,textUv);if(tex.a<0.02)discard;float distToTip=abs(frontier);float tipFlare=exp(-pow(distToTip*55.0,2.0));float trailDist=max(0.0,frontier);float trailGlow=exp(-trailDist*16.0)*0.75;float unfurled=smoothstep(1.0,1.15,uProgress);tipFlare*=(1.0-unfurled);trailGlow*=(1.0-unfurled);float shimmer=1.0+0.18*sin(vUv.x*28.0-time*3.2);vec3 baseCol=tex.rgb*uColor*shimmer;vec3 tipColor=vec3(1.6,1.4,0.95);vec3 finalColor=mix(baseCol,tipColor,clamp(tipFlare*1.6+trailGlow,0.0,1.0));float revealAlpha=smoothstep(0.0,0.03,frontier);float alpha=tex.a*uBaseOpacity*revealAlpha;gl_FragColor=vec4(finalColor,alpha);}";
    function makeRingMat(tex, colorHex, baseOpacity) {
      var repeats = tex.userData && tex.userData.repeats || 1;
      return new T.ShaderMaterial({ uniforms: { uMap: { value: tex }, uColor: { value: new T.Color(colorHex) }, uBaseOpacity: { value: baseOpacity }, uProgress: { value: 0 }, uOffset: { value: 0 }, uRepeats: { value: repeats }, time: { value: 0 } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    }
    function padText(text, radius) {
      var probe = document.createElement("canvas").getContext("2d");
      probe.font = 'bold 50px "Noto Sans","Apple Color Emoji","Segoe UI Emoji",sans-serif';
      var circ = 2 * Math.PI * radius * 15, padded = text, tries = 0;
      while (probe.measureText(padded).width < 0.4 * circ && tries < 3) {
        padded += (tries % 2 ? "   🏮   " : "   ❤️   ") + text;
        tries++;
      }
      return padded;
    }
    function messageBands() {
      var src = (cfg.flyingTexts && cfg.flyingTexts.length ? cfg.flyingTexts : ["Trung thu vui ve", "Mai luon ben nhau", "Binh an va hanh phuc"]).filter(function(v) {
        return v && String(v).trim();
      }).map(String);
      if (!src.length) src = ["Trung thu vui ve"];
      var sorted = src.slice().sort(function(a2, b) {
        return b.length - a2.length;
      }), longest = sorted[0];
      var rest = src.filter(function(v) {
        return v !== longest;
      });
      var inner = rest[0] || cfg.recipient || "Nguoi thuong";
      var outer = rest.slice(1).join("   ❤️   🏮   ") || "Trung thu vui ve   ♥   Mai luon ben nhau";
      return { inner, middle: longest, outer };
    }
    function makeRing(text, r2, h, colorHex, baseOpacity, rx, rz, speed, offsetSpeed) {
      var g = new T.Group();
      g.rotation.x = rx;
      g.rotation.z = rz;
      var tex = ringTexture(padText(text, r2), r2, h);
      var mat = makeRingMat(tex, colorHex, baseOpacity);
      var mesh = new T.Mesh(new T.CylinderGeometry(r2, r2, h, 128, 1, true), mat);
      mesh.renderOrder = 8;
      g.add(mesh);
      S.add(g);
      return { g, mesh, mat, tex, v: speed, offsetSpeed: offsetSpeed || 0.045, baseOp: baseOpacity };
    }
    var bands = messageBands();
    var rings = [
      makeRing(bands.inner, 36, 2.8, 16774370, 0.86, 0, 0, -0.012, 0.045),
      makeRing(bands.middle, 52, 4.4, 16762718, 0.92, -0.075 * Math.PI, -0.04 * Math.PI, 0.018, 0.065),
      makeRing(bands.outer, 70, 3.4, 16760661, 0.7, 0.075 * Math.PI, 0.04 * Math.PI, -8e-3, 0.035)
    ];
    function cardTex(url, done) {
      var im = new Image();
      im.onload = function() {
        var c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        var x = c.getContext("2d");
        x.drawImage(im, 0, 0);
        var d = x.getImageData(0, 0, c.width, c.height);
        for (var i2 = 0; i2 < d.data.length; i2 += 4) {
          var l = (d.data[i2] + d.data[i2 + 1] + d.data[i2 + 2]) / 3;
          d.data[i2 + 3] = Math.max(0, Math.min(255, (l - 8) * 4.2));
        }
        x.putImageData(d, 0, 0);
        var t = new T.CanvasTexture(c);
        if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
        done(t);
      };
      im.src = url;
    }
    var env = new T.Group();
    env.visible = false;
    env.scale.setScalar(1e-3);
    env.position.set(0, 0, 0);
    S.add(env);
    var enm = new T.MeshBasicMaterial({ color: 16766874, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, alphaTest: 0.03 });
    env.add(new T.Mesh(new T.PlaneGeometry(46, 30.63), enm));
    cardTex("assets/mid_autumn_envelope_card.jpg", function(t) {
      enm.map = t;
      enm.color.setHex(15128264);
      enm.needsUpdate = true;
    });
    var eng = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 16753947, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }));
    eng.position.z = -1;
    eng.scale.set(65, 48, 1);
    env.add(eng);
    var envRingMat = new T.ShaderMaterial({ uniforms: { time: { value: 0 }, uOpacity: { value: 0 } }, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}", fragmentShader: "uniform float time;uniform float uOpacity;varying vec2 vUv;void main(){float band=smoothstep(0.0,0.35,vUv.y)*smoothstep(1.0,0.65,vUv.y);float sweep=0.55+0.45*sin(vUv.x*6.2831*2.0-time*1.6);vec3 col=mix(vec3(1.0,0.62,0.18),vec3(1.0,0.9,0.6),sweep);float a=band*(0.35+0.65*sweep)*uOpacity;gl_FragColor=vec4(col*a,a);}", transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
    var envRing = new T.Mesh(new T.CylinderGeometry(29, 29, 1.6, 128, 1, true), envRingMat);
    envRing.scale.set(1, 1, 0.92);
    envRing.rotation.x = 0.36;
    envRing.rotation.z = -0.12;
    env.add(envRing);
    var esN = mobile ? 260 : 520, esPos = new Float32Array(esN * 3);
    for (var es = 0; es < esN; es++) {
      var ea = Math.random() * Math.PI * 2, er = 24 + Math.random() * 16;
      esPos[es * 3] = Math.cos(ea) * er;
      esPos[es * 3 + 1] = (Math.random() - 0.5) * 10;
      esPos[es * 3 + 2] = Math.sin(ea) * er * 0.92;
    }
    var esG = new T.BufferGeometry();
    esG.setAttribute("position", new T.BufferAttribute(esPos, 3));
    var esMat = new T.PointsMaterial({ map: glow, color: 16765562, size: 0.9, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    var envSpark = new T.Points(esG, esMat);
    envSpark.rotation.x = 0.36;
    envSpark.rotation.z = -0.12;
    env.add(envSpark);
    var controls = null;
    if (T.OrbitControls) {
      controls = new T.OrbitControls(C, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.screenSpacePanning = false;
      controls.enableZoom = true;
      controls.zoomSpeed = 1;
      controls.minDistance = portrait ? 25 : 20;
      controls.maxDistance = portrait ? 260 : 220;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.target.set(0, 0, 0);
      controls.update();
    }
    var hold = document.createElement("button");
    hold.type = "button";
    hold.className = "giftory-stage-ui giftory-hold giftory-heart-hold show";
    hold.innerHTML = '<span class="gh-progress"></span><b>💌</b><span class="gh-label">Chạm vào Trái Tim để mở <strong>Thiệp Thư</strong></span>';
    root.appendChild(hold);
    var pr = document.createElement("div");
    pr.className = "giftory-stage-ui giftory-pointer-progress";
    pr.innerHTML = '<div class="gpp-inner"><b>0%</b><small>GIỮ</small></div><span class="gpp-label">Đang ngưng tụ Thiệp Thư... 💌</span>';
    root.appendChild(pr);
    var phase = "heart", start = performance.now(), holding = false, hs0 = 0, hraf = 0, ready = 300;
    function reset() {
      if (phase !== "heart") return;
      holding = false;
      hs0 = 0;
      cancelAnimationFrame(hraf);
      hold.classList.remove("holding");
      hold.style.setProperty("--hold", "0%");
      pr.classList.remove("show");
    }
    function finish() {
      if (phase !== "heart") return;
      phase = "transforming";
      start = performance.now();
      holding = false;
      hold.classList.remove("holding");
      hold.classList.add("complete");
      pr.classList.remove("show");
      if (controls) controls.enabled = false;
      if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try {
        navigator.vibrate([55, 35, 90]);
      } catch (_) {
      }
    }
    function ht(now) {
      if (!holding || phase !== "heart") return;
      var p = Math.min(1, (now - hs0) / 1250);
      hold.style.setProperty("--hold", p * 100 + "%");
      pr.style.setProperty("--angle", p * 360 + "deg");
      pr.querySelector("b").textContent = Math.round(p * 100) + "%";
      if (p >= 1) {
        finish();
        return;
      }
      hraf = requestAnimationFrame(ht);
    }
    function begin(e) {
      if (phase !== "heart" || performance.now() - start < ready) return;
      if (e) e.preventDefault();
      music();
      holding = true;
      hs0 = performance.now();
      hold.classList.add("holding");
      pr.style.left = e && typeof e.clientX === "number" ? e.clientX + "px" : "50%";
      pr.style.top = e && typeof e.clientY === "number" ? e.clientY + "px" : "50%";
      pr.classList.add("show");
      hraf = requestAnimationFrame(ht);
    }
    hold.addEventListener("pointerdown", begin);
    hold.addEventListener("pointerup", reset);
    hold.addEventListener("pointerleave", reset);
    hold.addEventListener("pointercancel", reset);
    hold.addEventListener("contextmenu", function(e) {
      e.preventDefault();
    });
    hold.addEventListener("keydown", function(e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        if (phase === "envelope") {
          open();
          return;
        }
        var r2 = hold.getBoundingClientRect();
        begin({ preventDefault: function() {
          e.preventDefault();
        }, clientX: r2.left + r2.width / 2, clientY: r2.top - 60 });
      }
    });
    hold.addEventListener("keyup", function(e) {
      if (e.key === " " || e.key === "Enter") reset();
    });
    hold.addEventListener("click", function() {
      open();
    });
    var ray = new T.Raycaster(), mouse = new T.Vector2();
    var tapX = 0, tapY = 0, tapT = 0;
    canvas.addEventListener("pointerdown", function(e) {
      tapX = e.clientX;
      tapY = e.clientY;
      tapT = performance.now();
      if (phase === "envelope") return;
      if (phase !== "heart" || performance.now() - start < ready) return;
      mouse.x = e.clientX / innerWidth * 2 - 1;
      mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      ray.setFromCamera(mouse, C);
      if (ray.intersectObjects(heart.children, true).length) {
        music();
      }
    });
    canvas.addEventListener("pointerup", function(e) {
      reset();
      if (Math.hypot(e.clientX - tapX, e.clientY - tapY) < 15 && performance.now() - tapT < 600) {
        mouse.x = e.clientX / innerWidth * 2 - 1;
        mouse.y = -(e.clientY / innerHeight) * 2 + 1;
        ray.setFromCamera(mouse, C);
        if (ray.intersectObjects(heart.children, true).length) {
          open();
          return;
        }
      }
      if (phase === "envelope" && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 10 && performance.now() - tapT < 600) open();
    });
    canvas.addEventListener("pointercancel", reset);
    canvas.addEventListener("pointerleave", reset);
    function ease(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function smooth(t) {
      return t * t * (3 - 2 * t);
    }
    var clock = new T.Clock(), elapsed = 0;
    function frame() {
      requestAnimationFrame(frame);
      var dt = Math.min(0.04, clock.getDelta());
      elapsed += dt;
      var now = performance.now(), age = now - start;
      ground.rotation.y += dt * 5e-3;
      sky.rotation.y -= dt * 9e-3;
      var uAssemble = Math.min(1, age / 2200);
      uAssemble = uAssemble * uAssemble * (3 - 2 * uAssemble);
      diskMat.uniforms.time.value = elapsed;
      diskMat.uniforms.uAssemble.value = uAssemble;
      ribbonMat.uniforms.time.value = elapsed;
      cg.material.opacity = 0.35 + Math.sin(elapsed * 1.3) * 0.08;
      var gs = 65 + Math.sin(elapsed * 1.15) * 5;
      cg.scale.set(gs, gs, 1);
      if (phase === "heart") {
        var pulse = 1 + Math.sin(elapsed * 1.8) * 0.024;
        var heartAppear = smooth(Math.min(1, Math.max(0, (age - 600) / 1600)));
        heart.scale.setScalar(heartAppear * pulse);
        heart.rotation.z = Math.sin(elapsed * 0.5) * 0.05;
        heart.position.y = Math.sin(elapsed * 0.8) * 0.8;
        var photoAlpha = smooth(Math.min(1, Math.max(0, (age - 1200) / 1400)));
        pm.opacity = 0.96 * photoAlpha;
        bm.opacity = 0.96 * photoAlpha;
        oa.material.opacity = (0.45 + Math.sin(elapsed * 2.2) * 0.1) * heartAppear;
        ob.material.opacity = (0.18 + Math.sin(elapsed * 1.5) * 0.06) * heartAppear;
        oc.material.opacity = 0;
        od.material.opacity = 0;
        glassMat.uniforms.uOpacity.value = heartAppear;
        glassMat.uniforms.time.value = elapsed;
        auraMat.uniforms.time.value = elapsed;
        auraMat.uniforms.uOpacity.value = smooth(Math.min(1, Math.max(0, (age - 1400) / 1600))) * (0.85 + Math.sin(elapsed * 2.1) * 0.15);
        heart.rotation.y += dt * 0.85;
        shell1.rotation.y += dt * 0.18;
        shell1.rotation.z = Math.sin(elapsed * 0.5) * 0.08;
        shell1.material.opacity = (0.12 + Math.sin(elapsed * 1.7) * 0.04) * heartAppear;
        emb.material.opacity = Math.min(0.95, uAssemble);
        rings.forEach(function(q, ix) {
          q.g.rotation.y += dt * q.v;
          var prog = Math.min(1.2, Math.max(0, (age - 2200 - ix * 350) / 2e3));
          q.mat.uniforms.uProgress.value = prog;
          q.mat.uniforms.uOffset.value += dt * q.offsetSpeed;
          q.mat.uniforms.time.value = elapsed;
        });
        if (age > ready) hold.classList.add("show");
      } else if (phase === "transforming") {
        var tp = Math.min(1, age / 1600), sh = Math.max(1e-3, 1 - smooth(Math.min(1, tp * 1.7)));
        heart.scale.setScalar(sh);
        heart.rotation.y += dt * (2 + tp * 8);
        emb.material.opacity = Math.max(0, 0.85 * (1 - tp));
        rings.forEach(function(q) {
          q.mat.uniforms.uBaseOpacity.value = q.baseOp * Math.max(0, 1 - smooth(Math.min(1, tp * 1.4)));
        });
        if (tp > 0.22) {
          env.visible = true;
          var ee = Math.min(1, (tp - 0.22) / 0.78);
          env.scale.setScalar((portrait ? 1.05 : 1.5) * (1 + 2.2 * (1 - ease(ee))));
          enm.opacity = smooth(ee);
          env.quaternion.copy(C.quaternion);
          env.rotateZ((1 - ee) * -0.12 + Math.sin(elapsed * 1.2) * 0.015);
        }
        if (tp >= 1) {
          phase = "envelope";
          start = now;
          hold.classList.remove("complete");
          hold.classList.add("show", "envelope-mode");
          hold.style.setProperty("--hold", "0%");
          hold.querySelector("b").textContent = "💌";
          hold.querySelector(".gh-label").innerHTML = "Chạm vào Thiệp Thư để <strong>Đọc Thư</strong>";
          if (controls) {
            controls.enabled = true;
            controls.autoRotate = false;
          }
        }
      } else {
        env.position.y = 3 + Math.sin(elapsed * 1.5) * 0.7;
        env.quaternion.copy(C.quaternion);
        env.rotateZ(Math.sin(elapsed * 1.2) * 0.025);
        eng.material.opacity = 0.17 + Math.sin(elapsed * 1.8) * 0.08;
      }
      var ar = eg.attributes.position.array;
      for (var i2 = 0; i2 < emeta.length; i2++) {
        var it = emeta[i2], an = it.a + elapsed * it.v;
        ar[i2 * 3] = Math.cos(an) * it.r;
        ar[i2 * 3 + 1] = it.y + Math.sin(elapsed * 1.1 + it.a * 2) * 0.18;
        ar[i2 * 3 + 2] = Math.sin(an) * it.r;
      }
      eg.attributes.position.needsUpdate = true;
      var hca = hcG.attributes.position.array;
      for (var k = 0; k < hcN; k++) {
        var hm = hcMeta[k], ang = hm.a + elapsed * hm.v;
        hca[k * 3] = Math.cos(ang) * hm.r;
        hca[k * 3 + 1] = hm.y + Math.sin(elapsed * 0.7 + hm.b) * 1.6;
        hca[k * 3 + 2] = Math.sin(ang) * hm.r;
      }
      hcG.attributes.position.needsUpdate = true;
      var bka = bkG.attributes.position.array;
      for (var k2 = 0; k2 < bkN; k2++) {
        var bm2 = bkMeta[k2];
        bka[k2 * 3] = bm2.x + Math.sin(elapsed * 0.13 + bm2.p) * 4;
        bka[k2 * 3 + 1] = bm2.y + Math.sin(elapsed * 0.21 + bm2.p * 2) * 2.5;
        bka[k2 * 3 + 2] = bm2.z;
      }
      bkG.attributes.position.needsUpdate = true;
      var sceneIn = Math.min(1, age / 2500);
      if (phase === "heart") {
        hcMat.opacity = 0.9 * smooth(Math.min(1, Math.max(0, (age - 900) / 1800)));
        bkMat.opacity = 0.5 * sceneIn;
      } else {
        hcMat.opacity = Math.max(0, hcMat.opacity - dt * 0.8);
        bkMat.opacity = 0.5;
      }
      envRingMat.uniforms.time.value = elapsed;
      envRingMat.uniforms.uOpacity.value = enm.opacity;
      esMat.opacity = enm.opacity * 0.85;
      envRing.rotation.y += dt * 0.35;
      envSpark.rotation.y += dt * 0.12;
      if (controls) controls.update();
      R.render(S, C);
    }
    frame();
    addEventListener("resize", function() {
      mobile = Math.min(innerWidth, innerHeight) < 700;
      dpr = Math.min(devicePixelRatio || 1, mobile ? 1.55 : 1.9);
      R.setPixelRatio(dpr);
      R.setSize(innerWidth, innerHeight);
      camera();
      layoutRibbon();
      if (controls) {
        controls.minDistance = portrait ? 25 : 20;
        controls.maxDistance = portrait ? 260 : 220;
        controls.update();
      }
    });
  }
  window.GiftoryCloneScene = { init };
})();
