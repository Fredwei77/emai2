#!/usr/bin/env node
// Test streaming chat endpoint (SSE) by auto-discovering a working base URL and model

const candidates = [];
if (process.env.TEST_BASE_URL) candidates.push(process.env.TEST_BASE_URL.replace(/\/$/, ''));
candidates.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001');

async function pickBaseUrl() {
  for (const base of candidates) {
    try {
      const r = await fetch(base + '/api/models');
      if (r.ok) return base;
    } catch {}
  }
  // Try streaming endpoint directly
  for (const base of candidates) {
    try {
      const r = await fetch(base + '/api/ai-chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'ping (probe)' }] }) });
      if (r.ok) return base;
    } catch {}
  }
  throw new Error('No working dev server base URL found. Try setting TEST_BASE_URL or ensure `npm run dev` is running.');
}

async function pickModel(base) {
  try {
    const r = await fetch(base + '/api/models');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    if (!list.length) throw new Error('empty model list');
    const free = list.filter(m => typeof m?.id === 'string' && m.id.includes(':free'));
    return free[0]?.id || list[0]?.id || 'openai/gpt-4o-mini';
  } catch (e) {
    return 'openai/gpt-4o-mini';
  }
}

async function main() {
  const base = await pickBaseUrl();
  const model = await pickModel(base);
  const body = {
    model,
    messages: [{ role: 'user', content: 'streaming ping from test:stream' }]
  };
  const resp = await fetch(base + '/api/ai-chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    console.error(`[test:stream] FAIL base=${base} model=${model} -> HTTP ${resp.status} ${text}`);
    process.exit(1);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let gotDelta = false;
  let readCount = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    readCount++;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk.includes('data:')) gotDelta = true;
    if (readCount > 50) break; // don't run forever in tests
  }
  if (!gotDelta) {
    console.error(`[test:stream] FAIL base=${base} model=${model} -> no SSE data received`);
    process.exit(1);
  }
  console.log(`[test:stream] OK base=${base} model=${model} -> streaming SSE received`);
}

main().catch(err => { console.error('[test:stream] ERROR', err?.message || err); process.exit(1); });
