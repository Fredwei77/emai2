// Netlify Function: /.netlify/functions/ai-health
// Simple health check to verify function routing and (optionally) upstream availability.

exports.handler = async () => {
  const started = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const env = { present: !!apiKey };

  let upstream = {};
  if (apiKey) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (r.ok) {
        const j = await r.json();
        const list = Array.isArray(j?.data) ? j.data : [];
        upstream.models = { ok: true, count: list.length, pick: list[0]?.id || null };
      } else {
        upstream.models = { ok: false, error: `HTTP ${r.status}` };
      }
    } catch (e) {
      upstream.models = { ok: false, error: e?.message || String(e) };
    }

    // quick chat probe (non-streaming) to validate key works; keep it lightweight
    try {
      const payload = { model: (process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash:free'), messages: [{ role: 'user', content: 'ping' }] };
      const r2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (r2.ok) {
        upstream.chat = { ok: true, model: payload.model };
      } else {
        const txt = await r2.text().catch(() => '');
        upstream.chat = { ok: false, model: payload.model, error: `HTTP ${r2.status} ${txt.slice(0,200)}` };
      }
    } catch (e) {
      upstream.chat = { ok: false, error: e?.message || String(e) };
    }
  }

  const out = {
    ok: true,
    env,
    upstream,
    durationMs: Date.now() - started
  };

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) };
};
