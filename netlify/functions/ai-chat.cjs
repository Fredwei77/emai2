// Netlify Function: /.netlify/functions/ai-chat
// Securely proxies requests to OpenRouter using env var OPENROUTER_API_KEY

async function runTool(tool) {
  try {
    const { name, function: func, arguments: argsJson } = tool || {};
    const toolName = name || func?.name;
    const args = typeof argsJson === 'string' ? JSON.parse(argsJson) : (argsJson || {});

    const stripHtml = (html) => {
      if (typeof html !== 'string') return '';
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                 .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>');
      return html.replace(/\s+/g, ' ').trim();
    };

    const getByPath = (obj, path) => {
      if (!path) return obj;
      const parts = path.split('.');
      let cur = obj;
      for (const part of parts) {
        const m = part.match(/([^\[]+)(\[(\d+)\])?/);
        const key = m?.[1];
        const idx = m?.[3] !== undefined ? parseInt(m[3], 10) : undefined;
        if (key) cur = cur?.[key]; else return undefined;
        if (idx !== undefined) cur = Array.isArray(cur) ? cur[idx] : undefined;
        if (cur === undefined || cur === null) break;
      }
      return cur;
    };

    if (toolName === 'fetch_url') {
      const url = args?.url;
      if (!url || typeof url !== 'string') return { error: 'fetch_url: missing url' };
      const resp = await fetch(url, { method: 'GET' });
      const ct = resp.headers.get('content-type') || '';
      let text = '';
      if (ct.includes('application/json')) {
        try { text = JSON.stringify(await resp.json()).slice(0, 5000); } catch { text = await resp.text(); }
      } else if (ct.startsWith('text/')) {
        text = (await resp.text()).slice(0, 5000);
      } else {
        text = `[non-text content-type=${ct}, status=${resp.status}]`;
      }
      return { status: resp.status, contentType: ct, text };
    }

    if (toolName === 'fetch_url_text') {
      const url = args?.url;
      const limit = Math.min(Math.max(args?.limit || 8000, 256), 20000);
      if (!url || typeof url !== 'string') return { error: 'fetch_url_text: missing url' };
      const resp = await fetch(url, { method: 'GET' });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await resp.json();
        const out = JSON.stringify(json).slice(0, limit);
        return { status: resp.status, contentType: ct, text: out };
      }
      const raw = await resp.text();
      const text = stripHtml(raw).slice(0, limit);
      return { status: resp.status, contentType: ct, text };
    }

    if (toolName === 'http_get_json_path') {
      const url = args?.url;
      const path = args?.path; // dot + [index]
      if (!url || typeof url !== 'string') return { error: 'http_get_json_path: missing url' };
      const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const json = await resp.json();
      const value = getByPath(json, path);
      return { status: resp.status, value };
    }

    if (toolName === 'web_search') {
      const query = (args?.query || '').toString();
      const limit = Math.min(Math.max(parseInt(args?.limit ?? '5', 10) || 5, 1), 10);
      if (!query) return { error: 'web_search: missing query' };
      const url = 'https://duckduckgo.com/html/?q=' + encodeURIComponent(query);
      const resp = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await resp.text();
      const results = [];
      const re = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) && results.length < limit) {
        const href = m[1];
        const title = stripHtml(m[2]).slice(0, 200);
        results.push({ title, url: href });
      }
      return { query, results };
    }

    if (toolName === 'current_time') {
      return { now: new Date().toISOString() };
    }

    return { error: `Unsupported tool: ${toolName}` };
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

async function callOpenRouter({ apiKey, siteUrl, payload }) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'emai2.cn'
    },
    body: JSON.stringify(payload)
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Upstream error ${resp.status}: ${text}`);
  }
  return JSON.parse(text);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    const body = JSON.parse(event.body || '{}');
    const {
      prompt,
      messages,
      model = (process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash:free'),
      temperature,
      top_p,
      max_tokens,
      tools,
      tool_choice,
      response_format,
      extra_headers,
      extra_body
    } = body || {};

    if (!apiKey) {
      // Demo fallback when no server API key is configured
      const finalMessages = Array.isArray(messages) ? messages : [ { role: 'user', content: prompt || '' } ];
      const userText = finalMessages.find(m => m?.role === 'user')?.content || prompt || '';
      const demo = `演示模式：未配置 OPENROUTER_API_KEY\n指令：${(typeof userText === 'string' ? userText : JSON.stringify(userText)).slice(0, 400)}\n提示：在服务器设置 OPENROUTER_API_KEY 后即可调用真实模型。`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, output: demo, raw: { demo: true } }) };
    }

    // proceed with real upstream

    if (!prompt && !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing prompt or messages' }) };
    }

    const finalMessages = Array.isArray(messages) ? messages : [ { role: 'user', content: prompt } ];
    const siteUrl = (event.headers && event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host'])
      ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
      : (event.headers?.origin || event.headers?.referer || '');

    const basePayload = {
      model,
      messages: finalMessages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
      ...(response_format ? { response_format } : {}),
      ...(extra_body && typeof extra_body === 'object' ? extra_body : {})
    };

    async function isQuotaOrEndpointError(e) {
      const s = (e?.message || e || '').toString();
      // treat 401/403 as recoverable (missing allowlist, invalid key scope), and 402/404 as quota/endpoint
      return /(Upstream error\s*(401|402|403|404))|Insufficient credits|No endpoints found|unauthorized|forbidden/i.test(s);
    }

    async function getFallbackModels(current) {
      const seen = new Set();
      const out = [];
      const preferred = (process.env.DEFAULT_MODEL || '').trim();
      if (preferred && preferred !== current) { seen.add(preferred); out.push(preferred); }
      try {
        const r = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (r.ok) {
          const j = await r.json();
          const list = Array.isArray(j?.data) ? j.data : [];
          const vendorOrder = ['meta','qwen','deepseek','mistralai','openai','google','anthropic','cohere','xai','hf','perplexity','01-ai','databricks','nvidia','ai21'];
          const ids = list.map(m => m?.id).filter(id => typeof id === 'string' && id.includes(':free'));
          ids.sort((a,b) => {
            const va = a.split('/')[0], vb = b.split('/')[0];
            const ra = vendorOrder.indexOf(va), rb = vendorOrder.indexOf(vb);
            if (ra !== rb) return (ra<0?999:ra) - (rb<0?999:rb);
            return String(a).localeCompare(String(b));
          });
          for (const id of ids) { if (id !== current && !seen.has(id)) { seen.add(id); out.push(id); if (out.length >= 5) break; } }
        }
      } catch {}
      if (out.length === 0) {
        const fallback = [
          'meta/llama-3.1-8b-instruct:free',
          'qwen/qwen2.5-7b-instruct:free',
          'deepseek/deepseek-chat:free',
          'mistralai/mistral-7b-instruct:free',
          'google/gemini-2.5-flash:free'
        ];
        for (const id of fallback) { if (id !== current && !seen.has(id)) { seen.add(id); out.push(id); } }
      }
      return out;
    }

    async function attemptWithModel(modelId) {
      let ctxMessages = finalMessages.slice();
      let lastData = null;
      for (let round = 0; round < 3; round++) {
        const data = await callOpenRouter({ apiKey, siteUrl, payload: { ...basePayload, model: modelId, messages: ctxMessages } });
        lastData = data;
        const choice = data?.choices?.[0];
        const msg = choice?.message;
        const toolCalls = msg?.tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          ctxMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });
          for (const tc of toolCalls) {
            const toolResult = await runTool(tc);
            ctxMessages.push({ role: 'tool', tool_call_id: tc?.id || undefined, name: tc?.function?.name || tc?.name, content: JSON.stringify(toolResult) });
          }
          continue;
        }
        const output = msg?.content || '';
        return { ok: true, output, raw: data, model: modelId };
      }
      const output = lastData?.choices?.[0]?.message?.content || '';
      return { ok: true, output, raw: lastData, notice: 'max tool rounds reached', model: modelId };
    }

    try {
      const res = await attemptWithModel(basePayload.model);
      return { statusCode: 200, body: JSON.stringify(res) };
    } catch (err) {
      if (!(await isQuotaOrEndpointError(err))) {
        throw err;
      }
      const candidates = await getFallbackModels(basePayload.model);
      for (const alt of candidates) {
        try {
          const res = await attemptWithModel(alt);
          // prepend a note
          res.output = `已自动切换到可用免费模型：${alt}\n\n` + (res.output || '');
          return { statusCode: 200, body: JSON.stringify(res) };
        } catch {}
      }
      const tip = `当前模型不可用或额度不足。可尝试以下免费模型：\n- ${candidates.join('\n- ') || '请从 /api/models 中选择带 :free 的模型'}\n\n也可在 .env 设置 DEFAULT_MODEL 并重启。`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, output: tip, raw: { demo: false, fallbackTried: candidates } }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message || String(err) }) };
  }
};
