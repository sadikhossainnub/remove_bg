'use client';
import { useState } from 'react';
import Link from 'next/link';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode]         = useState<Mode>('register');
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<any>(null);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = mode === 'register'
        ? { email, name, password }
        : { email, password };

      const res = await fetch(`${API}/v1/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Something went wrong');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      {/* BG orbs */}
      <div className="orb orb-violet" style={{ position: 'fixed', top: '10%', left: '10%', opacity: 0.2 }} />
      <div className="orb orb-cyan"   style={{ position: 'fixed', bottom: '10%', right: '10%', opacity: 0.15 }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--color-text)', fontSize: '1.3rem', fontWeight: 700 }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#g1)"/>
              <path d="M8 20L14 8L20 20H8Z" fill="white" fillOpacity="0.9"/>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#7c3aed"/><stop offset="1" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
            Remove<span style={{ color: 'var(--color-primary-glow)' }}>BG</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '36px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '28px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            {(['register', 'login'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setResult(null); setError(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  borderRadius: 'calc(var(--radius-md) - 4px)',
                  fontFamily: 'var(--font-main)', fontWeight: 600, fontSize: '0.9rem',
                  background: mode === m ? 'var(--color-primary)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--color-text2)',
                  transition: 'all 0.2s ease',
                }}>
                {m === 'register' ? '📝 Register' : '🔑 Login'}
              </button>
            ))}
          </div>

          {/* Success state */}
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', fontSize: '2rem' }}>
                {mode === 'register' ? '🎉' : '✅'}
              </div>
              <h3 style={{ textAlign: 'center', fontWeight: 700 }}>
                {mode === 'register' ? 'Account Created!' : 'Welcome back!'}
              </h3>
              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-text2)' }}>
                <strong style={{ color: 'var(--color-text)' }}>👤 {result.user?.name}</strong> — {result.user?.email}
                <div style={{ marginTop: '4px' }}>Plan: <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>{result.user?.plan}</span></div>
              </div>

              {/* API Key (register only) */}
              {result.api_key && (
                <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>🔑 আপনার API Key:</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--color-primary-glow)', marginBottom: '10px', lineHeight: 1.5 }}>
                    {result.api_key.key}
                  </div>
                  <button onClick={() => copy(result.api_key.key)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    {copied ? '✓ Copied!' : '📋 Key কপি করুন'}
                  </button>
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--color-warning)', textAlign: 'center' }}>
                    ⚠️ এই key আর দেখাবে না। এখনই কপি করুন!
                  </div>
                </div>
              )}

              {/* Login keys */}
              {result.api_keys?.length > 0 && (
                <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>🔑 আপনার API Keys ({result.api_keys.length}টি):</div>
                  {result.api_keys.map((k: any) => (
                    <div key={k.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-text2)', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                      {k.prefix} — <span style={{ color: 'var(--color-muted)' }}>{k.name}</span>
                    </div>
                  ))}
                  <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--color-text2)' }}>
                    নতুন key বানাতে Dashboard এ যান।
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href="/app" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>🖼️ App খুলুন</Link>
                <Link href="/dashboard" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>📊 Dashboard</Link>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '4px' }}>
                {mode === 'register' ? 'নতুন Account তৈরি করুন' : 'লগিন করুন'}
              </h2>
              <p style={{ color: 'var(--color-text2)', fontSize: '0.88rem', marginBottom: '8px' }}>
                {mode === 'register'
                  ? 'Register করলে একটি API key স্বয়ংক্রিয়ভাবে তৈরি হবে।'
                  : 'আপনার account এ লগিন করুন।'}
              </p>

              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>নাম (optional)</label>
                  <input id="reg-name" className="input" type="text" placeholder="আপনার নাম" value={name} onChange={e => setName(e.target.value)} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>Email</label>
                <input id="auth-email" className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>Password</label>
                <input id="auth-password" className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>

              {error && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.88rem' }}>
                  ❌ {error}
                </div>
              )}

              <button id="auth-submit" type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
                {loading
                  ? <><span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Loading...</>
                  : mode === 'register' ? '🚀 Register করুন' : '🔑 Login করুন'}
              </button>

              {/* Dev: demo key button */}
              <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={async () => {
                  const res = await fetch(`${API}/v1/auth/demo-key`);
                  const d = await res.json();
                  if (d.api_key) { copy(d.api_key); alert(`Demo key copied!\n\n${d.api_key}\n\nPlan: Pro (dev only)`); }
                  else alert(d.message || 'Demo key already created. Register for a fresh key.');
                }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  ⚡ Dev: Demo key নিন (test করতে)
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--color-text2)', textDecoration: 'none' }}>← Homepage এ ফিরুন</Link>
        </p>
      </div>
    </main>
  );
}
