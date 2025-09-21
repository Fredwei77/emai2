/**
 * 联系表单增强功能
 * 包括字符计数器、实时提示、键盘快捷键等
 */

document.addEventListener('DOMContentLoaded', function() {
    initContactFormEnhancements();
});

function initContactFormEnhancements() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // 初始化字符计数器
    initCharacterCounter();
    
    // 初始化智能提示
    initSmartHints();
    
    // 初始化键盘快捷键
    initKeyboardShortcuts();
    
    // 初始化字段增强
    initFieldEnhancements();
    
    // 初始化表单状态保存
    initFormStatePersistence();

    // 初始化提交逻辑（发送到邮箱）
    initFormSubmit();
}

/**
 * 处理提交到服务端发送邮件
 */
function initFormSubmit() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  // If page opts to use another enhanced handler (e.g., ContactForm), skip this binding
  const skip = form.hasAttribute('data-skip-enhanced-submit') && ['1','true','yes'].includes(String(form.getAttribute('data-skip-enhanced-submit')).toLowerCase());
  if (skip) return;

  const successEl = document.getElementById('form-success');
  const errorEl = document.getElementById('form-error');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitText = submitBtn?.querySelector('.submit-text');
  const loadingText = submitBtn?.querySelector('.loading-text');

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (submitText && loadingText) {
      submitText.classList.toggle('hidden', loading);
      loadingText.classList.toggle('hidden', !loading);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 隐藏提示
    successEl?.classList.add('hidden');
    errorEl?.classList.add('hidden');

    // 简单校验
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const required = ['name', 'email', 'subject', 'message'];
    for (const key of required) {
      const val = (data[key] || '').toString().trim();
      const errorSpan = document.getElementById(`${key}-error`);
      if (!val) {
        errorSpan?.classList.remove('hidden');
        if (errorSpan) errorSpan.textContent = '此项为必填';
        return;
      } else {
        errorSpan?.classList.add('hidden');
        if (errorSpan) errorSpan.textContent = '';
      }
    }

    try {
      setLoading(true);
      const r = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
          message: data.message
        })
      });
      const j = await r.json().catch(() => ({ ok: false }));
      if (r.ok && j.ok) {
        // 显示成功
        successEl?.classList.remove('hidden');
        errorEl?.classList.add('hidden');
        // 清空表单
        form.reset();
        // 触发输入事件，刷新计数器等
        form.querySelectorAll('input, textarea, select').forEach(el => {
          el.dispatchEvent(new Event('input'));
          el.dispatchEvent(new Event('change'));
        });
      } else {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
    } catch (err) {
      console.warn('发送失败:', err);
      if (errorEl) {
        errorEl.textContent = '发送失败，请稍后重试或使用其他联系方式。';
        errorEl.classList.remove('hidden');
      }
    } finally {
      setLoading(false);
    }
  });
}

/**
 * 字符计数器
 */
function initCharacterCounter() {
    const messageField = document.getElementById('message');
    const counter = document.getElementById('message-counter');
    
    if (!messageField || !counter) return;
    
    const maxLength = 2000; // 设置为2000字符限制
    
    function updateCounter() {
        const currentLength = messageField.value.length;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        // 根据字符数量改变颜色
        if (currentLength > maxLength * 0.95) {
            counter.className = 'text-xs text-red-500 font-medium';
            counter.textContent = `${currentLength}/${maxLength} - 即将达到字符限制`;
        } else if (currentLength > maxLength * 0.8) {
            counter.className = 'text-xs text-yellow-600 font-medium';
        } else {
            counter.className = 'text-xs text-gray-500';
        }
        
        // 软限制：当接近限制时给出提示，但不阻止输入
        if (currentLength > maxLength) {
            counter.className = 'text-xs text-red-600 font-bold';
            counter.textContent = `${currentLength}/${maxLength} - 超出建议长度`;
        }
    }
    
    messageField.addEventListener('input', updateCounter);
    messageField.addEventListener('paste', () => setTimeout(updateCounter, 0));
    
    // 确保textarea可以正常输入
    messageField.addEventListener('keydown', function(e) {
        // 允许所有控制键（退格、删除、方向键等）
        const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'];
        const isControlKey = controlKeys.includes(e.key) || e.ctrlKey || e.metaKey;
        
        // 如果不是控制键且已达到硬限制（3000字符），则阻止输入
        if (!isControlKey && messageField.value.length >= 3000) {
            e.preventDefault();
            counter.textContent = `${messageField.value.length}/2000 - 已达到最大字符限制`;
            counter.className = 'text-xs text-red-600 font-bold';
        }
    });
    
    // 初始化计数器
    updateCounter();
}

/**
 * 智能提示系统
 */
function initSmartHints() {
    const fields = {
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        subject: document.getElementById('subject'),
        message: document.getElementById('message')
    };
    
    // 为每个字段添加智能提示
    Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        if (!field) return;
        
        addSmartHint(field, fieldName);
    });
}

function addSmartHint(field, fieldName) {
    const hints = {
        name: '请输入您的真实姓名，便于我们称呼您',
        email: '请输入常用邮箱，我们将通过邮箱回复您',
        phone: '可选填写，便于紧急情况下联系您',
        subject: '选择最符合您需求的主题',
        message: '详细描述您的需求，有助于我们更好地为您服务'
    };
    
    const hint = hints[fieldName];
    if (!hint) return;
    
    // 创建提示元素
    const hintElement = document.createElement('div');
    hintElement.className = 'text-xs text-blue-600 mt-1 opacity-0 transition-opacity duration-200';
    hintElement.textContent = hint;
    hintElement.id = `${fieldName}-hint`;
    
    // 插入提示元素
    const errorElement = document.getElementById(`${fieldName}-error`);
    if (errorElement) {
        errorElement.parentNode.insertBefore(hintElement, errorElement);
    }
    
    // 聚焦时显示提示
    field.addEventListener('focus', () => {
        hintElement.classList.remove('opacity-0');
        hintElement.classList.add('opacity-100');
    });
    
    // 失焦时隐藏提示（如果有内容）
    field.addEventListener('blur', () => {
        if (field.value.trim()) {
            hintElement.classList.add('opacity-0');
            hintElement.classList.remove('opacity-100');
        }
    });
}

/**
 * 键盘快捷键
 */
function initKeyboardShortcuts() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter 提交表单
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
        
        // Esc 清除当前字段（仅在当前焦点是 INPUT 或 TEXTAREA 时生效）
        if (e.key === 'Escape' && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            if (document.activeElement.value) {
                document.activeElement.value = '';
                document.activeElement.dispatchEvent(new Event('input'));
            }
        }
    });
    
    // 添加快捷键提示
    addShortcutHints();
}

function addShortcutHints() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    const hintsContainer = document.createElement('div');
    hintsContainer.className = 'text-xs text-gray-400 mt-2 flex flex-wrap gap-4';
    hintsContainer.innerHTML = `
        <span class="flex items-center">
            <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd>
            <span class="mx-1">+</span>
            <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd>
            <span class="ml-1">快速提交</span>
        </span>
        <span class="flex items-center">
            <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd>
            <span class="ml-1">清除当前字段</span>
        </span>
    `;
    
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.parentNode.insertBefore(hintsContainer, submitButton.nextSibling);
    }
}

// 邮箱复制按钮
(function initCopyEmail() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#copy-email-btn');
    if (!btn) return;
    const emailEl = document.getElementById('contact-email');
    const successEl = document.getElementById('copy-email-success');
    if (!emailEl) return;
    const text = emailEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      if (successEl) {
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 1500);
      }
    } catch (_) {
      // 回退：创建临时 textarea 复制
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      if (successEl) {
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 1500);
      }
    }
  });
})();

/**
 * 字段增强功能
 */
function initFieldEnhancements() {
    // 邮箱字段自动补全
    initEmailAutocomplete();
    
    // 电话号码格式化
    initPhoneFormatting();
    
    // 姓名字段优化
    initNameFieldEnhancements();
}

function initEmailAutocomplete() {
    const emailField = document.getElementById('email');
    if (!emailField) return;
    
    const commonDomains = ['qq.com', '163.com', '126.com', 'gmail.com', 'hotmail.com', 'sina.com'];
    
    // 创建建议列表
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden';
    suggestionsList.id = 'email-suggestions';
    
    emailField.parentNode.style.position = 'relative';
    emailField.parentNode.appendChild(suggestionsList);
    
    emailField.addEventListener('input', (e) => {
        const value = e.target.value;
        const atIndex = value.indexOf('@');
        
        if (atIndex > 0 && atIndex === value.length - 1) {
            // 用户刚输入@符号
            showEmailSuggestions(value, commonDomains, suggestionsList);
        } else if (atIndex > 0) {
            const domain = value.substring(atIndex + 1);
            const matchingDomains = commonDomains.filter(d => d.startsWith(domain));
            if (matchingDomains.length > 0 && domain !== matchingDomains[0]) {
                showEmailSuggestions(value.substring(0, atIndex + 1), matchingDomains, suggestionsList);
            } else {
                suggestionsList.classList.add('hidden');
            }
        } else {
            suggestionsList.classList.add('hidden');
        }
    });
    
    // 点击外部隐藏建议
    document.addEventListener('click', (e) => {
        if (!emailField.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
}

function showEmailSuggestions(prefix, domains, container) {
    container.innerHTML = '';
    
    domains.slice(0, 5).forEach(domain => {
        const suggestion = document.createElement('div');
        suggestion.className = 'px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm';
        suggestion.textContent = prefix + domain;
        
        suggestion.addEventListener('click', () => {
            document.getElementById('email').value = prefix + domain;
            container.classList.add('hidden');
            document.getElementById('email').dispatchEvent(new Event('input'));
        });
        
        container.appendChild(suggestion);
    });
    
    container.classList.remove('hidden');
}

function initPhoneFormatting() {
    const phoneField = document.getElementById('phone');
    if (!phoneField) return;
    
    phoneField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // 只保留数字
        
        // 中国手机号格式化
        if (value.length > 0) {
            if (value.startsWith('86')) {
                value = '+86 ' + value.substring(2);
            } else if (value.length === 11 && value.startsWith('1')) {
                value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
            }
        }
        
        e.target.value = value;
    });
}

function initNameFieldEnhancements() {
    const nameField = document.getElementById('name');
    if (!nameField) return;
    
    // 自动首字母大写
    nameField.addEventListener('input', (e) => {
        const value = e.target.value;
        const words = value.split(' ');
        const capitalizedWords = words.map(word => {
            if (word.length > 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word;
        });
        
        const newValue = capitalizedWords.join(' ');
        if (newValue !== value) {
            e.target.value = newValue;
        }
    });
}

/**
 * 表单状态持久化
 */
function initFormStatePersistence() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    const STORAGE_KEY = 'contactFormState';
    
    // 加载保存的状态
    loadFormState();
    
    // 监听表单变化
    form.addEventListener('input', debounce(saveFormState, 1000));
    form.addEventListener('change', saveFormState);
    
    // 表单提交成功后清除状态
    form.addEventListener('submit', () => {
        setTimeout(() => {
            if (document.getElementById('form-success') && !document.getElementById('form-success').classList.contains('hidden')) {
                clearFormState();
            }
        }, 100);
    });
    
    function saveFormState() {
        const formData = new FormData(form);
        const state = {};
        
        for (let [key, value] of formData.entries()) {
            state[key] = value;
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    function loadFormState() {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                
                Object.keys(state).forEach(key => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field && state[key]) {
                        field.value = state[key];
                        // 触发input事件以更新计数器等
                        field.dispatchEvent(new Event('input'));
                    }
                });
            }
        } catch (error) {
            console.warn('加载表单状态失败:', error);
        }
    }
    
    function clearFormState() {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * 防抖函数
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