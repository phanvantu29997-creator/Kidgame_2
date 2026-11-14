import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const PHRASE_PROMPTS = {
  congrats: {
    text: 'Chúc mừng bé!',
    style:
      'Warm, sweet, cheerful Vietnamese female preschool teacher speaking affectionately and proudly to a 3 to 5 year old child',
  },
  wrong: {
    text: 'Chưa đúng rồi bé ơi!',
    style:
      'Gentle, warm, sweet Vietnamese female preschool teacher speaking softly and encouragingly to a 3 to 5 year old child',
  },
} as const;

type PhraseKey = keyof typeof PHRASE_PROMPTS;

const audioCache = new Map<PhraseKey, Buffer>();
const inflightRequests = new Map<PhraseKey, Promise<Buffer | null>>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function synthesizePhrase(key: PhraseKey): Promise<Buffer | null> {
  const cached = audioCache.get(key);
  if (cached) return cached;

  const existing = inflightRequests.get(key);
  if (existing) return existing;

  const task = (async (): Promise<Buffer | null> => {
    const ai = getGeminiClient();
    if (!ai) return null;

    const config = PHRASE_PROMPTS[key];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: config.text,
              speechMetadata: {
                style: config.style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) return null;

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    audioCache.set(key, wavBuffer);
    return wavBuffer;
  })().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, task);
  return task;
}

async function startServer() {
  const app = express();

  app.get('/api/tts', async (req, res) => {
    const typeParam = String(req.query.type || '');
    if (typeParam !== 'congrats' && typeParam !== 'wrong') {
      res.status(400).json({ error: 'Invalid phrase type' });
      return;
    }

    try {
      const wavBuffer = await synthesizePhrase(typeParam);
      if (!wavBuffer) {
        res.status(503).json({ error: 'TTS service unavailable' });
        return;
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(wavBuffer);
    } catch (err) {
      console.error('TTS synthesis error:', err);
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
