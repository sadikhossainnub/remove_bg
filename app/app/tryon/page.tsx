'use client';
import { useState, useRef, useCallback } from 'react';

type Status = 'idle' | 'uploading' | 'done' | 'error';
type TryOnProvider = 'replicate' | 'openai' | 'gemini' | 'local';
type StyleProvider  = 'openai' | 'gemini';

// ── Markdown renderer (simple) ──────────────────────────────────
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ lineHeight: 1.8, fontSize: '0.9rem', color: 'var(--color-text)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} style={{ fontWeight: 700, marginTop: '12px', marginBottom: '4px', color: 'var(--color-primary-glow)' }}>{line.slice(4)}</h4>;
        if (line.startsWith('## '))  return <h3 key={i} style={{ fontWeight: 700, marginTop: '12px', marginBottom: '4px' }}>{line.slice(3)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.slice(2, -2)}</strong>;
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: '12px', marginBottom: '2px' }}>• {line.slice(2)}</div>;
        if (line.startsWith('1. ') || line.match(/^\d+\. /)) return <div key={i} style={{ paddingLeft: '12px', marginBottom: '2px' }}>{line}</div>;
        if (line.trim() === '') return <br key={i} />;
        // inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ marginBottom: '2px' }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : <span key={j}>{part}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TryOnPage() {
  // Try-On state
  const [modelImage,   setModelImage]   = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [resultImage,  setResultImage]  = useState<string | null>(null);
  const [tryOnStatus,  setTryOnStatus]  = useState<Status>('idle');
  const [tryOnError,   setTryOnError]   = useState('');
  const [tryOnProvider, setTryOnProvider] = useState<TryOnProvider>('replicate');
  const [garmentType,  setGarmentType]  = useState<'upper_body' | 'lower_body' | 'dresses'>('upper_body');
  const [progress,     setProgress]     = useState(0);
  const [resultNote,   setResultNote]   = useState('');

  // Style AI state
  const [styleText,     setStyleText]     = useState('');
  const [styleLoading,  setStyleLoading]  = useState(false);
  const [styleError,    setStyleError]    = useState('');
  const [styleProvider, setStyleProvider] = useState<StyleProvider>('gemini');
  const [styleTarget,   setStyleTarget]   = useState<'model' | 'garment'>('garment');

  // Drag state
  const [isDraggingModel,   setIsDraggingModel]   = useState(false);
  const [isDraggingGarment, setIsDraggingGarment] = useState(false);

  const modelInputRef   = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  // ── File helpers ──────────────────────────────────────────────
  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleModelFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setModelImage(await readFileAsBase64(file));
    setResultImage(null); setStyleText('');
  }, []);

  const handleGarmentFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setGarmentImage(await readFileAsBase64(file));
    setResultImage(null); setStyleText('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'model' | 'garment') => {
    e.preventDefault();
    type === 'model' ? setIsDraggingModel(false) : setIsDraggingGarment(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    type === 'model' ? handleModelFile(file) : handleGarmentFile(file);
  }, [handleModelFile, handleGarmentFile]);

  // ── Virtual Try-On ────────────────────────────────────────────
  const processTryOn = async () => {
    if (!modelImage || !garmentImage) { setTryOnError('দুটো ছবিই upload করুন।'); return; }
    setTryOnStatus('uploading'); setTryOnError(''); setProgress(10); setResultNote('');

    const timer = setInterval(() => setProgress(p => Math.min(p + 4, 85)), 2000);

    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelImage, garmentImage, garmentType, provider: tryOnProvider }),
      });

      clearInterval(timer); setProgress(92);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setProgress(100);
      setResultImage(data.output);
      setResultNote(data.note || '');
      setTryOnStatus('done');
    } catch (e: any) {
      clearInterval(timer);
      setTryOnError(e.message || 'কিছু একটা ভুল হয়েছে।');
      setTryOnStatus('error'); setProgress(0);
    }
  };

  // ── Style AI ──────────────────────────────────────────────────
  const analyzeStyle = async () => {
    const targetImage = styleTarget === 'garment' ? garmentImage : modelImage;
    if (!targetImage) { setStyleError('আগে ছবি upload করুন।'); return; }

    setStyleLoading(true); setStyleError(''); setStyleText('');

    try {
      const res = await fetch('/api/style-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImage,
          provider: styleProvider,
          prompt: styleTarget === 'garment'
            ? 'এই পোশাকটির style analysis করো।'
            : 'এই person এর জন্য কোন ধরনের পোশাক suit করবে?',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStyleText(data.text || '');
    } catch (e: any) {
      setStyleError(e.message || 'AI error');
    } finally {
      setStyleLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage; a.download = `tryon_${Date.now()}.png`; a.click();
  };

  const reset = () => {
    setModelImage(null); setGarmentImage(null);
    setResultImage(null); setTryOnStatus('idle');
    setTryOnError(''); setProgress(0);
    setStyleText(''); setStyleError(''); setResultNote('');
  };

  const isProcessing = tryOnStatus === 'uploading';

  // ── Render ────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', padding: '0 0 80px' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 0 36px' }}>
        <div style={{ position:'absolute', top:'-100px', left:'20%', width:'500px', height:'500px', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius:'50%', filter:'blur(140px)', opacity:0.12, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-60px', right:'10%', width:'350px', height:'350px', background:'#ec4899', borderRadius:'50%', filter:'blur(120px)', opacity:0.08, pointerEvents:'none' }} />
        <div className="container-sm" style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <div className="badge badge-violet" style={{ marginBottom:'16px', display:'inline-flex' }}>
            👗 AI Virtual Try-On · Multi-Provider
          </div>
          <h1 style={{ fontSize:'3rem', fontWeight:800, lineHeight:1.1, marginBottom:'12px', letterSpacing:'-0.02em' }}>
            যেকোনো <span className="gradient-text">পোশাক পরুন</span> AI দিয়ে
          </h1>
          <p style={{ fontSize:'1rem', color:'var(--color-text2)', maxWidth:'480px', margin:'0 auto', lineHeight:1.7 }}>
            Model + dress এর ছবি দিন। Replicate, OpenAI বা Gemini — যেটা চান সেটা দিয়ে generate করুন।
          </p>
        </div>
      </section>

      <div className="container" style={{ position:'relative', zIndex:1 }}>

        {/* ── Provider Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'12px', marginBottom:'32px' }}>
          {([
            { key:'local',     name:'FREE IDM-VTON', label:'IDM-VTON (Free Engine)', desc:'সম্পূর্ণ ফ্রি, আসল ভার্চুয়াল ট্রাই-অন (কোনো API key লাগবে না)', badge:'✨ 100% Free / Real VTON', color:'#f59e0b', envKey:'LOCAL_SD_URL' },
            { key:'replicate', name:'REPLICATE', label:'IDM-VTON', desc:'Best quality — true virtual try-on', badge:'🏆 Best Quality', color:'#7c3aed', envKey:'REPLICATE_API_TOKEN' },
            { key:'openai',    name:'GPT (OpenAI)', label:'GPT-4o + DALL-E 3', desc:'GPT দিয়ে describe, DALL-E দিয়ে generate', badge:'⚡ Popular', color:'#10b981', envKey:'OPENAI_API_KEY' },
            { key:'gemini',    name:'GEMINI (Google)', label:'Nano Banana 2.1', desc:'Native image generation via Interactions API', badge:'✨ Nano Banana 2.1', color:'#4f87ff', envKey:'GEMINI_API_KEY' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setTryOnProvider(p.key)}
              style={{
                padding:'16px 20px', textAlign:'left',
                borderRadius:'var(--radius-lg)',
                border:`2px solid ${tryOnProvider === p.key ? p.color : 'var(--color-border2)'}`,
                background: tryOnProvider === p.key ? `${p.color}15` : 'var(--color-surface)',
                cursor:'pointer', fontFamily:'var(--font-main)', transition:'all 0.2s ease',
              }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <span style={{ fontWeight:700, fontSize:'0.95rem', color: tryOnProvider===p.key ? p.color : 'var(--color-text)' }}>{p.name}</span>
                <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:'999px', background:`${p.color}20`, color:p.color, fontWeight:600 }}>{p.badge}</span>
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--color-primary-glow)', fontWeight:600, marginBottom:'4px' }}>{p.label}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--color-muted)' }}>{p.desc}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--color-border2)', marginTop:'8px', fontFamily:'var(--font-mono)' }}>
                env: <span style={{ color: tryOnProvider===p.key ? p.color : 'var(--color-muted)' }}>{p.envKey}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Garment Type ── */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'28px', flexWrap:'wrap' }}>
          {([
            { key:'upper_body', label:'👕 উপরের পোশাক' },
            { key:'lower_body', label:'👖 নিচের পোশাক' },
            { key:'dresses',    label:'👗 ফুল ড্রেস' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setGarmentType(key)}
              style={{
                padding:'10px 20px', borderRadius:'var(--radius-md)',
                border:`1.5px solid ${garmentType===key ? 'var(--color-primary)' : 'var(--color-border2)'}`,
                background: garmentType===key ? 'rgba(124,58,237,0.15)' : 'var(--color-surface)',
                color: garmentType===key ? 'var(--color-primary-glow)' : 'var(--color-text2)',
                cursor:'pointer', fontFamily:'var(--font-main)', fontWeight:600, fontSize:'0.88rem',
                transition:'all 0.2s ease',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── Upload Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'28px' }}>
          <UploadZone
            label="👤 Model এর ছবি" sublabel="যার গায়ে পোশাক পরাবেন"
            image={modelImage} isDragging={isDraggingModel}
            onDragOver={e => { e.preventDefault(); setIsDraggingModel(true); }}
            onDragLeave={() => setIsDraggingModel(false)}
            onDrop={e => handleDrop(e, 'model')}
            onClick={() => modelInputRef.current?.click()}
            onClear={() => setModelImage(null)}
            inputRef={modelInputRef}
            onFileSelect={e => { const f=e.target.files?.[0]; if(f) handleModelFile(f); }}
            accentColor="#7c3aed" disabled={isProcessing}
          />
          <UploadZone
            label="👗 পোশাকের ছবি" sublabel="যে পোশাকটা পরাতে চান"
            image={garmentImage} isDragging={isDraggingGarment}
            onDragOver={e => { e.preventDefault(); setIsDraggingGarment(true); }}
            onDragLeave={() => setIsDraggingGarment(false)}
            onDrop={e => handleDrop(e, 'garment')}
            onClick={() => garmentInputRef.current?.click()}
            onClear={() => setGarmentImage(null)}
            inputRef={garmentInputRef}
            onFileSelect={e => { const f=e.target.files?.[0]; if(f) handleGarmentFile(f); }}
            accentColor="#ec4899" disabled={isProcessing}
          />
        </div>

        {/* ── Generate Button ── */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          {!isProcessing ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={processTryOn}
              disabled={!modelImage || !garmentImage}
              style={{
                opacity: (!modelImage||!garmentImage) ? 0.45 : 1,
                cursor: (!modelImage||!garmentImage) ? 'not-allowed' : 'pointer',
                fontSize:'1.05rem', padding:'16px 44px',
                animation: (modelImage&&garmentImage) ? 'pulse-glow 2s ease-in-out infinite' : 'none',
              }}
            >
              ✨ Virtual Try-On Generate করুন
            </button>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'260px', height:'8px', background:'var(--color-border2)', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#ec4899)', borderRadius:'4px', transition:'width 0.5s ease' }} />
              </div>
              <p style={{ color:'var(--color-text2)', fontSize:'0.92rem' }}>
                {progress < 20 ? '📤 ছবি পাঠানো হচ্ছে...' : progress < 85 ? '🤖 AI পোশাক পরাচ্ছে... (৩০-৯০ সেকেন্ড)' : '✅ প্রায় হয়ে গেছে...'}
              </p>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {tryOnError && (
          <div style={{ margin:'0 auto 24px', maxWidth:'600px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-md)', padding:'14px 18px', color:'#fca5a5', fontSize:'0.88rem', textAlign:'center' }}>
            ❌ {tryOnError}
          </div>
        )}

        {/* ── Style AI Panel ── */}
        {(modelImage || garmentImage) && (
          <div className="card" style={{ marginBottom:'28px', background:'var(--color-surface2)', border:'1px solid var(--color-border2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', marginBottom:'16px' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:'2px' }}>🤖 AI Style Assistant</div>
                <div style={{ color:'var(--color-muted)', fontSize:'0.8rem' }}>GPT-4o বা Gemini দিয়ে পোশাকের style analysis</div>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {/* Style Provider */}
                {(['openai','gemini'] as const).map(sp => (
                  <button key={sp} onClick={() => setStyleProvider(sp)} style={{
                    padding:'6px 14px', borderRadius:'var(--radius-sm)', fontSize:'0.8rem', fontWeight:600,
                    border:`1.5px solid ${styleProvider===sp ? (sp==='openai'?'#10b981':'#4f87ff') : 'var(--color-border2)'}`,
                    background: styleProvider===sp ? (sp==='openai'?'rgba(16,185,129,0.15)':'rgba(79,135,255,0.15)') : 'transparent',
                    color: styleProvider===sp ? (sp==='openai'?'#10b981':'#4f87ff') : 'var(--color-text2)',
                    cursor:'pointer', fontFamily:'var(--font-main)', transition:'all 0.2s',
                  }}>
                    {sp === 'openai' ? '🟢 GPT-4o' : '🔵 Gemini'}
                  </button>
                ))}
                {/* Target image */}
                {(['garment','model'] as const).map(t => (
                  <button key={t} onClick={() => setStyleTarget(t)} style={{
                    padding:'6px 14px', borderRadius:'var(--radius-sm)', fontSize:'0.8rem', fontWeight:600,
                    border:`1.5px solid ${styleTarget===t ? 'var(--color-accent)' : 'var(--color-border2)'}`,
                    background: styleTarget===t ? 'rgba(6,182,212,0.15)' : 'transparent',
                    color: styleTarget===t ? 'var(--color-accent)' : 'var(--color-text2)',
                    cursor:'pointer', fontFamily:'var(--font-main)', transition:'all 0.2s',
                  }}>
                    {t === 'garment' ? '👗 Dress' : '👤 Model'}
                  </button>
                ))}
                <button
                  onClick={analyzeStyle}
                  disabled={styleLoading || !(styleTarget==='garment' ? garmentImage : modelImage)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize:'0.82rem' }}
                >
                  {styleLoading ? '⏳ Analyzing...' : '✨ Analyze'}
                </button>
              </div>
            </div>

            {styleLoading && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', color:'var(--color-text2)', fontSize:'0.88rem' }}>
                <div className="spinner" style={{ width:'18px', height:'18px' }} />
                {styleProvider === 'openai' ? 'GPT-4o' : 'Gemini'} বিশ্লেষণ করছে...
              </div>
            )}

            {styleError && (
              <div style={{ color:'#fca5a5', fontSize:'0.85rem', background:'rgba(239,68,68,0.08)', padding:'10px 14px', borderRadius:'var(--radius-sm)', border:'1px solid rgba(239,68,68,0.2)' }}>
                ❌ {styleError}
              </div>
            )}

            {styleText && !styleLoading && (
              <div style={{ background:'var(--color-surface)', borderRadius:'var(--radius-md)', padding:'16px', border:'1px solid var(--color-border)' }}>
                <div style={{ fontSize:'0.72rem', color:'var(--color-muted)', marginBottom:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  {styleProvider==='openai' ? '🟢 GPT-4o' : '🔵 Gemini'} · Style Analysis
                </div>
                <SimpleMarkdown text={styleText} />
              </div>
            )}

            {!styleText && !styleLoading && !styleError && (
              <div style={{ color:'var(--color-muted)', fontSize:'0.85rem', textAlign:'center', padding:'8px' }}>
                ছবি upload করে Analyze বাটন চাপুন
              </div>
            )}
          </div>
        )}

        {/* ── Result ── */}
        {resultImage && tryOnStatus === 'done' && (
          <div style={{ maxWidth:'720px', margin:'0 auto', animation:'fadeInUp 0.6s ease forwards' }}>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'18px 22px', background:'rgba(16,185,129,0.08)', borderBottom:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'1.3rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight:600, color:'var(--color-success)', fontSize:'0.95rem' }}>Virtual Try-On সম্পন্ন!</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--color-muted)' }}>
                      {tryOnProvider==='replicate' ? 'Replicate IDM-VTON' : tryOnProvider==='openai' ? 'OpenAI GPT-4o + DALL-E 3' : 'Google Gemini 3.8 + Imagen 3'} দিয়ে generate করা হয়েছে
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={downloadResult} className="btn btn-primary btn-sm">⬇️ Download</button>
                  <button onClick={reset} className="btn btn-outline btn-sm">🔄 Reset</button>
                </div>
              </div>

              {resultNote && (
                <div style={{ padding:'10px 22px', background:'rgba(245,158,11,0.08)', borderBottom:'1px solid rgba(245,158,11,0.15)', fontSize:'0.8rem', color:'#fcd34d' }}>
                  ℹ️ {resultNote}
                </div>
              )}

              <div style={{ padding:'22px' }}>
                {/* Before/After row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', gap:'10px', alignItems:'center', marginBottom:'18px' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--color-muted)', marginBottom:'6px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>MODEL</div>
                    <img src={modelImage!} alt="Model" style={{ width:'100%', maxHeight:'160px', objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border2)' }} />
                  </div>
                  <div style={{ fontSize:'1.4rem', color:'var(--color-muted)', userSelect:'none' }}>+</div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--color-muted)', marginBottom:'6px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>DRESS</div>
                    <img src={garmentImage!} alt="Dress" style={{ width:'100%', maxHeight:'160px', objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border2)' }} />
                  </div>
                  <div style={{ fontSize:'1.4rem', color:'var(--color-primary-glow)', userSelect:'none' }}>→</div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--color-success)', marginBottom:'6px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>RESULT ✨</div>
                    <img src={resultImage} alt="Result" style={{ width:'100%', maxHeight:'160px', objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid rgba(16,185,129,0.35)', boxShadow:'0 0 20px rgba(16,185,129,0.12)' }} />
                  </div>
                </div>
                <img src={resultImage} alt="Virtual Try-On Result" style={{ maxWidth:'100%', maxHeight:'600px', objectFit:'contain', borderRadius:'var(--radius-lg)', border:'2px solid rgba(16,185,129,0.2)', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', display:'block', margin:'0 auto' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Setup Guide ── */}
        {tryOnStatus === 'idle' && (
          <div className="card" style={{ maxWidth:'680px', margin:'40px auto 0', padding:'24px' }}>
            <h3 style={{ fontSize:'0.92rem', fontWeight:700, marginBottom:'18px', color:'var(--color-text2)' }}>⚙️ API Keys Setup Guide</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {[
                { name:'Replicate', color:'#7c3aed', env:'REPLICATE_API_TOKEN', link:'https://replicate.com/account/api-tokens', use:'Virtual Try-On (IDM-VTON)' },
                { name:'OpenAI',    color:'#10b981', env:'OPENAI_API_KEY',       link:'https://platform.openai.com/api-keys',    use:'Try-On + Style AI (GPT-4o, DALL-E)' },
                { name:'Gemini',    color:'#4f87ff', env:'GEMINI_API_KEY',       link:'https://aistudio.google.com/apikey',       use:'Style AI (Gemini 3.8 Flash)' },
              ].map(p => (
                <div key={p.name} style={{ padding:'14px', background:'var(--color-surface2)', borderRadius:'var(--radius-md)', border:`1px solid ${p.color}30` }}>
                  <div style={{ fontWeight:700, color:p.color, marginBottom:'4px', fontSize:'0.88rem' }}>{p.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--color-muted)', marginBottom:'8px' }}>{p.use}</div>
                  <code style={{ fontSize:'0.75rem', color:'var(--color-text2)', display:'block', marginBottom:'8px', fontFamily:'var(--font-mono)' }}>
                    {p.env}=...
                  </code>
                  <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color:p.color, fontSize:'0.78rem', textDecoration:'underline' }}>
                    Token নিন →
                  </a>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'16px', fontSize:'0.8rem', color:'var(--color-muted)', fontFamily:'var(--font-mono)', background:'var(--color-surface)', padding:'12px 16px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)' }}>
              📁 app/.env.local এ এই keys যোগ করুন, তারপর server restart করুন
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── UploadZone ────────────────────────────────────────────────────
interface UploadZoneProps {
  label: string; sublabel: string;
  image: string | null; isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void; onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accentColor: string; disabled: boolean;
}

function UploadZone({ label, sublabel, image, isDragging, onDragOver, onDragLeave, onDrop, onClick, onClear, inputRef, onFileSelect, accentColor, disabled }: UploadZoneProps) {
  return (
    <div>
      <div style={{ marginBottom:'10px' }}>
        <div style={{ fontWeight:600, fontSize:'0.92rem' }}>{label}</div>
        <div style={{ color:'var(--color-muted)', fontSize:'0.8rem' }}>{sublabel}</div>
      </div>
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={!disabled ? onClick : undefined}
        style={{
          borderRadius:'var(--radius-lg)',
          border:`2px dashed ${isDragging ? accentColor : image ? accentColor+'66' : 'var(--color-border2)'}`,
          background: isDragging ? `${accentColor}18` : image ? `${accentColor}08` : 'var(--color-surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition:'all 0.2s ease', overflow:'hidden',
          minHeight:'280px', display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        }}
      >
        {image ? (
          <>
            <img src={image} alt="Uploaded" style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:'280px' }} />
            {!disabled && (
              <button onClick={e => { e.stopPropagation(); onClear(); }}
                style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:'30px', height:'30px', color:'#fff', cursor:'pointer', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}
              >✕</button>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'36px 20px' }}>
            <div style={{ fontSize:'2.8rem', marginBottom:'10px' }}>{isDragging ? '📂' : '📤'}</div>
            <p style={{ color: isDragging ? accentColor : 'var(--color-text2)', fontWeight:500, marginBottom:'4px', fontSize:'0.9rem' }}>
              {isDragging ? 'এখানে ছাড়ুন!' : 'ছবি drag করুন'}
            </p>
            <p style={{ color:'var(--color-muted)', fontSize:'0.78rem' }}>বা click করে select করুন</p>
            <p style={{ color:'var(--color-muted)', fontSize:'0.72rem', marginTop:'6px' }}>JPG · PNG · WebP</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileSelect} />
    </div>
  );
}
