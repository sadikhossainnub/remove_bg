import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    modelImage,
    garmentImage,
    garmentType = 'upper_body',
    provider = 'replicate',   // 'replicate' | 'openai'
  } = body;

  if (!modelImage || !garmentImage) {
    return NextResponse.json({ error: 'modelImage ও garmentImage দুটোই দরকার' }, { status: 400 });
  }

  try {
    if (provider === 'local') {
      return await tryOnWithLocalSD(modelImage, garmentImage, garmentType);
    }
    if (provider === 'gemini') {
      return await tryOnWithGemini(modelImage, garmentImage, garmentType);
    }
    if (provider === 'openai') {
      return await tryOnWithOpenAI(modelImage, garmentImage, garmentType);
    }
    return await tryOnWithReplicate(modelImage, garmentImage, garmentType);
  } catch (err: any) {
    console.error(`[TryOn ${provider} Error]`, err?.message);
    const msg = err?.message || 'Unknown error';
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return NextResponse.json({ error: `${provider.toUpperCase()} API token/key ভুল বা expired।` }, { status: 401 });
    }
    if (msg.includes('402') || msg.includes('billing') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({
        error: provider === 'replicate'
          ? 'Replicate একাউন্টে ক্রেডিট শেষ হয়ে গেছে। Replicate বিলিংয়ে ক্রেডিট রিচার্জ করুন অথবা GPT / Gemini সিলেক্ট করুন।'
          : provider === 'gemini'
          ? 'Gemini একাউন্টের ফ্রি কোটা বা ক্রেডিট শেষ। অনুগ্রহ করে বিলিং চেক করুন অথবা Replicate/GPT সিলেক্ট করুন।'
          : 'OpenAI একাউন্টে ক্রেডিট নেই। আপনার OpenAI বিলিং চেক করুন অথবা Gemini সিলেক্ট করুন।'
      }, { status: 402 });
    }
    return NextResponse.json({ error: `AI Error (${provider}): ${msg}` }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────
const toBase64 = (dataUrl: string) =>
  dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : dataUrl;

const getMime = (dataUrl: string) => {
  const m = dataUrl.match(/^data:([^;]+);/);
  return m ? m[1] : 'image/jpeg';
};

// ── Provider: Replicate IDM-VTON ──────────────────────────────────
async function tryOnWithReplicate(modelImage: string, garmentImage: string, garmentType: string) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN নেই। .env.local এ যোগ করুন: https://replicate.com/account/api-tokens' },
      { status: 500 }
    );
  }

  const { default: Replicate } = await import('replicate');
  const replicate = new Replicate({ auth: apiToken });

  const garmentDesc =
    garmentType === 'dresses' ? 'A full dress or outfit' :
    garmentType === 'lower_body' ? 'Pants or lower body clothing' :
    'A shirt or upper body clothing';

  const output = await replicate.run(
    'cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
    {
      input: {
        human_img:    `data:${getMime(modelImage)};base64,${toBase64(modelImage)}`,
        garm_img:     `data:${getMime(garmentImage)};base64,${toBase64(garmentImage)}`,
        garment_des:  garmentDesc,
        is_checked:       true,
        is_checked_crop:  false,
        denoise_steps:    30,
        seed:             42,
        category:         garmentType,
      },
    }
  );

  let resultUrl: string;
  if (typeof output === 'string') resultUrl = output;
  else if (Array.isArray(output) && output.length > 0) resultUrl = String(output[0]);
  else if (output && typeof (output as any).url === 'function') resultUrl = (output as any).url().toString();
  else resultUrl = String(output);

  return NextResponse.json({ output: resultUrl, success: true, provider: 'replicate' });
}

// ── Provider: OpenAI DALL-E 3 (Image Edit / Prompt-based) ────────
async function tryOnWithOpenAI(modelImage: string, garmentImage: string, garmentType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY নেই। .env.local এ যোগ করুন: https://platform.openai.com/api-keys' },
      { status: 500 }
    );
  }

  const garmentLabel =
    garmentType === 'dresses' ? 'full dress' :
    garmentType === 'lower_body' ? 'pants/lower clothing' :
    'top/shirt';

  // GPT-4o first analyses the garment, then DALL-E generates the try-on
  // Step 1: Ask GPT-4o to describe the garment in detail
  const descRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: garmentImage.startsWith('data:') ? garmentImage : `data:image/jpeg;base64,${garmentImage}`, detail: 'low' }
          },
          {
            type: 'text',
            text: `Describe this ${garmentLabel} in extreme detail for a fashion designer. Include: exact colors, fabric texture appearance, patterns/prints, cut/silhouette, neckline, sleeves, length, any embellishments. Be precise and technical. Max 3 sentences.`
          }
        ]
      }],
      max_tokens: 300,
    })
  });

  if (!descRes.ok) {
    const err = await descRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `GPT-4o HTTP ${descRes.status}`);
  }

  const descData = await descRes.json();
  const garmentDescription = descData.choices?.[0]?.message?.content || 'a stylish garment';

  // Step 2: Generate try-on image with DALL-E 3
  const prompt = `A professional fashion photo of a person wearing exactly this ${garmentLabel}: ${garmentDescription}. The clothing fits perfectly. Studio lighting, white background, high quality fashion photography, realistic.`;

  const genRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    })
  });

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `DALL-E HTTP ${genRes.status}`);
  }

  const genData = await genRes.json();
  const imageUrl = genData.data?.[0]?.url;

  if (!imageUrl) throw new Error('DALL-E থেকে image পাওয়া যায়নি');

  return NextResponse.json({
    output: imageUrl,
    success: true,
    provider: 'openai',
    note: 'GPT-4o দিয়ে dress বিশ্লেষণ করে DALL-E 3 দিয়ে generate করা হয়েছে। True try-on এর জন্য Replicate ব্যবহার করুন।'
  });
}

// ── Provider: Google Gemini Nano Banana 2.1 (Interactions API) ─────
async function tryOnWithGemini(modelImage: string, garmentImage: string, garmentType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY নেই। .env.local এ যোগ করুন: https://aistudio.google.com/apikey' },
      { status: 500 }
    );
  }

  const garmentLabel =
    garmentType === 'dresses' ? 'full dress' :
    garmentType === 'lower_body' ? 'pants/lower body outfit' :
    'top / shirt / upper body clothing';

  const modelMime = getMime(modelImage);
  const modelB64  = toBase64(modelImage);
  const garmMime  = getMime(garmentImage);
  const garmB64   = toBase64(garmentImage);

  const promptText = `Virtual Try-On task: Image 1 is the target person/model. Image 2 is the ${garmentLabel} garment. Generate a single photorealistic, high quality fashion photo showing the person from Image 1 wearing the exact garment from Image 2. Maintain the person's face, hair, body shape, and pose while naturally fitting the clothing onto them with realistic fabric folds, shadows, and lighting. Studio lighting, clean background, 8k resolution.`;

  // Nano Banana 2.1 uses the Gemini Interactions API
  const interactionsRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-nano-banana-2.1',
        input: [
          { type: 'text', text: promptText },
          { type: 'image', mime_type: modelMime, data: modelB64 },
          { type: 'image', mime_type: garmMime, data: garmB64 },
        ],
        response_format: {
          type: 'image',
          aspect_ratio: '1:1',
          image_size: '2K',
        },
      }),
    }
  );

  if (interactionsRes.ok) {
    const data = await interactionsRes.json();

    // 1. Check direct output_image (convenience property)
    if (data?.output_image?.data) {
      const mime = data.output_image.mime_type || 'image/png';
      return NextResponse.json({
        output: `data:${mime};base64,${data.output_image.data}`,
        success: true,
        provider: 'gemini',
        note: 'Google Nano Banana 2.1 (gemini-nano-banana-2.1) দিয়ে তৈরি করা হয়েছে।',
      });
    }

    // 2. Iterate steps for model_output image blocks
    if (Array.isArray(data?.steps)) {
      for (const step of data.steps) {
        if (step?.type === 'model_output' && Array.isArray(step?.content)) {
          for (const block of step.content) {
            if (block?.type === 'image' && block?.data) {
              const mime = block.mime_type || 'image/png';
              return NextResponse.json({
                output: `data:${mime};base64,${block.data}`,
                success: true,
                provider: 'gemini',
                note: 'Google Nano Banana 2.1 (gemini-nano-banana-2.1) দিয়ে তৈরি করা হয়েছে।',
              });
            }
          }
        }
      }
    }

    // 3. Check if output or text was returned
    const textOut = data?.output_text || data?.steps?.[0]?.content?.[0]?.text;
    if (textOut) {
      throw new Error(`Nano Banana 2.1 টেক্সট ফেরত পাঠিয়েছে: ${textOut}`);
    }
  }

  const errData = await interactionsRes.json().catch(() => ({}));
  const errMsg = errData?.error?.message || `HTTP ${interactionsRes.status} ${interactionsRes.statusText}`;
  throw new Error(`Nano Banana 2.1 error: ${errMsg}`);
}

// ── Provider: Local / Free IDM-VTON (sd_server.py) ─────
async function tryOnWithLocalSD(modelImage: string, garmentImage: string, garmentType: string) {
  const localSdUrl = process.env.LOCAL_SD_URL || 'http://localhost:5001';

  const garmentLabel =
    garmentType === 'dresses' ? 'full dress outfit' :
    garmentType === 'lower_body' ? 'stylish trousers/jeans' :
    'fashion top/shirt';

  try {
    const res = await fetch(`${localSdUrl}/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_image: modelImage,
        garment_image: garmentImage,
        garment_type: garmentType,
        garment_des: garmentLabel,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Local SD Server HTTP ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      output: data.output,
      success: true,
      provider: 'local',
      note: data.note || 'IDM-VTON মডেল দিয়ে পোশাকটি পরা তৈরি করা হয়েছে।'
    });
  } catch (err: any) {
    if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')) {
      throw new Error(`লোকাল SD সার্ভার বন্ধ আছে (${localSdUrl})। অনুগ্রহ করে 'python3 api/src/services/sd_server.py' চালু করুন।`);
    }
    throw err;
  }
}

