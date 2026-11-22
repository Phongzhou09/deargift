/**
 * Enhanced Effects Module
 * Adds snowfall, galaxy, starfield, and fireworks to the heart scene
 * Also hides bottom particles and text rings from the original heart
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js';

// Initialize effects ngay lập tức
setTimeout(() => {
    initStandaloneEffects();
}, 100);  // Chỉ delay 100ms để DOM ready

let scene, camera, renderer;
let snowParticles, flakeParticlesArray = [], galaxy, staticStars;
let snowVelocities = [], flakeVelocities = [];
let fireworks = [];
let isInitialized = false;

// Fade in control - hiện ngay lập tức
let effectsOpacity = 1;  // Bắt đầu với opacity đầy đủ
let effectsStartTime = 0;
const EFFECTS_FADE_DURATION = 500; // Fade in nhanh 0.5 giây

// 3D Text Board variables
let textMesh, textTexture, textCanvas, textContext;
let messageArray = [];
let msgIndex = 0;
let charIndex = 0;
let lastTypingTime = 0;
let typingSpeed = 80;
let isWaiting = false;
let waitStartTime = 0;

function initStandaloneEffects() {
    if (isInitialized) return;
    isInitialized = true;

    // Get existing renderer or create overlay
    const existingCanvas = document.querySelector('canvas');
    if (!existingCanvas) return;

    // Create overlay canvas for additional effects
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'effects-overlay';
    overlayCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2;
    `;
    document.body.appendChild(overlayCanvas);

    // Setup Three.js for effects
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 25, 65);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: overlayCanvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Create effects
    createStarfield();
    createGalaxy();
    createSnowfall();
    create3DTextBoard(); // Thêm text board

    // Set initial opacity - hiện ngay lập tức
    effectsStartTime = Date.now();
    setEffectsOpacity(1);  // Hiện ngay với opacity đầy đủ

    // Start animation
    animateEffects();

    // Handle resize
    window.addEventListener('resize', onWindowResize);

    console.log('Enhanced effects initialized');
}

// ==========================================
// 📝 3D TEXT BOARD - Hiệu ứng chữ typing cạnh trái tim
// ==========================================
function create3DTextBoard() {
    // Lấy messages từ config
    if (window.Heartlove && window.Heartlove.data && window.Heartlove.data.messages) {
        messageArray = window.Heartlove.data.messages;
    } else if (window.dataChristmasTree && window.dataChristmasTree.data && window.dataChristmasTree.data.messages) {
        messageArray = window.dataChristmasTree.data.messages;
    }

    if (!messageArray || messageArray.length === 0) {
        messageArray = ["Happy Valentine ❤️", "Yêu em nhiều lắm!", "Mãi bên nhau nhé!"];
    }

    // Tạo canvas cho text
    textCanvas = document.createElement('canvas');
    textCanvas.width = 2048;
    textCanvas.height = 1024;
    textContext = textCanvas.getContext('2d');

    textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.anisotropy = 16;

    const material = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const isMobile = window.innerWidth < 768;

    // Mobile: nhỏ hơn, Desktop: giữ nguyên
    const geometry = new THREE.PlaneGeometry(isMobile ? 28 : 35, isMobile ? 14 : 18);
    textMesh = new THREE.Mesh(geometry, material);

    // Vị trí: Mobile = phía trên trái tim, Desktop = bên phải
    const textX = isMobile ? 0 : 30;
    const textY = isMobile ? 22 : 8;  // Mobile: ngay trên trái tim
    const textZ = isMobile ? 15 : 10;
    textMesh.position.set(textX, textY, textZ);
    textMesh.rotation.y = isMobile ? 0 : -0.15;

    scene.add(textMesh);

    // Fade in animation - mobile opacity cao hơn
    const maxOpacity = isMobile ? 1 : 0.95;
    let opacity = 0;
    const fadeIn = () => {
        opacity += 0.02;
        material.opacity = Math.min(opacity, maxOpacity);
        if (opacity < maxOpacity) requestAnimationFrame(fadeIn);
    };
    setTimeout(fadeIn, 2000); // Delay 2s để đồng bộ với trái tim

    updateTextCanvas("");
    console.log('3D Text Board created with messages:', messageArray);
}

function updateTextCanvas(currentMessage) {
    if (!textContext) return;
    textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);

    // Lấy title từ config
    let title = "Happy Valentine";
    if (window.dataChristmasTree && window.dataChristmasTree.data && window.dataChristmasTree.data.title) {
        title = window.dataChristmasTree.data.title;
    }

    const centerX = textCanvas.width / 2;
    const maxWidth = textCanvas.width - 200;

    // Title với glow effect - Màu hồng
    // Tự động thu nhỏ font để title dài không bị cắt chữ, luôn canh giữa theo tâm canvas
    textContext.shadowColor = "rgba(255, 105, 180, 0.9)";
    textContext.shadowBlur = 60;
    textContext.fillStyle = "#ff69b4";
    textContext.textAlign = "center";
    let titleFontSize = 160;
    const setTitleFont = function(s) { textContext.font = "bold " + s + "px 'Pacifico', 'Mali', cursive"; };
    setTitleFont(titleFontSize);
    while (textContext.measureText(title).width > maxWidth && titleFontSize > 70) {
        titleFontSize -= 6;
        setTitleFont(titleFontSize);
    }
    textContext.fillText(title, centerX, 260);

    // Typing Content Text
    textContext.shadowColor = "rgba(255, 182, 193, 0.6)";
    textContext.shadowBlur = 30;
    const fontSize = 85;
    const lineHeight = 120;
    textContext.font = `bold ${fontSize}px "Mali", "Noto Sans", sans-serif`;
    textContext.fillStyle = "#ffffff";
    textContext.textAlign = "center";
    let startY = 480;

    const paragraphs = currentMessage.split('\n');
    paragraphs.forEach(paragraph => {
        let currentLine = '';
        const words = paragraph.split(' ');

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const testWidth = textContext.measureText(testLine).width;

            if (testWidth > maxWidth && i > 0) {
                textContext.fillText(currentLine.trim(), centerX, startY);
                currentLine = words[i] + ' ';
                startY += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        textContext.fillText(currentLine.trim(), centerX, startY);
        startY += lineHeight;
    });

    textTexture.needsUpdate = true;
}

function createStarfield() {
    const vertices = [];
    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        vertices.push(x, y, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.6
    });
    staticStars = new THREE.Points(geometry, material);
    scene.add(staticStars);
}

function createGalaxy() {
    const particleCount = 30000;
    const vertices = [];
    const colors = [];
    const maxRadius = 80;
    const spin = 1;

    // Màu gradient: hồng trái tim ở trong, tím ở ngoài
    const innerColor = new THREE.Color(0xfd9595);  // Màu trái tim (pastel pink)
    const midColor = new THREE.Color(0xffb8b8);    // Light pastel pink
    const outerColor = new THREE.Color(0x9966cc);  // Purple

    for (let i = 0; i < particleCount; i++) {
        const r = Math.pow(Math.random(), 1.5) * maxRadius;
        const angle = Math.random() * Math.PI * 2;
        const spinAngle = r * spin * 0.05;
        const x = Math.cos(angle + spinAngle) * r;
        const y = (Math.random() - 0.5) * 1.5;
        const z = Math.sin(angle + spinAngle) * r;
        vertices.push(x, y, z);

        // Tính màu dựa trên khoảng cách từ tâm
        const t = r / maxRadius;  // 0 = tâm, 1 = rìa
        let color;
        if (t < 0.5) {
            // Từ tâm đến giữa: hồng đậm -> hồng nhạt
            color = innerColor.clone().lerp(midColor, t * 2);
        } else {
            // Từ giữa ra ngoài: hồng nhạt -> tím
            color = midColor.clone().lerp(outerColor, (t - 0.5) * 2);
        }

        // Thêm chút variation ngẫu nhiên
        const variation = 0.1;
        color.r += (Math.random() - 0.5) * variation;
        color.g += (Math.random() - 0.5) * variation;
        color.b += (Math.random() - 0.5) * variation;

        colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    galaxy = new THREE.Points(geometry, material);
    galaxy.position.y = -20;
    scene.add(galaxy);
}

function createSnowfall() {
    const isMobile = window.innerWidth < 768;
    const snowCount = isMobile ? 8000 : 8000;
    const snowVertices = [];
    snowVelocities = [];

    for (let i = 0; i < snowCount; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = Math.random() * 200 - 50;
        const z = (Math.random() - 0.5) * 200;
        snowVertices.push(x, y, z);
        snowVelocities.push({
            y: Math.random() * 0.02 + 0.01,
            swayX: (Math.random() - 0.5) * 0.1,
            swayZ: (Math.random() - 0.5) * 0.1,
            freq: Math.random() * 0.5 + 0.2
        });
    }

    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowVertices, 3));
    const snowMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    scene.add(snowParticles);

    // Create snowflakes with textures
    createSnowflakes(isMobile);
}

function createSnowflakes(isMobile) {
    const totalFlakeCount = isMobile ? 350 : 400;
    const textureLoader = new THREE.TextureLoader();
    flakeParticlesArray = [];

    for (let i = 1; i <= 11; i++) {
        const texturePath = `./assets/christmas-tree/snowflakes/${i}.png`;
        const texture = textureLoader.load(texturePath, undefined, undefined, () => {
            // Fallback: use white circle if texture fails
        });

        const flakesForThisType = Math.floor(totalFlakeCount / 11);
        const flakeVertices = [];
        const flakeColors = [];

        for (let j = 0; j < flakesForThisType; j++) {
            const x = (Math.random() - 0.5) * 200;
            const y = Math.random() * 200 - 50;
            const z = (Math.random() - 0.5) * 200;
            flakeVertices.push(x, y, z);

            // Pink-white color variation
            const color = new THREE.Color(0xffffff);
            if (Math.random() > 0.85) {
                color.setHSL(0.9, 0.3, 0.95); // Pink pastel
            } else {
                color.setHSL(0, 0, 0.85 + Math.random() * 0.15);
            }
            flakeColors.push(color.r, color.g, color.b);

            flakeVelocities.push({
                y: Math.random() * 0.015 + 0.008,
                swayX: (Math.random() - 0.5) * 0.12,
                swayZ: (Math.random() - 0.5) * 0.12,
                freq: Math.random() * 0.4 + 0.1
            });
        }

        const flakeGeometry = new THREE.BufferGeometry();
        flakeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(flakeVertices, 3));
        flakeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(flakeColors, 3));

        const flakeMaterial = new THREE.PointsMaterial({
            size: 1.8,
            map: texture,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.75
        });

        const flakes = new THREE.Points(flakeGeometry, flakeMaterial);
        flakeParticlesArray.push(flakes);
        scene.add(flakes);
    }
}


class Firework {
    constructor(scene) {
        this.scene = scene;
        this.isDead = false;

        const startX = (Math.random() - 0.5) * 40;
        const startY = 20 + Math.random() * 30;
        const startZ = (Math.random() - 0.5) * 20;

        this.createExplosion(new THREE.Vector3(startX, startY, startZ));
    }

    createExplosion(position) {
        const particleCount = 80;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        // Random color for this firework
        const hue = Math.random();
        const color = new THREE.Color().setHSL(hue, 0.9, 0.6);

        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y, position.z);
            positions.push(position.x, position.y, position.z);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = 0.12 + Math.random() * 0.2;

            velocities.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed,
                z: Math.cos(phi) * speed
            });
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.LineSegments(geometry, material);
        this.mesh.userData = {
            velocities: velocities,
            life: 1.0,
            drag: 0.96
        };
        this.scene.add(this.mesh);
    }

    update() {
        if (this.isDead) return;

        const positions = this.mesh.geometry.attributes.position.array;
        const velocities = this.mesh.userData.velocities;
        const gravity = -0.005;
        const drag = this.mesh.userData.drag;

        this.mesh.userData.life -= 0.012;
        this.mesh.material.opacity = this.mesh.userData.life;

        for (let i = 0; i < velocities.length; i++) {
            velocities[i].x *= drag;
            velocities[i].y *= drag;
            velocities[i].z *= drag;
            velocities[i].y += gravity;

            const headIdx = i * 6;
            const tailIdx = i * 6 + 3;

            positions[tailIdx] += (positions[headIdx] - positions[tailIdx]) * 0.15;
            positions[tailIdx + 1] += (positions[headIdx + 1] - positions[tailIdx + 1]) * 0.15;
            positions[tailIdx + 2] += (positions[headIdx + 2] - positions[tailIdx + 2]) * 0.15;

            positions[headIdx] += velocities[i].x;
            positions[headIdx + 1] += velocities[i].y;
            positions[headIdx + 2] += velocities[i].z;
        }

        this.mesh.geometry.attributes.position.needsUpdate = true;

        if (this.mesh.userData.life <= 0) {
            this.isDead = true;
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

function animateEffects() {
    requestAnimationFrame(animateEffects);

    const time = Date.now() * 0.0005;
    const now = Date.now();

    // Fade in effects đồng bộ với animation trái tim
    if (effectsOpacity < 1 && effectsStartTime > 0) {
        const elapsed = now - effectsStartTime;
        effectsOpacity = Math.min(1, elapsed / EFFECTS_FADE_DURATION);
        setEffectsOpacity(effectsOpacity);
    }

    // Typing animation for text mesh
    if (textMesh && messageArray.length > 0) {
        const currentFullText = messageArray[msgIndex];
        if (!isWaiting) {
            if (now - lastTypingTime > typingSpeed) {
                charIndex++;
                const currentStr = currentFullText.substring(0, charIndex);
                const cursor = (Math.floor(now / 500) % 2 === 0 ? "|" : "");
                updateTextCanvas(currentStr + cursor);

                lastTypingTime = now;
                if (charIndex > currentFullText.length) {
                    isWaiting = true;
                    waitStartTime = now;
                }
            }
        } else {
            const cursor = (Math.floor(now / 500) % 2 === 0 ? "|" : "");
            updateTextCanvas(currentFullText + cursor);
            if (now - waitStartTime > 2500) {
                isWaiting = false;
                charIndex = 0;
                msgIndex = (msgIndex + 1) % messageArray.length;
                updateTextCanvas("");
            }
        }
    }

    // Animate snow
    if (snowParticles) {
        const snowPositions = snowParticles.geometry.attributes.position.array;
        for (let i = 0; i < snowPositions.length; i += 3) {
            const idx = i / 3;
            if (snowVelocities[idx]) {
                const vel = snowVelocities[idx];
                snowPositions[i + 1] -= vel.y;
                snowPositions[i] += Math.sin(time * vel.freq + i) * vel.swayX * 0.1;
                snowPositions[i + 2] += Math.cos(time * vel.freq + i) * vel.swayZ * 0.1;
                if (snowPositions[i + 1] < -60) snowPositions[i + 1] = 100;
            }
        }
        snowParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate snowflakes
    let flakeVelocityIndex = 0;
    flakeParticlesArray.forEach(flakes => {
        if (!flakes || !flakes.geometry) return;
        const flakePositions = flakes.geometry.attributes.position.array;
        for (let i = 0; i < flakePositions.length; i += 3) {
            if (flakeVelocities[flakeVelocityIndex]) {
                const vel = flakeVelocities[flakeVelocityIndex];
                flakePositions[i + 1] -= vel.y;
                flakePositions[i] += Math.sin(time * vel.freq + i) * vel.swayX * 0.1;
                flakePositions[i + 2] += Math.cos(time * vel.freq + i) * vel.swayZ * 0.1;
                if (flakePositions[i + 1] < -60) flakePositions[i + 1] = 100;
            }
            flakeVelocityIndex++;
        }
        flakes.geometry.attributes.position.needsUpdate = true;
        flakes.rotation.y += 0.0005;
    });

    // Rotate galaxy
    if (galaxy) {
        galaxy.rotation.y += 0.0003;
    }

    // Spawn and update fireworks
    if (Math.random() < 0.025) {
        fireworks.push(new Firework(scene));
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        if (fireworks[i].isDead) {
            fireworks.splice(i, 1);
        }
    }

    // Animate photo gallery
    animateGallery();

    // Render
    if (renderer) {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Update text position for mobile/desktop
        if (textMesh) {
            const isMobile = window.innerWidth < 768;
            textMesh.position.x = isMobile ? 0 : 30;
            textMesh.position.y = isMobile ? 22 : 8;
            textMesh.position.z = isMobile ? 15 : 10;
            textMesh.rotation.y = isMobile ? 0 : -0.15;
        }
    }
}

// Hàm set opacity cho tất cả effects
function setEffectsOpacity(opacity) {
    if (snowParticles && snowParticles.material) {
        snowParticles.material.opacity = 0.7 * opacity;
    }
    if (staticStars && staticStars.material) {
        staticStars.material.opacity = 0.6 * opacity;
    }
    if (galaxy && galaxy.material) {
        galaxy.material.opacity = 0.35 * opacity;
    }
    flakeParticlesArray.forEach(flakes => {
        if (flakes && flakes.material) {
            flakes.material.opacity = 0.75 * opacity;
        }
    });
}

// Hide bottom heart and ribbon after heart loads
function hideUnwantedElements() {
    // Try to find and hide bottom elements
    setInterval(() => {
        const canvas = document.querySelector('canvas:not(#effects-overlay)');
        if (canvas && canvas.__three_scene) {
            const scene = canvas.__three_scene;
            scene.traverse((child) => {
                // Hide ribbon (text ring)
                if (child.name === 'ribbon' || (child.isGroup && child.children.some(c => c.geometry?.type === 'CylinderGeometry'))) {
                    child.visible = false;
                }
            });
        }
    }, 500);
}

// Initialize
hideUnwantedElements();

// ==========================================
// 📸 PHOTO GALLERY SYSTEM - Click heart to show photos
// ==========================================
let mainPhotos = [];
let decoyPhotos = [];
let isGalleryOpen = false;
let galleryClickCount = 0;
let currentZoomedPhoto = null;
let isAutoSequenceRunning = false;
let autoSequenceIndex = 0;

// Config responsive cho gallery
function getGalleryConfig() {
    const isMobile = window.innerWidth < 768;
    return {
        spawn: { x: 0, y: 5, z: 10 },
        hover: {
            height: isMobile ? 10 : 12,
            spreadX: isMobile ? 5 : 8,
            centerZ: isMobile ? 45 : 50
        },
        stormCount: isMobile ? 8 : 12,
        photoSize: {
            width: isMobile ? 2.5 : 4,
            height: isMobile ? 3.2 : 5
        },
        zoomScale: isMobile ? 2 : 3,
        zoomDistance: isMobile ? 8 : 12,
        zoomDuration: 2500,
        delayBetween: 500,
        initialDelay: 1500
    };
}

const GALLERY_CONFIG = getGalleryConfig();

// Delay helper function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Tạo texture polaroid từ ảnh với caption
function createPolaroidTexture(imageUrl, caption = '') {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');

        // Vẽ khung polaroid trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 640);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(25, 25, 462, 462);

        // Vùng ảnh
        ctx.fillStyle = '#111111';
        ctx.fillRect(30, 30, 452, 452);

        // Hàm vẽ caption
        const drawCaption = () => {
            if (caption) {
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 28px "Mali", "Pacifico", cursive, Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Vị trí caption ở giữa vùng trắng phía dưới
                const captionY = 560;

                // Vẽ text với wrap nếu quá dài
                const maxWidth = 460;
                const words = caption.split(' ');
                let line = '';
                let lines = [];

                for (let word of words) {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && line !== '') {
                        lines.push(line.trim());
                        line = word + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line.trim());

                // Vẽ các dòng
                const lineHeight = 32;
                const startY = captionY - ((lines.length - 1) * lineHeight) / 2;
                lines.forEach((l, i) => {
                    ctx.fillText(l, 256, startY + i * lineHeight);
                });
            }
        };

        // Load ảnh
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Vẽ ảnh vào vùng ảnh
            ctx.drawImage(img, 35, 35, 442, 442);

            // Vẽ caption
            drawCaption();

            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve(texture);
        };
        img.onerror = () => {
            // Fallback nếu không load được ảnh
            ctx.fillStyle = '#ff69b4';
            ctx.fillRect(35, 35, 442, 442);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('❤️', 256, 280);

            // Vẽ caption
            drawCaption();

            const texture = new THREE.CanvasTexture(canvas);
            resolve(texture);
        };
        img.src = imageUrl;
    });
}

// Tạo texture polaroid trống cho decoy
function createEmptyPolaroidTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = '#ffcccc';
    ctx.fillRect(15, 15, 226, 226);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// Spawn decoy storm - polaroid trống bay ra phía trước như hiệu ứng
function spawnDecoyStorm() {
    if (!scene) return;

    const config = getGalleryConfig();
    const isMobile = window.innerWidth < 768;
    const emptyTex = createEmptyPolaroidTexture();
    const geometry = new THREE.BoxGeometry(isMobile ? 1.5 : 2, isMobile ? 1.8 : 2.5, 0.02);

    for (let i = 0; i < config.stormCount; i++) {
        const material = new THREE.MeshBasicMaterial({
            map: emptyTex,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            config.spawn.x + (Math.random() - 0.5) * 5,
            config.spawn.y,
            config.spawn.z
        );

        // Bay về phía trước (hướng camera) với spread ngang
        const spreadX = (Math.random() - 0.5) * 0.3;  // Spread ngang
        const spreadY = (Math.random() - 0.5) * 0.2;  // Spread dọc nhẹ
        const speed = 0.2 + Math.random() * 0.15;

        mesh.userData = {
            velocity: new THREE.Vector3(
                spreadX * speed,
                spreadY * speed,
                speed  // Bay về phía trước (Z+)
            ),
            rotVel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
            ),
            decay: 0.012 + Math.random() * 0.008
        };

        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        scene.add(mesh);
        decoyPhotos.push(mesh);
    }
}

// Spawn main gallery - ảnh chính bay ra và xếp theo cung
async function spawnMainGallery() {
    if (!scene) return;

    // Clear gallery cũ
    clearGallery();
    isGalleryOpen = true;

    // Lấy config mới (responsive)
    const config = getGalleryConfig();

    // Lấy danh sách ảnh và captions từ config
    let images = [];
    let captions = [];

    // Kiểm tra các nguồn dữ liệu theo thứ tự ưu tiên
    if (window.dataValentine && window.dataValentine.data && window.dataValentine.data.images) {
        images = window.dataValentine.data.images;
        captions = window.dataValentine.data.captions || [];
    } else if (window.Heartlove && window.Heartlove.data && window.Heartlove.data.images) {
        images = window.Heartlove.data.images;
        captions = window.Heartlove.data.captions || [];
    } else if (window.dataChristmasTree && window.dataChristmasTree.data && window.dataChristmasTree.data.images) {
        images = window.dataChristmasTree.data.images;
        captions = window.dataChristmasTree.data.captions || [];
    }

    // Fallback ảnh mặc định
    if (!images || images.length === 0) {
        images = [
            'default2.jpeg',
            'default3.jpeg',
            'default4.jpeg'
        ];
    }

    // Default captions - sử dụng khi không có captions trong data
    const defaultCaptions = [
        'Love you💖',
        'Love Day 🌹',
        'Yêu 💕',
        'Sweet Moments 🍫',
        'My Love 💘',
        'Yêu Thương 💗',
        'Forever Love 💞',
        'Khoảnh Khắc Ngọt Ngào ✨',
        'With Love 💝',
        'Love Wishes 🌹💕'
    ];

    // Nếu không có captions hoặc thiếu, dùng default
    if (!captions || captions.length === 0) {
        captions = defaultCaptions;
    }

    const geometry = new THREE.BoxGeometry(
        config.photoSize.width,
        config.photoSize.height,
        0.1
    );

    const imageCount = images.length;
    const h = config.hover;

    for (let i = 0; i < imageCount; i++) {
        const imageUrl = images[i];
        const caption = captions[i] || '';
        const texture = await createPolaroidTexture(imageUrl, caption);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Spawn từ vị trí trái tim
        mesh.position.set(
            config.spawn.x,
            config.spawn.y,
            config.spawn.z
        );

        // Tính vị trí target - xếp hàng ngang phía trước camera
        // Ảnh xếp từ trái sang phải, centered
        const totalWidth = (imageCount - 1) * h.spreadX;
        const startX = -totalWidth / 2;
        const targetX = startX + (i * h.spreadX);
        const targetY = h.height + Math.sin(i * 0.8) * 1.5;  // Chút variation chiều cao
        const targetZ = h.centerZ;  // Tất cả cùng độ sâu Z (phía trước)

        mesh.userData = {
            isMainPhoto: true,
            index: i,
            baseTarget: new THREE.Vector3(targetX, targetY, targetZ),
            floatPhase: Math.random() * Math.PI * 2,
            floatSpeed: 1.5 + Math.random() * 0.5,
            isZoomed: false,
            spawnTime: Date.now(),
            imageUrl: imageUrl
        };

        scene.add(mesh);
        mainPhotos.push(mesh);
    }

    // Spawn decoy storm
    spawnDecoyStorm();

    // Bắt đầu auto sequence sau khi spawn xong
    startAutoSequence();
}

// Clear gallery
function clearGallery() {
    isAutoSequenceRunning = false;
    autoSequenceIndex = 0;

    mainPhotos.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
        }
    });
    mainPhotos = [];

    decoyPhotos.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    });
    decoyPhotos = [];

    isGalleryOpen = false;
    currentZoomedPhoto = null;
}

// Auto sequence - tự động zoom từng ảnh
async function startAutoSequence() {
    if (isAutoSequenceRunning || mainPhotos.length === 0) return;

    isAutoSequenceRunning = true;
    autoSequenceIndex = 0;

    // Đợi ảnh bay ra vị trí
    await delay(GALLERY_CONFIG.initialDelay);

    // Auto zoom từng ảnh
    for (let i = 0; i < mainPhotos.length; i++) {
        if (!isAutoSequenceRunning) return;

        // Unzoom tất cả ảnh trước
        mainPhotos.forEach(p => p.userData.isZoomed = false);

        // Zoom ảnh hiện tại
        mainPhotos[i].userData.isZoomed = true;
        autoSequenceIndex = i;

        // Đợi thời gian hiển thị
        await delay(GALLERY_CONFIG.zoomDuration);
    }

    // Kết thúc - unzoom tất cả
    if (isAutoSequenceRunning) {
        mainPhotos.forEach(p => p.userData.isZoomed = false);
        await delay(GALLERY_CONFIG.delayBetween);

        // Clear gallery sau khi xong
        clearGallery();
    }
}

// Toggle zoom ảnh
function togglePhotoZoom(photo) {
    if (currentZoomedPhoto === photo) {
        // Unzoom
        photo.userData.isZoomed = false;
        currentZoomedPhoto = null;
    } else {
        // Unzoom ảnh cũ
        if (currentZoomedPhoto) {
            currentZoomedPhoto.userData.isZoomed = false;
        }
        // Zoom ảnh mới
        photo.userData.isZoomed = true;
        currentZoomedPhoto = photo;
    }
}

// Animation cho gallery trong main loop
function animateGallery() {
    const time = Date.now() * 0.001;

    // Animate decoy photos
    for (let i = decoyPhotos.length - 1; i >= 0; i--) {
        const p = decoyPhotos[i];
        p.position.add(p.userData.velocity);
        p.rotation.x += p.userData.rotVel.x;
        p.rotation.y += p.userData.rotVel.y;
        p.rotation.z += p.userData.rotVel.z;

        if (p.material.opacity > 0) {
            p.material.opacity -= p.userData.decay;
        }

        if (p.material.opacity <= 0 || p.position.z > 80) {
            scene.remove(p);
            decoyPhotos.splice(i, 1);
        }
    }

    // Animate main photos
    mainPhotos.forEach((p) => {
        const elapsed = (Date.now() - p.userData.spawnTime) / 1000;

        // Fade in
        if (p.material.opacity < 1) {
            p.material.opacity = Math.min(1, elapsed * 2);
        }

        if (p.userData.isZoomed) {
            // Zoom: Di chuyển về giữa màn hình, gần camera
            const config = getGalleryConfig();
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);
            const targetPos = new THREE.Vector3()
                .copy(camera.position)
                .add(cameraDir.multiplyScalar(config.zoomDistance));

            p.position.lerp(targetPos, 0.08);

            // Phóng to ảnh khi zoom (responsive scale)
            const targetScale = config.zoomScale;
            p.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

            // Quay mặt về phía camera
            const lookTarget = camera.position.clone();
            p.lookAt(lookTarget);
        } else {
            // Thu nhỏ về scale bình thường
            p.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            // Float animation
            const base = p.userData.baseTarget;
            const floatY = Math.sin(time * p.userData.floatSpeed + p.userData.floatPhase) * 0.5;
            const floatX = Math.cos(time * p.userData.floatSpeed * 0.7 + p.userData.floatPhase) * 0.3;

            const targetPos = new THREE.Vector3(
                base.x + floatX,
                base.y + floatY,
                base.z
            );

            p.position.lerp(targetPos, 0.05);

            // Ảnh hướng mặt về camera với chút nghiêng nhẹ
            p.lookAt(camera.position);
            // Thêm chút nghiêng nhẹ theo thời gian
            p.rotation.z = Math.sin(time * 0.5 + p.userData.floatPhase) * 0.05;
        }
    });
}

// Click handler cho gallery
function setupGalleryClickHandler() {
    document.addEventListener('click', (event) => {
        // Kiểm tra click vào vùng trái tim (giữa màn hình)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const clickX = event.clientX;
        const clickY = event.clientY;

        const distance = Math.sqrt(
            Math.pow(clickX - centerX, 2) +
            Math.pow(clickY - centerY, 2)
        );

        // Nếu click gần tâm (trong vùng trái tim)
        if (distance < 150) {
            cancelAutoTrigger();
            hideTapHint();
            if (!isGalleryOpen) {
                // Mở gallery
                spawnMainGallery();
            } else {
                // Click khi đang mở -> dừng auto-sequence và đóng gallery
                isAutoSequenceRunning = false;
                clearGallery();
            }
            return; // Không xử lý click vào ảnh nếu click vào trái tim
        }

        // Kiểm tra click vào ảnh để zoom (chỉ khi không auto-sequence)
        if (isGalleryOpen && mainPhotos.length > 0 && !isAutoSequenceRunning) {
            // Sử dụng raycaster để detect click vào ảnh
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(mainPhotos);
            if (intersects.length > 0) {
                togglePhotoZoom(intersects[0].object);
            }
        }
    });
}

// Hide tap hint khi gallery mở
function hideTapHint() {
    const hint = document.getElementById('tapHint');
    if (hint) {
        hint.classList.add('hidden');
    }
}

// Auto-trigger gallery sau 10 giây nếu chưa tương tác
let autoTriggerTimeout = null;
let hasInteracted = false;

function setupAutoTrigger() {
    autoTriggerTimeout = setTimeout(() => {
        if (!hasInteracted && !isGalleryOpen) {
            hideTapHint();
            spawnMainGallery();
        }
    }, 10000); // 10 giây
}

// Cancel auto-trigger khi user tương tác
function cancelAutoTrigger() {
    hasInteracted = true;
    if (autoTriggerTimeout) {
        clearTimeout(autoTriggerTimeout);
        autoTriggerTimeout = null;
    }
}

// Setup gallery click handler sau khi scene ready
setTimeout(() => {
    if (scene) {
        setupGalleryClickHandler();
        setupAutoTrigger();
        console.log('Photo gallery system initialized - Click heart to show photos!');
    }
}, 3000);

export { initStandaloneEffects, spawnMainGallery, clearGallery, animateGallery };
