// Netlify Function: /.netlify/functions/ai-chat-stream (SSE)
// Streams model output and supports server-side tool execution between streaming segments.

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

async function callUpstreamStream({ apiKey, siteUrl, model, messages, params }) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'emai2.cn'
    },
    body: JSON.stringify({ model, messages, stream: true, ...(params||{}) })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Upstream error ${resp.status}: ${text}`);
  }
  return resp.body.getReader();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    const body = JSON.parse(event.body || '{}');

    if (!apiKey) {
      // SSE demo fallback without upstream key: stream a simple message and end
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const sse = async (obj) => { await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); };
      (async () => {
        try {
          await sse({ choices: [{ delta: { content: '演示模式（无服务器密钥）：' } }] });
          await sse({ choices: [{ delta: { content: '已收到请求，' } }] });
          await sse({ choices: [{ delta: { content: '请在服务器配置 OPENROUTER_API_KEY 后使用真实模型。' } }] });
          await sse({ done: true });
        } finally { await writer.close(); }
      })();
      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive'
        }
      });
    }

    // proceed real upstream
    const {
      prompt,
      messages,
      model = (process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash:free'),
      temperature,
      top_p,
      max_tokens,
      response_format,
      extra_body,
      tools,
      tool_choice
    } = body || {};

    if (!prompt && !Array.isArray(messages)) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Missing prompt or messages' }) };
    }

    const baseParams = {
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(response_format ? { response_format } : {}),
      ...(extra_body && typeof extra_body === 'object' ? extra_body : {}),
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {})
    };

    let ctxMessages = Array.isArray(messages) ? messages.slice() : [ { role: 'user', content: prompt } ];
    const siteUrl = (event.headers && event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host'])
      ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
      : (event.headers?.origin || event.headers?.referer || '');

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const sseWrite = async (obj) => { await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); };

    // Helpers for fallback
    const isQuotaOrEndpointError = (e) => {
      const s = (e?.message || e || '').toString();
      return /(Upstream error\s*(401|402|403|404))|Insufficient credits|No endpoints found|unauthorized|forbidden/i.test(s);
    };

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

    async function streamOnceWithModel(modelId) {
      let hasWritten = false;
      const textDecoder = new TextDecoder();
      let localCtx = Array.isArray(messages) ? messages.slice() : [ { role: 'user', content: prompt } ];
      for (let round = 0; round < 3; round++) {
        const reader = await callUpstreamStream({ apiKey, siteUrl, model: modelId, messages: localCtx, params: baseParams });
        let buffer = '';
        const toolAcc = {}; // index -> { id, name, args: string }
        let sawToolFinish = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += textDecoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const line = part.trim();
            if (!line) continue;
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') { await sseWrite({ done: true }); continue; }
            let j;
            try { j = JSON.parse(data); } catch { continue; }
            const choice = j?.choices?.[0];
            const delta = choice?.delta;
            const finish = choice?.finish_reason;

            const contentDelta = delta?.content;
            if (contentDelta) {
              hasWritten = true;
              await sseWrite({ choices: [{ delta: { content: contentDelta } }] });
            }

            const tc = delta?.tool_calls;
            if (Array.isArray(tc)) {
              for (const item of tc) {
                const idx = item?.index ?? 0;
                toolAcc[idx] = toolAcc[idx] || { id: item?.id, name: item?.function?.name || '', args: '' };
                if (item?.id) toolAcc[idx].id = item.id;
                if (item?.function?.name) toolAcc[idx].name = item.function.name;
                if (typeof item?.function?.arguments === 'string') toolAcc[idx].args += item.function.arguments;
              }
            }

            if (finish === 'tool_calls') {
              sawToolFinish = true;
            }
          }
        }

        if (sawToolFinish && Object.keys(toolAcc).length > 0) {
          const toolCalls = Object.values(toolAcc).map((t, i) => ({
            id: t.id || `call_${i}`,
            type: 'function',
            function: { name: t.name || 'unknown', arguments: t.args || '{}' }
          }));
          localCtx.push({ role: 'assistant', content: '', tool_calls: toolCalls });
          for (const tc of toolCalls) {
            let parsed;
            try { parsed = JSON.parse(tc.function.arguments || '{}'); } catch { parsed = { _raw: tc.function.arguments }; }
            const result = await runTool({ name: tc.function.name, arguments: parsed });
            localCtx.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) });
          }
          continue; // next round
        }

        await sseWrite({ done: true });
        return true;
      }
      await sseWrite({ done: true });
      return true;
    }

    (async () => {
      try {
        // Try initial model; if upstream error qualifies and nothing was written yet, fallback
        try {
          await streamOnceWithModel(model);
          return;
        } catch (e) {
          if (!isQuotaOrEndpointError(e)) throw e;
        }
        const candidates = await getFallbackModels(model);
        for (const alt of candidates) {
          try {
            await sseWrite({ choices: [{ delta: { content: `已自动切换到可用免费模型：${alt}\n` } }] });
            await streamOnceWithModel(alt);
            return;
          } catch (e2) {
            if (!isQuotaOrEndpointError(e2)) throw e2;
          }
        }
        const tip = `当前模型不可用或额度不足。可尝试以下免费模型：\n- ${candidates.join('\n- ') || '请从 /api/models 中选择带 :free 的模型'}\n\n也可在 .env 设置 DEFAULT_MODEL 并重启。`;
        await sseWrite({ choices: [{ delta: { content: tip } }] });
        await sseWrite({ done: true });
      } catch (err) {
        await sseWrite({ error: err?.message || String(err) });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: err?.message || String(err) }) };
  }
};
