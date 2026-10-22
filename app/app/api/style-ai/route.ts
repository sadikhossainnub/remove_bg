import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { imageBase64, prompt, provider = 'openai' } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 দরকার' }, { status: 400 });
  }

  const systemPrompt = `তুমি একজন expert fashion stylist AI। 
User একটি পোশাকের ছবি দেখাবে। তুমি বাংলায় সংক্ষিপ্ত কিন্তু helpful style advice দেবে:
1. পোশাকের বর্ণনা (রঙ, ধরন, স্টাইল)
2. কোন occasion এ মানাবে
3. কি accessories match করবে
4. কার জন্য suitable
সর্বোচ্চ ৫-৬ বাক্যে উত্তর দাও। Markdown ব্যবহার করো।`;

  const userPromptText = prompt || 'এই পোশাকটি সম্পর্কে style advice দাও।';

  try {
    if (provider === 'gemini') {
      return await analyzeWithGemini(imageBase64, systemPrompt, userPromptText);
    } else {
      return await analyzeWithOpenAI(imageBase64, systemPrompt, userPromptText);
    }
  } catch (err: any) {
    console.error(`[StyleAI ${provider} Error]`, err?.message);
    return NextResponse.json({ error: err?.message || 'AI error' }, { status: 500 });
  }
}

// ── OpenAI GPT-4o Vision ──────────────────────────────────────────
async function analyzeWithOpenAI(imageBase64: string, system: string, userText: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY নেই। .env.local এ যোগ করুন।' },
      { status: 500 }
    );
  }

  // Ensure data URL format
  const imageUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: userText },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return NextResponse.json({ text, provider: 'openai', model: 'gpt-4o' });
}

// ── Google Gemini Flash ───────────────────────────────────────────
async function analyzeWithGemini(imageBase64: string, system: string, userText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY নেই। .env.local এ যোগ করুন।' },
      { status: 500 }
    );
  }

  // Extract pure base64 and mime type
  let mimeType = 'image/jpeg';
  let pureBase64 = imageBase64;
  if (imageBase64.startsWith('data:')) {
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      pureBase64 = match[2];
    }
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const modelsToTry = [primaryModel, 'gemini-1.5-flash', 'gemini-1.5-pro'];

  let lastError = '';
  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: pureBase64 } },
                { text: userText },
              ],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = err?.error?.message || `Gemini HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ text, provider: 'gemini', model });
    } catch (e: any) {
      lastError = e?.message;
    }
  }

  throw new Error(lastError || 'Gemini API call failed');
}
