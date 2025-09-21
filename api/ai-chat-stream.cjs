// Vercel Serverless Function: /api/ai-chat-stream (SSE)
// Streams model output directly from OpenRouter to the client.
// NOTE: This streaming endpoint focuses on direct generation and does not execute server-side tool calls.

// Combined streaming with server-side tool execution between segments.

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

function sseWrite(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json').end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      res.status(500).setHeader('Content-Type', 'application/json').end(JSON.stringify({ ok: false, error: 'Missing OPENROUTER_API_KEY on server' }));
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
      response_format,
      extra_body,
      tools,
      tool_choice
    } = body || {};

    if (!prompt && !Array.isArray(messages)) {
      res.status(400).setHeader('Content-Type', 'application/json').end(JSON.stringify({ ok: false, error: 'Missing prompt or messages' }));
      return;
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
    const siteUrl = (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host'])
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
      : (req.headers.origin || '');

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const textDecoder = new TextDecoder();

    for (let round = 0; round < 3; round++) {
      const reader = await callUpstreamStream({ apiKey, siteUrl, model, messages: ctxMessages, params: baseParams });
      let buffer = '';

      // Accumulate tool calls (OpenAI style partial deltas)
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
          if (data === '[DONE]') { sseWrite(res, { done: true }); continue; }
          let j;
          try { j = JSON.parse(data); } catch { continue; }
          const choice = j?.choices?.[0];
          const delta = choice?.delta;
          const finish = choice?.finish_reason;

          // Forward content deltas directly
          const contentDelta = delta?.content;
          if (contentDelta) {
            sseWrite(res, { choices: [{ delta: { content: contentDelta } }] });
          }

          // Collect tool_calls deltas
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
        // Execute tools
        const toolCalls = Object.values(toolAcc).map((t, i) => ({
          id: t.id || `call_${i}`,
          type: 'function',
          function: { name: t.name || 'unknown', arguments: t.args || '{}' }
        }));

        // Assistant message referencing tool calls
        ctxMessages.push({ role: 'assistant', content: '', tool_calls: toolCalls });

        for (const tc of toolCalls) {
          let parsed;
          try { parsed = JSON.parse(tc.function.arguments || '{}'); } catch { parsed = { _raw: tc.function.arguments }; }
          const result = await runTool({ name: tc.function.name, arguments: parsed });
          ctxMessages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) });
        }
        // Continue next round to get final content
        continue;
      }

      // Finished without tool calls => end stream
      sseWrite(res, { done: true });
      res.end();
      return;
    }

    // Max rounds reached
    sseWrite(res, { notice: 'max tool rounds reached' });
    res.end();
  } catch (err) {
    try {
      sseWrite(res, { error: err?.message || String(err) });
    } catch {}
    res.end();
  }
};
