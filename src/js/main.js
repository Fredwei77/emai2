// 主JavaScript文件

/**
 * 网站主要功能初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('网站已加载');
    
    // 初始化导航组件
    if (typeof NavigationManager !== 'undefined') {
        new NavigationManager();
    }

    // 初始化联系表单（仅在存在表单时生效）
    if (typeof ContactForm !== 'undefined') {
        new ContactForm('#contact-form');
    }

    // 增强图片体验
    if (typeof enhanceResponsiveImages !== 'undefined') {
        enhanceResponsiveImages();
    }

    // 注入结构化数据（JSON-LD）
    injectStructuredData();
    
    // 平滑滚动
    initSmoothScrolling();
    
    // 性能监控
    logPerformanceMetrics();

    // 轻量背景动效
    initHeroBackgroundEffect();
});

/**
 * 轻量粒子/光线背景动效（性能友好）
 */
function initHeroBackgroundEffect() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let width, height, dpr;
    const particles = [];
    const MAX = 40; // 轻量颗粒数量

    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < MAX; i++) {
            particles.push({
                x: rand(0, width), y: rand(0, height),
                r: rand(0.6, 1.6),
                vx: rand(-0.2, 0.2), vy: rand(-0.15, 0.15),
                alpha: rand(0.3, 0.8)
            });
        }
    }

    function drawLightRays() {
        // 轻量光带
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function step() {
        ctx.clearRect(0, 0, width, height);
        drawLightRays();
        for (const p of particles) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < -5) p.x = width + 5; else if (p.x > width + 5) p.x = -5;
            if (p.y < -5) p.y = height + 5; else if (p.y > height + 5) p.y = -5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
            ctx.fill();
        }
        requestAnimationFrame(step);
    }

    const onResize = () => { resize(); initParticles(); };
    window.addEventListener('resize', onResize);
    resize();
    initParticles();
    step();
}


/**
 * 注入基础的 JSON-LD 结构化数据（WebSite、WebPage、BreadcrumbList）
 */
function injectStructuredData() {
    try {
        const siteName = document.querySelector('meta[name="author"]')?.content || '现代化网站';
        const title = document.title || siteName;
        const description = document.querySelector('meta[name="description"]')?.content || '';
        const url = (typeof window !== 'undefined') ? window.location.origin + window.location.pathname : '/';

        const scripts = [];
        
        // WebSite
        scripts.push({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': siteName,
            'url': window.location.origin || '/',
            'potentialAction': {
                '@type': 'SearchAction',
                'target': `${window.location.origin}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            }
        });
        
        // WebPage
        scripts.push({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'name': title,
            'url': url,
            'description': description
        });

        // Breadcrumb
        const path = window.location.pathname || '/';
        const crumbs = [
            { name: '首页', path: '/' }
        ];
        if (path.includes('about')) crumbs.push({ name: '关于我们', path: '/about.html' });
        if (path.includes('services')) crumbs.push({ name: '服务', path: '/services.html' });
        if (path.includes('contact')) crumbs.push({ name: '联系我们', path: '/contact.html' });
        if (crumbs.length > 1) {
            scripts.push({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                'itemListElement': crumbs.map((c, i) => ({
                    '@type': 'ListItem',
                    'position': i + 1,
                    'name': c.name,
                    'item': (window.location.origin || '') + c.path
                }))
            });
        }

        scripts.forEach(obj => {
            const el = document.createElement('script');
            el.type = 'application/ld+json';
            el.text = JSON.stringify(obj);
            document.head.appendChild(el);
        });
    } catch (e) {
        console.warn('JSON-LD 注入失败:', e);
    }
}

/**
 * 初始化平滑滚动
 */
function initSmoothScrolling() {
    // 为所有内部链接添加平滑滚动
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * 记录性能指标
 */
function logPerformanceMetrics() {
    // 页面加载完成后记录性能指标
    window.addEventListener('load', function() {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            
            if (perfData) {
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
                
                console.log(`页面加载时间: ${loadTime}ms`);
                console.log(`DOM内容加载时间: ${domContentLoaded}ms`);
            }
        }
    });
}

/**
 * 工具函数：防抖
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 工具函数：节流
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 初始化页面动画效果
 */
function initPageAnimations() {
    // 观察器配置
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 观察所有需要动画的元素
    const animatedElements = document.querySelectorAll('.feature-card, .modern-card, .team-card');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

/**
 * 初始化视差滚动效果
 */
function initParallaxEffect() {
    const heroSections = document.querySelectorAll('.hero-section');
    
    if (heroSections.length === 0) return;

    const handleScroll = throttle(() => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        heroSections.forEach(section => {
            section.style.transform = `translateY(${rate}px)`;
        });
    }, 10);

    window.addEventListener('scroll', handleScroll);
}

/**
 * 初始化卡片悬停效果
 */
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.modern-card, .feature-card, .team-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// 在DOM加载完成后初始化新功能
document.addEventListener('DOMContentLoaded', function() {
    // 原有功能...
    console.log('网站已加载');
    
    if (typeof NavigationManager !== 'undefined') {
        new NavigationManager();
    }

    if (typeof ContactForm !== 'undefined') {
        new ContactForm('#contact-form');
    }

    if (typeof enhanceResponsiveImages !== 'undefined') {
        enhanceResponsiveImages();
    }

    injectStructuredData();
    initSmoothScrolling();
    logPerformanceMetrics();
    
    // 新增功能
    initPageAnimations();
    initParallaxEffect();
    initCardHoverEffects();
});

// 导出工具函数供其他模块使用
window.debounce = debounce;
window.throttle = throttle;