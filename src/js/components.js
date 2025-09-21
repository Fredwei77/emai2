// 组件逻辑文件

// -- WeChat/KF floating button --
(function(){
  try {
    const root = document.body;
    const kfUrl = root?.getAttribute('data-wechat-kf-url') || '';
    if (!kfUrl) return;

    // inject styles (minimal)
    const style = document.createElement('style');
    style.textContent = `
    .kf-fab{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
    .kf-btn{background:#0A7EFA;color:#fff;border-radius:9999px;padding:10px 14px;display:flex;align-items:center;gap:8px;box-shadow:0 6px 16px rgba(0,0,0,.15);cursor:pointer;border:0;font-size:14px}
    .kf-btn:hover{background:#066bd3}
    .kf-drawer{position:fixed;right:16px;bottom:72px;width:360px;max-width:94vw;max-height:70vh;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);overflow:hidden;display:none}
    .kf-drawer.open{display:block}
    .kf-drawer-header{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb}
    .kf-drawer-title{font-size:13px;color:#111827}
    .kf-drawer-actions{display:flex;align-items:center;gap:8px}
    .kf-drawer-close{background:transparent;border:0;color:#374151;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px}
    .kf-drawer-close:hover{background:#eef2f7;color:#374151}
    .kf-drawer-close svg{width:20px;height:20px;display:block}

    /* AI chat widget */
    .aiw{display:flex;flex-direction:column;height:min(70vh,640px)}
    .aiw-messages{flex:1;overflow:auto;padding:12px;background:#fff}
    .aiw-msg{margin-bottom:8px;padding:10px;border-radius:10px;white-space:pre-wrap;line-height:1.5}
    .aiw-msg-user{background:#e6f0ff;color:#0f172a}
    .aiw-msg-bot{background:#f3f4f6;color:#111827}
    .aiw-input{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fafafa}
    .aiw-input input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-size:14px}
    .aiw-input button{border:0;border-radius:8px;padding:10px 12px;cursor:pointer;font-size:14px}
    .aiw-input #aiw-send{background:#0A7EFA;color:#fff}
    .aiw-input #aiw-send:disabled{opacity:.6;cursor:not-allowed}
    .aiw-input #aiw-stop{background:#e5e7eb;color:#111827}

    .aiw-toolbar{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-top:1px solid #e5e7eb;background:#fafafa}
    .aiw-faq{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;border-top:1px solid #e5e7eb;background:#fbfbfb}
    .aiw-faq button{font-size:12px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;cursor:pointer}
    .aiw-faq button:hover{background:#f3f4f6}
    .aiw-qr{width:96px;height:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:4px;cursor:zoom-in}
    .aiw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:60}
    .aiw-overlay img{max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4)}

    /* Responsive sizing */
    @media (min-width:1024px){
      .kf-drawer{right:24px;bottom:80px;width:420px;max-height:75vh}
    }
    @media (min-width:1536px){
      .kf-drawer{width:480px}
    }
    @media (max-width:768px){
      .kf-drawer{right:2vw;bottom:calc(16px + env(safe-area-inset-bottom));left:2vw;width:96vw;max-height:80vh;border-radius:16px}
      .aiw{height:min(78vh,600px)}
      .aiw-input input{font-size:16px;padding:12px}
      .aiw-input button{padding:12px 14px}
    }
    @media (max-width:480px){
      .kf-drawer{left:0;right:0;bottom:calc(8px + env(safe-area-inset-bottom));width:100vw;max-height:88vh;border-radius:16px 16px 0 0}
      .kf-fab{right:12px;bottom:12px}
      .aiw{height:min(82vh,640px)}
    }
    `
    document.head.appendChild(style);

    // Additional viewport-aware adjustments for mobile/tablet
    try {
      const respStyle = document.createElement('style');
      respStyle.textContent = `
      @supports (height: 100dvh) {
        .aiw{height:min(78dvh,640px)}
        @media (max-width:480px){ .aiw{height:min(82dvh,640px)} }
        @media (max-width:768px){ .aiw{height:min(78dvh,600px)} }
        .kf-drawer{max-height:80dvh}
        @media (min-width:1024px){ .kf-drawer{max-height:75dvh} }
        @media (max-width:480px){ .kf-drawer{max-height:88dvh} }
      }
      @media (min-width:768px) and (max-width:1023.98px){
        .kf-drawer{right:24px;bottom:80px;width:440px;max-width:calc(100vw - 48px);max-height:80vh}
        .aiw{height:min(75vh,640px)}
      }
      @media (orientation: landscape) and (max-height:520px){
        .kf-drawer{max-height:92vh}
        .aiw{height:min(90vh,520px)}
      }
      `;
      document.head.appendChild(respStyle);
    } catch {}

    // floating container
    const fab = document.createElement('div');
    fab.className = 'kf-fab';
    fab.innerHTML = `
      <div class="kf-drawer" id="kf-drawer" role="dialog" aria-label="AI 客服">
        <div class="kf-drawer-header">
          <div class="kf-drawer-title">AI 客服</div>
          <div class="kf-drawer-actions">
            <button class="kf-drawer-close" id="kf-exit" aria-label="退出">退出</button>
            <button class="kf-drawer-close" id="kf-close" aria-label="关闭对话框" title="关闭">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 L18 18 M6 18 L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="aiw" id="aiw">
          <div class="aiw-messages" id="aiw-messages" aria-live="polite" aria-busy="false"></div>
          <div class="aiw-faq" id="aiw-faq">
            <button data-q="你们提供哪些服务？">你们提供哪些服务？</button>
            <button data-q="如何获取报价？">如何获取报价？</button>
            <button data-q="项目周期一般多久？">项目周期一般多久？</button>
            <button data-q="是否支持后期维护？">是否支持后期维护？</button>
          </div>
          <div class="aiw-toolbar">
            <button id="aiw-human" type="button" title="转人工">转人工</button>
            <small id="aiw-timer" class="text-gray-500"></small>
          </div>
          <div class="aiw-input">
            <input id="aiw-input" type="text" placeholder="请输入您的问题..." aria-label="AI 客服输入框" />
            <button id="aiw-stop" type="button">停止</button>
            <button id="aiw-send" type="button">发送</button>
          </div>
        </div>
      </div>
      <button class="kf-btn" id="kf-open" aria-haspopup="dialog" aria-controls="kf-drawer" aria-expanded="false">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16v12H5.17L4 17.17V4zm0-2c-1.1 0-2 .9-2 2v20l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"></path></svg>
        <span>AI 客服</span>
      </button>
    `;
    document.body.appendChild(fab);

    const drawer = document.getElementById('kf-drawer');
    const openBtn = document.getElementById('kf-open');
    const closeBtn = document.getElementById('kf-close');
    const exitBtn = document.getElementById('kf-exit');

    function toggle(open){
      drawer.classList.toggle('open', !!open);
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    openBtn.addEventListener('click', () => {
      // 改为内置 AI 客服抽屉
      toggle(true);
      try { document.getElementById('aiw-input')?.focus(); } catch {}
    });
    closeBtn.addEventListener('click', () => toggle(false));
    exitBtn?.addEventListener('click', () => { try { clearTimeout(idleTimer); } catch {} drawer.classList.remove('open'); list.innerHTML=''; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    // --- AI 客服逻辑 ---
    const aiw = document.getElementById('aiw');
    const list = document.getElementById('aiw-messages');
    const input = document.getElementById('aiw-input');
    const btnSend = document.getElementById('aiw-send');
    const btnStop = document.getElementById('aiw-stop');

    let abortCtrl = null;
    const convo = [];
    let idleTimer = null; // 3分钟无响应自动关闭
    let countdown = 0;    // 倒计时秒

    function appendMsg(role, text){
      const el = document.createElement('div');
      el.className = 'aiw-msg ' + (role === 'user' ? 'aiw-msg-user' : 'aiw-msg-bot');
      el.textContent = text;
      list.appendChild(el);
      list.scrollTop = list.scrollHeight;
    }

    function setBusy(b){
      list?.setAttribute('aria-busy', b ? 'true' : 'false');
      if (btnSend) btnSend.disabled = !!b;
      if (btnStop) btnStop.disabled = !b;
      input?.toggleAttribute?.('disabled', !!b);
    }

    function resetIdleCountdown() {
      try { clearTimeout(idleTimer); } catch {}
      const timerEl = document.getElementById('aiw-timer');
      countdown = 180; // 3分钟
      const tick = () => {
        if (!timerEl) return;
        if (countdown <= 0) { toggle(false); return; }
        timerEl.textContent = `将于 ${Math.ceil(countdown)}s 后自动关闭`;
        countdown -= 1;
        idleTimer = setTimeout(tick, 1000);
      };
      idleTimer = setTimeout(tick, 1000);
    }

    async function sendChat(text){
      if (!text) return;
      appendMsg('user', text);
      convo.push({ role: 'user', content: text });
      input.value = '';

      try {
        setBusy(true);
        resetIdleCountdown();
        // 采用流式接口
        const resp = await fetch('/api/ai-chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: convo })
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const rdr = resp.body.getReader();
        const dec = new TextDecoder();
        let acc = '';
        // 占位的机器人消息
        appendMsg('assistant', '');
        const last = list.lastElementChild;
        while (true) {
          const { value, done } = await rdr.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          const parts = chunk.split('\n\n');
          for (const p of parts) {
            const line = p.trim();
            if (!line || !line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const j = JSON.parse(data);
              const delta = j?.choices?.[0]?.delta?.content
                         ?? j?.choices?.[0]?.message?.content
                         ?? '';
              if (delta) {
                acc += delta;
                if (last) last.textContent = acc;
                resetIdleCountdown();
              }
            } catch {}
          }
        }
        if (!acc) {
          // 回退拿最终答案
          const r2 = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: convo })
          });
          const t2 = await r2.text();
          let j2 = null; try { j2 = JSON.parse(t2); } catch {}
          const out = j2?.output || '(无输出)';
          if (last) last.textContent = out;
          if (j2?.ok) convo.push({ role: 'assistant', content: out });
        } else {
          convo.push({ role: 'assistant', content: acc });
        }
        resetIdleCountdown();
      } catch (e) {
        appendMsg('assistant', '网络异常，请稍后重试');
      } finally {
        setBusy(false);
      }
    }

    btnSend?.addEventListener('click', () => { resetIdleCountdown(); sendChat((input?.value || '').trim()); });
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); resetIdleCountdown(); sendChat((input?.value || '').trim()); } });
    btnStop?.addEventListener('click', () => { try { abortCtrl?.abort(); } catch {} setBusy(false); resetIdleCountdown(); });

    // FAQ 点击快速提问
    try {
      document.getElementById('aiw-faq')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-q]');
        if (!btn) return;
        const q = btn.getAttribute('data-q') || '';
        if (!q) return;
        input.value = q;
        resetIdleCountdown();
        sendChat(q);
      });
    } catch {}

    // 转人工入口：跳转微信号 AI_YiMai（深链 + 复制微信号 + 文案提示）
    document.getElementById('aiw-human')?.addEventListener('click', async () => {
      const wxId = 'AI_YiMai';
      const deepLinks = [
        `weixin://dl/chat?${wxId}`,
        `weixin://dl/add?${wxId}`
      ];
      for (const link of deepLinks) {
        try { window.location.href = link; break; } catch {}
      }
      try { await navigator.clipboard.writeText(wxId); } catch {}
      // 在对话中插入二维码 + 可放大查看
      const qr = '/Wechat%20official%20account.jpg';
      const html = `已尝试打开微信。如未自动跳转，请在微信中搜索添加：<b>${wxId}</b>（微信号已复制）。\n\n点击下方二维码可放大：`;
      appendMsg('assistant', html.replace(/<[^>]+>/g,'').replace(/\\n/g,'\n'));
      const img = document.createElement('img');
      img.src = qr; img.alt = '微信二维码'; img.className = 'aiw-qr';
      img.addEventListener('click', () => {
        const ov = document.createElement('div');
        ov.className = 'aiw-overlay';
        ov.innerHTML = `<img src="${qr}" alt="微信二维码放大"/>`;
        ov.addEventListener('click', () => ov.remove());
        document.body.appendChild(ov);
      });
      list.appendChild(img);
      list.scrollTop = list.scrollHeight;
    });

  } catch (e) { /* no-op */ }
})();

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
 * 增强版联系表单组件
 * 功能包括：实时验证、智能提交、用户体验优化、数据持久化
 */
class ContactForm {
    constructor(selector = '#contact-form') {
        this.form = document.querySelector(selector);
        if (!this.form) return;

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
        
        // 状态管理
        this.isSubmitting = false;
        this.validationTimeout = null;
        this.autoSaveTimeout = null;
        
        // 初始化
        this.init();
    }

    init() {
        this.attachEvents();
        this.loadDraftData();
        this.setupAutoSave();
        this.enhanceAccessibility();
        this.addProgressIndicator();
    }

    attachEvents() {
        // 实时验证（防抖处理）
        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            if (!field) return;

            // 输入时验证
            field.addEventListener('input', () => {
                clearTimeout(this.validationTimeout);
                this.validationTimeout = setTimeout(() => {
                    this.validateField(fieldName);
                    this.updateSubmitButtonState();
                }, 300);
            });

            // 失焦时立即验证
            field.addEventListener('blur', () => {
                this.validateField(fieldName);
                this.updateSubmitButtonState();
            });

            // 聚焦时清除错误状态
            field.addEventListener('focus', () => {
                this.clearFieldError(fieldName);
            });
        });

        // 表单提交
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // 键盘快捷键
        this.form.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        this.clearAlerts();
        
        // 全面验证
        const isValid = this.validateForm();
        if (!isValid) {
            this.focusFirstError();
            return;
        }

        try {
            this.setSubmitting(true);
            const payload = this.getPayload();
            
            // 添加时间戳和用户代理信息
            payload.timestamp = new Date().toISOString();
            payload.userAgent = navigator.userAgent;
            payload.referrer = document.referrer;

            await this.submitForm(payload);
            
            this.showSuccess();
            this.clearDraftData();
            this.resetForm();
            
        } catch (error) {
            console.error('表单提交失败:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setSubmitting(false);
        }
    }

    async submitForm(payload) {
        if (this.endpoint) {
            // 有端点时提交到服务器
            const response = await fetch(this.endpoint, {
                method: this.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } else {
            // 无端点时的处理方案
            return this.handleOfflineSubmission(payload);
        }
    }

    handleOfflineSubmission(payload) {
        // 保存到本地存储
        const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
        submissions.push(payload);
        localStorage.setItem('contactSubmissions', JSON.stringify(submissions));

        // 尝试发送邮件（如果支持）
        this.tryEmailSubmission(payload);

        return Promise.resolve({ success: true, offline: true });
    }

    tryEmailSubmission(payload) {
        try {
            const subject = encodeURIComponent(`网站联系表单: ${payload.subject}`);
            const body = encodeURIComponent(
                `姓名: ${payload.name}\n` +
                `邮箱: ${payload.email}\n` +
                `电话: ${payload.phone || '未提供'}\n` +
                `主题: ${payload.subject}\n\n` +
                `消息内容:\n${payload.message}\n\n` +
                `提交时间: ${new Date(payload.timestamp).toLocaleString()}`
            );
            
            const mailtoLink = `mailto:weiyunming@emai2.cn?subject=${subject}&body=${body}`;
            
            // 延迟打开邮件客户端，避免阻塞成功提示
            setTimeout(() => {
                window.location.href = mailtoLink;
            }, 2000);
        } catch (error) {
            console.warn('邮件客户端调用失败:', error);
        }
    }

    validateForm() {
        const requiredFields = ['name', 'email', 'subject', 'message'];
        let isValid = true;

        requiredFields.forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        });

        // 验证可选字段
        this.validateField('phone');

        return isValid;
    }

    validateField(fieldName) {
        const field = this.fields[fieldName];
        const errorElement = this.errors[fieldName];
        
        if (!field || !errorElement) return true;

        const value = field.value.trim();
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
                if (!value) {
                    errorMessage = '请输入您的姓名';
                } else if (value.length < 2) {
                    errorMessage = '姓名至少需要2个字符';
                } else if (value.length > 50) {
                    errorMessage = '姓名不能超过50个字符';
                }
                break;

            case 'email':
                if (!value) {
                    errorMessage = '请输入邮箱地址';
                } else if (!this.isValidEmail(value)) {
                    errorMessage = '请输入有效的邮箱地址';
                }
                break;

            case 'phone':
                if (value && !this.isValidPhone(value)) {
                    errorMessage = '请输入有效的电话号码';
                }
                break;

            case 'subject':
                if (!value) {
                    errorMessage = '请选择联系主题';
                }
                break;

            case 'message':
                if (!value) {
                    errorMessage = '请输入消息内容';
                } else if (value.length < 10) {
                    errorMessage = '消息内容至少需要10个字符';
                } else if (value.length > 2000) {
                    errorMessage = '消息内容不能超过2000个字符';
                }
                break;
        }

        if (errorMessage) {
            this.showFieldError(fieldName, errorMessage);
            return false;
        } else {
            this.clearFieldError(fieldName);
            return true;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
        return phoneRegex.test(phone);
    }

    showFieldError(fieldName, message) {
        const field = this.fields[fieldName];
        const errorElement = this.errors[fieldName];
        
        if (field && errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            field.setAttribute('aria-invalid', 'true');
            field.classList.add('border-red-500');
        }
    }

    clearFieldError(fieldName) {
        const field = this.fields[fieldName];
        const errorElement = this.errors[fieldName];
        
        if (field && errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('hidden');
            field.removeAttribute('aria-invalid');
            field.classList.remove('border-red-500');
        }
    }

    focusFirstError() {
        const firstErrorField = Object.keys(this.fields).find(fieldName => {
            const errorElement = this.errors[fieldName];
            return errorElement && !errorElement.classList.contains('hidden');
        });

        if (firstErrorField && this.fields[firstErrorField]) {
            this.fields[firstErrorField].focus();
        }
    }

    setSubmitting(isSubmitting) {
        this.isSubmitting = isSubmitting;
        
        if (this.submitBtn) {
            this.submitBtn.disabled = isSubmitting;
        }
        
        if (this.submitText && this.loadingText) {
            this.submitText.classList.toggle('hidden', isSubmitting);
            this.loadingText.classList.toggle('hidden', !isSubmitting);
        }

        // 禁用所有表单字段
        Object.values(this.fields).forEach(field => {
            if (field) field.disabled = isSubmitting;
        });
    }

    updateSubmitButtonState() {
        if (!this.submitBtn) return;
        
        const hasErrors = Object.keys(this.errors).some(fieldName => {
            const errorElement = this.errors[fieldName];
            return errorElement && !errorElement.classList.contains('hidden');
        });

        const hasRequiredValues = ['name', 'email', 'subject', 'message'].every(fieldName => {
            const field = this.fields[fieldName];
            return field && field.value.trim();
        });

        this.submitBtn.disabled = hasErrors || !hasRequiredValues || this.isSubmitting;
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

    // 自动保存草稿
    setupAutoSave() {
        Object.values(this.fields).forEach(field => {
            if (field) {
                field.addEventListener('input', () => {
                    clearTimeout(this.autoSaveTimeout);
                    this.autoSaveTimeout = setTimeout(() => {
                        this.saveDraftData();
                    }, 2000);
                });
            }
        });
    }

    saveDraftData() {
        const draftData = this.getPayload();
        if (Object.values(draftData).some(value => value)) {
            localStorage.setItem('contactFormDraft', JSON.stringify(draftData));
        }
    }

    loadDraftData() {
        try {
            const draftData = localStorage.getItem('contactFormDraft');
            if (draftData) {
                const data = JSON.parse(draftData);
                Object.keys(data).forEach(key => {
                    const field = this.fields[key];
                    if (field && data[key]) {
                        field.value = data[key];
                    }
                });
            }
        } catch (error) {
            console.warn('加载草稿数据失败:', error);
        }
    }

    clearDraftData() {
        localStorage.removeItem('contactFormDraft');
    }

    resetForm() {
        this.form.reset();
        Object.keys(this.fields).forEach(fieldName => {
            this.clearFieldError(fieldName);
        });
        this.updateSubmitButtonState();
    }

    enhanceAccessibility() {
        // 为表单添加更好的可访问性支持
        this.form.setAttribute('novalidate', 'true');
        
        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            const errorElement = this.errors[fieldName];
            
            if (field && errorElement) {
                field.setAttribute('aria-describedby', errorElement.id);
            }
        });
    }

    addProgressIndicator() {
        // 添加表单填写进度指示器
        const progressContainer = document.createElement('div');
        progressContainer.className = 'form-progress mb-4';
        progressContainer.innerHTML = `
            <div class="flex justify-between text-sm text-gray-600 mb-2">
                <span>表单完成度</span>
                <span class="progress-text">0%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="progress-bar bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
        `;
        
        this.form.insertBefore(progressContainer, this.form.firstChild);
        
        this.progressBar = progressContainer.querySelector('.progress-bar');
        this.progressText = progressContainer.querySelector('.progress-text');
        
        // 监听字段变化更新进度
        Object.values(this.fields).forEach(field => {
            if (field) {
                field.addEventListener('input', () => this.updateProgress());
            }
        });
    }

    updateProgress() {
        const requiredFields = ['name', 'email', 'subject', 'message'];
        const filledFields = requiredFields.filter(fieldName => {
            const field = this.fields[fieldName];
            return field && field.value.trim();
        });
        
        const progress = Math.round((filledFields.length / requiredFields.length) * 100);
        
        if (this.progressBar && this.progressText) {
            this.progressBar.style.width = `${progress}%`;
            this.progressText.textContent = `${progress}%`;
        }
    }

    clearAlerts() {
        if (this.successBox) this.successBox.classList.add('hidden');
        if (this.errorBox) this.errorBox.classList.add('hidden');
    }

    showSuccess() {
        if (this.successBox) {
            this.successBox.classList.remove('hidden');
            this.successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (this.errorBox) this.errorBox.classList.add('hidden');
    }

    showError(message) {
        if (this.errorBox) {
            this.errorBox.classList.remove('hidden');
            const messageElement = this.errorBox.querySelector('.flex div:last-child');
            if (messageElement) {
                messageElement.textContent = message;
            }
            this.errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (this.successBox) this.successBox.classList.add('hidden');
    }

    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('400')) {
            return '提交的信息有误，请检查后重试';
        } else if (error.message.includes('500')) {
            return '服务器暂时无法处理请求，请稍后重试';
        } else {
            return '发送失败，请稍后重试或使用其他联系方式';
        }
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
