'use client';
import { useState } from 'react';

type Lang = 'curl' | 'python' | 'javascript' | 'php';

const EXAMPLES: Record<string, Record<Lang, string>> = {
  remove: {
    curl: `curl -X POST https://api.removebg.app/v1/remove \\
  -H "Authorization: Api-Key rbg_live_xxxx" \\
  -F "image_file=@photo.jpg" \\
  -F "size=full" \\
  --output result.png`,

    python: `import requests

response = requests.post(
    "https://api.removebg.app/v1/remove",
    headers={"Authorization": "Api-Key rbg_live_xxxx"},
    files={"image_file": open("photo.jpg", "rb")},
    data={"size": "full"},
)

with open("result.png", "wb") as f:
    f.write(response.content)`,

    javascript: `const form = new FormData();
form.append('image_file', fileInput.files[0]);
form.append('size', 'full');

const res = await fetch('https://api.removebg.app/v1/remove', {
  method: 'POST',
  headers: { 'Authorization': 'Api-Key rbg_live_xxxx' },
  body: form,
});

const blob = await res.blob();
const url = URL.createObjectURL(blob);`,

    php: `<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => 'https://api.removebg.app/v1/remove',
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Authorization: Api-Key rbg_live_xxxx'],
  CURLOPT_POSTFIELDS => [
    'image_file' => new CURLFile('photo.jpg'),
    'size' => 'full',
  ],
  CURLOPT_RETURNTRANSFER => true,
]);
$result = curl_exec($curl);
file_put_contents('result.png', $result);`,
  },

  async: {
    curl: `curl -X POST https://api.removebg.app/v1/remove/async \\
  -H "Authorization: Api-Key rbg_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "webhook_url": "https://yourapp.com/webhooks/rbg"
  }'`,
    python: `import requests

res = requests.post(
    "https://api.removebg.app/v1/remove/async",
    headers={
        "Authorization": "Api-Key rbg_live_xxxx",
        "Content-Type": "application/json",
    },
    json={
        "image_url": "https://example.com/photo.jpg",
        "webhook_url": "https://yourapp.com/webhooks/rbg",
    },
)
print(res.json())  # {"job_id": "...", "status": "pending"}`,
    javascript: `const res = await fetch('https://api.removebg.app/v1/remove/async', {
  method: 'POST',
  headers: {
    'Authorization': 'Api-Key rbg_live_xxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image_url: 'https://example.com/photo.jpg',
    webhook_url: 'https://yourapp.com/webhooks/rbg',
  }),
});
const { job_id } = await res.json();`,
    php: `// PHP async example
$data = json_encode([
  'image_url'   => 'https://example.com/photo.jpg',
  'webhook_url' => 'https://yourapp.com/webhooks/rbg',
]);
// ... curl post with Content-Type: application/json`,
  },
};

const ENDPOINTS = [
  { method: 'POST', path: '/v1/remove',        badge: 'cyan',   label: 'Sync Remove',   desc: 'Remove background from a single image. Returns PNG binary.' },
  { method: 'POST', path: '/v1/remove/async',  badge: 'violet', label: 'Async Remove',  desc: 'Submit an async job. Returns job_id. Use webhook or poll for result.' },
  { method: 'GET',  path: '/v1/jobs/{job_id}', badge: 'cyan',   label: 'Get Job',       desc: 'Poll status of an async background removal job.' },
  { method: 'GET',  path: '/v1/account',       badge: 'cyan',   label: 'Account Info',  desc: 'Get current plan, credit usage, and reset date.' },
  { method: 'GET',  path: '/v1/api-keys',      badge: 'cyan',   label: 'List Keys',     desc: 'List all REST API keys for the authenticated account.' },
  { method: 'POST', path: '/v1/api-keys',      badge: 'violet', label: 'Create Key',    desc: 'Generate a new API key. Raw key shown ONCE only.' },
  { method: 'DELETE', path: '/v1/api-keys/{id}', badge: 'red',  label: 'Revoke Key',    desc: 'Permanently revoke (deactivate) an API key.' },
];

const ERROR_CODES = [
  { status: '400', code: 'invalid_image',         desc: 'Could not decode the provided image.' },
  { status: '400', code: 'missing_image',          desc: 'No image_file or image_url provided.' },
  { status: '401', code: 'unauthorized',           desc: 'Missing, invalid, or revoked API key.' },
  { status: '402', code: 'insufficient_credits',  desc: 'Account has no remaining credits.' },
  { status: '413', code: 'file_too_large',         desc: 'Image exceeds the 25MB size limit.' },
  { status: '422', code: 'unsupported_format',     desc: 'Only JPEG, PNG, WebP, HEIC are supported.' },
  { status: '429', code: 'rate_limit_exceeded',    desc: 'Too many requests — check rate limit headers.' },
  { status: '500', code: 'internal_error',         desc: 'Server-side processing error.' },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    'rgba(6,182,212,0.15)',
  POST:   'rgba(124,58,237,0.15)',
  DELETE: 'rgba(239,68,68,0.15)',
};
const METHOD_TEXT: Record<string, string> = {
  GET:    'var(--color-accent)',
  POST:   'var(--color-primary-glow)',
  DELETE: '#f87171',
};

export default function DocsPage() {
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [activeSection, setActiveSection] = useState<string>('remove');
  const [copied, setCopied] = useState(false);

  const LANGS: Lang[] = ['curl', 'python', 'javascript', 'php'];

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCode = EXAMPLES[activeSection]?.[activeLang] || '';

  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>

        {/* ── Header ───────────────────────────────── */}
        <div style={{ marginBottom: '48px' }}>
          <div className="badge badge-cyan" style={{ marginBottom: '16px' }}>📄 API Reference</div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, marginBottom: '16px' }}>
            Remove BG <span className="gradient-text">API Documentation</span>
          </h1>
          <p style={{ color: 'var(--color-text2)', fontSize: '1.05rem', maxWidth: '600px' }}>
            A simple REST API to remove image backgrounds programmatically. Authenticate with an API Key — no JWT, no sessions.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="badge badge-violet">Base URL: https://api.removebg.app</div>
            <div className="badge badge-cyan">Version: v1</div>
            <div className="badge badge-green">REST · JSON · PNG</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '40px', alignItems: 'start' }}>

          {/* ── Sidebar ─────────────────────────────── */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { id: 'auth',    label: '🔐 Authentication' },
                { id: 'remove',  label: '⚡ POST /remove' },
                { id: 'async',   label: '🔄 POST /remove/async' },
                { id: 'jobs',    label: '📋 GET /jobs/{id}' },
                { id: 'account', label: '👤 GET /account' },
                { id: 'keys',    label: '🔑 API Keys' },
                { id: 'errors',  label: '❌ Error Codes' },
                { id: 'limits',  label: '⚡ Rate Limits' },
                { id: 'webhooks',label: '🔔 Webhooks' },
              ].map(item => (
                <a key={item.id} href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    color: activeSection === item.id ? 'var(--color-primary-glow)' : 'var(--color-text2)',
                    background: activeSection === item.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                    borderLeft: activeSection === item.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    fontWeight: activeSection === item.id ? 600 : 400,
                  }}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* ── Content ─────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Authentication */}
            <section id="auth">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>🔐 Authentication</h2>
              <p style={{ color: 'var(--color-text2)', marginBottom: '20px', lineHeight: 1.8 }}>
                All API requests require a REST API Key. Pass it in the <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-glow)', fontSize: '0.9em' }}>Authorization</code> header using the <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '0.9em' }}>Api-Key</code> scheme.
              </p>
              <div className="code-block" style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--color-text2)' }}>Authorization: </span>
                <span style={{ color: '#c678dd' }}>Api-Key </span>
                <span style={{ color: '#98c379' }}>rbg_live_xxxxxxxxxxxxxxxxxxxxxxxx</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { title: '🔑 Key Format', desc: 'rbg_live_ prefix + 32 hex chars' },
                  { title: '💾 Storage', desc: 'Only SHA-256 hash stored in DB' },
                  { title: '♾️ Expiry', desc: 'Never expires unless manually revoked' },
                  { title: '🛡️ Scheme', desc: 'Api-Key (not Bearer / JWT)' },
                ].map(i => (
                  <div key={i.title} className="card" style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>{i.title}</div>
                    <div style={{ color: 'var(--color-text2)', fontSize: '0.84rem' }}>{i.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Endpoints Overview */}
            <section id="endpoints">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>📡 Endpoints</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ENDPOINTS.map(e => (
                  <div key={`${e.method}-${e.path}`} className="card" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
                      padding: '3px 10px', borderRadius: '4px',
                      background: METHOD_COLORS[e.method], color: METHOD_TEXT[e.method],
                      minWidth: '60px', textAlign: 'center',
                    }}>{e.method}</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--color-text)', flex: 1 }}>{e.path}</code>
                    <span style={{ color: 'var(--color-text2)', fontSize: '0.85rem' }}>{e.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Code Examples */}
            <section id="remove">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>⚡ Code Examples</h2>
              <p style={{ color: 'var(--color-text2)', marginBottom: '20px', fontSize: '0.93rem' }}>Select an endpoint and language to see the example.</p>

              {/* Endpoint selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {Object.keys(EXAMPLES).map(k => (
                  <button key={k} onClick={() => setActiveSection(k)} className="btn btn-sm"
                    style={{ background: activeSection === k ? 'var(--color-primary)' : 'var(--color-surface2)', color: activeSection === k ? '#fff' : 'var(--color-text2)', border: `1px solid ${activeSection === k ? 'var(--color-primary)' : 'var(--color-border2)'}` }}>
                    {k === 'remove' ? 'Sync Remove' : 'Async Remove'}
                  </button>
                ))}
              </div>

              {/* Language tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '0', borderBottom: '1px solid var(--color-border)' }}>
                {LANGS.map(l => (
                  <button key={l} onClick={() => setActiveLang(l)}
                    style={{
                      padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                      background: 'none',
                      color: activeLang === l ? 'var(--color-primary-glow)' : 'var(--color-text2)',
                      borderBottom: activeLang === l ? '2px solid var(--color-primary)' : '2px solid transparent',
                      marginBottom: '-1px',
                    }}>
                    {l === 'javascript' ? 'Node.js' : l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <div className="code-block" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, position: 'relative' }}>
                <button onClick={() => copy(currentCode)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)', padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', cursor: 'pointer' }}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{currentCode}</pre>
              </div>
            </section>

            {/* Error Codes */}
            <section id="errors">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>❌ Error Codes</h2>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>HTTP</th><th>Code</th><th>Description</th></tr></thead>
                  <tbody>
                    {ERROR_CODES.map(e => (
                      <tr key={e.code}>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: parseInt(e.status) >= 500 ? '#f87171' : parseInt(e.status) >= 400 ? '#fb923c' : 'var(--color-text)' }}>{e.status}</span></td>
                        <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: 'var(--color-primary-glow)' }}>{e.code}</code></td>
                        <td style={{ color: 'var(--color-text2)', fontSize: '0.9rem' }}>{e.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="code-block" style={{ marginTop: '16px' }}>
                <div style={{ color: 'var(--color-text2)', marginBottom: '8px', fontSize: '0.82rem' }}>// Error response format</div>
                <div><span style={{ color: '#abb2bf' }}>{'{'}</span></div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"error"</span><span>: {'{'}</span></div>
                <div style={{ paddingLeft: '32px' }}><span className="key">"code"</span><span>: </span><span className="string">"insufficient_credits"</span><span>,</span></div>
                <div style={{ paddingLeft: '32px' }}><span className="key">"message"</span><span>: </span><span className="string">"Your account has 0 credits remaining."</span><span>,</span></div>
                <div style={{ paddingLeft: '32px' }}><span className="key">"docs_url"</span><span>: </span><span className="string">"https://docs.removebg.app/errors/..."</span></div>
                <div style={{ paddingLeft: '16px' }}><span>{'}'}</span></div>
                <div><span>{'}'}</span></div>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="limits">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>⚡ Rate Limits</h2>
              <div className="table-wrapper" style={{ marginBottom: '16px' }}>
                <table>
                  <thead><tr><th>Plan</th><th>Requests / min</th><th>Images / day</th><th>Max file size</th></tr></thead>
                  <tbody>
                    {[
                      { plan: 'Free',       rpm: '5',   day: '5',         size: '5 MB' },
                      { plan: 'Pro',        rpm: '60',  day: '500',       size: '25 MB' },
                      { plan: 'Enterprise', rpm: '500', day: 'Unlimited', size: '25 MB' },
                    ].map(r => (
                      <tr key={r.plan}>
                        <td style={{ fontWeight: 600 }}>{r.plan}</td>
                        <td style={{ color: 'var(--color-accent)' }}>{r.rpm}</td>
                        <td>{r.day}</td>
                        <td style={{ color: 'var(--color-text2)' }}>{r.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem' }}>Rate limit headers returned on every response:</p>
              <div className="code-block" style={{ marginTop: '12px' }}>
                <div><span style={{ color: '#61afef' }}>X-RateLimit-Limit</span><span>: 60</span></div>
                <div><span style={{ color: '#61afef' }}>X-RateLimit-Remaining</span><span>: 55</span></div>
                <div><span style={{ color: '#61afef' }}>X-RateLimit-Reset</span><span>: 1697295480</span></div>
              </div>
            </section>

            {/* Webhooks */}
            <section id="webhooks">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>🔔 Webhooks</h2>
              <p style={{ color: 'var(--color-text2)', marginBottom: '20px', lineHeight: 1.8 }}>
                When submitting async jobs, provide a <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-glow)', fontSize: '0.9em' }}>webhook_url</code> and we'll POST the result to your server upon completion.
              </p>
              <div className="code-block">
                <div style={{ color: 'var(--color-text2)', marginBottom: '8px', fontSize: '0.82rem' }}>// Webhook payload (POST to your webhook_url)</div>
                <div><span>{'{'}</span></div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"event"</span><span>: </span><span className="string">"job.completed"</span>,</div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"job_id"</span><span>: </span><span className="string">"550e8400-e29b-41d4-..."</span>,</div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"status"</span><span>: </span><span className="string">"done"</span>,</div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"result_url"</span><span>: </span><span className="string">"https://cdn.removebg.app/results/..."</span>,</div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"credits_charged"</span><span>: </span><span className="number">1</span>,</div>
                <div style={{ paddingLeft: '16px' }}><span className="key">"timestamp"</span><span>: </span><span className="string">"2026-10-14T14:50:08Z"</span></div>
                <div><span>{'}'}</span></div>
              </div>
              <p style={{ marginTop: '16px', color: 'var(--color-text2)', fontSize: '0.9rem' }}>
                Verify authenticity with the <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '0.88em' }}>X-Signature-256</code> header (HMAC-SHA256 of payload).
              </p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
