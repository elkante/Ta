import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

async function executeBackendAi({
  prompt,
  jsonMode,
  groqKey,
  geminiKey,
}: {
  prompt: string;
  jsonMode: boolean;
  groqKey?: string;
  geminiKey?: string;
}): Promise<string | null> {
  // 1. Try Gemini if key is provided
  if (geminiKey && geminiKey.length > 15) {
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];
    for (const model of models) {
      try {
        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: jsonMode ? 750 : 850,
          },
        };
        if (jsonMode) {
          body.generationConfig.responseMimeType = 'application/json';
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (res.ok) {
          const data: any = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e: any) {
        console.warn(`[Vite AI Middleware] Gemini ${model} failed:`, e?.message);
      }
    }
  }

  // 2. Try Groq (high-speed fallback)
  if (groqKey && groqKey.length > 15) {
    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    for (const model of models) {
      try {
        const body: any = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: jsonMode ? 750 : 850,
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
          const data: any = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (e: any) {
        console.warn(`[Vite AI Middleware] Groq ${model} failed:`, e?.message);
      }
    }
  }

  return null;
}

function aiServerMiddleware(env: Record<string, string>): Plugin {
  return {
    name: 'ai-server-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && (req.url === '/api/ai/marketing' || req.url === '/api/ai/description')) {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const isJson = req.url === '/api/ai/marketing';
              const groqKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
              const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

              const resultText = await executeBackendAi({
                prompt: parsed.prompt,
                jsonMode: isJson,
                groqKey,
                geminiKey,
              });

              res.setHeader('Content-Type', 'application/json');
              if (resultText) {
                res.end(JSON.stringify({ success: true, text: resultText }));
              } else {
                res.end(JSON.stringify({ success: false, error: 'AI generation unavailable' }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), aiServerMiddleware(env)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
