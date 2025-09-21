// Vercel Serverless Function: /api/ai-chat
// Securely proxies requests to OpenRouter (or another LLM provider) using env var OPENROUTER_API_KEY

// Helper: execute a supported tool call
async function runTool(tool) {
  try {
    const { name, arguments: argsJson } = tool || {};
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

    if (name === 'fetch_url') {
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

    if (name === 'fetch_url_text') {
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

    if (name === 'http_get_json_path') {
      const url = args?.url;
      const path = args?.path; // dot + [index]
      if (!url || typeof url !== 'string') return { error: 'http_get_json_path: missing url' };
      const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const json = await resp.json();
      const value = getByPath(json, path);
      return { status: resp.status, value };
    }

    if (name === 'web_search') {
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

    if (name === 'current_time') {
      return { now: new Date().toISOString() };
    }

    return { error: `Unsupported tool: ${name}` };
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Demo fallback when no server API key is configured
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const finalMessages = Array.isArray(body?.messages) ? body.messages : [ { role: 'user', content: body?.prompt || '' } ];
      const userText = finalMessages.find(m => m?.role === 'user')?.content || body?.prompt || '';
      const demo = `演示模式：未配置 OPENROUTER_API_KEY\n指令：${(typeof userText === 'string' ? userText : JSON.stringify(userText)).slice(0, 400)}\n提示：在服务器设置 OPENROUTER_API_KEY 后即可调用真实模型。`;
      res.status(200).json({ ok: true, output: demo, raw: { demo: true } });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      prompt,
      messages,
      model = 'google/gemini-2.5-flash-image-preview:free',
      temperature,
      top_p,
      max_tokens,
      tools,
      tool_choice,
      response_format,
      extra_headers,
      extra_body
    } = body || {};

    if (!prompt && !Array.isArray(messages)) {
      res.status(400).json({ ok: false, error: 'Missing prompt or messages' });
      return;
    }

    // Build messages (support plain prompt or OpenAI-style content arrays, including image_url)
    const finalMessages = Array.isArray(messages) ? messages : [ { role: 'user', content: prompt } ];

    const siteUrl = (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host'])
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
      : (req.headers.origin || '');

    // Initial payload
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

    // Single or iterative tool-call handling (up to 3 rounds)
    let ctxMessages = finalMessages.slice();
    let lastData = null;
    for (let round = 0; round < 3; round++) {
      const data = await callOpenRouter({ apiKey, siteUrl, payload: { ...basePayload, messages: ctxMessages } });
      lastData = data;
      const choice = data?.choices?.[0];
      const msg = choice?.message;
      const toolCalls = msg?.tool_calls;

      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        // Append assistant tool_calls
        ctxMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });
        // Execute each call
        for (const tc of toolCalls) {
          const toolResult = await runTool(tc);
          ctxMessages.push({ role: 'tool', tool_call_id: tc?.id || undefined, name: tc?.function?.name || tc?.name, content: JSON.stringify(toolResult) });
        }
        // Continue next round to get final answer
        continue;
      }

      // No tool calls -> final
      const output = msg?.content || '';
      res.status(200).json({ ok: true, output, raw: data });
      return;
    }

    // If exceeded rounds, return last data content
    const output = lastData?.choices?.[0]?.message?.content || '';
    res.status(200).json({ ok: true, output, raw: lastData, notice: 'max tool rounds reached' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
};
