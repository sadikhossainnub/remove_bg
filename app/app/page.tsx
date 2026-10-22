'use client';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [isDragging, setIsDragging]   = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const router                        = useRouter();

  // Quick drop from homepage — redirect to /app
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    router.push('/app');
  };

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 0 80px' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-120px', left: '30%', width: '500px', height: '500px', background: 'var(--color-primary)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '20%', width: '350px', height: '350px', background: 'var(--color-accent)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.1, pointerEvents: 'none' }} />

        <div className="container-sm" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="badge badge-violet" style={{ marginBottom: '24px', display: 'inline-flex' }}>
            ✨ AI-Powered · Personal Tool · rembg
          </div>

          <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
            ব্যাকগ্রাউন্ড মুছুন{' '}
            <span className="gradient-text">এক সেকেন্ডে</span>
          </h1>

          <p style={{ fontSize: '1.2rem', color: 'var(--color-text2)', maxWidth: '520px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            ছবি upload করুন — AI ব্যাকগ্রাউন্ড সরিয়ে দেবে। কোনো account নেই, কোনো key নেই, কোনো জটিলতা নেই।
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}>
            <Link href="/app" className="btn btn-primary btn-lg" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
              🚀 শুরু করুন — বিনামূল্যে
            </Link>
            <Link href="/docs" className="btn btn-outline btn-lg">
              📄 API Documentation
            </Link>
          </div>

          {/* Quick Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => router.push('/app')}
            style={{
              border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border2)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: '48px',
              cursor: 'pointer',
              background: isDragging ? 'rgba(124,58,237,0.08)' : 'var(--color-surface)',
              boxShadow: isDragging ? 'var(--shadow-glow)' : 'none',
              transition: 'all 0.2s ease',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
              {isDragging ? '📂' : '🖼️'}
            </div>
            <p style={{ color: isDragging ? 'var(--color-primary-glow)' : 'var(--color-text2)', fontWeight: 500, marginBottom: '8px' }}>
              {isDragging ? 'এখানে ছাড়ুন!' : 'এখানে ছবি drag করুন'}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>JPEG · PNG · WebP · HEIC — সর্বোচ্চ 50MB</p>
          </div>
        </div>
      </section>

      {/* ── Before/After Demo ─────────────────────────────────── */}
      <section style={{ padding: '60px 0', background: 'var(--color-surface)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '48px' }}>
            কিভাবে কাজ করে?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
            {[
              { step: '01', icon: '📤', title: 'Upload করুন', desc: 'যেকোনো ছবি drag করুন বা click করে select করুন।' },
              { step: '02', icon: '🤖', title: 'AI কাজ করে', desc: 'rembg AI model মাত্র কয়েক সেকেন্ডে ব্যাকগ্রাউন্ড চিহ্নিত করে।' },
              { step: '03', icon: '⬇️', title: 'Download করুন', desc: 'Transparent PNG বা যেকোনো background color দিয়ে download করুন।' },
            ].map(s => (
              <div key={s.step} className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '12px' }}>STEP {s.step}</div>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{s.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '10px' }}>{s.title}</h3>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '48px' }}>
            Features
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { icon: '⚡', title: 'দ্রুত', desc: 'রেজাল্ট পান মাত্র ২-৫ সেকেন্ডে।' },
              { icon: '🎨', title: 'Custom BG', desc: 'Transparent, সাদা, কালো বা যেকোনো রং।' },
              { icon: '📦', title: 'বড় ছবি', desc: '50MB পর্যন্ত full-resolution ছবি।' },
              { icon: '🔒', title: 'Private', desc: 'Local server — কোনো data upload হয় না।' },
              { icon: '🆓', title: 'সম্পূর্ণ বিনামূল্যে', desc: 'Personal use — কোনো subscription নেই।' },
              { icon: '🖥️', title: 'Offline', desc: 'একবার setup হলে internet ছাড়াও চলে।' },
            ].map(f => (
              <div key={f.title} className="card"
                style={{ transition: 'all 0.2s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; (e.currentTarget as HTMLDivElement).style.transform = ''; }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>{f.title}</h3>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API Documentation Preview ──────────────────────────── */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'rgba(15,15,26,0.6)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            <div>
              <div className="badge badge-cyan" style={{ marginBottom: '16px' }}>⚡ Developers & REST API</div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>
                সহজ ও দ্রুত <span className="gradient-text">API Integration</span>
              </h2>
              <p style={{ color: 'var(--color-text2)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '24px' }}>
                আপনার ওয়েবসাইট বা মোবাইল অ্যাপে খুব সহজে মাত্র এক লাইনে ব্যাকগ্রাউন্ড রিমুভাল ইন্টিগ্রেট করুন। cURL, Python, Node.js বা PHP — যেকোনো মাধ্যমে ব্যবহার করা যায়।
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>Sync ও Async ব্যাকগ্রাউন্ড রিমুভাল সাপোর্ট</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>সহজ Header-based API Key প্রমাণীকরণ (<code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-glow)' }}>Api-Key rbg_live_...</code>)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>Webhooks ও সরাসরি Transparent PNG রেজাল্ট</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>Full resolution এবং সর্বোচ্চ 50MB ইমেজ সাইজ সাপোর্ট</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/docs" className="btn btn-primary btn-lg">
                  📄 সম্পূর্ণ API Documentation দেখুন →
                </Link>
                <Link href="/dashboard" className="btn btn-outline btn-lg">
                  🔑 API Key তৈরি করুন
                </Link>
              </div>
            </div>

            {/* Code snippet card */}
            <div className="card" style={{ padding: '24px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>POST /v1/remove</span>
                  <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>cURL</span>
                </div>
              </div>

              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--color-text)',
                overflowX: 'auto',
                lineHeight: 1.6,
                margin: 0,
                padding: '8px 0',
              }}>
                <code>{`curl -X POST https://api.removebg.app/v1/remove \\
  -H "Authorization: Api-Key rbg_live_xxxx" \\
  -F "image_file=@photo.jpg" \\
  -F "size=full" \\
  --output result.png`}</code>
              </pre>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text2)' }}>
                  ✅ রিটার্ন করে সরাসরি transparent PNG binary
                </span>
                <Link href="/docs" style={{ color: 'var(--color-accent)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
                  Python & JS কোড দেখুন →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 0', background: 'var(--color-surface)', textAlign: 'center' }}>
        <div className="container-sm">
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '16px' }}>
            এখনই ব্যবহার করুন
          </h2>
          <p style={{ color: 'var(--color-text2)', marginBottom: '32px', fontSize: '1.05rem' }}>
            Setup হয়ে আছে। শুধু ছবি দিন।
          </p>
          <Link href="/app" className="btn btn-primary btn-lg">
            🖼️ App খুলুন
          </Link>
        </div>
      </section>
    </main>
  );
}
