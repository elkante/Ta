// Vercel / Netlify serverless endpoint for AI Viral Marketing Studio
// API keys are stored securely on the server and NEVER exposed to client browsers

async function executeBackendAi({ prompt, jsonMode, groqKey, geminiKey }) {
  if (geminiKey && geminiKey.length > 15) {
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];
    for (const model of models) {
      try {
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: jsonMode ? 600 : 350,
          },
        };
        if (jsonMode) {
          body.generationConfig.responseMimeType = 'application/json';
        }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e) {
        console.warn(`[Serverless AI] Gemini ${model} failed:`, e?.message);
      }
    }
  }

  if (groqKey && groqKey.length > 15) {
    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    for (const model of models) {
      try {
        const body = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: jsonMode ? 600 : 350,
        };
        if (jsonMode) {
          body.response_format = { type: 'json_object' };
        }
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (e) {
        console.warn(`[Serverless AI] Groq ${model} failed:`, e?.message);
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const text = await executeBackendAi({ prompt, jsonMode: true, groqKey, geminiKey });
    if (text) {
      return res.status(200).json({ success: true, text });
    }
    return res.status(502).json({ success: false, error: 'AI provider unavailable' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
}
