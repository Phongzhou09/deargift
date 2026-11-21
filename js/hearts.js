// Falling Hearts Effect
document.addEventListener("DOMContentLoaded", () => {
    // Check if user disabled hearts (optional feature)
    if (localStorage.getItem('disableHearts') === 'true') return;
    
    // Inject CSS for hearts if not already present
    if (!document.getElementById('hearts-style')) {
        const style = document.createElement('style');
        style.id = 'hearts-style';
        style.innerHTML = `
            .falling-heart {
                position: fixed;
                top: -10vh;
                font-size: 1.5rem;
                color: #f472b6; /* Tailwind pink-400 */
                user-select: none;
                pointer-events: none;
                z-index: 40; /* Above page sections; pointer-events:none keeps clicks working */
                animation: dgHeartFall linear forwards;
                opacity: 0.6;
                text-shadow: 0 0 5px rgba(244, 114, 182, 0.3);
            }
            @keyframes dgHeartFall {
                0% {
                    transform: translateY(-10vh) translateX(0) rotate(0deg) scale(1);
                }
                100% {
                    transform: translateY(110vh) translateX(100px) rotate(360deg) scale(0.8);
                }
            }
            @keyframes dgHeartSway {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(20px); }
            }
            .click-heart {
                position: fixed;
                font-size: 1.2rem;
                pointer-events: none;
                z-index: 9999;
                user-select: none;
                animation: dgClickHeartUp 1s ease-out forwards;
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 2px 4px rgba(244, 114, 182, 0.4));
            }
            @keyframes dgClickHeartUp {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -200%) scale(1.5); }
            }
        `;
        document.head.appendChild(style);
    }

    function createHeart() {
        const heart = document.createElement('div');
        heart.classList.add('falling-heart');
        heart.innerHTML = '❤️'; // Unicode heart
        
        // Randomize properties
        const left = Math.random() * 100;
        const duration = Math.random() * 6 + 6; // 6-12s
        const delay = Math.random() * 2;
        const size = Math.random() * 12 + 10; // 10-22px
        const opacity = Math.random() * 0.4 + 0.2; // 0.2 - 0.6
        const isSwaying = Math.random() > 0.5;
        
        heart.style.left = `${left}vw`;
        heart.style.animationDuration = `${duration}s`;
        heart.style.animationDelay = `${delay}s`;
        heart.style.fontSize = `${size}px`;
        heart.style.opacity = opacity;
        
        // Sometimes add a sway animation wrapper
        if (isSwaying) {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.top = '-10vh';
            wrapper.style.left = `${left}vw`;
            wrapper.style.animation = `dgHeartSway ${Math.random() * 3 + 2}s ease-in-out infinite alternate`;
            wrapper.style.zIndex = '40';
            wrapper.style.pointerEvents = 'none';
            
            heart.style.left = '0';
            heart.style.top = '0';
            heart.style.position = 'relative';
            wrapper.appendChild(heart);
            document.body.appendChild(wrapper);
            if (wrapper.animate) {
                wrapper.style.animation = 'none';
                wrapper.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(20px)' }
                ], { duration: (Math.random() * 3 + 2) * 1000, easing: 'ease-in-out', iterations: Infinity, direction: 'alternate' });
            }

            setTimeout(() => { wrapper.remove(); }, (duration + delay) * 1000);
        } else {
            document.body.appendChild(heart);
            setTimeout(() => { heart.remove(); }, (duration + delay) * 1000);
        }

        // Same reason as the click heart: reduced-motion CSS kills CSS animations.
        if (heart.animate) {
            heart.style.animation = 'none';
            heart.animate([
                { transform: 'translateY(-10vh) translateX(0) rotate(0deg) scale(1)' },
                { transform: 'translateY(110vh) translateX(100px) rotate(360deg) scale(0.8)' }
            ], { duration: duration * 1000, delay: delay * 1000, easing: 'linear', fill: 'both' });
        }
    }
    
    // Keep the ambience subtle so particles never compete with the content.
    for (let i = 0; i < 8; i++) {
        setTimeout(createHeart, Math.random() * 3000);
    }
    
    // Continuously create hearts
    setInterval(createHeart, 1400);

    // Click effect hearts
    document.addEventListener('click', function(e) {
        const clickHeart = document.createElement('div');
        clickHeart.classList.add('click-heart');
        const emojis = ['❤️', '💖', '💗', '💕', '💘'];
        clickHeart.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
        clickHeart.style.left = e.clientX + 'px';
        clickHeart.style.top = e.clientY + 'px';
        // Random rotation for natural feel
        const rotation = Math.random() * 40 - 20; 
        clickHeart.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        // Theme CSS kills CSS animations under prefers-reduced-motion (!important),
        // so drive this one via the Web Animations API, which that rule can't override.
        clickHeart.style.animation = 'none';

        document.body.appendChild(clickHeart);
        if (clickHeart.animate) {
            clickHeart.animate([
                { opacity: 1, transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(1)` },
                { opacity: 0, transform: `translate(-50%, -200%) rotate(${rotation}deg) scale(1.5)` }
            ], { duration: 1000, easing: 'ease-out', fill: 'forwards' });
        }
        setTimeout(() => { clickHeart.remove(); }, 1000);
    });
});
