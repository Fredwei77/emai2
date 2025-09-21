// Vercel Serverless Function: /api/ai-health
// Simple health check to verify function routing and (optionally) upstream availability.

module.exports = async (req, res) => {
  const started = Date.now();
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const env = { present: !!apiKey };

    const out = { ok: true, env, durationMs: Date.now() - started };

    if (apiKey) {
      const defaultModel = process.env.DEFAULT_MODEL || 'google/gemini-2.5-flash:free';
      try {
        const r = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (r.ok) {
          const j = await r.json();
          out.upstream = { models: { ok: true, count: Array.isArray(j?.data) ? j.data.length : 0 } };
        } else {
          out.upstream = { models: { ok: false, error: `HTTP ${r.status}` } };
        }
      } catch (e) {
        out.upstream = { models: { ok: false, error: e?.message || String(e) } };
      }
    }

    res.status(200).json(out);
  } catch (err) {
    res.status(200).json({ ok: true, env: { present: false }, durationMs: Date.now() - started, notice: 'fallback' });
  }
};
