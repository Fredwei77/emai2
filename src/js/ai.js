// AI 智能体对接真实模型 API（通过服务端代理，前端不暴露密钥）
(function(){
  const form = document.getElementById('agent-form');
  const input = document.getElementById('agent-input');
  const view = document.getElementById('agent-messages');
  const imageInput = typeof document !== 'undefined' ? document.getElementById('agent-image') : null;
  const imageBtn = typeof document !== 'undefined' ? document.getElementById('agent-image-btn') : null;
  const imagePreview = typeof document !== 'undefined' ? document.getElementById('agent-image-preview') : null;
  const examples = typeof document !== 'undefined' ? document.getElementById('agent-examples') : null;

  // 简单的会话内存
  const convo = [];
  // 默认模型使用可用的免费模型（可被 /api/models 返回的列表覆盖）
  let DEFAULT_MODEL = "qwen/qwen3-4b:free";
  let AVAILABLE_MODEL_IDS = new Set();
  // 会话级图像列表（以临时 blob url 预览，同时保留 File 数据以便构建 image_url）
  const sessionImages = [];
  // 图片大小与压缩配置（可按需调整）
  const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB 上限
  const IMAGE_MAX_SIDE = 1280; // 长边像素限制
  // 控件引用
  const modelEl = document.getElementById('model-select');
  const tempEl = document.getElementById('temp-input');
  const topPEl = document.getElementById('top-p-input');
  const maxTokEl = document.getElementById('max-tokens-input');
  const tempVal = document.getElementById('temp-value');
  const topPVal = document.getElementById('top-p-value');

  // 工具相关控件
  const enableToolsEl = document.getElementById('enable-tools');
  const toolsPanelEl = document.getElementById('tools-panel');
  const toolFetchUrlTextEl = document.getElementById('tool-fetch-url-text');
  const toolJsonPathEl = document.getElementById('tool-json-path');
  const toolWebSearchEl = document.getElementById('tool-web-search');
  const toolCurrentTimeEl = document.getElementById('tool-current-time');
  const toolChoiceEls = typeof document !== 'undefined' ? document.querySelectorAll('input[name="tool-choice"]') : [];

  function getToolChoice() {
    let v = 'auto';
    toolChoiceEls?.forEach?.((el) => { if (el.checked) v = el.value; });
    return v;
  }

  function buildToolsDefinitions() {
    if (!enableToolsEl?.checked) return undefined;
    const tools = [];
    if (toolFetchUrlTextEl?.checked) {
      tools.push({
        type: 'function',
        function: {
          name: 'fetch_url_text',
          description: 'Fetch HTML/JSON and return plain text or truncated JSON',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['url']
          }
        }
      });
    }
    if (toolJsonPathEl?.checked) {
      tools.push({
        type: 'function',
        function: {
          name: 'http_get_json_path',
          description: 'GET JSON and extract value via dotted path with optional [index] segments',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              path: { type: 'string' }
            },
            required: ['url','path']
          }
        }
      });
    }
    if (toolWebSearchEl?.checked) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Lightweight web search using DuckDuckGo HTML results',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        }
      });
    }
    if (toolCurrentTimeEl?.checked) {
      tools.push({
        type: 'function',
        function: {
          name: 'current_time',
          description: 'Return current server ISO datetime',
          parameters: { type: 'object', properties: {} }
        }
      });
    }
    return tools.length ? tools : undefined;
  }

  function setToolsPanelState() {
    const enabled = !!enableToolsEl?.checked;
    toolsPanelEl?.querySelectorAll?.('input,select,button')?.forEach?.(el => {
      if (el.id === 'enable-tools') return;
      el.disabled = !enabled;
      el.closest('label')?.classList?.toggle('opacity-50', !enabled);
    });
  }

  enableToolsEl?.addEventListener('change', setToolsPanelState);
  // 初始禁用工具面板
  setToolsPanelState();

  // 处理图片选择与预览
  imageInput?.addEventListener('change', async () => {
    try {
      const files = Array.from(imageInput.files || []);
      for (const f of files) {
        let fileToUse = f;
        // 超过大小尝试压缩
        if (fileToUse.size > IMAGE_MAX_BYTES) {
          try { fileToUse = await compressImage(fileToUse, IMAGE_MAX_SIDE, 0.85, IMAGE_MAX_BYTES); } catch {}
        }
        const url = URL.createObjectURL(fileToUse);
        sessionImages.push({ file: fileToUse, url });
      }
      renderImagePreview();
      imageInput.value = '';
    } catch {}
  });

  function renderImagePreview() {
    if (!imagePreview) return;
    imagePreview.innerHTML = '';
    sessionImages.forEach((it, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'relative w-20 h-20 border border-gray-200 rounded overflow-hidden';
      const img = document.createElement('img');
      img.src = it.url; img.alt = 'selected image'; img.className = 'w-full h-full object-cover';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'absolute top-0 right-0 bg-white/80 hover:bg-white text-red-600 text-xs px-1 rounded-bl';
      del.innerText = '×';
      del.title = '移除';
      del.addEventListener('click', () => {
        try { URL.revokeObjectURL(it.url); } catch {}
        sessionImages.splice(idx, 1);
        renderImagePreview();
      });
      wrap.appendChild(img);
      wrap.appendChild(del);
      imagePreview.appendChild(wrap);
    });
  }

  async function compressImage(file, maxSide, quality, targetBytes) {
    const img = document.createElement('img');
    const dataUrl = await readFileAsDataURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const { naturalWidth: w, naturalHeight: h } = img;
    let tw = w, th = h;
    if (Math.max(w, h) > maxSide) {
      if (w >= h) { tw = maxSide; th = Math.round(h * (maxSide / w)); }
      else { th = maxSide; tw = Math.round(w * (maxSide / h)); }
    }
    const canvas = document.createElement('canvas');
    canvas.width = tw; canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, tw, th);
    let q = quality;
    let blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
    // 如果仍然超过限制，逐步降低质量
    while (blob && blob.size > targetBytes && q > 0.5) {
      q -= 0.1;
      blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
    }
    const outFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    return outFile.size < file.size ? outFile : file;
  }

  // 初始化默认值与显示（运行时动态获取模型列表）
  async function initModelList() {
    const endpoints = ['/api/models', '/.netlify/functions/models'];
    let models = [];
    for (const url of endpoints) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (Array.isArray(data?.data)) { models = data.data; break; }
        if (Array.isArray(data)) { models = data; break; }
      } catch (e) { /* try next */ }
    }

    if (!Array.isArray(models) || models.length === 0) {
      // Local fallback (no server running or no internet). Populate UI with a sensible free list.
      models = [
        { id: 'qwen/qwen3-4b:free', name: 'Qwen3 4B (free)' },
        { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B A22B (free)' },
        { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (free)' },
        { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B (free)' },
        { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (free)' },
        { id: 'google/gemini-2.5-flash-image-preview:free', name: 'Gemini 2.5 Flash Image Preview (free)' }
      ];
    }

    AVAILABLE_MODEL_IDS = new Set(models.map(m => m && (m.id || m.value || m.name)).filter(Boolean));

    // Choose default: prefer free models
    const ids = models.map(m => m?.id).filter(Boolean);
    const free = models.filter(m => typeof m?.id === 'string' && m.id.includes(':free'));
    const pick = free[0]?.id || ids[0] || DEFAULT_MODEL;
    DEFAULT_MODEL = pick;

    if (modelEl) {
      const preserve = [];
      for (const opt of [...modelEl.options]) preserve.push({ v: opt.value, t: opt.textContent });
      modelEl.innerHTML = '';

      const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t || v; modelEl.appendChild(o); };
      const vendorOrder = ['openai','google','anthropic','meta','mistralai','cohere','qwen','baichuan','xai','hf','perplexity','deepseek','01-ai','databricks','nvidia','ai21'];
      const rankVendor = (id) => {
        const vendor = (id || '').split('/')[0];
        const i = vendorOrder.indexOf(vendor);
        return i >= 0 ? i : vendorOrder.length + 1;
      };
      const labelFor = (id) => {
        const map = {
          'openai/gpt-4o-mini:free': 'OpenAI GPT-4o mini (free)',
          'google/gemini-2.5-flash-image-preview:free': 'Gemini 2.5 Flash Image Preview (free)',
          'google/gemini-2.5-flash:free': 'Gemini 2.5 Flash (free)',
          'google/gemma-2-2b-it:free': 'Gemma 2 2B IT (free)'
        };
        return map[id] || id;
      };

      // sort free first then others by vendor
      const allIds = Array.from(new Set(models.map(m => m?.id).filter(Boolean)));
      allIds.sort((a, b) => {
        const af = a.includes(':free') ? 0 : 1;
        const bf = b.includes(':free') ? 0 : 1;
        if (af !== bf) return af - bf;
        const ra = rankVendor(a), rb = rankVendor(b);
        if (ra !== rb) return ra - rb;
        return String(a).localeCompare(String(b));
      });

      for (const id of allIds) add(id, labelFor(id));

      // preserve any manual options not present
      const present = new Set([...modelEl.options].map(o => o.value));
      for (const p of preserve) { if (p.v && !present.has(p.v)) add(p.v, p.t || p.v); }

      modelEl.value = pick;
    }
  }
  initModelList();
  // 根据模型切换控制图片按钮可用性（只允许多模态模型使用图片）
  function isMultimodalModel(id) { return typeof id === 'string' && (/gemini|gpt-4o|gpt-4.1|llama-vision|vision|image|multimodal/i).test(id); }
  function refreshImageBtnState() {
    const id = modelEl?.value || DEFAULT_MODEL;
    const enable = isMultimodalModel(id);
    imageBtn?.classList?.toggle('opacity-50', !enable);
    imageBtn?.classList?.toggle('pointer-events-none', !enable);
    if (!enable) {
      // 清空已选图片
      sessionImages.forEach(it => { try { URL.revokeObjectURL(it.url); } catch {} });
      sessionImages.length = 0;
      renderImagePreview();
    }
  }
  modelEl?.addEventListener('change', refreshImageBtnState);
  setTimeout(refreshImageBtnState, 0);
  if (tempEl && tempVal) tempVal.textContent = tempEl.value;
  if (topPEl && topPVal) topPVal.textContent = topPEl.value;

  tempEl?.addEventListener('input', () => { if (tempVal) tempVal.textContent = tempEl.value; });
  topPEl?.addEventListener('input', () => { if (topPVal) topPVal.textContent = topPEl.value; });

  let currentAbort = null;
  let isRunning = false;

  function setRunningState(running) {
    isRunning = running;
    const runBtn = document.getElementById('agent-run');
    const stopBtn = document.getElementById('agent-stop');
    if (runBtn) runBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
    input?.toggleAttribute?.('disabled', running);
  }

  function showAlert(type, text) {
    const wrap = document.createElement('div');
    wrap.className = 'rounded-lg p-3 border ' + (type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-800');
    wrap.innerText = text;
    view.appendChild(wrap);
    view.scrollTop = view.scrollHeight;
  }

  function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = role === 'user' ? 'p-3 rounded-lg bg-blue-50 text-blue-900 whitespace-pre-wrap' : 'p-3 rounded-lg bg-gray-100 text-gray-900 whitespace-pre-wrap';
    wrap.innerText = text;
    view.appendChild(wrap);
    view.scrollTop = view.scrollHeight;
  }

  async function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function buildMessagesWithImages(messages, images) {
    try {
      const imgs = Array.isArray(images) ? images : [];
      if (!imgs.length) return messages;
      const lastUserIdx = [...messages].map((m,i)=>({m,i})).reverse().find(x => x.m && x.m.role === 'user')?.i;
      if (lastUserIdx === undefined) return messages;
      const cloned = messages.map(m => ({ ...m }));
      const last = cloned[lastUserIdx];
      const baseContent = typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : (Array.isArray(last.content) ? last.content.slice() : []);
      for (const it of imgs) {
        try {
          const dataUrl = await readFileAsDataURL(it.file);
          baseContent.push({ type: 'image_url', image_url: { url: dataUrl } });
        } catch {}
      }
      cloned[lastUserIdx] = { ...last, content: baseContent };
      return cloned;
    } catch { return messages; }
  }

  function appendThinking() {
    const wrap = document.createElement('div');
    wrap.className = 'p-3 rounded-lg bg-gray-50 text-gray-500 text-sm flex items-center gap-2';
    wrap.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.2"/><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="2"/></svg> 思考中…';
    view.appendChild(wrap);
    view.scrollTop = view.scrollHeight;
    return wrap;
  }

  async function callApi({ prompt, messages, model, temperature, top_p, max_tokens, tools, tool_choice, signal }) {
    const payload = {
      model: model || DEFAULT_MODEL,
      prompt,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {})
    };

    // 优先 Vercel /api，其次 Netlify 函数
    // 在开发环境下，Vite 可能运行在 3001 端口，但前端相对路径仍会指向同源。
// 这里保留相对路径，确保无论端口如何变化都使用当前同源的代理路径。
const endpoints = ['/api/ai-chat', '/.netlify/functions/ai-chat'];
    const errors = [];

    for (const url of endpoints) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          ...(signal ? { signal } : {})
        });
        if (!resp.ok) {
          // 尝试读取更详细的错误
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status} ${text}`);
        }
        const data = await resp.json();
        if (data?.ok) return data;
        throw new Error(data?.error || 'Unknown server error');
      } catch (err) {
        // 尝试下一个端点
        console.warn('AI API call failed at', url, err);
        errors.push({ url, message: err?.message || String(err) });
      }
    }

    // 若都失败，抛出错误由上层处理
    const detail = errors.length ? ('：' + errors.map(e => `${e.url}: ${e.message}`).join(' | ')) : '';
    throw new Error('无法连接到服务器端 AI 代理，请检查部署与环境变量' + detail);
  }

  async function streamApi({ prompt, messages, model, temperature, top_p, max_tokens, tools, tool_choice, onDelta, signal }) {
    const payload = {
      model: model || DEFAULT_MODEL,
      prompt,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {})
    };
    const endpoints = ['/api/ai-chat/stream', '/api/ai-chat-stream', '/.netlify/functions/ai-chat-stream'];
    const textDecoder = new TextDecoder();

    for (const url of endpoints) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          ...(signal ? { signal } : {})
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += textDecoder.decode(value, { stream: true });
          // Split by SSE event delimiter (\n\n)
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const line = part.trim();
            if (!line) continue;
            // Expect lines like: data: {...}
            const dataLine = line.split('\n').find(l => l.startsWith('data:'));
            if (!dataLine) continue;
            const data = dataLine.replace(/^data:\s*/, '');
            if (data === '[DONE]') return true;
            try {
              const json = JSON.parse(data);
              // OpenRouter/OpenAI style deltas
              const delta = json?.choices?.[0]?.delta?.content
                ?? json?.choices?.[0]?.message?.content
                ?? '';
              if (delta) onDelta?.(delta);
            } catch {}
          }
        }
        return true;
      } catch (err) {
        console.warn('AI stream failed at', url, err);
      }
    }
    throw new Error('无法连接到服务器端 AI 流式代理');
  }

  function demoFallback(text, thinkingEl) {
    // 演示模式回退：不依赖后端
    setTimeout(() => {
      thinkingEl?.remove?.();
      const reply = `已收到指令：${text}\n(演示模式) 示例输出：\n- 任务分析：解析指令并拆分步骤\n- 可执行方案：生成内容或提供建议\n- 下一步：在服务端配置 OPENROUTER_API_KEY 并部署函数`;
      appendMessage('assistant', reply);
    }, 700);
  }

  // Health check button
  const healthBtn = typeof document !== 'undefined' ? document.getElementById('btn-health') : null;
  healthBtn?.addEventListener('click', async () => {
    const endpoints = ['/api/ai-health', '/.netlify/functions/ai-health'];
    const attempts = [];
    let j = null;

    // Try endpoints in order and capture diagnostics
    for (const url of endpoints) {
      try {
        const resp = await fetch(url);
        const raw = await resp.text();
        attempts.push({ url, status: resp.status, ok: resp.ok, raw: raw.slice(0, 200) });
        if (!resp.ok) continue;
        try { j = JSON.parse(raw); } catch (e) {
          attempts[attempts.length - 1].parseError = e?.message || 'Invalid JSON';
        }
        if (j) break;
      } catch (e) {
        attempts.push({ url, error: e?.message || String(e) });
      }
    }

    const isFallback = !j;
    if (!j) j = { ok: true, env: { present: false }, durationMs: 0, notice: 'client-fallback' };

    const lines = [];
    lines.push('健康检查:');
    lines.push('来源: ' + (isFallback ? '前端回退（未连接到服务器）' : '服务器函数'));
    lines.push('env.present: ' + (j?.env?.present ? 'true' : 'false'));

    const m = j?.upstream?.models;
    const c = j?.upstream?.chat;
    if (m) lines.push('models: ' + (m.ok ? `ok (count=${m.count || 0}, pick=${m.pick || '-'})` : `error: ${m.error || '-'}`));
    if (c) lines.push('chat: ' + (c.ok ? `ok (model=${c.model || '-'})` : `error: ${c.error || '-'} (model=${c.model || '-'})`));

    const dur = typeof j?.durationMs === 'number' && j.durationMs >= 0 ? j.durationMs : '-';
    lines.push('duration: ' + dur + 'ms');

    if (attempts.length) {
      lines.push('探测详情:');
      for (const a of attempts) {
        if (a.error) {
          lines.push(`- ${a.url}: error=${a.error}`);
        } else {
          lines.push(`- ${a.url}: status=${a.status} ok=${a.ok}`);
          if (a.parseError) lines.push(`  parseError=${a.parseError}`);
        }
      }
    }

    showAlert(j?.ok ? 'warn' : 'error', lines.join('\n'));
  });

  // Control buttons
  const stopBtn = document.getElementById('agent-stop');
  const clearBtn = document.getElementById('agent-clear');
  const copyBtn = document.getElementById('agent-copy');

  stopBtn?.addEventListener('click', () => {
    try { currentAbort?.abort(); showAlert('warn', '已停止当前生成'); } catch {}
    setRunningState(false);
  });

  clearBtn?.addEventListener('click', () => {
    view.innerHTML = '';
    convo.length = 0;
    showAlert('warn', '已清空会话');
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      const text = convo.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n');
      await navigator.clipboard.writeText(text || '');
      showAlert('warn', '已复制到剪贴板');
    } catch (err) {
      showAlert('error', '复制失败，请手动选择文本复制');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input?.value || '').trim();
    if (isRunning) { showAlert('warn', '有任务正在进行，请先停止或稍候'); return; }
    if (!text) return;

    // 前端渲染用户消息
    appendMessage('user', text);
    convo.push({ role: 'user', content: text });
    input.value = '';

    const thinkingEl = appendThinking();
    setRunningState(true);
    currentAbort = new AbortController();

    try {
      // 读取参数
      const model = modelEl?.value || DEFAULT_MODEL;
      const t = tempEl ? parseFloat(tempEl.value) : undefined;
      const p = topPEl ? parseFloat(topPEl.value) : undefined;
      const mx = maxTokEl ? parseInt(maxTokEl.value, 10) : undefined;

      // 先尝试流式输出
      const assistantWrap = document.createElement('div');
      assistantWrap.className = 'p-3 rounded-lg bg-gray-100 text-gray-900 whitespace-pre-wrap';
      assistantWrap.textContent = '';
      view.appendChild(assistantWrap);
      view.scrollTop = view.scrollHeight;

      let acc = '';
      const tools = buildToolsDefinitions();
      const tool_choice = getToolChoice();

      // 优先尝试流式；若失败则回退到普通接口
      let streamed = false;
      try {
        streamed = await streamApi({
          prompt: text,
          messages: await buildMessagesWithImages(convo, sessionImages),
          model,
          temperature: isNaN(t) ? undefined : t,
          top_p: isNaN(p) ? undefined : p,
          max_tokens: isNaN(mx) ? undefined : mx,
          tools,
          tool_choice,
          signal: currentAbort.signal,
          onDelta: (chunk) => {
            acc += chunk;
            assistantWrap.textContent = acc;
          }
        });
      } catch (e) {
        console.warn('AI stream failed, falling back to non-streaming endpoint', e);
      }

      if (streamed) {
        // 如果流式结束但没有任何 token（某些模型/网络下可能只发了控制消息），回退到非流式拿最终答案
        if (!acc || !acc.trim()) {
          try {
            const result = await callApi({ prompt: text, messages: await buildMessagesWithImages(convo, sessionImages), model, temperature: isNaN(t) ? undefined : t, top_p: isNaN(p) ? undefined : p, max_tokens: isNaN(mx) ? undefined : mx, tools, tool_choice, signal: currentAbort.signal });
            const output = result?.output || '(无输出)';
            assistantWrap.textContent = output;
            convo.push({ role: 'assistant', content: output });
          } catch (e2) {
            console.warn('Fallback non-streaming call failed', e2);
            assistantWrap.textContent = '(无输出)';
          }
        } else {
          convo.push({ role: 'assistant', content: acc || '' });
        }
        thinkingEl.remove();
        setRunningState(false);
        currentAbort = null;
        return;
      }

      // 若流式失败，回退普通接口
      const result = await callApi({ prompt: text, messages: await buildMessagesWithImages(convo, sessionImages), model, temperature: isNaN(t) ? undefined : t, top_p: isNaN(p) ? undefined : p, max_tokens: isNaN(mx) ? undefined : mx, tools, tool_choice, signal: currentAbort.signal });
      thinkingEl.remove();
      const output = result?.output || '(无输出)';
      assistantWrap.textContent = output;
      convo.push({ role: 'assistant', content: output });
    } catch (err) {
      console.error(err);
      if (err?.name === 'AbortError') {
        showAlert('warn', '生成已取消');
      } else {
        showAlert('error', '发生错误：' + (err?.message || '未知错误'));
      }
      // 回退演示
      demoFallback(text, thinkingEl);
    } finally {
      setRunningState(false);
      currentAbort = null;
    }
  });
  // 示例点击：填充并运行
  try {
    examples?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-prompt]');
      if (!btn) return;
      const prompt = btn.getAttribute('data-prompt') || '';
      if (!prompt) return;
      input.value = prompt;
      // 触发提交，与“运行”一致
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  } catch {}
})();
