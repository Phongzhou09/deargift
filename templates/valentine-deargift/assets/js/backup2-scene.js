/**
 * Valentine DearGift - 3D Backup Scene & Heart Particles
 * Renders glowing heart / particles sphere and handles interactive letter & effects.
 */
(function() {
    window.initBackup2Scene = function() {
        var container = window.SCENE3D_CONTAINER || document.getElementById('scene3d-root');
        if (!container) return;

        container.style.display = 'block';
        container.classList.add('visible');

        var hint = document.getElementById('sphere-click-hint');
        if (hint) {
            hint.classList.add('show');
            hint.setAttribute('aria-hidden', 'false');
        }

        // If Three.js canvas already exists, don't recreate
        if (document.getElementById('threejs-canvas')) return;

        var width = container.clientWidth || window.innerWidth;
        var height = container.clientHeight || window.innerHeight;

        var scene = new (window.THREE ? window.THREE.Scene : Object)();
        var camera = new window.THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.z = 40;

        var renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.domElement.id = 'threejs-canvas';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '0';
        container.insertBefore(renderer.domElement, container.firstChild);

        // OrbitControls if available
        var controls = null;
        if (window.THREE && window.THREE.OrbitControls) {
            controls = new window.THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.2;
        }

        // Create 3D heart particle cloud
        var particleCount = 1200;
        var geometry = new window.THREE.BufferGeometry();
        var positions = new Float32Array(particleCount * 3);
        var colors = new Float32Array(particleCount * 3);

        for (var i = 0; i < particleCount; i++) {
            // Heart math surface: x = 16sin^3(t), y = 13cos(t)-5cos(2t)-2cos(3t)-cos(4t)
            var t = Math.PI * 2 * Math.random();
            var u = Math.PI * (Math.random() - 0.5);
            var scale = 0.8 + Math.random() * 0.4;
            
            var x = 16 * Math.pow(Math.sin(t), 3) * Math.cos(u) * scale;
            var y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale;
            var z = 10 * Math.sin(u) * Math.sin(t) * scale;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Gradient colors from pink to purple
            var mixRatio = Math.random();
            colors[i * 3] = 1.0;                          // R
            colors[i * 3 + 1] = 0.35 + 0.35 * mixRatio;   // G
            colors[i * 3 + 2] = 0.65 + 0.35 * mixRatio;   // B
        }

        geometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new window.THREE.BufferAttribute(colors, 3));

        var material = new window.THREE.PointsMaterial({
            size: 1.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: window.THREE.AdditiveBlending
        });

        var particles = new window.THREE.Points(geometry, material);
        scene.add(particles);

        // Ambient glow light
        var light = new window.THREE.PointLight(0xff69b4, 2, 100);
        light.position.set(0, 0, 10);
        scene.add(light);

        // Animation loop
        var clock = new window.THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            var delta = clock.getDelta();
            particles.rotation.y += 0.008;
            particles.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
            if (controls) controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Responsive resize
        window.addEventListener('resize', function() {
            var w = container.clientWidth || window.innerWidth;
            var h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });

        // Trigger clicking hint behavior
        if (hint) {
            hint.addEventListener('click', function() {
                var cupidOverlay = document.getElementById('cupid-letter-overlay');
                if (cupidOverlay) {
                    cupidOverlay.style.display = 'block';
                    cupidOverlay.classList.add('visible');
                }
                hint.style.display = 'none';
            });
        }
    };
})();
