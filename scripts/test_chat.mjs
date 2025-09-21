#!/usr/bin/env node
// Test non-streaming chat endpoint by auto-discovering a working base URL and model

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
  // As a fallback, if /api/models isn't available, still try /api/ai-chat on defaults
  for (const base of candidates) {
    try {
      const r = await fetch(base + '/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'ping (probe)' }] }) });
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
    // Fallback to a commonly available model (requires access on your key)
    return 'openai/gpt-4o-mini';
  }
}

async function main() {
  const base = await pickBaseUrl();
  const model = await pickModel(base);
  const body = {
    model,
    messages: [{ role: 'user', content: 'ping from test:chat' }]
  };
  const resp = await fetch(base + '/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.error(`[test:chat] FAIL base=${base} model=${model} -> HTTP ${resp.status} ${text}`);
    process.exit(1);
  }
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!json?.ok) {
    console.error(`[test:chat] FAIL base=${base} model=${model} -> ${text}`);
    process.exit(1);
  }
  const out = (json.output || '').slice(0, 200);
  console.log(`[test:chat] OK base=${base} model=${model} -> ${JSON.stringify(out)}`);
}

main().catch(err => { console.error('[test:chat] ERROR', err?.message || err); process.exit(1); });
