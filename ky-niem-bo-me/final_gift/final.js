var _a, _b;
import * as THREE from "three";
import {
  OrbitControls
} from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js";
import {
  EffectComposer
} from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/postprocessing/EffectComposer.js";
import {
  RenderPass
} from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/postprocessing/RenderPass.js";
import {
  AfterimagePass
} from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/postprocessing/AfterimagePass.js";
import {
  makeMat
} from "./materials.min.js";
const appData = ((_a = window.dataMemoryHeartLoveLoom) == null ? void 0 : _a.data) || {};
let allWordsFlat = [];
const originalTexts = appData.messages || [];
originalTexts.forEach((sentence) => {
  const words = sentence.split(" ");
  allWordsFlat.push(...words);
});
let currentWordIndex = 0;
let nextWordSpawnTime = 0;
const WORD_SPAWN_INTERVAL = 0.4;
const IMAGE_CONFIG = {
  paths: appData.images || [],
  count: ((_b = appData.images) == null ? void 0 : _b.length) || 0,
  scale: 2.5,
  glowIntensity: 0.4,
  spawnRate: 0.18,
  maxActiveImages: 45,
  spawnInterval: 400
};
const heartInitialColor = new THREE.Color("#FFC47A");
let imageTextures = [], imageLoadingComplete = false, imagePool = [], activeImages = /* @__PURE__ */ new Map(), freeImageIndices = [], currentImageIndex = 0, lastImageSpawnTime = 0, imageSpawnQueue = [], minActiveImages = 8, maxConcurrentImages = 24, lastStatusLogTime = 0, independentImageSprites = [], nextIndependentSpawnTime = 0;
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
async function fetchAndPrepareImageTextures() {
  try {
    const t = IMAGE_CONFIG.paths.map((t2) => new Promise((e, a) => {
      textureLoader.load(t2, (t3) => {
        t3.flipY = false;
        t3.minFilter = THREE.LinearFilter;
        t3.magFilter = THREE.LinearFilter;
        t3.format = THREE.RGBAFormat;
        t3.needsUpdate = true;
        e(t3);
      }, void 0, (t3) => {
        const a2 = document.createElement("canvas");
        a2.width = a2.height = 512;
        const o = a2.getContext("2d"), s = o.createRadialGradient(256, 256, 0, 256, 256, 256);
        s.addColorStop(0, "#ffd9a0"), s.addColorStop(1, "#e8a24a"), o.fillStyle = s, o.fillRect(0, 0, 512, 512);
        const r = new THREE.CanvasTexture(a2);
        r.needsUpdate = true, e(r);
      });
    }));
    return imageTextures = await Promise.all(t), true;
  } catch (t) {
    return false;
  }
}
function buildImageSpriteMaterial(t, e = 1) {
  return new THREE.SpriteMaterial({
    map: t,
    transparent: true,
    opacity: e,
    depthWrite: false,
    alphaTest: 0.1,
    sizeAttenuation: true
  });
}
function getAspectRatioAdjustedScale(t, e = 2.5) {
  if (!t || !t.image) return e;
  const a = t.image.width / t.image.height;
  return {
    x: a > 1 ? e : e * a,
    y: a > 1 ? e / a : e
  };
}
async function setupImageStreaming() {
  imageLoadingComplete = await fetchAndPrepareImageTextures(), imageLoadingComplete && tweakSpawnParametersByImageCount();
}
function tweakSpawnParametersByImageCount() {
  const t = IMAGE_CONFIG.count;
  t <= 2 ? (IMAGE_CONFIG.spawnInterval = 300, minActiveImages = 6, maxConcurrentImages = Math.min(15, 7.5 * t)) : t <= 5 ? (IMAGE_CONFIG.spawnInterval = 400, minActiveImages = 8, maxConcurrentImages = Math.min(18, 3.5 * t)) : (IMAGE_CONFIG.spawnInterval = 500, minActiveImages = 8, maxConcurrentImages = Math.min(30, Math.ceil(2.5 * t)));
}
function printImageSystemReport() {
  activeImages.size, independentImageSprites.length, freeImageIndices.length, imageSpawnQueue.length;
}
function setupImageObjectPool() {
  if (imageLoadingComplete && streamHeart) {
    imagePool.forEach((t) => {
      t && t.parent && t.parent.remove(t);
    }), imagePool.length = 0, activeImages.clear(), freeImageIndices.length = 0;
    for (let t = 0; t < IMAGE_CONFIG.maxActiveImages; t++) {
      const e = t % IMAGE_CONFIG.count, a = imageTextures[e], o = buildImageSpriteMaterial(a, 1), s = new THREE.Sprite(o), r = getAspectRatioAdjustedScale(a, IMAGE_CONFIG.scale);
      s.scale.set(r.x, r.y, 1), s.visible = false, s.userData = {
        poolIndex: t,
        textureIndex: e,
        isActive: false,
        particleIndex: -1,
        aspectScale: r
      }, streamHeart.add(s), imagePool.push(s), freeImageIndices.push(t);
    }
  }
}
function retrieveImageFromPool(t) {
  if (0 === freeImageIndices.length) return null;
  const e = freeImageIndices.pop(), a = imagePool[e], o = currentImageIndex % IMAGE_CONFIG.count, s = imageTextures[o];
  a.material.map = s, a.material.needsUpdate = true;
  const r = getAspectRatioAdjustedScale(s, IMAGE_CONFIG.scale);
  return a.scale.set(r.x, r.y, 1), a.userData.aspectScale = r, a.userData.textureIndex = o, a.userData.isActive = true, a.userData.particleIndex = t, activeImages.set(t, e), currentImageIndex = (currentImageIndex + 1) % IMAGE_CONFIG.count, a;
}
function releaseImageToPool(t) {
  const e = activeImages.get(t);
  if (void 0 !== e) {
    const a = imagePool[e];
    a.visible = false, a.material.opacity = 0, a.userData.isActive = false, a.userData.particleIndex = -1, activeImages.delete(t), freeImageIndices.push(e);
  }
}
function controlImageSpawningLogic(t) {
  return;
}
function createFloatingImageSprite(t) {
  return;
}
function animateFloatingImageSprites(t) {
  return;
}
function selectBestParticleForImageSpawn() {
  const t = [];
  for (let e = 0; e < streamCount; e++)
    if (!activeImages.has(e)) {
      const a = streamState[e];
      t.push({
        index: e,
        state: a,
        priority: a === STATE_ASCEND ? 3 : a === STATE_ON_DISK ? 2 : 1
      });
    }
  return 0 === t.length ? -1 : (t.sort((t2, e) => e.priority - t2.priority), t[0].index);
}
function handleQueuedImageSpawns() {
  imageSpawnQueue.length = 0;
  return;
}
function applyMobileSpecificSettings() {
  if (!document.querySelector('meta[name="viewport"]')) {
    const t = document.createElement("meta");
    t.name = "viewport", t.content = "width=device-width, initial-scale=1.0, user-scalable=no", document.head.appendChild(t);
  }
  document.body.style.overflow = "hidden", document.body.style.position = "fixed", document.body.style.width = "100%", document.body.style.height = "100%", /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
setupImageStreaming();
let STAR_COUNT = 0, starAlpha = null, starPhase = null, starGeo = null, cosmicDust = null;
const RingText = [...appData.messages];
let cameraAnimationStart = null;
const CAMERA_ANIMATION_DURATION = 2.5;
let CAMERA_START_POSITION = {
  x: 0,
  y: 90,
  z: 30
};
const CAMERA_END_POSITION = {
  x: 0,
  y: 25,
  z: 65
};
let userHasMovedCamera = false, streamHeartStarted = false, streamHeartActiveRatio = 0, firstResetCompleted = false;
const scene = new THREE.Scene(), heartScene = new THREE.Scene(), renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
}), HEART_ROTATE = false;
let heartbeatEnabled = false;
const fadeObjects = [];
const explosionEffects = [];
const effectPool = {
  // Một object để chứa tất cả các hồ hiệu ứng
  waves: [],
  sparkles: [],
  texts: []
};
const POOL_SIZE = 5;
const activeTexts = /* @__PURE__ */ new Map();
let isPulsing = false;
let pulseStartTime = 0;
const PULSE_DURATION = 0.6;
const PULSE_AMPLITUDE = 0.15;
let planeRotationAngle = 0;
let spinBoostUntil = 0;
let revealStart = null;
const REVEAL_DURATION = 1.5, HEARTBEAT_FREQ_HZ = 0.5, HEARTBEAT_AMPLITUDE = 0.05, STAGE = {
  RIBBON: 0,
  STREAM: 1,
  STAR: 2,
  SHOOT: 3,
  HEART: 4
}, STAGE_DURATION = 0.15;
renderer.setPixelRatio(window.devicePixelRatio), renderer.setSize(window.innerWidth, window.innerHeight), document.body.appendChild(renderer.domElement), applyMobileSpecificSettings();
let staticBottomHeart = null, staticTopHeart = null;
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 90, 25), camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true, controls.minDistance = 5, controls.maxDistance = 100, controls.enableZoom = true, controls.minPolarAngle = THREE.MathUtils.degToRad(60), controls.maxPolarAngle = THREE.MathUtils.degToRad(135), controls.enablePan = true;
const planeGeo1 = new THREE.PlaneGeometry(30, 30);
const planeMat = new THREE.MeshBasicMaterial({
  color: 16711935,
  side: THREE.DoubleSide,
  visible: false
  // Quan trọng: làm cho nó vô hình
});
const invisiblePlane = new THREE.Mesh(planeGeo1, planeMat);
invisiblePlane.rotation.z = Math.PI;
invisiblePlane.position.y = 10;
scene.add(invisiblePlane);
const composerMain = new EffectComposer(renderer), renderPassMain = new RenderPass(scene, camera);
renderPassMain.clear = false, composerMain.addPass(renderPassMain);
const composerHeart = new EffectComposer(renderer);
composerHeart.addPass(new RenderPass(heartScene, camera));
const afterimagePass = new AfterimagePass();
afterimagePass.uniforms.damp.value = 0.9, composerHeart.addPass(afterimagePass), scene.add(new THREE.AmbientLight(16777215, 0.6));
const p1 = new THREE.PointLight(16777215, 1.2);
p1.position.set(10, 10, 10), scene.add(p1);
const p2 = new THREE.PointLight(16744703, 0.8);
function generateGlowCircleTexture() {
  const t = document.createElement("canvas");
  t.width = 256, t.height = 256;
  const e = t.getContext("2d"), a = 128, o = e.createRadialGradient(a, a, 0.4 * 127, a, a, 127);
  o.addColorStop(0, "rgba(255,105,180,0.6)"), o.addColorStop(1, "rgba(255,20,147,0)"), e.fillStyle = o, e.beginPath(), e.arc(a, a, 127, 0, 2 * Math.PI), e.closePath(), e.fill();
  const s = e.createRadialGradient(a, a, 0, a, a, 76.2);
  s.addColorStop(0, "rgba(255,255,255,1)"), s.addColorStop(1, "rgba(255,255,255,0)"), e.fillStyle = s, e.beginPath(), e.arc(a, a, 76.2, 0, 2 * Math.PI), e.closePath(), e.fill();
  const r = new THREE.CanvasTexture(t);
  return r.minFilter = THREE.LinearFilter, r.magFilter = THREE.LinearFilter, r.needsUpdate = true, r;
}
p2.position.set(-10, -10, -10), scene.add(p2);
const circleTexture = generateGlowCircleTexture(), heartShape = new THREE.Shape(), x = 0, y = 0;
heartShape.moveTo(5, 5), heartShape.bezierCurveTo(5, 5, 4, 0, 0, 0), heartShape.bezierCurveTo(-6, 0, -6, 7, -6, 7), heartShape.bezierCurveTo(-6, 11, -3, 15.4, 5, 19), heartShape.bezierCurveTo(12, 15.4, 16, 11, 16, 7), heartShape.bezierCurveTo(16, 7, 16, 0, 10, 0), heartShape.bezierCurveTo(7, 0, 5, 5, 5, 5);
const polyPts = heartShape.getPoints(100);
function isPointInsidePolygon(t, e) {
  let a = false;
  for (let o = 0, s = e.length - 1; o < e.length; s = o++) {
    const r = e[o].x, i = e[o].y, n = e[s].x, l = e[s].y;
    i > t.y != l > t.y && t.x < (n - r) * (t.y - i) / (l - i) + r && (a = !a);
  }
  return a;
}
const polyShift = polyPts.map((t) => ({
  x: t.x - 5,
  y: t.y - 7
})), BORDER_THRESHOLD = 0.1 * (Math.max(...polyPts.map((t) => t.x)) - Math.min(...polyPts.map((t) => t.x)));
function calculateMinimumDistanceToBorder(t, e) {
  let a = 1 / 0;
  for (let o = 0; o < polyShift.length; o++) {
    const s = polyShift[o], r = polyShift[(o + 1) % polyShift.length], i = r.x - s.x, n = r.y - s.y, l = ((t - s.x) * i + (e - s.y) * n) / (i * i + n * n), m = Math.max(0, Math.min(1, l)), c = t - (s.x + m * i), p = e - (s.y + m * n), d = c * c + p * p;
    d < a && (a = d);
  }
  return Math.sqrt(a);
}
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const HEART_CENTER_TARGET = new THREE.Vector3(0, 10, 0);
function createHeartExplosion(event) {
  mouse.x = event.clientX / window.innerWidth * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const explosionDistance = 60;
  const intersectionPoint = new THREE.Vector3();
  raycaster.ray.at(explosionDistance, intersectionPoint);
  const explosionGroup = new THREE.Group();
  const explosionMat = makeMat({
    map: circleTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaSupport: true,
    vertexColors: true
  });
  const count = 30 + Math.random() * 20;
  const positions2 = [];
  const colors2 = [];
  const sizes = [];
  const velocities = [];
  const baseColor = new THREE.Color().setHSL(Math.random(), 0.9, 0.7);
  for (let i = 0; i < count; i++) {
    positions2.push(intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);
    const color = baseColor.clone().offsetHSL(Math.random() * 0.2 - 0.1, 0, 0);
    colors2.push(color.r, color.g, color.b);
    sizes.push(Math.random() * 0.8 + 0.2);
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(Math.random() * 2 - 1);
    const speed = Math.random() * 15 + 10;
    const velocity = new THREE.Vector3();
    velocity.setFromSphericalCoords(1, phi, theta);
    velocities.push(velocity.multiplyScalar(speed));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions2, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors2, 3));
  geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
  const points = new THREE.Points(geo, explosionMat);
  explosionGroup.add(points);
  explosionGroup.userData.velocities = velocities;
  explosionGroup.userData.life = 1;
  scene.add(explosionGroup);
  explosionEffects.push(explosionGroup);
}
function setupEffectPools() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const waveTexture = new THREE.CanvasTexture(canvas);
  for (let i = 0; i < POOL_SIZE; i++) {
    const waveMat = new THREE.MeshBasicMaterial({
      map: waveTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const wave = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), waveMat);
    wave.visible = false;
    wave.userData.active = false;
    scene.add(wave);
    effectPool.waves.push(wave);
    const SPARKLE_COUNT = 100;
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKLE_COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const sparkleMat = makeMat({ map: circleTexture, blending: THREE.AdditiveBlending, alphaSupport: true, depthWrite: false });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    sparkles.visible = false;
    sparkles.userData.active = false;
    scene.add(sparkles);
    effectPool.sparkles.push(sparkles);
  }
  const textsToCreate = (appData == null ? void 0 : appData.messages) || [];
}
function releaseTextToPool(particleIndex) {
  if (activeTexts.has(particleIndex)) {
    const sprite = activeTexts.get(particleIndex);
    sprite.visible = false;
    sprite.userData.active = false;
    activeTexts.delete(particleIndex);
  }
}
function createFlyingTextTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.font = 'bold 70px "Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Sans TC", "Noto Sans Arabic", "Noto Sans Devanagari", "Noto Sans Hebrew", "Noto Sans Thai", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "rgba(160, 30, 95, 0.9)";
  context.lineWidth = 8;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillStyle = "#ffffff";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
let WISH_SENTENCES = typeof window !== "undefined" && Array.isArray(window.WISH_SENTENCES) ? window.WISH_SENTENCES : [];
if (typeof window !== "undefined") {
  window.WISH_SENTENCES = WISH_SENTENCES;
}
const ORBIT_WISH_COUNT = 80;
const ORBIT_WISH_PINK = "#ffe2b0";
const ORBIT_WISH_PINK_STROKE = "rgba(190, 110, 40, 0.9)";
const ORBIT_WISH_APPEAR_SPAN = 8;
const ORBIT_WISH_FADE_DURATION = 1.5;
let orbitingWishGroup = null;
let orbitingWishAppearStart = null;
function createOrbitingWishTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");
  ctx.font = '72px "Pacifico", cursive';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = ORBIT_WISH_PINK_STROKE;
  ctx.lineWidth = 6;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = ORBIT_WISH_PINK;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
function createOrbitingWishSprites() {
  if (orbitingWishGroup) return;
  if (!WISH_SENTENCES || WISH_SENTENCES.length === 0) return;
  orbitingWishGroup = new THREE.Group();
  orbitingWishGroup.visible = true;
  for (let i = 0; i < ORBIT_WISH_COUNT; i++) {
    const text = WISH_SENTENCES[i % WISH_SENTENCES.length];
    const tex = createOrbitingWishTexture(text);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.material.opacity = 0;
    const aspect = tex.image ? tex.image.width / tex.image.height : 7;
    sprite.scale.set(aspect * 2.2, 2.2, 1);
    sprite.userData.orbitAngle = Math.random() * Math.PI * 2;
    sprite.userData.orbitSpeed = 0.04 + Math.random() * 0.08;
    sprite.userData.orbitRadius = 28 + Math.random() * 40;
    sprite.userData.baseY = (Math.random() - 0.5) * 35;
    sprite.userData.floatSpeed = 0.25 + Math.random() * 0.4;
    sprite.userData.floatAmplitude = 1.5 + Math.random() * 2.5;
    sprite.userData.floatPhase = Math.random() * Math.PI * 2;
    sprite.userData.appearDelay = Math.random() * ORBIT_WISH_APPEAR_SPAN;
    orbitingWishGroup.add(sprite);
  }
  scene.add(orbitingWishGroup);
}
const positions = [], sampleCount = 7e3, xs = polyPts.map((t) => t.x), ys = polyPts.map((t) => t.y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), threshold = minY + (maxY - minY) / 6;
for (; positions.length / 3 < 7e3; ) {
  const t = Math.random() * (maxX - minX) + minX, e = Math.random() * (maxY - minY) + minY;
  if (isPointInsidePolygon({
    x: t,
    y: e
  }, polyPts)) {
    let a = 1 / 0;
    for (let o2 = 0; o2 < polyPts.length; o2++) {
      const s = polyPts[o2], r = polyPts[(o2 + 1) % polyPts.length], i = r.x - s.x, n = r.y - s.y, l = ((t - s.x) * i + (e - s.y) * n) / (i * i + n * n), m = Math.max(0, Math.min(1, l)), c = t - (s.x + m * i), p = e - (s.y + m * n), d = c * c + p * p;
      d < a && (a = d);
    }
    const o = 1 / (1 + 2 * Math.sqrt(a));
    if (Math.random() < o) {
      const a2 = 3.6 * (Math.random() - 0.5);
      positions.push(t - 5, e - 7, a2);
    }
  }
}
let minZ = 1 / 0, maxZval = -1 / 0;
for (let t = 2; t < positions.length; t += 3) {
  const e = positions[t];
  e < minZ && (minZ = e), e > maxZval && (maxZval = e);
}
const heartDepth = maxZval - minZ, heartWidth = maxX - minX, planeXVar = 2 * heartWidth, rStreamStart = 0.8 * heartWidth, Rmax = rStreamStart, rVortex = 0.6 * heartWidth, planeZVar = 15 * heartDepth, planeYCenter = maxY, planeYVar = 1, riseDuration = 10, fallDuration = 0, holdDuration = 0, STREAM_RISE_MIN = 8, STREAM_RISE_MAX = 12, INDENT_Y = maxY - 0.25 * (maxY - minY), INDENT_HALF_WIDTH = 0.35 * heartWidth, COS_ANGLE_THRESH = 0.707106, CLIP_FRONT_Z = 0.3, staticGeo = new THREE.BufferGeometry(), originalPositions = positions.slice();
staticGeo.setAttribute("position", new THREE.Float32BufferAttribute(originalPositions, 3));
const colors = [];
for (let t = 0; t < positions.length; t += 3) colors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b);
staticGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
const staticSizes = new Float32Array(positions.length / 3), SIZE_SCALE = 2;
for (let t = 0; t < staticSizes.length; t++) staticSizes[t] = 2 * (0.3 * Math.random() + 0.2);
staticGeo.setAttribute("size", new THREE.Float32BufferAttribute(staticSizes, 1));
const topIndices = [];
for (let t = 0; t < positions.length; t += 3) positions[t + 1] > threshold + 0.1 * (Math.random() - 0.5) * (maxY - minY) && topIndices.push(t / 3);
const topSet = new Set(topIndices);
let bottomPositions = [];
const bottomColors = [], bottomSizes = [], bottomSizesBase = [], topPositionsArr = [], topColors = [], topSizes = [], topAlpha = [], idxToTopIdx = new Int32Array(positions.length / 3).fill(-1);
for (let t = 0, e = 0; t < positions.length; t += 3) {
  const a = t / 3, o = staticSizes[a], s = positions[t], r = positions[t + 1], i = positions[t + 2];
  if (topSet.has(a)) {
    topPositionsArr.push(s, r, i), topColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), topSizes.push(o);
    const t2 = Math.abs(s) < INDENT_HALF_WIDTH && r > INDENT_Y;
    topAlpha.push(t2 ? 0 : 1), idxToTopIdx[a] = e++;
  } else bottomPositions.push(s, r, i), bottomColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), bottomSizes.push(o);
}
staticGeo.setAttribute("position", new THREE.Float32BufferAttribute(topPositionsArr, 3)), staticGeo.setAttribute("color", new THREE.Float32BufferAttribute(topColors, 3)), staticGeo.setAttribute("size", new THREE.Float32BufferAttribute(topSizes, 1)), staticGeo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(topAlpha), 1)), staticGeo.attributes.position.needsUpdate = true, staticGeo.attributes.alpha.needsUpdate = true;
const topCount = topPositionsArr.length / 3, topRadiusArr = new Float32Array(topCount), topPhaseArr = new Float32Array(topCount), topDelayArr = new Float32Array(topCount);
for (let t = 0; t < topCount; t++) {
  const e = topPositionsArr[3 * t], a = topPositionsArr[3 * t + 2], o = Math.sqrt(e * e + a * a);
  topRadiusArr[t] = o, topPhaseArr[t] = Math.atan2(a, e), topDelayArr[t] = 10 * Math.random();
}
const GLOBAL_SPIRAL_FREQ = 0.5, BASE_OMEGA = -1 * Math.PI / 10, GATHER_RATIO = 0.01, HOLD_RATIO = 0.2, radiusPow = 2.5, rCore = 0.25, rOuter = rVortex, vIn = 0.9, SHRINK_TO_CORE = false, BURST_SPREAD = 0.1, FADE_DURATION = 1.5, SPAWN_DELAY_MAX = 3, ASCEND_DELAY_MAX = 10, apexY = maxY, LOW_REGION_FACTOR = 0.5;
let minBottomY = 1 / 0, maxBottomY = -1 / 0;
for (let t = 1; t < bottomPositions.length; t += 3) {
  const e = bottomPositions[t];
  e < minBottomY && (minBottomY = e), e > maxBottomY && (maxBottomY = e);
}
const Y_THRESHOLD = minBottomY + 0.5 * (maxBottomY - minBottomY), HIGH_BOTTOM_MULT = 2;
{
  const t = [], e = [], a = [];
  for (let o = 0; o < bottomPositions.length; o += 3) {
    const s = bottomPositions[o + 1];
    if (s >= Y_THRESHOLD)
      for (let r = 1; r < 2; r++) t.push(bottomPositions[o], s, bottomPositions[o + 2]), e.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), a.push(bottomSizes[o / 3]);
  }
  bottomPositions.push(...t), bottomColors.push(...e), bottomSizes.push(...a);
}
const BOTTOM_ROTATE_RATIO = 0.2, rotPos = [], rotColors = [], rotSizes = [], staticBotPos = [], staticBotColors = [], staticBotSizes = [];
for (let t = 0; t < bottomPositions.length; t += 3) Math.random() < 0.2 ? (rotPos.push(bottomPositions[t], bottomPositions[t + 1], bottomPositions[t + 2]), rotColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), rotSizes.push(bottomSizes[t / 3])) : (staticBotPos.push(bottomPositions[t], bottomPositions[t + 1], bottomPositions[t + 2]), staticBotColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), staticBotSizes.push(bottomSizes[t / 3]));
bottomPositions.length = 0, bottomPositions.push(...rotPos), bottomColors.length = 0, bottomColors.push(...rotColors), bottomSizes.length = 0, bottomSizes.push(...rotSizes);
const bottomCount = bottomPositions.length / 3, bottomRadiusArr = new Float32Array(bottomCount), bottomPhaseArr = new Float32Array(bottomCount), bottomDelayArr = new Float32Array(bottomCount), CLEFT_FACTOR = 2.5, bottomAlphaArr = new Float32Array(bottomCount).fill(1), bottomIsLow = new Uint8Array(bottomCount), pivotOffset = 0.25 * heartWidth, KEEP_LOW_MIN = 0, KEEP_LOW_MAX = 0.3;
for (let t = 0; t < bottomCount; t++) {
  const e = bottomPositions[3 * t], a = bottomPositions[3 * t + 1], o = bottomPositions[3 * t + 2], s = a < Y_THRESHOLD;
  if (bottomIsLow[t] = s ? 1 : 0, s) {
    const e2 = 0 + (a - minBottomY) / (Y_THRESHOLD - minBottomY) * 0.3;
    bottomAlphaArr[t] = Math.random() < e2 ? 1 : 0;
  } else bottomAlphaArr[t] = 1;
  const r = Math.sqrt(e * e + o * o), i = Math.atan2(o, e), n = Math.min(1, Math.abs(e) / (0.25 * heartWidth)), l = 1.5 * Math.pow(1 - n, 3) + 1;
  bottomRadiusArr[t] = r * l, bottomPhaseArr[t] = i, bottomDelayArr[t] = 10 * Math.random();
}
const bottomAlphaBase = Float32Array.from(bottomAlphaArr), bottomGeo = new THREE.BufferGeometry();
const topTargetPositions = new Float32Array(topPositionsArr);
const bottomTargetPositions = new Float32Array(bottomPositions);
const HEART_ASSEMBLY_DURATION = 1.1;
let heartAssemblyStart = null;
const SPAWN_RADIUS = 90;
const topDelayArray = new Float32Array(topPositionsArr.length / 3);
for (let i = 0; i < topDelayArray.length; i++) {
  topDelayArray[i] = Math.random() * 0.25;
}
const bottomDelayArray = new Float32Array(bottomPositions.length / 3);
for (let i = 0; i < bottomDelayArray.length; i++) {
  bottomDelayArray[i] = Math.random() * 0.25;
}
const topStartPositions = new Float32Array(topPositionsArr.length);
for (let i = 0; i < topPositionsArr.length; i += 3) {
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const radius = SPAWN_RADIUS * (0.5 + Math.random() * 0.5);
  topStartPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
  topStartPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  topStartPositions[i + 2] = radius * Math.cos(phi);
}
const bottomStartPositions = new Float32Array(bottomPositions.length);
for (let i = 0; i < bottomPositions.length; i += 3) {
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const radius = SPAWN_RADIUS * (0.5 + Math.random() * 0.5);
  bottomStartPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
  bottomStartPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  bottomStartPositions[i + 2] = radius * Math.cos(phi);
}
staticGeo.attributes.position.array.set(topStartPositions);
staticGeo.attributes.position.needsUpdate = true;
bottomGeo.setAttribute("position", new THREE.Float32BufferAttribute(bottomStartPositions, 3)), bottomGeo.setAttribute("color", new THREE.Float32BufferAttribute(bottomColors, 3).setUsage(THREE.DynamicDrawUsage)), bottomGeo.setAttribute("size", new THREE.Float32BufferAttribute(bottomSizes, 1)), bottomGeo.setAttribute("alpha", new THREE.BufferAttribute(bottomAlphaArr, 1));
const V_SLOPE = 0.3, matBottom = makeMat({
  map: circleTexture,
  alphaSupport: true,
  vClipSlope: 0.3,
  clipFrontZ: 0.3
});
matBottom.alphaTest = 0.5;
const bottomHeart = new THREE.Points(bottomGeo, matBottom);
bottomHeart.rotation.z = Math.PI, bottomHeart.renderOrder = 0, scene.add(bottomHeart);
const BOTTOM_OMEGA = BASE_OMEGA, topPointVisibility = new Array(topIndices.length).fill(true);
let hiddenTopCount = 0;
const matStatic = makeMat({
  map: circleTexture,
  alphaSupport: true
});
matStatic.alphaTest = 0.5;
const staticHeart = new THREE.Points(staticGeo, matStatic);
staticHeart.rotation.z = Math.PI, staticHeart.renderOrder = 0, scene.add(staticHeart);
const TOP_STATIC_RATIO = 0.5;
{
  const t = [], e = [], a = [];
  for (let o = 0; o < topPositionsArr.length; o += 3) {
    const s = calculateMinimumDistanceToBorder(topPositionsArr[o] + 5, topPositionsArr[o + 1] + 7) < BORDER_THRESHOLD || Math.random() < 0.3;
    Math.random() < 0.5 && s && (t.push(topPositionsArr[o], topPositionsArr[o + 1], topPositionsArr[o + 2]), e.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), a.push(topSizes[Math.floor(o / 3)]));
  }
  if (t.length) {
    const o = new THREE.BufferGeometry();
    o.setAttribute("position", new THREE.Float32BufferAttribute(t, 3)), o.setAttribute("color", new THREE.Float32BufferAttribute(e, 3).setUsage(THREE.DynamicDrawUsage)), o.setAttribute("size", new THREE.Float32BufferAttribute(a, 1));
    const s = makeMat({
      map: circleTexture,
      alphaSupport: true
    });
    s.alphaTest = 0.5, staticTopHeart = new THREE.Points(o, s), staticTopHeart.rotation.z = Math.PI, staticTopHeart.renderOrder = 0, scene.add(staticTopHeart);
    const staticTopTargetPositions = new Float32Array(staticTopHeart.geometry.attributes.position.array);
    const staticTopStartPositions = new Float32Array(staticTopTargetPositions.length);
    const staticTopDelayArray = new Float32Array(staticTopTargetPositions.length / 3);
    for (let i = 0; i < staticTopTargetPositions.length; i += 3) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = SPAWN_RADIUS * (0.5 + Math.random() * 0.5);
      staticTopStartPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      staticTopStartPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      staticTopStartPositions[i + 2] = radius * Math.cos(phi);
      staticTopDelayArray[i / 3] = Math.random() * 0.8;
    }
    staticTopHeart.geometry.attributes.position.array.set(staticTopStartPositions);
    staticTopHeart.geometry.attributes.position.needsUpdate = true;
    staticTopHeart.userData.targetPositions = staticTopTargetPositions;
    staticTopHeart.userData.startPositions = staticTopStartPositions;
    staticTopHeart.userData.delayArray = staticTopDelayArray;
  }
}
if (staticBotPos.length > 0) {
  const t = new THREE.BufferGeometry();
  t.setAttribute("position", new THREE.Float32BufferAttribute(staticBotPos, 3)), t.setAttribute("color", new THREE.Float32BufferAttribute(staticBotColors, 3).setUsage(THREE.DynamicDrawUsage)), t.setAttribute("size", new THREE.Float32BufferAttribute(staticBotSizes, 1));
  const e = makeMat({
    map: circleTexture,
    alphaSupport: true
  });
  e.alphaTest = 0.5, staticBottomHeart = new THREE.Points(t, e), staticBottomHeart.rotation.z = Math.PI, staticBottomHeart.renderOrder = 0, scene.add(staticBottomHeart);
  const staticBottomTargetPositions = new Float32Array(staticBottomHeart.geometry.attributes.position.array);
  const staticBottomStartPositions = new Float32Array(staticBottomTargetPositions.length);
  const staticBottomDelayArray = new Float32Array(staticBottomTargetPositions.length / 3);
  for (let i = 0; i < staticBottomTargetPositions.length; i += 3) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const radius = SPAWN_RADIUS * (0.5 + Math.random() * 0.5);
    staticBottomStartPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
    staticBottomStartPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    staticBottomStartPositions[i + 2] = radius * Math.cos(phi);
    staticBottomDelayArray[i / 3] = Math.random() * 0.8;
  }
  staticBottomHeart.geometry.attributes.position.array.set(staticBottomStartPositions);
  staticBottomHeart.geometry.attributes.position.needsUpdate = true;
  staticBottomHeart.userData.targetPositions = staticBottomTargetPositions;
  staticBottomHeart.userData.startPositions = staticBottomStartPositions;
  staticBottomHeart.userData.delayArray = staticBottomDelayArray;
}
const SPAWN_MULT = 0.2, rimIndices = [];
for (const t of topIndices) calculateMinimumDistanceToBorder(positions[3 * t], positions[3 * t + 1]) < BORDER_THRESHOLD && rimIndices.push(t);
const streamSource = rimIndices.length ? rimIndices : topIndices, streamCount = Math.floor(0.2 * streamSource.length), targetIdxArr = new Uint32Array(streamCount);
for (let t = 0; t < streamCount; t++) targetIdxArr[t] = streamSource[t % streamSource.length];
const planeIdxForStream = new Int32Array(streamCount).fill(-1), streamPositions = new Float32Array(3 * streamCount), streamGeo = new THREE.BufferGeometry(), streamAlpha = new Float32Array(streamCount).fill(1);
streamGeo.setAttribute("alpha", new THREE.BufferAttribute(streamAlpha, 1)), streamGeo.setAttribute("position", new THREE.BufferAttribute(streamPositions, 3).setUsage(THREE.DynamicDrawUsage));
const streamColors = new Float32Array(3 * streamCount);
for (let t = 0; t < streamCount; t++) {
  streamColors[3 * t] = heartInitialColor.r;
  streamColors[3 * t + 1] = heartInitialColor.g;
  streamColors[3 * t + 2] = heartInitialColor.b;
}
streamGeo.setAttribute("color", new THREE.BufferAttribute(streamColors, 3));
const streamSizes = new Float32Array(streamCount);
for (let t = 0; t < streamCount; t++) streamSizes[t] = 2 * (0.3 * Math.random() + 0.2 + 0.1) * 1.5;
const streamSizeBase = streamSizes.slice(), BIG_RATIO = 0.1;
for (let t = 0; t < streamCount; t++) {
  if (Math.random() < 0.1) {
    streamSizes[t] *= 1.5;
    streamColors[3 * t] = heartInitialColor.r;
    streamColors[3 * t + 1] = heartInitialColor.g;
    streamColors[3 * t + 2] = heartInitialColor.b;
  }
}
streamGeo.setAttribute("size", new THREE.BufferAttribute(streamSizes, 1));
const matStream = makeMat({
  map: circleTexture,
  alphaSupport: true,
  clipBandWidth: INDENT_HALF_WIDTH,
  clipFrontZ: 0.3
});
matStream.alphaTest = 0.5;
const streamHeart = new THREE.Points(streamGeo, matStream);
streamHeart.rotation.z = Math.PI, streamHeart.renderOrder = 1, scene.add(streamHeart), streamHeart.visible = false, fadeObjects.push(streamHeart), streamHeart.userData.fadeStage = STAGE.STREAM;
const PLANE_COUNT = Math.floor(80 * rVortex), planePositions = [], planeColors = [], planeSizes = [], planeAlphaArr = new Float32Array(PLANE_COUNT).fill(1);
for (let t = 0; t < PLANE_COUNT; t++) {
  const t2 = Math.random() * Math.PI * 2, e = Math.sqrt(Math.random()) * rVortex;
  planePositions.push(Math.cos(t2) * e, planeYCenter - 7.5, Math.sin(t2) * e), planeColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), planeSizes.push(2.5 * Math.random() + 1.5);
}
const planeGeo = new THREE.BufferGeometry();
planeGeo.setAttribute("position", new THREE.Float32BufferAttribute(planePositions, 3)), planeGeo.setAttribute("color", new THREE.Float32BufferAttribute(planeColors, 3)), planeGeo.setAttribute("size", new THREE.Float32BufferAttribute(planeSizes, 1)), planeGeo.setAttribute("alpha", new THREE.BufferAttribute(planeAlphaArr, 1));
const matPlane = makeMat({
  map: circleTexture,
  alphaSupport: true,
  // Dùng AdditiveBlending + opacity để tạo hiệu ứng sao băng phát sáng, có vệt
  blending: THREE.AdditiveBlending,
  opacity: 0.85
});
matPlane.alphaTest = 0.5;
const planeLayer = new THREE.Points(planeGeo, matPlane);
planeLayer.rotation.z = Math.PI, scene.add(planeLayer), fadeObjects.push(planeLayer), fadeObjects.includes(planeLayer) && fadeObjects.splice(fadeObjects.indexOf(planeLayer), 1), planeLayer.visible = true;
let imageWallGroup = null;
let imageWallMeshes = [];
const roundedWallTextures = [];
function getRoundedWallTexture(idx) {
  if (roundedWallTextures[idx]) return roundedWallTextures[idx];
  const tex = imageTextures[idx];
  if (!tex) return null;
  const rtex = createRoundedImageTextureFromTexture(tex) || tex;
  rtex.flipY = false;
  roundedWallTextures[idx] = rtex;
  return rtex;
}
async function createImageWall() {
  if (!imageLoadingComplete || IMAGE_CONFIG.count === 0) return;
  if (imageWallGroup) {
    scene.remove(imageWallGroup);
    imageWallMeshes = [];
  }
  imageWallGroup = new THREE.Group();
  const WALL_HEIGHT = 8;
  const WALL_RADIUS = rVortex + 0.5;
  const SEGMENTS = 64;
  const IMAGES_PER_WALL = Math.max(4, Math.floor(IMAGE_CONFIG.count / 2));
  const WALL_SEGMENTS = 8;
  for (let i = 0; i < WALL_SEGMENTS; i++) {
    const angle = i / WALL_SEGMENTS * Math.PI * 2;
    const wallWidth = 2 * Math.PI * WALL_RADIUS / WALL_SEGMENTS;
    const wallGeometry = new THREE.PlaneGeometry(wallWidth, WALL_HEIGHT);
    const imageIndex = IMAGE_CONFIG.count <= 8 ? i % IMAGE_CONFIG.count : i;
    const wallTexture = getRoundedWallTexture(imageIndex);
    const wallMaterial = new THREE.MeshBasicMaterial({
      map: wallTexture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 1
      // Tăng lên 1.0 để ảnh rõ hơn
    });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.x = Math.cos(angle) * WALL_RADIUS;
    wallMesh.position.y = planeYCenter - 7.5;
    wallMesh.position.z = Math.sin(angle) * WALL_RADIUS;
    wallMesh.lookAt(
      Math.cos(angle) * (WALL_RADIUS + 1),
      planeYCenter - 7.5,
      Math.sin(angle) * (WALL_RADIUS + 1)
    );
    wallMesh.rotateY(Math.PI);
    imageWallGroup.add(wallMesh);
    imageWallMeshes.push(wallMesh);
  }
  scene.add(imageWallGroup);
  imageWallGroup.rotation.z = Math.PI;
  imageWallGroup.visible = true;
  imageWallGroup.userData.fadeStage = STAGE.STREAM;
  fadeObjects.push(imageWallGroup);
  imageWallMeshes.forEach((mesh) => {
    if (mesh.material) {
      mesh.userData.baseOpacity = 1;
      mesh.material.opacity = revealStart === null ? 1 : 0;
    }
  });
  if (revealStart === null) {
    imageWallMeshes.forEach((mesh) => {
      if (mesh.material) mesh.material.opacity = 1;
    });
  }
}
const IMAGE_BURST_COUNT = 30;
const IMAGE_BURST_FLY_DURATION = 4;
const IMAGE_BURST_DELAY = 0.08;
const IMAGE_BURST_SCALE = 6;
const IMAGE_BURST_FLOAT_AMPLITUDE = { min: 1.5, max: 3.5 };
const IMAGE_BURST_FLOAT_SPEED = { min: 0.6, max: 1.2 };
const IMAGE_BURST_ORBIT_RADIUS = { min: 2.5, max: 5 };
const IMAGE_BURST_ORBIT_SPEED = { min: 0.25, max: 0.55 };
let imageBurstSprites = [];
let imageBurstStarted = false;
let imageBurstStartTime = null;
function createRoundedImageTextureFromTexture(tex) {
  if (!tex || !tex.image) return tex;
  const img = tex.image;
  if (!(img instanceof HTMLImageElement) || !img.complete || !img.naturalWidth || !img.naturalHeight) {
    return tex;
  }
  const w = img.naturalWidth || img.width || 512;
  const h = img.naturalHeight || img.height || 512;
  try {
    let roundRect = function(ctx2, x2, y2, width, height, r) {
      ctx2.beginPath();
      ctx2.moveTo(x2 + r, y2);
      ctx2.lineTo(x2 + width - r, y2);
      ctx2.quadraticCurveTo(x2 + width, y2, x2 + width, y2 + r);
      ctx2.lineTo(x2 + width, y2 + height - r);
      ctx2.quadraticCurveTo(x2 + width, y2 + height, x2 + width - r, y2 + height);
      ctx2.lineTo(x2 + r, y2 + height);
      ctx2.quadraticCurveTo(x2, y2 + height, x2, y2 + height - r);
      ctx2.lineTo(x2, y2 + r);
      ctx2.quadraticCurveTo(x2, y2, x2 + r, y2);
      ctx2.closePath();
    };
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return tex;
    const radius = Math.min(w, h) * 0.18;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    roundRect(ctx, 0, 0, w, h, radius);
    ctx.clip();
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
    const roundedTex = new THREE.CanvasTexture(canvas);
    roundedTex.minFilter = tex.minFilter || THREE.LinearFilter;
    roundedTex.magFilter = tex.magFilter || THREE.LinearFilter;
    roundedTex.needsUpdate = true;
    return roundedTex;
  } catch (err) {
    console.warn("Rounded texture creation failed, fallback to original texture:", err);
    return tex;
  }
}
function startImageBurst(currentTime) {
  if (!imageLoadingComplete || IMAGE_CONFIG.count === 0) return;
  imageBurstSprites = [];
  imageBurstStartTime = currentTime;
  imageBurstStarted = true;
  spinBoostUntil = currentTime + 1;
  for (let i = 0; i < IMAGE_BURST_COUNT; i++) {
    const tex = imageTextures[i % IMAGE_CONFIG.count];
    const spr = createImageBurstSprite(tex, i);
    if (spr) imageBurstSprites.push(spr);
  }
}
function createImageBurstSprite(tex, idx) {
  if (!tex) return null;
  const roundedTex = createRoundedImageTextureFromTexture(tex) || tex;
  const aspect = getAspectRatioAdjustedScale(roundedTex, IMAGE_BURST_SCALE);
  const mat = buildImageSpriteMaterial(roundedTex, 0);
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(aspect.x * 0.85, aspect.y * 1.4, 1);
  sprite.scale.y *= -1;
  const startPos = { x: 0, y: 10, z: 0 };
  sprite.position.set(startPos.x, startPos.y, startPos.z);
  const angle = idx / IMAGE_BURST_COUNT * Math.PI * 2 + Math.random() * 0.5;
  const radius = 40 + Math.random() * 25;
  const height = -20 + Math.random() * 60;
  const targetPos = {
    x: Math.cos(angle) * radius,
    y: height,
    z: Math.sin(angle) * radius
  };
  sprite.userData.startPosition = startPos;
  sprite.userData.targetPosition = targetPos;
  sprite.userData.startTime = null;
  sprite.userData.delay = idx * IMAGE_BURST_DELAY;
  sprite.userData.hasReachedTarget = false;
  sprite.userData.floatSpeed = IMAGE_BURST_FLOAT_SPEED.min + Math.random() * (IMAGE_BURST_FLOAT_SPEED.max - IMAGE_BURST_FLOAT_SPEED.min);
  sprite.userData.floatAmplitude = IMAGE_BURST_FLOAT_AMPLITUDE.min + Math.random() * (IMAGE_BURST_FLOAT_AMPLITUDE.max - IMAGE_BURST_FLOAT_AMPLITUDE.min);
  sprite.userData.floatPhase = Math.random() * Math.PI * 2;
  sprite.userData.orbitSpeed = IMAGE_BURST_ORBIT_SPEED.min + Math.random() * (IMAGE_BURST_ORBIT_SPEED.max - IMAGE_BURST_ORBIT_SPEED.min);
  sprite.userData.orbitRadius = IMAGE_BURST_ORBIT_RADIUS.min + Math.random() * (IMAGE_BURST_ORBIT_RADIUS.max - IMAGE_BURST_ORBIT_RADIUS.min);
  sprite.userData.orbitPhase = Math.random() * Math.PI * 2;
  sprite.material.opacity = 0;
  scene.add(sprite);
  return sprite;
}
function tryCreateImageWall() {
  if (imageLoadingComplete && IMAGE_CONFIG.count > 0) {
    createImageWall();
  } else {
    setTimeout(tryCreateImageWall, 100);
  }
}
tryCreateImageWall();
const PLANE_COLOR_CYCLE = 9, PLANE_COL_WHITE = new THREE.Color("rgb(255, 227, 249)"), PLANE_COL_LIGHT = new THREE.Color("rgb(255,192,215)"), PLANE_COL_DARK = new THREE.Color("rgb(241, 121, 185)");
function createTextSpriteTexture(t) {
  const e = document.createElement("canvas");
  e.width = e.height = 128;
  const o = new THREE.CanvasTexture(e);
  return o.minFilter = o.magFilter = THREE.LinearFilter, o;
}
planeGeo.attributes.color.setUsage(THREE.DynamicDrawUsage);
const ringCharsFull = RingText.join(""), ringChars = Array.from(ringCharsFull), charMatMap = {};
function generateTextRingTexture(t) {
  const e = document.createElement("canvas");
  e.width = 2048;
  e.height = 256;
  const a = e.getContext("2d");
  a.clearRect(0, 0, e.width, e.height);
  const s = new THREE.CanvasTexture(e);
  s.needsUpdate = true;
  return s;
}
[...new Set(ringChars)].forEach((t) => {
  charMatMap[t] = new THREE.SpriteMaterial({
    map: createTextSpriteTexture(t),
    transparent: true,
    depthWrite: false
  });
});
const ringTexture = generateTextRingTexture(RingText), ringMat = new THREE.MeshBasicMaterial({
  map: ringTexture,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
}), RING_THICKNESS = 3.5, RING_HUE_SPEED = 0.05, RING_FADE_DIST = 1, RING_FADE_SPEED = 2, ringHeight = 0.8, RING_Y_OFFSET = 2 * -planeYCenter - 0.5, ringGeo = new THREE.CylinderGeometry(rVortex, rVortex, 1, 128, 1, true), RING_SPACING = 2, RING_START_RADIUS = rVortex, RING_END_RADIUS = 0.25, RING_COUNT = Math.ceil((RING_START_RADIUS - 0.25) / 2), RING_FLIP_Y = Math.PI, ribbon = new THREE.Group();
ribbon.position.set(0, planeYCenter + RING_Y_OFFSET, 0), ribbon.rotation.z = Math.PI, scene.add(ribbon), ribbon.visible = true;
for (let t = 0; t < RING_COUNT; t++) {
  const e = generateTextRingTexture([RingText[t % RingText.length]]);
  e.wrapS = THREE.RepeatWrapping, e.repeat.set(2, 1), e.offset.x = 1;
  const a = new THREE.MeshBasicMaterial({
    map: e,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), o = new THREE.Mesh(ringGeo, a);
  o.rotation.x = Math.PI;
  const s = RING_START_RADIUS - 2 * t, r = 2 * (Math.random() - 0.5) * 0.3;
  o.userData.radius = s + r, o.userData.phase = Math.random() * Math.PI * 2;
  const i = s / RING_START_RADIUS;
  o.scale.set(i, 3.5, i), o.material.opacity = 1, o.material.transparent = true, o.material.depthWrite = false, o.renderOrder = t, ribbon.add(o);
}
const vortexIndices = [];
for (let t = 0; t < positions.length / 3; t++) topIndices.includes(t) || vortexIndices.push(t);
const vortexCount = vortexIndices.length, vortexPositions = new Float32Array(3 * vortexCount), vortexPhase = new Float32Array(vortexCount), vortexRadius = new Float32Array(vortexCount);
for (let t = 0; t < vortexCount; t++) {
  vortexPhase[t] = Math.random() * Math.PI * 2;
  const e = Math.random() * rVortex;
  vortexRadius[t] = e, vortexPositions[3 * t] = Math.cos(vortexPhase[t]) * e, vortexPositions[3 * t + 1] = planeYCenter, vortexPositions[3 * t + 2] = Math.sin(vortexPhase[t]) * e;
}
const vortexGeo = new THREE.BufferGeometry();
vortexGeo.setAttribute("position", new THREE.BufferAttribute(vortexPositions, 3).setUsage(THREE.DynamicDrawUsage));
const vortexColors = new Float32Array(3 * vortexCount);
for (let t = 0; t < vortexCount; t++) vortexColors[3 * t] = heartInitialColor.r, vortexColors[3 * t + 1] = heartInitialColor.g, vortexColors[3 * t + 2] = heartInitialColor.b;
vortexGeo.setAttribute("color", new THREE.BufferAttribute(vortexColors, 3));
const vortexSizes = new Float32Array(vortexCount);
for (let t = 0; t < vortexCount; t++) vortexSizes[t] = 0.2 * Math.random() + 0.15;
vortexGeo.setAttribute("size", new THREE.BufferAttribute(vortexSizes, 1));
const vortexMat = makeMat({
  map: circleTexture,
  blending: THREE.AdditiveBlending,
  opacity: 0.8
});
vortexMat.onBeforeCompile = function(t) {
  t.vertexShader = t.vertexShader.replace("uniform float size;", "attribute float size;");
};
const heartLayers = [staticHeart, bottomHeart, staticBottomHeart, staticTopHeart];
heartLayers.forEach((t) => {
  t && (scene.remove(t), heartScene.add(t));
}), heartLayers.forEach((t) => {
  t && (t.visible = false, t.userData.fadeStage = STAGE.HEART, fadeObjects.includes(t) || fadeObjects.push(t));
});
const HEART_OFFSET_Y = 10;
[staticHeart, bottomHeart, staticTopHeart, staticBottomHeart].forEach((t) => {
  t && (t.position.y += 10);
});
const HEART_OFFSET_YY = 8;
[streamHeart, ribbon].forEach((t) => {
  t && (t.position.y += 8);
});
const MINI_HEART_COUNT = 12;
const MINI_HEART_SCALE = 0.2;
const MINI_HEART_PARTICLE_COUNT = Math.floor(2500 * 0.25);
const miniHearts = [];
function createMiniHeart(scale, position, rotation) {
  const miniPositions = [];
  const miniScale = scale;
  for (let i = 0; miniPositions.length / 3 < MINI_HEART_PARTICLE_COUNT; i++) {
    const t = Math.random() * (maxX - minX) + minX, e = Math.random() * (maxY - minY) + minY;
    if (isPointInsidePolygon({ x: t, y: e }, polyPts)) {
      let a = 1 / 0;
      for (let o2 = 0; o2 < polyPts.length; o2++) {
        const s = polyPts[o2], r = polyPts[(o2 + 1) % polyPts.length], i2 = r.x - s.x, n = r.y - s.y, l = ((t - s.x) * i2 + (e - s.y) * n) / (i2 * i2 + n * n), m = Math.max(0, Math.min(1, l)), c = t - (s.x + m * i2), p = e - (s.y + m * n), d = c * c + p * p;
        d < a && (a = d);
      }
      const o = 1 / (1 + 2 * Math.sqrt(a));
      if (Math.random() < o) {
        const a2 = 3.6 * (Math.random() - 0.5);
        miniPositions.push((t - 5) * miniScale, (e - 7) * miniScale, a2 * miniScale);
      }
    }
  }
  const miniGeo = new THREE.BufferGeometry();
  miniGeo.setAttribute("position", new THREE.Float32BufferAttribute(miniPositions, 3));
  const miniColors = [];
  for (let i = 0; i < miniPositions.length; i += 3) {
    miniColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b);
  }
  miniGeo.setAttribute("color", new THREE.Float32BufferAttribute(miniColors, 3));
  const miniSizes = new Float32Array(miniPositions.length / 3);
  for (let i = 0; i < miniSizes.length; i++) {
    miniSizes[i] = 2 * (0.3 * Math.random() + 0.2) * miniScale * 1.5;
  }
  miniGeo.setAttribute("size", new THREE.Float32BufferAttribute(miniSizes, 1));
  const miniMat = makeMat({
    map: circleTexture,
    alphaSupport: true
  });
  miniMat.alphaTest = 0.5;
  const miniHeart = new THREE.Points(miniGeo, miniMat);
  miniHeart.rotation.z = Math.PI;
  miniHeart.position.set(position.x, position.y, position.z);
  miniHeart.rotation.y = 0;
  miniHeart.rotation.x = 0;
  scene.add(miniHeart);
  return miniHeart;
}
for (let i = 0; i < MINI_HEART_COUNT; i++) {
  const angle = i / MINI_HEART_COUNT * Math.PI * 2;
  const radius = 40 + Math.random() * 20;
  const verticalLayer = i % 5;
  const layerProgress = verticalLayer / 4;
  const baseHeight = -30;
  const topHeight = 50;
  const height = baseHeight + (topHeight - baseHeight) * layerProgress;
  const randomOffset = (Math.random() - 0.5) * 10;
  const position = {
    x: Math.cos(angle) * radius,
    y: height + randomOffset,
    z: Math.sin(angle) * radius
  };
  const rotation = {
    y: 0,
    x: 0
  };
  const startPosition = { x: 0, y: 10, z: 0 };
  const miniHeart = createMiniHeart(MINI_HEART_SCALE, startPosition, rotation);
  miniHeart.material.opacity = 0;
  miniHeart.userData.targetPosition = { x: position.x, y: position.y, z: position.z };
  miniHeart.userData.startPosition = startPosition;
  miniHeart.userData.floatSpeed = 0.6 + Math.random() * 0.6;
  miniHeart.userData.floatAmplitude = 2 + Math.random() * 3;
  miniHeart.userData.floatPhase = Math.random() * Math.PI * 2;
  miniHeart.userData.orbitSpeed = 0.2 + Math.random() * 0.3;
  miniHeart.userData.orbitRadius = 3 + Math.random() * 5;
  miniHeart.userData.orbitPhase = Math.random() * Math.PI * 2;
  miniHeart.userData.hasReachedTarget = false;
  miniHearts.push(miniHeart);
}
let miniHeartsFadeStart = null;
const MINI_HEARTS_FADE_DURATION = 1.2;
const MINI_HEARTS_FLY_OUT_DURATION = 2.5;
const ENABLE_EXPLOSION = false;
let expPositions, expVelocities, expBirth, expGeo, expColors, expMat, explosionPoints, MAX_EXP, expCount = 0;
const startTimes = new Float32Array(streamCount), STATE_ON_DISK = 0, STATE_ASCEND = 1, streamState = new Uint8Array(streamCount), curRadiusArr = new Float32Array(streamCount), ascendStart = new Float32Array(streamCount), spiralPhase = new Float32Array(streamCount), streamRadius = new Float32Array(streamCount), initialRadius = new Float32Array(streamCount), spiralFrequency = new Float32Array(streamCount), spiralDirection = new Float32Array(streamCount), extraRotArr = new Float32Array(streamCount), MAX_TOP_HIDE = Math.floor(1 * topIndices.length), HIDE_DISTANCE = 0.25, TOP_ROT_SPEED = 0.5, streamRiseDuration = new Float32Array(streamCount), streamOffsets = new Float32Array(3 * streamCount);
for (let t = 0; t < streamCount; t++) {
  const e = 3 * t, a = Math.random() * Math.PI * 2, o = Math.acos(2 * Math.random() - 1), s = 0.4;
  streamOffsets[e] = s * Math.sin(o) * Math.cos(a), streamOffsets[e + 1] = s * Math.sin(o) * Math.sin(a), streamOffsets[e + 2] = s * Math.cos(o);
}
function initializeStreamParticleState(t, e) {
  const a = 3 * t, o = targetIdxArr[t];
  let s = -1;
  for (let t2 = 0; t2 < 100; t2++) {
    const t3 = Math.floor(Math.random() * PLANE_COUNT), e2 = planePositions[3 * t3], a2 = planePositions[3 * t3 + 2];
    if (Math.hypot(e2, a2) <= 0.26) {
      s = t3;
      break;
    }
  }
  -1 === s && (s = Math.floor(Math.random() * PLANE_COUNT)), planeIdxForStream[t] = s;
  const r = Math.random() * Math.PI * 2;
  planePositions[3 * s] = Math.cos(r) * rOuter, planePositions[3 * s + 2] = Math.sin(r) * rOuter, planeGeo.attributes.position.needsUpdate = true;
  const i = planeLayer.rotation.y, n = Math.cos(i), l = Math.sin(i), m = n * planePositions[3 * s] - l * planePositions[3 * s + 2], c = l * planePositions[3 * s] + n * planePositions[3 * s + 2];
  streamPositions[a] = m, streamPositions[a + 1] = planePositions[3 * s + 1], streamPositions[a + 2] = c;
  const p = 0.25 + (rOuter - 0.25) * Math.random(), d = Math.random() * Math.PI * 2;
  streamPositions[a] = Math.cos(d) * p, streamPositions[a + 1] = planeYCenter, streamPositions[a + 2] = Math.sin(d) * p, curRadiusArr[t] = p, spiralPhase[t] = d, streamState[t] = STATE_ON_DISK, startTimes[t] = e - Math.random() * (rOuter - 0.25) / 0.9, ascendStart[t] = 10 * Math.random(), streamRiseDuration[t] = 8 + 4 * Math.random();
  const h = 0.5 + 1.5 * Math.random(), u = Math.random() < 0.5 ? -1 : 1;
  extraRotArr[t] = 2 * h * Math.PI * u;
  const A = idxToTopIdx[o];
  -1 !== A && (topAlpha[A] = 1, staticGeo.attributes.alpha.needsUpdate = true), activeImages.has(t) && releaseImageToPool(t), activeTexts.has(t) && releaseTextToPool(t), streamAlpha[t] = 1, streamGeo.attributes.alpha.needsUpdate = true;
}
const now0 = 0;
for (let t = 0; t < streamCount; t++) initializeStreamParticleState(t, 0);
streamGeo.attributes.position.needsUpdate = true, streamGeo.attributes.alpha.needsUpdate = true;
const clock = new THREE.Clock();
let initialColorApplied = false;
function mainAnimationLoop() {
  requestAnimationFrame(mainAnimationLoop);
  let t = clock.getDelta();
  const e = clock.getElapsedTime();
  if (t > 0.1) {
    t = 0.1;
  }
  if (heartAssemblyStart === null) {
    heartAssemblyStart = e;
  }
  const assemblyProgress = Math.min((e - heartAssemblyStart) / HEART_ASSEMBLY_DURATION, 1);
  function easeOutExpo(x2) {
    return x2 === 1 ? 1 : 1 - Math.pow(2, -10 * x2);
  }
  function easeOutQuint(x2) {
    return 1 - Math.pow(1 - x2, 5);
  }
  if (assemblyProgress < 1) {
    const topPosArray = staticGeo.attributes.position.array;
    for (let i = 0; i < topPosArray.length; i += 3) {
      const particleIndex = i / 3;
      const delay = topDelayArray[particleIndex];
      const adjustedTime = Math.max(0, (e - heartAssemblyStart - delay) / (HEART_ASSEMBLY_DURATION - delay * 0.5));
      const particleProgress = Math.min(adjustedTime, 1);
      const easedProgress = easeOutExpo(particleProgress);
      const midPoint = easedProgress * 0.5;
      const curveOffset = Math.sin(easedProgress * Math.PI) * 2;
      const startX = topStartPositions[i];
      const startY = topStartPositions[i + 1];
      const startZ = topStartPositions[i + 2];
      const targetX = topTargetPositions[i];
      const targetY = topTargetPositions[i + 1];
      const targetZ = topTargetPositions[i + 2];
      const dirX = targetX - startX;
      const dirY = targetY - startY;
      const dirZ = targetZ - startZ;
      const crossX = dirY * 0.1 - dirZ * 0.05;
      const crossY = dirZ * 0.1 - dirX * 0.05;
      const crossZ = dirX * 0.05 - dirY * 0.1;
      topPosArray[i] = THREE.MathUtils.lerp(startX, targetX, easedProgress) + crossX * curveOffset;
      topPosArray[i + 1] = THREE.MathUtils.lerp(startY, targetY, easedProgress) + crossY * curveOffset;
      topPosArray[i + 2] = THREE.MathUtils.lerp(startZ, targetZ, easedProgress) + crossZ * curveOffset;
    }
    staticGeo.attributes.position.needsUpdate = true;
    const bottomPosArray = bottomGeo.attributes.position.array;
    for (let i = 0; i < bottomPosArray.length; i += 3) {
      const particleIndex = i / 3;
      const delay = bottomDelayArray[particleIndex];
      const adjustedTime = Math.max(0, (e - heartAssemblyStart - delay) / (HEART_ASSEMBLY_DURATION - delay * 0.5));
      const particleProgress = Math.min(adjustedTime, 1);
      const easedProgress = easeOutExpo(particleProgress);
      const curveOffset = Math.sin(easedProgress * Math.PI) * 2;
      const startX = bottomStartPositions[i];
      const startY = bottomStartPositions[i + 1];
      const startZ = bottomStartPositions[i + 2];
      const targetX = bottomTargetPositions[i];
      const targetY = bottomTargetPositions[i + 1];
      const targetZ = bottomTargetPositions[i + 2];
      const dirX = targetX - startX;
      const dirY = targetY - startY;
      const dirZ = targetZ - startZ;
      const crossX = dirY * 0.1 - dirZ * 0.05;
      const crossY = dirZ * 0.1 - dirX * 0.05;
      const crossZ = dirX * 0.05 - dirY * 0.1;
      bottomPosArray[i] = THREE.MathUtils.lerp(startX, targetX, easedProgress) + crossX * curveOffset;
      bottomPosArray[i + 1] = THREE.MathUtils.lerp(startY, targetY, easedProgress) + crossY * curveOffset;
      bottomPosArray[i + 2] = THREE.MathUtils.lerp(startZ, targetZ, easedProgress) + crossZ * curveOffset;
    }
    bottomGeo.attributes.position.needsUpdate = true;
    if (staticTopHeart && staticTopHeart.userData.startPositions && staticTopHeart.userData.targetPositions && staticTopHeart.userData.delayArray) {
      const staticTopPosArray = staticTopHeart.geometry.attributes.position.array;
      const startPos = staticTopHeart.userData.startPositions;
      const targetPos = staticTopHeart.userData.targetPositions;
      const delays = staticTopHeart.userData.delayArray;
      for (let i = 0; i < staticTopPosArray.length; i += 3) {
        const particleIndex = i / 3;
        const delay = delays[particleIndex];
        const adjustedTime = Math.max(0, (e - heartAssemblyStart - delay) / (HEART_ASSEMBLY_DURATION - delay * 0.5));
        const particleProgress = Math.min(adjustedTime, 1);
        const easedProgress = easeOutExpo(particleProgress);
        staticTopPosArray[i] = THREE.MathUtils.lerp(startPos[i], targetPos[i], easedProgress);
        staticTopPosArray[i + 1] = THREE.MathUtils.lerp(startPos[i + 1], targetPos[i + 1], easedProgress);
        staticTopPosArray[i + 2] = THREE.MathUtils.lerp(startPos[i + 2], targetPos[i + 2], easedProgress);
      }
      staticTopHeart.geometry.attributes.position.needsUpdate = true;
    }
    if (staticBottomHeart && staticBottomHeart.userData.startPositions && staticBottomHeart.userData.targetPositions && staticBottomHeart.userData.delayArray) {
      const staticBottomPosArray = staticBottomHeart.geometry.attributes.position.array;
      const startPos = staticBottomHeart.userData.startPositions;
      const targetPos = staticBottomHeart.userData.targetPositions;
      const delays = staticBottomHeart.userData.delayArray;
      for (let i = 0; i < staticBottomPosArray.length; i += 3) {
        const particleIndex = i / 3;
        const delay = delays[particleIndex];
        const adjustedTime = Math.max(0, (e - heartAssemblyStart - delay) / (HEART_ASSEMBLY_DURATION - delay * 0.5));
        const particleProgress = Math.min(adjustedTime, 1);
        const easedProgress = easeOutExpo(particleProgress);
        staticBottomPosArray[i] = THREE.MathUtils.lerp(startPos[i], targetPos[i], easedProgress);
        staticBottomPosArray[i + 1] = THREE.MathUtils.lerp(startPos[i + 1], targetPos[i + 1], easedProgress);
        staticBottomPosArray[i + 2] = THREE.MathUtils.lerp(startPos[i + 2], targetPos[i + 2], easedProgress);
      }
      staticBottomHeart.geometry.attributes.position.needsUpdate = true;
    }
  } else {
    const topPosArray = staticGeo.attributes.position.array;
    topPosArray.set(topTargetPositions);
    staticGeo.attributes.position.needsUpdate = true;
    const bottomPosArray = bottomGeo.attributes.position.array;
    bottomPosArray.set(bottomTargetPositions);
    bottomGeo.attributes.position.needsUpdate = true;
    if (staticTopHeart && staticTopHeart.userData.targetPositions) {
      staticTopHeart.geometry.attributes.position.array.set(staticTopHeart.userData.targetPositions);
      staticTopHeart.geometry.attributes.position.needsUpdate = true;
    }
    if (staticBottomHeart && staticBottomHeart.userData.targetPositions) {
      staticBottomHeart.geometry.attributes.position.array.set(staticBottomHeart.userData.targetPositions);
      staticBottomHeart.geometry.attributes.position.needsUpdate = true;
    }
  }
  const streamPulse = 0.3 * Math.sin(e * 2.2) + 0.7;
  matStream.opacity = streamPulse;
  for (let e2 = 0; e2 < PLANE_COUNT; e2++) {
    const a2 = 3 * e2;
    let o2 = planePositions[a2], s2 = planePositions[a2 + 2], r = Math.hypot(o2, s2);
    if (r > 0.25) {
      r = Math.max(0.25, r - 0.9 * t);
      const e3 = Math.atan2(s2, o2);
      planePositions[a2] = Math.cos(e3) * r, planePositions[a2 + 2] = Math.sin(e3) * r;
    }
  }
  if (planeGeo.attributes.position.needsUpdate = true, planeLayer.visible && (planeLayer.visible = true)) {
    const rotationBoost = e < spinBoostUntil ? 5 : 1;
    planeRotationAngle += BASE_OMEGA * rotationBoost * t;
    planeLayer.rotation.y = planeRotationAngle;
    if (imageWallGroup) imageWallGroup.rotation.y = planeRotationAngle;
    if (void 0 !== ribbon) ribbon.rotation.y = planeRotationAngle + RING_FLIP_Y;
  }
  if (void 0 !== ribbon && ribbon.children.length) {
    const e2 = RING_START_RADIUS - 0.25;
    ribbon.children.forEach((a2, o2) => {
      a2.userData.radius -= 0.9 * t, a2.userData.radius - 1.75 < 0.25 && (a2.userData.radius += e2 + 2);
      const s2 = a2.userData.radius - 1.75;
      if (s2 < 1.25) {
        const t2 = THREE.MathUtils.clamp((s2 - 0.25) / 1, 0, 1);
        a2.material.opacity = t2;
      }
      s2 < 0.25 && (a2.userData.radius += e2 + 2, a2.material.opacity = 0), a2.material.opacity < 1 && (a2.material.opacity = Math.min(1, a2.material.opacity + 2 * t));
      const r = a2.userData.radius / RING_START_RADIUS;
      a2.scale.set(r, 3.5, r), a2.material.color.set(16777215), a2.rotation.y = a2.userData.phase;
    });
  }
  camera.updateMatrixWorld();
  const a = camera.matrixWorldInverse;
  if (cosmicDust) {
    cosmicDust.rotation.y += 15e-5;
  }
  if (assemblyProgress >= 1) {
    if (miniHeartsFadeStart === null) {
      miniHeartsFadeStart = e;
    }
    const fadeElapsed = e - miniHeartsFadeStart;
    const fadeProgress = Math.min(fadeElapsed / MINI_HEARTS_FADE_DURATION, 1);
    if (miniHearts && miniHearts.length > 0) {
      miniHearts.forEach((miniHeart, index) => {
        if (miniHeart && miniHeart.material) {
          const fadeProgress2 = Math.min(fadeElapsed / MINI_HEARTS_FADE_DURATION, 1);
          const flyProgress = Math.min(fadeElapsed / MINI_HEARTS_FLY_OUT_DURATION, 1);
          const easedFadeProgress = 1 - Math.pow(1 - fadeProgress2, 3);
          miniHeart.material.opacity = easedFadeProgress;
          if (miniHeart.userData.startPosition && miniHeart.userData.targetPosition) {
            const startPos = miniHeart.userData.startPosition;
            const targetPos = miniHeart.userData.targetPosition;
            const easedFlyProgress = flyProgress === 1 ? 1 : 1 - Math.pow(2, -10 * flyProgress);
            const delay = index * 0.05;
            const adjustedFlyProgress = Math.max(0, Math.min(1, (fadeElapsed - delay) / MINI_HEARTS_FLY_OUT_DURATION));
            const finalFlyProgress = adjustedFlyProgress === 1 ? 1 : 1 - Math.pow(2, -10 * adjustedFlyProgress);
            const currentX = THREE.MathUtils.lerp(startPos.x, targetPos.x, finalFlyProgress);
            const currentY = THREE.MathUtils.lerp(startPos.y, targetPos.y, finalFlyProgress);
            const currentZ = THREE.MathUtils.lerp(startPos.z, targetPos.z, finalFlyProgress);
            miniHeart.position.set(currentX, currentY, currentZ);
            if (finalFlyProgress >= 1) {
              miniHeart.userData.hasReachedTarget = true;
            }
          }
          let finalScale = 1;
          if (heartbeatEnabled) {
            const heartbeatScale = 1 + HEARTBEAT_AMPLITUDE * Math.sin(HEARTBEAT_FREQ_HZ * e * Math.PI * 2);
            finalScale = heartbeatScale;
          }
          if (isPulsing) {
            const pulseProgress = Math.min((e - pulseStartTime) / PULSE_DURATION, 1);
            const pulseSine = Math.sin(pulseProgress * Math.PI);
            const pulseScale = 1 + PULSE_AMPLITUDE * pulseSine;
            finalScale = pulseScale;
          }
          miniHeart.scale.set(finalScale, finalScale, finalScale);
          if (miniHeart.userData.hasReachedTarget && miniHeart.userData.targetPosition) {
            const targetPos = miniHeart.userData.targetPosition;
            const floatY = Math.sin(e * miniHeart.userData.floatSpeed + miniHeart.userData.floatPhase) * miniHeart.userData.floatAmplitude;
            const orbitAngle = e * miniHeart.userData.orbitSpeed + miniHeart.userData.orbitPhase;
            const orbitX = Math.cos(orbitAngle) * miniHeart.userData.orbitRadius;
            const orbitZ = Math.sin(orbitAngle) * miniHeart.userData.orbitRadius;
            miniHeart.position.set(
              targetPos.x + orbitX,
              targetPos.y + floatY,
              targetPos.z + orbitZ
            );
            miniHeart.rotation.y += t * 0.2;
          }
        }
      });
    }
    if (orbitingWishGroup && orbitingWishGroup.children.length > 0) {
      if (orbitingWishAppearStart === null) orbitingWishAppearStart = e;
      const elapsed = e - orbitingWishAppearStart;
      orbitingWishGroup.children.forEach((sprite) => {
        if (!sprite.userData.orbitSpeed) return;
        sprite.userData.orbitAngle += sprite.userData.orbitSpeed * t;
        const r = sprite.userData.orbitRadius;
        const angle = sprite.userData.orbitAngle;
        const floatY = Math.sin(e * sprite.userData.floatSpeed + sprite.userData.floatPhase) * sprite.userData.floatAmplitude;
        sprite.position.set(Math.cos(angle) * r, sprite.userData.baseY + floatY, Math.sin(angle) * r);
        const startAt = sprite.userData.appearDelay;
        if (elapsed <= startAt) {
          sprite.material.opacity = 0;
        } else {
          const fadeProgress2 = (elapsed - startAt) / ORBIT_WISH_FADE_DURATION;
          sprite.material.opacity = Math.min(1, fadeProgress2);
        }
      });
    }
  }
  if (streamHeartStarted) {
    streamHeart.matrixWorld, new THREE.Vector3(), new THREE.Vector3();
    const t2 = 1e3 * e;
    controlImageSpawningLogic(t2), handleQueuedImageSpawns(), animateFloatingImageSprites(t2), t2 - lastStatusLogTime > 3e3 && (printImageSystemReport(), lastStatusLogTime = t2);
    for (let t3 = 0; t3 < streamCount; t3++) {
      const a2 = 3 * t3, o2 = startTimes[t3], s2 = e - (o2 + t3 % 5 * 1.6), r = targetIdxArr[t3];
      if (streamState[t3] === STATE_ON_DISK) {
        const o3 = spiralPhase[t3] + BASE_OMEGA * (e - startTimes[t3]);
        streamPositions[a2] = Math.cos(o3) * curRadiusArr[t3], streamPositions[a2 + 1] = planeYCenter, streamPositions[a2 + 2] = Math.sin(o3) * curRadiusArr[t3], activeImages.has(t3) && releaseImageToPool(t3), streamAlpha[t3] = 1, s2 >= ascendStart[t3] && (streamState[t3] = STATE_ASCEND, startTimes[t3] = e, initialRadius[t3] = curRadiusArr[t3]);
        continue;
      }
      if (s2 < -1.5) {
        const s3 = spiralPhase[t3] + BASE_OMEGA * (e - o2);
        streamPositions[a2] = initialRadius[t3] * Math.cos(s3), streamPositions[a2 + 1] = planeYCenter, streamPositions[a2 + 2] = initialRadius[t3] * Math.sin(s3), streamAlpha[t3] = 0;
        continue;
      }
      if (s2 < 0) {
        const r2 = (s2 + 1.5) / 1.5, i2 = r2 * r2 * (3 - 2 * r2);
        streamAlpha[t3] = i2, activeImages.has(t3) && releaseImageToPool(t3);
        const n2 = spiralPhase[t3] + BASE_OMEGA * (e - o2);
        streamPositions[a2] = initialRadius[t3] * Math.cos(n2), streamPositions[a2 + 1] = planeYCenter, streamPositions[a2 + 2] = initialRadius[t3] * Math.sin(n2);
        continue;
      }
      const i = streamRiseDuration[t3];
      if (s2 >= i) {
        const r2 = (s2 - i) / 1.5;
        if (r2 < 1) {
          const s3 = r2 * r2 * (3 - 2 * r2);
          if (streamAlpha[t3] = 1 - s3, activeImages.has(t3)) {
            const e2 = activeImages.get(t3);
            imagePool[e2].material.opacity *= 1 - s3;
          }
          const i2 = spiralPhase[t3] + BASE_OMEGA * (e - o2);
          streamPositions[a2] = initialRadius[t3] * Math.cos(i2), streamPositions[a2 + 1] = planeYCenter, streamPositions[a2 + 2] = initialRadius[t3] * Math.sin(i2);
          continue;
        }
        streamAlpha[t3] = 1, activeImages.has(t3) && releaseImageToPool(t3), initializeStreamParticleState(t3, e), firstResetCompleted || (firstResetCompleted = true);
        continue;
      }
      streamAlpha[t3] = 1;
      const n = s2 / i;
      if (n < 0.01) {
        let s3, r2, i2;
        const l = spiralPhase[t3] + BASE_OMEGA * (e - o2);
        {
          const e2 = initialRadius[t3];
          s3 = Math.cos(l) * e2, i2 = Math.sin(l) * e2;
          const a3 = Math.min(1, n / 0.01);
          r2 = THREE.MathUtils.lerp(planeYCenter, apexY, a3);
        }
        streamPositions[a2] = s3, streamPositions[a2 + 1] = r2, streamPositions[a2 + 2] = i2;
      } else {
        const s3 = (n - 0.01) / 0.99, i2 = 1 - Math.pow(1 - s3, 3), l = spiralPhase[t3] + BASE_OMEGA * (e - o2), m = initialRadius[t3], c = Math.cos(l) * m, p = Math.sin(l) * m, d = apexY, h = 3 * r, u = positions[h], A = positions[h + 1] - 4 + 2, E = positions[h + 2];
        let T = THREE.MathUtils.lerp(c, u, i2), f = THREE.MathUtils.lerp(d, A, i2), S = THREE.MathUtils.lerp(p, E, i2);
        const I = 1 + 0.1 * (1 - i2);
        T *= I, S *= I;
        const g = (1 - i2) * extraRotArr[t3], b = Math.cos(g), M = Math.sin(g), P = T * b - S * M, R = T * M + S * b;
        streamPositions[a2] = P, streamPositions[a2 + 1] = f, streamPositions[a2 + 2] = R;
      }
      if (n < 0.01) streamAlpha[t3] = 1, activeImages.has(t3) && releaseImageToPool(t3);
      else {
        const e2 = (n - 0.01) / 0.99;
        let a3 = null;
        if (activeImages.has(t3)) {
          const e3 = activeImages.get(t3);
          a3 = imagePool[e3];
        }
        if (a3) {
          streamAlpha[t3] = 0, a3.visible = true;
          const o3 = 1 - Math.pow(1 - e2, 3), s3 = 3 * r, i2 = positions[s3], n2 = positions[s3 + 1] - 4 + 2, l = positions[s3 + 2], m = 1 + t3 % 5 * 0.2, c = t3 % 2 == 0 ? 1 : -1, p = spiralPhase[t3] + o3 * m * Math.PI * 2 * c, d = (1 - o3) * (2 + 1 * Math.sin(t3)), h = THREE.MathUtils.lerp(0, i2, o3), u = THREE.MathUtils.lerp(apexY, n2, o3), A = THREE.MathUtils.lerp(0, l, o3), E = h + Math.cos(p) * d, T = u, f = A + Math.sin(p) * d;
          if (a3.position.set(E, T, f), o3 > 0.4) {
            const e3 = (o3 - 0.4) / 0.6, s4 = 1;
            a3.material.opacity = s4 * (1 - e3);
            const r2 = 1 - 0.9 * e3, i3 = a3.userData.aspectScale || {
              x: IMAGE_CONFIG.scale,
              y: IMAGE_CONFIG.scale
            };
            a3.scale.set(i3.x * r2, i3.y * r2, 1), e3 > 0.9 && (a3.visible = false, releaseImageToPool(t3));
          } else {
            a3.material.opacity = 1;
            const t4 = a3.userData.aspectScale || {
              x: IMAGE_CONFIG.scale,
              y: IMAGE_CONFIG.scale
            };
            a3.scale.set(t4.x, t4.y, 1);
          }
        } else streamAlpha[t3] = 1;
      }
      if (streamGeo.attributes.size.needsUpdate = true, n > 0.95) {
        const t4 = topIndices.indexOf(r);
        if (topPointVisibility[t4] && hiddenTopCount < MAX_TOP_HIDE) {
          topPointVisibility[t4] = false;
          const e2 = idxToTopIdx[r];
          -1 !== e2 && (topAlpha[e2] = 0, staticGeo.attributes.alpha.needsUpdate = true), hiddenTopCount++;
        }
      }
    }
  } else {
    for (let t2 = 0; t2 < streamCount; t2++) {
      if (streamHeartActiveRatio < 1 && t2 / streamCount > 0.1) {
        const a3 = 3 * t2, o3 = spiralPhase[t2] + BASE_OMEGA * e;
        streamPositions[a3] = Math.cos(o3) * curRadiusArr[t2], streamPositions[a3 + 1] = planeYCenter, streamPositions[a3 + 2] = Math.sin(o3) * curRadiusArr[t2], streamAlpha[t2] = 0;
        continue;
      }
      if (!firstResetCompleted && t2 / streamCount > 1e-4) {
        const a3 = 3 * t2, o3 = spiralPhase[t2] + BASE_OMEGA * e;
        streamPositions[a3] = Math.cos(o3) * curRadiusArr[t2], streamPositions[a3 + 1] = planeYCenter, streamPositions[a3 + 2] = Math.sin(o3) * curRadiusArr[t2], streamAlpha[t2] = 0;
        continue;
      }
      const a2 = 3 * t2, o2 = spiralPhase[t2] + BASE_OMEGA * e;
      streamPositions[a2] = Math.cos(o2) * curRadiusArr[t2], streamPositions[a2 + 1] = planeYCenter, streamPositions[a2 + 2] = Math.sin(o2) * curRadiusArr[t2], streamAlpha[t2] = 0;
    }
    streamGeo.attributes.position.needsUpdate = true, streamGeo.attributes.alpha.needsUpdate = true;
  }
  streamGeo.attributes.position.needsUpdate = true, streamGeo.attributes.alpha.needsUpdate = true;
  for (let t2 = 0; t2 < vortexCount; t2++) {
    const a2 = 3 * t2, o2 = 1 * Math.PI / 10, s2 = vortexRadius[t2], r = e * o2, i = 0.3 * Math.sin(r + vortexPhase[t2]), n = 0.2 * Math.cos(0.7 * r + vortexPhase[t2]), l = r + vortexPhase[t2] + i, m = s2 * (1 + n);
    vortexPositions[a2] = Math.cos(l) * m, vortexPositions[a2 + 1] = planeYCenter + 0.5 * Math.sin(r + vortexPhase[t2]), vortexPositions[a2 + 2] = Math.sin(l) * m;
  }
  vortexGeo.attributes.position.needsUpdate = true;
  const o = bottomGeo.attributes.position.array;
  for (let t2 = 0; t2 < bottomCount; t2++) {
    if (e < bottomDelayArr[t2]) continue;
    const s2 = bottomPhaseArr[t2], r = bottomRadiusArr[t2], i = Math.cos(s2) * r;
    if (Math.abs(s2) < 0.25 * Math.PI) {
      const e2 = Math.min(1, Math.abs(i) / (0.25 * heartWidth)), a2 = 1.5 * Math.pow(1 - e2, 3) + 1, s3 = i >= 0 ? 1 : -1;
      o[3 * t2] = i + s3 * (Math.abs(i) * (a2 - 1));
    } else o[3 * t2] = i;
    o[3 * t2 + 2] = Math.sin(s2) * r;
    const n = o[3 * t2], l = o[3 * t2 + 1], m = o[3 * t2 + 2], c = new THREE.Vector3(n, l, m).applyMatrix4(bottomHeart.matrixWorld);
    new THREE.Vector3().copy(c).applyMatrix4(a), bottomAlphaArr[t2] = bottomAlphaBase[t2];
  }
  bottomGeo.attributes.position.needsUpdate = true, bottomGeo.attributes.alpha.needsUpdate = true;
  const s = controls.getAzimuthalAngle();
  if (staticHeart && (staticHeart.rotation.y = s), bottomHeart && (bottomHeart.rotation.y = s), staticBottomHeart && (staticBottomHeart.rotation.y = s), staticTopHeart && (staticTopHeart.rotation.y = s), heartbeatEnabled) {
    const t2 = 1 + 0.05 * Math.sin(0.5 * e * Math.PI * 2);
    staticHeart && staticHeart.scale.set(t2, t2, t2), bottomHeart && bottomHeart.scale.set(t2, t2, t2), staticBottomHeart && staticBottomHeart.scale.set(t2, t2, t2), staticTopHeart && staticTopHeart.scale.set(t2, t2, t2);
  }
  if (controls.update(), renderer.clear(), composerHeart.render(), renderer.clearDepth(), renderer.autoClear = false, composerMain.render(), renderer.autoClear = true, hiddenTopCount < MAX_TOP_HIDE) {
    for (let t2 = 0; t2 < 5 && hiddenTopCount < MAX_TOP_HIDE; t2++) {
      const t3 = Math.floor(Math.random() * topIndices.length), e2 = topIndices[t3];
      if (topPointVisibility[t3]) {
        topPointVisibility[t3] = false;
        const a2 = idxToTopIdx[e2];
        -1 !== a2 && (topAlpha[a2] = 0, hiddenTopCount++);
      }
    }
    staticGeo.attributes.position.needsUpdate = true, staticGeo.attributes.alpha.needsUpdate = true;
  }
  for (let i = explosionEffects.length - 1; i >= 0; i--) {
    const group = explosionEffects[i];
    group.userData.life -= t;
    if (group.userData.life <= 0) {
      if (!isPulsing) {
        isPulsing = true;
        pulseStartTime = e;
        triggerCosmicRipple();
      }
      scene.remove(group);
      explosionEffects.splice(i, 1);
    } else {
      const points = group.children[0];
      const positions2 = points.geometry.attributes.position.array;
      const velocities = group.userData.velocities;
      const attractionStrength = 0.04;
      for (let j = 0; j < velocities.length; j++) {
        const idx = j * 3;
        const currentPosition = new THREE.Vector3(positions2[idx], positions2[idx + 1], positions2[idx + 2]);
        const currentVelocity = velocities[j];
        const toHeartVector = HEART_CENTER_TARGET.clone().sub(currentPosition);
        currentVelocity.lerp(toHeartVector, attractionStrength);
        positions2[idx] += currentVelocity.x * t;
        positions2[idx + 1] += currentVelocity.y * t;
        positions2[idx + 2] += currentVelocity.z * t;
      }
      points.geometry.attributes.position.needsUpdate = true;
      if (group.userData.life < 1) {
        points.material.opacity = group.userData.life / 1;
      }
    }
  }
  const RIPPLE_LIFESPAN = 1.8;
  effectPool.waves.forEach((wave) => {
    if (!wave.userData.active) return;
    const progress = (e - wave.userData.creationTime) / RIPPLE_LIFESPAN;
    if (progress >= 1) {
      wave.userData.active = false;
      wave.visible = false;
    } else {
      wave.lookAt(camera.position);
      wave.scale.set(1 + progress * 6, 1 + progress * 6, 1);
      wave.material.opacity = 0.6 * (1 - progress);
    }
  });
  effectPool.sparkles.forEach((sparkles) => {
    if (!sparkles.userData.active) return;
    const progress = (e - sparkles.userData.creationTime) / RIPPLE_LIFESPAN;
    if (progress >= 1) {
      sparkles.userData.active = false;
      sparkles.visible = false;
    } else {
      const positions2 = sparkles.geometry.attributes.position.array;
      const velocities = sparkles.userData.velocities;
      for (let i = 0; i < 100; i++) {
        const idx = i * 3;
        positions2[idx] += velocities[idx] * t;
        positions2[idx + 1] += velocities[idx + 1] * t;
      }
      sparkles.geometry.attributes.position.needsUpdate = true;
      sparkles.material.opacity = 1 - Math.pow(progress, 2);
    }
  });
  const heartMeshes = [staticHeart, bottomHeart, staticBottomHeart, staticTopHeart];
  let finalColor = new THREE.Color();
  finalColor.copy(heartInitialColor);
  if (isPulsing) {
    const pulseProgress = Math.min((e - pulseStartTime) / PULSE_DURATION, 1);
    const pulseSine = Math.sin(pulseProgress * Math.PI);
    const scale = 1 + PULSE_AMPLITUDE * pulseSine;
    heartMeshes.forEach((mesh) => {
      if (mesh) mesh.scale.set(scale, scale, scale);
    });
    const flashColor = new THREE.Color(16777215);
    finalColor.lerp(flashColor, pulseSine * 0.8);
    if (pulseProgress >= 1) {
      isPulsing = false;
      heartMeshes.forEach((mesh) => {
        if (mesh) mesh.scale.set(1, 1, 1);
      });
    }
  }
  if (isPulsing || !initialColorApplied) {
    let updateParticleColorArray = function(attributeArray) {
      if (!attributeArray) return;
      for (let i = 0; i < attributeArray.length; i += 3) {
        attributeArray[i] = n;
        attributeArray[i + 1] = l;
        attributeArray[i + 2] = m;
      }
    };
    const n = finalColor.r, l = finalColor.g, m = finalColor.b;
    updateParticleColorArray(planeGeo.attributes.color.array);
    updateParticleColorArray(staticGeo.attributes.color.array);
    updateParticleColorArray(bottomGeo.attributes.color.array);
    if (staticBottomHeart) updateParticleColorArray(staticBottomHeart.geometry.attributes.color.array);
    if (staticTopHeart) updateParticleColorArray(staticTopHeart.geometry.attributes.color.array);
    updateParticleColorArray(vortexGeo.attributes.color.array);
    updateParticleColorArray(streamGeo.attributes.color.array);
    planeGeo.attributes.color.needsUpdate = true;
    staticGeo.attributes.color.needsUpdate = true;
    bottomGeo.attributes.color.needsUpdate = true;
    if (staticBottomHeart) staticBottomHeart.geometry.attributes.color.needsUpdate = true;
    if (staticTopHeart) staticTopHeart.geometry.attributes.color.needsUpdate = true;
    vortexGeo.attributes.color.needsUpdate = true;
    streamGeo.attributes.color.needsUpdate = true;
    ribbon.children.forEach((t2) => {
      t2.material.color.setRGB(n, l, m);
    });
    initialColorApplied = true;
  }
  if (e >= nextShootTime) {
    for (let t2 = 0; t2 < SHOOT_MAX; t2++)
      if (shootLife[t2] <= 0) {
        const a2 = 3 * t2;
        const SPAWN_RADIUS2 = 200;
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(SPAWN_RADIUS2);
        shootPositions[a2] = startPos.x;
        shootPositions[a2 + 1] = startPos.y;
        shootPositions[a2 + 2] = startPos.z;
        const randomVec = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        const tangentVec = new THREE.Vector3().crossVectors(startPos, randomVec).normalize();
        const s2 = 40 + 30 * Math.random();
        shootVel[a2] = tangentVec.x * s2;
        shootVel[a2 + 1] = tangentVec.y * s2;
        shootVel[a2 + 2] = tangentVec.z * s2;
        shootBirth[t2] = e;
        shootLife[t2] = (SHOOT_OUT_RADIUS - SPAWN_RADIUS2) / s2;
        shootAlpha[t2] = 0.8 + 0.2 * Math.random();
        break;
      }
    nextShootTime = e + 0.5 + Math.random();
  }
  for (let e2 = 0; e2 < SHOOT_MAX; e2++)
    if (shootLife[e2] > 0) {
      const a2 = 3 * e2;
      shootPositions[a2] += shootVel[a2] * t, shootPositions[a2 + 1] += shootVel[a2 + 1] * t, shootPositions[a2 + 2] += shootVel[a2 + 2] * t;
      const o2 = Math.hypot(shootPositions[a2], shootPositions[a2 + 1], shootPositions[a2 + 2]);
      if (shootBirth[e2], shootLife[e2], o2 > SHOOT_OUT_RADIUS) shootLife[e2] = 0, shootAlpha[e2] = 0;
      else {
        const t2 = 0.9, a3 = o2 / SHOOT_OUT_RADIUS;
        shootAlpha[e2] = a3 > t2 ? 1 - (a3 - t2) / (1 - t2) : 1;
      }
      const s2 = e2 * (TAIL_SEGMENTS + 1), r = 3 * s2;
      tailPositions[r] = shootPositions[a2], tailPositions[r + 1] = shootPositions[a2 + 1], tailPositions[r + 2] = shootPositions[a2 + 2], tailAlphas[s2] = shootAlpha[e2];
      for (let t2 = 1; t2 <= TAIL_SEGMENTS; t2++) {
        const o3 = e2 * (TAIL_SEGMENTS + 1) + t2, s3 = 3 * o3;
        tailPositions[s3] = shootPositions[a2] - shootVel[a2] * t2 * TAIL_SPACING, tailPositions[s3 + 1] = shootPositions[a2 + 1] - shootVel[a2 + 1] * t2 * TAIL_SPACING, tailPositions[s3 + 2] = shootPositions[a2 + 2] - shootVel[a2 + 2] * t2 * TAIL_SPACING;
        const r2 = 1 - t2 / TAIL_SEGMENTS;
        tailAlphas[o3] = shootAlpha[e2] * r2;
      }
    }
  if (tailGeo.attributes.position.needsUpdate = true, tailGeo.attributes.alpha.needsUpdate = true, heartbeatEnabled) {
    const t2 = 1 + 0.05 * Math.sin(0.5 * e * Math.PI * 2);
    staticHeart && staticHeart.scale.set(t2, t2, t2), bottomHeart && bottomHeart.scale.set(t2, t2, t2), staticBottomHeart && staticBottomHeart.scale.set(t2, t2, t2), staticTopHeart && staticTopHeart.scale.set(t2, t2, t2);
  }
  if (null !== revealStart && (fadeObjects.forEach((t2) => {
    var _a2, _b2;
    if (!t2 || t2 === ribbon) return;
    const a2 = (_a2 = t2.userData.fadeStage) != null ? _a2 : 0, o2 = THREE.MathUtils.clamp((e - revealStart - STAGE_DURATION * a2) / STAGE_DURATION, 0, 1), s2 = o2 * o2 * (3 - 2 * o2);
    (_b2 = t2.traverse) == null ? void 0 : _b2.call(t2, (child) => {
      var _a3;
      const material = child.material;
      if (!material) return;
      if (child.isSprite && child.userData.text && child.userData.active === false) {
        material.opacity = 0;
        return;
      }
      const baseOpacity = (_a3 = child.userData.baseOpacity) != null ? _a3 : 1;
      material.opacity = baseOpacity * s2;
    }), a2 === STAGE.STREAM && s2 > 0.1 && (streamHeartStarted = true, streamHeartActiveRatio = s2);
  }), e - revealStart > STAGE_DURATION * (STAGE.HEART + 1) && (revealStart = null)), null !== cameraAnimationStart) {
    const t2 = e - cameraAnimationStart, a2 = THREE.MathUtils.clamp(t2 / CAMERA_ANIMATION_DURATION, 0, 1), o2 = a2 * a2 * (3 - 2 * a2);
    camera.position.x = THREE.MathUtils.lerp(CAMERA_START_POSITION.x, CAMERA_END_POSITION.x, o2), camera.position.y = THREE.MathUtils.lerp(CAMERA_START_POSITION.y, CAMERA_END_POSITION.y, o2), camera.position.z = THREE.MathUtils.lerp(CAMERA_START_POSITION.z, CAMERA_END_POSITION.z, o2), camera.lookAt(0, 0, 0), a2 >= 1 && (cameraAnimationStart = null, camera.position.set(CAMERA_END_POSITION.x, CAMERA_END_POSITION.y, CAMERA_END_POSITION.z), camera.lookAt(0, 0, 0));
  }
}
function triggerCosmicRipple() {
  const pulseColor = new THREE.Color().setHSL(clock.getElapsedTime() * 0.05 % 1, 0.9, 0.7);
  const wave = effectPool.waves.find((w) => !w.userData.active);
  if (wave) {
    wave.userData.active = true;
    wave.visible = true;
    wave.userData.creationTime = clock.getElapsedTime();
    wave.position.copy(HEART_CENTER_TARGET);
    wave.rotation.z = Math.PI;
    wave.scale.set(1, 1, 1);
    wave.material.color.copy(pulseColor);
  }
  const sparkles = effectPool.sparkles.find((s) => !s.userData.active);
  if (sparkles) {
    sparkles.userData.active = true;
    sparkles.visible = true;
    sparkles.userData.creationTime = clock.getElapsedTime();
    sparkles.position.copy(HEART_CENTER_TARGET);
    sparkles.rotation.z = Math.PI;
    sparkles.material.color.copy(pulseColor);
    const positions2 = sparkles.geometry.attributes.position.array;
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 9;
      const speed = Math.random() * 20 + 20;
      const idx = i * 3;
      positions2[idx] = Math.cos(angle) * radius;
      positions2[idx + 1] = Math.sin(angle) * radius;
      positions2[idx + 2] = (Math.random() - 0.5) * 5;
      if (!sparkles.userData.velocities) sparkles.userData.velocities = [];
      sparkles.userData.velocities[idx] = Math.cos(angle) * speed;
      sparkles.userData.velocities[idx + 1] = Math.sin(angle) * speed;
      sparkles.userData.velocities[idx + 2] = (Math.random() - 0.5) * 5;
    }
    sparkles.geometry.attributes.position.needsUpdate = true;
  }
}
setupEffectPools();
createOrbitingWishSprites();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight, camera.updateProjectionMatrix(), renderer.setSize(window.innerWidth, window.innerHeight);
});
const refinedBottomPos = [], refinedBottomColors = [], refinedBottomSizes = [];
for (let t = 0; t < bottomPositions.length; t += 3) {
  const e = bottomPositions[t], a = bottomPositions[t + 1], o = bottomPositions[t + 2];
  (calculateMinimumDistanceToBorder(e, a) < BORDER_THRESHOLD || Math.random() < 0.9) && (refinedBottomPos.push(e, a, o), refinedBottomColors.push(heartInitialColor.r, heartInitialColor.g, heartInitialColor.b), refinedBottomSizes.push(bottomSizes[t / 3]));
}
bottomPositions = refinedBottomPos, bottomColors.length = 0, bottomColors.push(...refinedBottomColors), bottomSizes.length = 0, bottomSizes.push(...refinedBottomSizes);
const starLayers = [];
function createStarLayer({ count, radius, colors: colors2, minSize, maxSize, opacity = 1.2 }) {
  const positions2 = new Float32Array(count * 3);
  const colorsAttr = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alpha = new Float32Array(count);
  const phase = new Float32Array(count);
  const twinkleSpeed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    positions2[i3] = radius * Math.cos(theta) * Math.sin(phi);
    positions2[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    positions2[i3 + 2] = radius * Math.cos(phi);
    const color = colors2[Math.floor(Math.random() * colors2.length)];
    colorsAttr[i3] = color.r;
    colorsAttr[i3 + 1] = color.g;
    colorsAttr[i3 + 2] = color.b;
    sizes[i] = Math.random() * (maxSize - minSize) + minSize;
    alpha[i] = 1;
    phase[i] = Math.random() * Math.PI * 2;
    twinkleSpeed[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions2, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colorsAttr, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.userData.phase = phase;
  geo.userData.twinkleSpeed = twinkleSpeed;
  const mat = makeMat({
    map: circleTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaSupport: true,
    opacity,
    sizeAttenuation: false,
    // Rất quan trọng: Giữ kích thước sao không đổi dù camera xa hay gần.
    vertexColors: true
  });
  mat.onBeforeCompile = function(shader) {
    shader.vertexShader = shader.vertexShader.replace("uniform float size;", "attribute float size; attribute float alpha; varying float vAlpha;");
    shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  vAlpha = alpha;");
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "varying float vAlpha;\nvoid main(){");
    shader.fragmentShader = shader.fragmentShader.replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );");
  };
  return new THREE.Points(geo, mat);
}
const starColors = [
  new THREE.Color(16777215),
  // Trắng tinh
  new THREE.Color(11197695),
  // Trắng-xanh băng giá
  new THREE.Color(16777184),
  // Trắng-vàng ấm
  new THREE.Color(16767153)
  // Cam nhạt
];
const farStars = createStarLayer({
  count: 2500,
  radius: 250,
  colors: [new THREE.Color(11197695), new THREE.Color(16777215)],
  minSize: 0.5,
  maxSize: 1.5,
  opacity: 0.8
});
const midStars = createStarLayer({
  count: 1500,
  radius: 180,
  colors: starColors,
  minSize: 1,
  maxSize: 2.5,
  opacity: 1
});
const nearStars = createStarLayer({
  count: 500,
  radius: 120,
  colors: starColors,
  minSize: 1.5,
  maxSize: 4,
  opacity: 1.2
});
starLayers.push(farStars, midStars, nearStars);
starLayers.forEach((layer) => {
  scene.add(layer);
  layer.visible = false;
  fadeObjects.push(layer);
  layer.userData.fadeStage = STAGE.STAR;
});
const dustParticlesCount = 4500;
const dustPositions = new Float32Array(dustParticlesCount * 3);
const dustColors = new Float32Array(dustParticlesCount * 3);
const dustColor = new THREE.Color(4854924);
for (let i = 0; i < dustParticlesCount; i++) {
  const i3 = i * 3;
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.random() * 200 + 50;
  dustPositions[i3] = radius * Math.cos(theta) * Math.sin(phi);
  dustPositions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
  dustPositions[i3 + 2] = radius * Math.cos(phi);
  const colorVariation = Math.random() * 0.5 + 0.5;
  dustColors[i3] = dustColor.r * colorVariation;
  dustColors[i3 + 1] = dustColor.g * colorVariation;
  dustColors[i3 + 2] = dustColor.b * colorVariation;
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
const dustMaterial = new THREE.PointsMaterial({
  size: 0.2,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  // Hiệu ứng phát sáng
  transparent: true,
  opacity: 0.7
});
cosmicDust = new THREE.Points(dustGeometry, dustMaterial);
scene.add(cosmicDust);
STAR_COUNT = 0;
starAlpha = null;
starPhase = null;
starGeo = null;
const SHOOT_MAX = 10, TAIL_SEGMENTS = 260, TAIL_SPACING = 1e-3, SHOOT_OUT_RADIUS = 350, SHOOT_POINTS = SHOOT_MAX * (1 + TAIL_SEGMENTS), shootPositions = new Float32Array(3 * SHOOT_MAX), shootVel = new Float32Array(3 * SHOOT_MAX), shootBirth = new Float32Array(SHOOT_MAX), shootLife = new Float32Array(SHOOT_MAX).fill(0), shootAlpha = new Float32Array(SHOOT_MAX).fill(0), shootSize = new Float32Array(SHOOT_MAX);
for (let t = 0; t < SHOOT_MAX; t++) shootSize[t] = 3;
const tailPositions = new Float32Array(3 * SHOOT_POINTS), tailColors = new Float32Array(3 * SHOOT_POINTS), tailSizes = new Float32Array(SHOOT_POINTS), tailAlphas = new Float32Array(SHOOT_POINTS).fill(0);
for (let t = 0; t < SHOOT_MAX; t++) {
  tailSizes[t * (TAIL_SEGMENTS + 1)] = 6;
  for (let e = 1; e <= TAIL_SEGMENTS; e++) {
    const a = t * (TAIL_SEGMENTS + 1) + e, o = 1 - e / TAIL_SEGMENTS;
    tailSizes[a] = 4 * o;
    const s = 3 * a;
    tailColors[s] = 0.7 * o, tailColors[s + 1] = 0.8 * o, tailColors[s + 2] = 1 * o;
  }
}
for (let t = 0; t < SHOOT_MAX; t++) {
  const e = t * (TAIL_SEGMENTS + 1) * 3;
  tailColors[e] = 1, tailColors[e + 1] = 1, tailColors[e + 2] = 1;
}
const tailGeo = new THREE.BufferGeometry();
tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPositions, 3).setUsage(THREE.DynamicDrawUsage)), tailGeo.setAttribute("color", new THREE.BufferAttribute(tailColors, 3)), tailGeo.setAttribute("size", new THREE.BufferAttribute(tailSizes, 1)), tailGeo.setAttribute("alpha", new THREE.BufferAttribute(tailAlphas, 1).setUsage(THREE.DynamicDrawUsage));
const tailMat = makeMat({
  map: circleTexture,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  alphaSupport: true,
  vertexColors: true,
  opacity: 2,
  sizeAttenuation: false
});
tailMat.onBeforeCompile = function(t) {
  t.vertexShader = t.vertexShader.replace("uniform float size;", "attribute float size; attribute float alpha; varying float vAlpha;"), t.vertexShader = t.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  vAlpha = alpha;"), t.fragmentShader = t.fragmentShader.replace("void main() {", "varying float vAlpha;\nvoid main(){"), t.fragmentShader = t.fragmentShader.replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );");
};
const shootingStars = new THREE.Points(tailGeo, tailMat);
scene.add(shootingStars), shootingStars.userData.fadeStage = STAGE.SHOOT;
let nextShootTime = 0;
function triggerSceneActivation(t) {
  heartbeatEnabled || (heartbeatEnabled = true, setupImageObjectPool(), lastImageSpawnTime = 0, imageSpawnQueue.length = 0, currentImageIndex = 0, lastStatusLogTime = 0, nextIndependentSpawnTime = 0, independentImageSprites.forEach((t2) => {
    t2 && t2.parent && t2.parent.remove(t2);
  }), independentImageSprites.length = 0, fadeObjects.forEach((t2) => {
    var _a2;
    t2 && (t2.visible = true, (_a2 = t2.traverse) == null ? void 0 : _a2.call(t2, (t3) => {
      var _a3;
      const e = t3.material;
      e && (t3.material && void 0 === t3.userData.baseOpacity && (t3.userData.baseOpacity = (_a3 = t3.material.opacity) != null ? _a3 : 1), e.opacity = 0);
    }));
  }), revealStart = clock.getElapsedTime(), cameraAnimationStart = clock.getElapsedTime(), userHasMovedCamera && (CAMERA_START_POSITION = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  }));
}
fadeObjects.push(streamHeart, shootingStars), [streamHeart, shootingStars].forEach((t) => {
  var _a2;
  t && (t.visible = false, (_a2 = t.traverse) == null ? void 0 : _a2.call(t, (t2) => {
    var _a3;
    t2.material && void 0 === t2.userData.baseOpacity && (t2.userData.baseOpacity = (_a3 = t2.material.opacity) != null ? _a3 : 1);
  }));
}), renderer.domElement.addEventListener("pointerdown", (event) => {
  createHeartExplosion(event);
});
triggerSceneActivation();
let lastTouchEnd = 0;
document.addEventListener("touchend", function(t) {
  const e = (/* @__PURE__ */ new Date()).getTime();
  e - lastTouchEnd <= 300 && t.preventDefault(), lastTouchEnd = e;
}, false), document.addEventListener("gesturestart", function(t) {
  t.preventDefault();
}, {
  passive: false
}), document.addEventListener("gesturechange", function(t) {
  t.preventDefault();
}, {
  passive: false
}), document.addEventListener("gestureend", function(t) {
  t.preventDefault();
}, {
  passive: false
}), mainAnimationLoop(), scene.add(staticBottomHeart), [staticTopHeart].forEach((t) => {
  t && (t.visible = false, t.userData.fadeStage = STAGE.HEART, fadeObjects.push(t));
}), controls.addEventListener("change", () => {
  userHasMovedCamera || (CAMERA_START_POSITION = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  }, userHasMovedCamera = true);
});
