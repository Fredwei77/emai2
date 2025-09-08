#!/usr/bin/env node
// Periodic health check for model connectivity.
// - Checks /api/ai-health for upstream availability
// - Sends a lightweight chat probe using DEFAULT_MODEL (no tool calls)
// - Supports optional webhook reporting via HEALTH_WEBHOOK_URL env
// Usage:
//   node scripts/health_check.mjs [--base http://localhost:3001] [--timeout 15000]

const args = process.argv.slice(2);
function getArg(flag, def) {
  const i = args.indexOf(flag);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return def;
}

const BASE = (process.env.HEALTH_BASE_URL || getArg('--base', 'http://localhost:3001')).replace(/\/$/, '');
const TIMEOUT = parseInt(process.env.HEALTH_TIMEOUT_MS || getArg('--timeout', '15000'), 10) || 15000;
const WEBHOOK = process.env.HEALTH_WEBHOOK_URL || '';

function withTimeout(p, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function postWebhook(payload) {
  if (!WEBHOOK) return;
  try {
    await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {}
}

async function checkHealth() {
  const started = Date.now();
  const result = { ok: false, steps: [], durationMs: 0 };

  try {
    // 1) /api/ai-health
    let r1, t1;
    try {
      r1 = await withTimeout(fetch(BASE + '/api/ai-health'), TIMEOUT, 'ai-health');
      t1 = await r1.text();
      const json = JSON.parse(t1);
      result.steps.push({ name: 'ai-health', status: r1.status, ok: !!json?.ok, upstream: json?.upstream || null });
    } catch (e) {
      result.steps.push({ name: 'ai-health', error: e?.message || String(e) });
    }

    // 2) /api/ai-chat (default model)
    let r2, t2;
    try {
      r2 = await withTimeout(fetch(BASE + '/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: '健康检查：请回复 OK' }] })
      }), TIMEOUT, 'ai-chat');
      t2 = await r2.text();
      let j2; try { j2 = JSON.parse(t2); } catch { j2 = null; }
      result.steps.push({ name: 'ai-chat', status: r2.status, ok: !!j2?.ok, model: j2?.model || null, notice: j2?.notice || null });
    } catch (e) {
      result.steps.push({ name: 'ai-chat', error: e?.message || String(e) });
    }

    result.ok = result.steps.every(s => s?.ok || s?.status === 200);
  } catch (e) {
    result.steps.push({ name: 'fatal', error: e?.message || String(e) });
  } finally {
    result.durationMs = Date.now() - started;
  }

  // Console report
  const summary = `health_check: base=${BASE} ok=${result.ok} durationMs=${result.durationMs}\n` +
                  result.steps.map(s => `- ${s.name}: ${s.status || ''} ${s.ok ? 'OK' : (s.error || '')}`).join('\n');
  console.log(summary);

  // Optional webhook
  await postWebhook({ source: 'health_check', base: BASE, ...result });

  // Exit code
  process.exit(result.ok ? 0 : 1);
}

checkHealth();
