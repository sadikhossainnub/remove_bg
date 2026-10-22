'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

export default function ConvertPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedSvg, setConvertedSvg] = useState<string | null>(null);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; size: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('অনুগ্রহ করে একটি ছবি ফাইল (PNG, JPG, WEBP) নির্বাচন করুন।');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setConvertedSvg(null);
    setSvgCode(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageMeta({
          width: img.width,
          height: img.height,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Call API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/v1/convert/png-to-svg`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `সার্ভার এরর (${res.status})`);
      }

      const data = await res.json();
      setConvertedSvg(data.dataUrl);
      setSvgCode(data.svg);
    } catch (err: any) {
      setError(err.message || 'SVG তে কনভার্ট করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const downloadSvg = () => {
    if (!convertedSvg) return;
    const a = document.createElement('a');
    a.href = convertedSvg;
    const baseName = selectedFile?.name.replace(/\.[^/.]+$/, "") || 'vectorized';
    a.download = `${baseName}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copySvgCode = () => {
    if (!svgCode) return;
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main style={{ minHeight: '100vh', padding: '100px 20px 60px', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(124, 58, 237, 0.15)',
            color: 'var(--color-primary-glow)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '12px'
          }}>
            ⚡ ফাস্ট ও স্কেলেবল ভেক্টর কনভার্টার
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            PNG to <span style={{ color: 'var(--color-primary-glow)' }}>SVG</span> Converter
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
            যেকোনো PNG, JPG বা আইকনকে মুহূর্তেই স্কেলেবল ভেক্টর (SVG) ফরম্যাটে রূপান্তর করুন।
          </p>
        </div>

        {/* Upload Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '30px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          marginBottom: '30px'
        }}>
          {!previewUrl ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border2)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '60px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📁</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>PNG বা ছবি এখানে ড্র্যাগ করুন</h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>অথবা ফাইল নির্বাচন করতে ক্লিক করুন</p>
              <span className="btn btn-primary btn-sm">ছবি সিলেক্ট করুন</span>
            </div>
          ) : (
            <div>
              {/* Preview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: convertedSvg ? '1fr 1fr' : '1fr', gap: '24px', marginBottom: '24px' }}>
                
                {/* Original Image */}
                <div style={{
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--color-border2)',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>মূল ছবি (Original PNG)</span>
                    {imageMeta && <span style={{ color: 'var(--color-muted)' }}>{imageMeta.width}x{imageMeta.height} ({imageMeta.size})</span>}
                  </div>
                  <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={previewUrl} alt="Original" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                </div>

                {/* Converted SVG Preview */}
                {convertedSvg && (
                  <div style={{
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    border: '1px solid var(--color-primary)',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary-glow)' }}>ভেক্টর (SVG Output) ✅</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>স্কেলেবল ভেক্টর</span>
                    </div>
                    <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'radial-gradient(#ffffff15 1px, transparent 1px) 0 0/16px 16px' }}>
                      <img src={convertedSvg} alt="Converted SVG" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {!convertedSvg ? (
                  <button
                    onClick={handleConvert}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '14px', fontSize: '1rem', fontWeight: 700 }}
                  >
                    {loading ? 'কনভার্ট করা হচ্ছে...' : '⚡ Convert to SVG'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={downloadSvg}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '12px', fontWeight: 700 }}
                    >
                      📥 SVG ডাউনলোড করুন
                    </button>
                    <button
                      onClick={copySvgCode}
                      className="btn btn-secondary"
                      style={{ padding: '12px 20px', fontWeight: 600 }}
                    >
                      {copied ? '✅ কোড কপি হয়েছে' : '📋 SVG Code কপি করুন'}
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setConvertedSvg(null);
                    setSvgCode(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '12px 18px' }}
                >
                  🔄 নতুন ছবি
                </button>
              </div>

              {error && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.9rem' }}>
                  ❌ {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🚀</div>
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>ইনস্ট্যান্ট প্রসেসিং</h4>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>কোনো কোয়ালিটি লস ছাড়াই কয়েক মিলি-সেকেন্ডে SVG ফাইলে রূপান্তর হয়।</p>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎯</div>
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>ওয়েব ও UI ফ্রেন্ডলি</h4>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>Figma, Illustrator বা সরাসরি Next.js / HTML কোডে SVG কোড ব্যবহারযোগ্য।</p>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔌</div>
            <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>ডেভেলপার API</h4>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>সরাসরি <code>/v1/convert/png-to-svg</code> এন্ডপয়েন্ট দিয়ে স্ক্রিপ্ট বা n8n থেকে কল করুন।</p>
          </div>
        </div>

      </div>
    </main>
  );
}

