// 组件逻辑文件

/**
 * 移动端导航菜单组件
 */
class MobileNavigation {
    constructor() {
        this.menuButton = document.getElementById('mobile-menu-button');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.hamburgerIcon = document.getElementById('hamburger-icon');
        this.mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        this.isOpen = false;
        this.focusableElements = [];
        
        this.init();
    }
    
    init() {
        if (this.menuButton && this.mobileMenu) {
            // 基本事件监听
            this.menuButton.addEventListener('click', () => this.toggleMenu());
            
            // 触摸支持
            this.menuButton.addEventListener('touchstart', (e) => this.handleTouch(e));
            
            // 点击菜单外部关闭菜单
            document.addEventListener('click', (e) => this.handleOutsideClick(e));
            
            // ESC键关闭菜单
            document.addEventListener('keydown', (e) => this.handleKeydown(e));
            
            // 窗口大小改变时关闭移动菜单
            window.addEventListener('resize', () => this.handleResize());
            
            // 移动端菜单链接点击后关闭菜单
            this.mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => this.closeMenu());
            });
            
            // 获取可聚焦元素
            this.updateFocusableElements();
        }
    }
    
    updateFocusableElements() {
        if (!this.mobileMenu) return;
        this.focusableElements = this.mobileMenu.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
    }
    
    handleTouch(e) {
        // 防止触摸时的双击缩放
        e.preventDefault();
    }
    
    toggleMenu() {
        this.isOpen = !this.isOpen;
        this.updateMenuState();
    }
    
    openMenu() {
        this.isOpen = true;
        this.updateMenuState();
    }
    
    closeMenu() {
        this.isOpen = false;
        this.updateMenuState();
    }
    
    updateMenuState() {
        if (!this.mobileMenu || !this.menuButton) return;
        if (this.isOpen) {
            this.mobileMenu.classList.remove('hidden');
            this.mobileMenu.classList.add('show');
            this.menuButton.setAttribute('aria-expanded', 'true');
            this.menuButton.setAttribute('aria-label', '关闭导航菜单');
            
            if (this.hamburgerIcon) {
                this.hamburgerIcon.classList.add('open');
            }
            
            // 聚焦到第一个菜单项
            setTimeout(() => {
                this.updateFocusableElements();
                if (this.focusableElements.length > 0) {
                    this.focusableElements[0].focus();
                }
            }, 100);
            
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        } else {
            this.mobileMenu.classList.add('hidden');
            this.mobileMenu.classList.remove('show');
            this.menuButton.setAttribute('aria-expanded', 'false');
            this.menuButton.setAttribute('aria-label', '打开导航菜单');
            
            if (this.hamburgerIcon) {
                this.hamburgerIcon.classList.remove('open');
            }
            
            // 恢复背景滚动
            document.body.style.overflow = '';
        }
    }
    
    handleOutsideClick(e) {
        if (this.isOpen && 
            this.mobileMenu && this.menuButton &&
            !this.mobileMenu.contains(e.target) && 
            !this.menuButton.contains(e.target)) {
            this.closeMenu();
        }
    }
    
    handleKeydown(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.closeMenu();
            this.menuButton && this.menuButton.focus();
        }
        
        // Tab键循环聚焦
        if (e.key === 'Tab' && this.isOpen) {
            this.handleTabNavigation(e);
        }
        
        // 方向键导航
        if (this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            this.handleArrowNavigation(e.key);
        }
    }
    
    handleTabNavigation(e) {
        if (this.focusableElements.length === 0) return;
        const firstFocusable = this.focusableElements[0];
        const lastFocusable = this.focusableElements[this.focusableElements.length - 1];
        
        if (e.shiftKey) {
            // Shift + Tab (向后)
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab (向前)
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }
    
    handleArrowNavigation(key) {
        const currentIndex = Array.from(this.focusableElements).indexOf(document.activeElement);
        let nextIndex = currentIndex;
        
        if (key === 'ArrowDown') {
            nextIndex = currentIndex + 1;
            if (nextIndex >= this.focusableElements.length) {
                nextIndex = 0;
            }
        } else if (key === 'ArrowUp') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
                nextIndex = this.focusableElements.length - 1;
            }
        }
        
        if (this.focusableElements[nextIndex]) {
            this.focusableElements[nextIndex].focus();
        }
    }
    
    handleResize() {
        // 在桌面尺寸时关闭移动菜单
        if (window.innerWidth >= 768 && this.isOpen) {
            this.closeMenu();
        }
    }
}

/**
 * 导航组件管理器
 */
class NavigationManager {
    constructor() {
        this.mobileNav = null;
        this.init();
    }
    
    init() {
        // 初始化移动导航
        this.mobileNav = new MobileNavigation();
        
        // 设置当前页面的活跃状态
        this.setActiveMenuItem();
    }
    
    setActiveMenuItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // 处理首页
            if (currentPath === '/' || currentPath === '/index.html') {
                if (href === '/' || href === './index.html') {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            } else {
                // 处理其他页面
                if (href && currentPath.includes(href.replace('./', ''))) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            }
        });
    }
}

/**
 * 联系表单组件：验证与提交
 * - 默认支持客户端验证与用户反馈
 * - 若设置 data-endpoint 或 action，则会以 POST JSON 或常规表单方式提交
 */
class ContactForm {
    constructor(selector = '#contact-form') {
        this.form = document.querySelector(selector);
        if (!this.form) return; // 非联系页无需初始化

        // 字段与错误区域
        this.fields = {
            name: this.form.querySelector('#name'),
            email: this.form.querySelector('#email'),
            phone: this.form.querySelector('#phone'),
            subject: this.form.querySelector('#subject'),
            message: this.form.querySelector('#message'),
        };
        this.errors = {
            name: this.form.querySelector('#name-error'),
            email: this.form.querySelector('#email-error'),
            phone: this.form.querySelector('#phone-error'),
            subject: this.form.querySelector('#subject-error'),
            message: this.form.querySelector('#message-error'),
        };

        // UI 元素
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.submitText = this.form.querySelector('.submit-text');
        this.loadingText = this.form.querySelector('.loading-text');
        this.successBox = document.getElementById('form-success');
        this.errorBox = document.getElementById('form-error');

        // 配置
        this.endpoint = this.form.getAttribute('data-endpoint') || this.form.getAttribute('action') || '';
        this.method = (this.form.getAttribute('method') || 'POST').toUpperCase();

        this.attachEvents();
    }

    attachEvents() {
        // 输入实时验证
        ['input', 'change', 'blur'].forEach(evt => {
            this.form.addEventListener(evt, (e) => {
                const target = e.target;
                if (!target || !('id' in target)) return;
                const id = target.id;
                if (this.fields[id]) {
                    this.validateField(id);
                }
            }, true);
        });

        // 提交处理
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.clearAlerts();

            const valid = this.validateForm();
            if (!valid) return;

            try {
                this.setSubmitting(true);
                const payload = this.getPayload();

                if (this.endpoint) {
                    // 优先 JSON 提交（若 endpoint 明确），否则遵循原 action 行为
                    const isJsonEndpoint = this.form.hasAttribute('data-endpoint');
                    if (isJsonEndpoint) {
                        await this.postJson(this.endpoint, payload);
                        this.showSuccess();
                        this.form.reset();
                    } else {
                        // 让浏览器按原表单方式提交（如 Formspree）
                        this.form.submit();
                    }
                } else {
                    // 无端点：本地模拟成功（可替换为邮件链接或后端集成）
                    // localStorage 暂存，便于后续后端接入前保留线索
                    const drafts = JSON.parse(localStorage.getItem('contactFormDrafts') || '[]');
                    drafts.push({ ...payload, timestamp: new Date().toISOString() });
                    localStorage.setItem('contactFormDrafts', JSON.stringify(drafts));
                    this.showSuccess();
                    this.form.reset();
                }
            } catch (err) {
                console.error('提交失败:', err);
                this.showError('发送失败，请稍后重试或使用其他联系方式。');
            } finally {
                this.setSubmitting(false);
            }
        });
    }

    getPayload() {
        return {
            name: this.fields.name?.value?.trim() || '',
            email: this.fields.email?.value?.trim() || '',
            phone: this.fields.phone?.value?.trim() || '',
            subject: this.fields.subject?.value || '',
            message: this.fields.message?.value?.trim() || '',
        };
    }

    async postJson(url, data) {
        const resp = await fetch(url, {
            method: this.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!resp.ok) {
            const text = await resp.text().catch(()=>'');
            throw new Error(`HTTP ${resp.status}: ${text}`);
        }
        return resp.json().catch(()=>({ ok: true }));
    }

    setSubmitting(isSubmitting) {
        if (!this.submitBtn) return;
        this.submitBtn.disabled = isSubmitting;
        if (this.submitText && this.loadingText) {
            this.submitText.classList.toggle('hidden', isSubmitting);
            this.loadingText.classList.toggle('hidden', !isSubmitting);
        }
    }

    validateForm() {
        const fields = ['name', 'email', 'subject', 'message'];
        let allValid = true;
        fields.forEach(f => {
            const v = this.validateField(f);
            allValid = allValid && v;
        });
        // 可选字段
        this.validateField('phone');
        return allValid;
    }

    validateField(field) {
        const el = this.fields[field];
        const err = this.errors[field];
        if (!el || !err) return true;
        let msg = '';

        const val = (el.value || '').trim();
        switch (field) {
            case 'name':
                if (!val) msg = '请输入您的姓名';
                else if (val.length < 2) msg = '姓名至少为2个字符';
                break;
            case 'email':
                if (!val) msg = '请输入邮箱';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = '邮箱格式不正确';
                break;
            case 'subject':
                if (!val) msg = '请选择主题';
                break;
            case 'message':
                if (!val) msg = '请输入消息内容';
                else if (val.length < 10) msg = '消息内容至少为10个字符';
                break;
            case 'phone':
                if (val && !/^[0-9+\-()\s]{6,20}$/.test(val)) msg = '电话格式不正确';
                break;
        }

        if (msg) {
            err.textContent = msg;
            err.classList.remove('hidden');
            el.setAttribute('aria-invalid', 'true');
            return false;
        } else {
            err.textContent = '';
            err.classList.add('hidden');
            el.removeAttribute('aria-invalid');
            return true;
        }
    }

    clearAlerts() {
        if (this.successBox) this.successBox.classList.add('hidden');
        if (this.errorBox) this.errorBox.classList.add('hidden');
    }

    showSuccess() {
        if (this.successBox) this.successBox.classList.remove('hidden');
        if (this.errorBox) this.errorBox.classList.add('hidden');
    }

    showError(message) {
        if (this.errorBox) {
            this.errorBox.classList.remove('hidden');
            const textNode = this.errorBox.querySelector('.error-text');
            if (textNode) textNode.textContent = message;
        }
        if (this.successBox) this.successBox.classList.add('hidden');
    }
}

/**
 * 响应式图片增强：
 * - 自动为未设置的 <img> 增加 loading="lazy" 和 decoding="async"
 * - 统一注册错误占位处理
 */
function enhanceResponsiveImages(options = {}) {
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
        if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.alt) img.alt = '图片';

        const onError = () => {
            img.style.background = '#f3f4f6';
            img.style.objectFit = 'contain';
        };
        img.removeEventListener('error', onError);
        img.addEventListener('error', onError, { once: true });
    });
}

// 导出组件供其他模块使用
window.NavigationManager = NavigationManager;
window.MobileNavigation = MobileNavigation;
window.ContactForm = ContactForm;
window.enhanceResponsiveImages = enhanceResponsiveImages;
