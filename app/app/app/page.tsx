'use client';
import { useState, useRef, useCallback } from 'react';

type Status = 'idle' | 'processing' | 'done' | 'error';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AppPage() {
  const [status, setStatus]       = useState<Status>('idle');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl]     = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [bgColor, setBgColor]         = useState('');
  const [fileName, setFileName]       = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusMsg, setStatusMsg] = useState('');

  const processFile = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(file.type)) {
      setError('শুধু JPEG, PNG, WebP বা HEIC সাপোর্ট করে।');
      return;
    }

    console.group(`🖼️ Remove BG — Processing: ${file.name}`);
    console.log('📁 Step 1 — File selected:', file.name, `(${(file.size/1024/1024).toFixed(2)} MB, ${file.type})`);

    setError(null);
    setFileName(file.name);
    setOriginalUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setStatus('processing');
    setStatusMsg('📁 ছবি পড়া হচ্ছে...');

    const form = new FormData();
    form.append('image_file', file);

    try {
      console.log('📤 Step 2 — Uploading to API:', `${API}/remove`);
      setStatusMsg('📤 API তে পাঠানো হচ্ছে...');

      const startTime = Date.now();
      const res = await fetch(`${API}/remove`, {
        method: 'POST',
        body: form,
      });

      console.log('📡 Step 3 — API response received:', res.status, res.statusText);
      setStatusMsg('🤖 AI processing হচ্ছে...');

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('❌ API Error:', err);
        throw new Error(err?.error || `Server error: ${res.status}`);
      }

      console.log('✅ Step 4 — Response OK, reading PNG blob...');
      setStatusMsg('✅ সফল! ছবি তৈরি হচ্ছে...');

      let blob = await res.blob();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`📦 Step 5 — Blob received: ${(blob.size/1024).toFixed(1)} KB | Total time: ${elapsed}s`);

      // Apply background color if selected
      if (bgColor) {
        console.log(`🎨 Step 6 — Applying background color: ${bgColor}`);
        setStatusMsg(`🎨 Background color লাগানো হচ্ছে...`);
        blob = await applyBgColor(blob, bgColor);
      }

      setResultUrl(URL.createObjectURL(blob));
      setStatus('done');
      setStatusMsg('');
      console.log(`🎉 Done! Total: ${elapsed}s`);
      console.groupEnd();

    } catch (e: any) {
      console.error('❌ Failed:', e.message);
      console.groupEnd();
      setError(e.message);
      setStatus('error');
      setStatusMsg('');
    }
  }, [bgColor]);

  // Apply solid background color to transparent PNG
  async function applyBgColor(pngBlob: Blob, color: string): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(b => resolve(b!), 'image/png');
      };
      img.src = URL.createObjectURL(pngBlob);
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = fileName.replace(/\.[^.]+$/, '') + '_nobg.png';
    a.click();
  };

  const reset = () => {
    setStatus('idle');
    setOriginalUrl(null);
    setResultUrl(null);
    setError(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 0' }}>
      <div className="container-sm">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '10px' }}>
            🖼️ Remove <span className="gradient-text">Background</span>
          </h1>
          <p style={{ color: 'var(--color-text2)' }}>
            ছবি upload করুন — AI ব্যাকগ্রাউন্ড মুছে দেবে।
          </p>
        </div>

        {/* BG Color picker — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--color-text2)', fontWeight: 500 }}>পেছনের রং:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="bg" value="" checked={bgColor === ''} onChange={() => setBgColor('')} />
            <span style={{ fontSize: '0.85rem' }}>Transparent (PNG)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="bg" value="white" checked={bgColor === '#ffffff'} onChange={() => setBgColor('#ffffff')} />
            <span style={{ fontSize: '0.85rem' }}>⬜ White</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="bg" value="black" checked={bgColor === '#000000'} onChange={() => setBgColor('#000000')} />
            <span style={{ fontSize: '0.85rem' }}>⬛ Black</span>
          </label>
          <input type="color" title="Custom color" value={bgColor || '#7c3aed'}
            onChange={e => setBgColor(e.target.value)}
            style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }} />
          {bgColor && <button onClick={() => setBgColor('')} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕ clear</button>}
        </div>

        {/* ── Upload Zone ─── */}
        {(status === 'idle' || status === 'error') && (
          <div
            id="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            style={{
              border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border2)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: '80px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(124,58,237,0.06)' : 'var(--color-surface)',
              boxShadow: isDragging ? 'var(--shadow-glow)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📂</div>
            <h3 style={{ fontWeight: 600, marginBottom: '10px', fontSize: '1.2rem' }}>
              {isDragging ? 'এখানে ছাড়ুন!' : 'ছবি drag করুন বা click করুন'}
            </h3>
            <p style={{ color: 'var(--color-text2)', marginBottom: '20px', fontSize: '0.9rem' }}>
              JPEG · PNG · WebP · HEIC — সর্বোচ্চ 50MB
            </p>
            {error && (
              <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.9rem', marginTop: '12px' }}>
                ❌ {error}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} style={{ display: 'none' }} />
          </div>
        )}

        {/* ── Processing ─── */}
        {status === 'processing' && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px',
                border: '3px solid var(--color-border2)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
            <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1.1rem' }}>🤖 AI কাজ করছে...</h3>
            <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem', marginBottom: '16px' }}>
              <strong style={{ color: 'var(--color-text)' }}>{fileName}</strong>
            </p>
            {/* Live step indicator */}
            {statusMsg && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 18px',
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                color: 'var(--color-primary-glow)',
                fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ animation: 'pulse-glow 1s ease-in-out infinite', display: 'inline-block', width: '8px', height: '8px', background: 'var(--color-primary)', borderRadius: '50%' }} />
                {statusMsg}
              </div>
            )}
            <p style={{ marginTop: '16px', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
              ব্রাউজার Console (F12) এ বিস্তারিত দেখুন
            </p>
          </div>
        )}

        {/* ── Result ─── */}
        {status === 'done' && originalUrl && resultUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Original */}
              <div className="card" style={{ padding: '12px' }}>
                <div className="badge badge-violet" style={{ marginBottom: '10px' }}>আগে</div>
                <img src={originalUrl} alt="Original" style={{ width: '100%', height: '300px', objectFit: 'contain', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)' }} />
              </div>
              {/* Result */}
              <div className="card" style={{ padding: '12px' }}>
                <div className="badge badge-green" style={{ marginBottom: '10px' }}>পরে ✨</div>
                <img src={resultUrl} alt="Result" style={{
                  width: '100%', height: '300px', objectFit: 'contain', borderRadius: 'var(--radius-md)',
                  background: bgColor || `repeating-conic-gradient(#1a1a2e 0% 25%, #0f0f1a 0% 50%) 0 0 / 20px 20px`,
                }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button id="download-btn" className="btn btn-primary btn-lg" onClick={download}>
                ⬇️ Download PNG
              </button>
              <button className="btn btn-outline btn-lg" onClick={reset}>
                🔄 আরেকটি ছবি
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
