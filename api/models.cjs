// Vercel Serverless Function: /api/models
// Returns a list of available models from OpenRouter. No API key required, but if present it will be passed.

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const upstream = 'https://openrouter.ai/api/v1/models';
    let list = [];
    try {
      const r = await fetch(upstream, {
        method: 'GET',
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          'Accept': 'application/json'
        }
      });
      const text = await r.text();
      if (r.ok) {
        const data = JSON.parse(text);
        list = Array.isArray(data?.data) ? data.data : [];
      }
    } catch {}

    if (!Array.isArray(list) || list.length === 0) {
      list = [
        { id: 'qwen/qwen3-4b:free', name: 'Qwen3 4B (free)' },
        { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B A22B (free)' },
        { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (free)' },
        { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 24B (free)' },
        { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (free)' },
        { id: 'google/gemini-2.5-flash-image-preview:free', name: 'Gemini 2.5 Flash Image Preview (free)' }
      ];
    }

    res.status(200).json({ ok: true, data: list });
  } catch (err) {
    const list = [
      { id: 'qwen/qwen3-4b:free', name: 'Qwen3 4B (free)' },
      { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (free)' },
      { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (free)' },
      { id: 'google/gemini-2.5-flash-image-preview:free', name: 'Gemini 2.5 Flash Image Preview (free)' }
    ];
    res.status(200).json({ ok: true, data: list, notice: 'fallback' });
  }
};
