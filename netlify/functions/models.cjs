// Netlify Function: /.netlify/functions/models
// Returns a list of available models from OpenRouter. Key is optional; if missing we still return public list.

exports.handler = async () => {
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
      } else {
        // ignore upstream error; we'll fallback to static list
      }
    } catch {}

    if (!Array.isArray(list) || list.length === 0) {
      // Fallback minimal list (free/commonly accessible)
      list = [
        { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (free)' },
        { id: 'google/gemini-2.5-flash-image-preview:free', name: 'Gemini 2.5 Flash Image Preview (free)' }
      ];
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, data: list }) };
  } catch (err) {
    // As a last resort, still return fallback static list
    const list = [
      { id: 'google/gemma-2-2b-it:free', name: 'Gemma 2 2B IT (free)' },
      { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (free)' },
      { id: 'google/gemini-2.5-flash-image-preview:free', name: 'Gemini 2.5 Flash Image Preview (free)' }
    ];
    return { statusCode: 200, body: JSON.stringify({ ok: true, data: list, notice: 'fallback' }) };
  }
};
