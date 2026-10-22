'use client';
import { useState } from 'react';

type ApiKey = { id: string; name: string; prefix: string; is_active: boolean; last_used: string | null; created_at: string; };

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Key', prefix: 'rbg_live_a1b2c3...', is_active: true, last_used: '2026-10-14T10:20:00Z', created_at: '2026-09-01T00:00:00Z' },
  { id: '2', name: 'Test Key', prefix: 'rbg_live_x9y8z7...', is_active: true, last_used: null, created_at: '2026-10-01T00:00:00Z' },
];

export default function DashboardPage() {
  const [keys, setKeys]           = useState<ApiKey[]>(MOCK_KEYS);
  const [newKey, setNewKey]       = useState<{ raw: string; name: string } | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [copied, setCopied]       = useState(false);
  const [creating, setCreating]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const usedCredits   = 47;
  const totalCredits  = 500;
  const usedPercent   = Math.round((usedCredits / totalCredits) * 100);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    await new Promise(r => setTimeout(r, 800)); // mock delay
    const mock = {
      id: Date.now().toString(),
      name: newKeyName,
      prefix: 'rbg_live_' + Math.random().toString(36).slice(2, 10) + '...',
      is_active: true,
      last_used: null,
      created_at: new Date().toISOString(),
    };
    setKeys(prev => [mock, ...prev]);
    setNewKey({ raw: 'rbg_live_' + Math.random().toString(36).slice(2, 42), name: newKeyName });
    setNewKeyName('');
    setCreating(false);
    setShowCreate(false);
  };

  const revokeKey = (id: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  return (
    <main style={{ minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'var(--color-text2)' }}>Manage your API keys and view usage.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>

          {/* Credit Usage Card */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Credits Used</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                  {usedCredits} <span style={{ color: 'var(--color-muted)', fontSize: '1.1rem', fontWeight: 400 }}>/ {totalCredits}</span>
                </div>
              </div>
              <div className="badge badge-violet">Pro Plan</div>
            </div>
            {/* Progress bar */}
            <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: `${usedPercent}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', borderRadius: '99px', transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text2)' }}>
              <span>{usedPercent}% used</span>
              <span>Resets Nov 1, 2026</span>
            </div>
          </div>

          {/* Plan Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Current Plan</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>Pro</div>
              <div style={{ color: 'var(--color-text2)', fontSize: '0.9rem' }}>$9 / month</div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Upgrade ↗</button>
          </div>
        </div>

        {/* ── New Key Banner ─────────────────────────── */}
        {newKey && (
          <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-success)' }}>✅ Key "{newKey.name}" created!</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--color-text2)', wordBreak: 'break-all' }}>{newKey.raw}</div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => copyKey(newKey.raw)}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--color-warning)' }}>
              ⚠️ This key will NOT be shown again. Store it somewhere safe!
            </div>
            <button onClick={() => setNewKey(null)} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>Dismiss</button>
          </div>
        )}

        {/* ── API Keys Table ──────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>API Keys</h2>
              <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem', marginTop: '2px' }}>
                Use <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-glow)', fontSize: '0.82em' }}>Authorization: Api-Key &lt;key&gt;</code>
              </p>
            </div>
            <button id="create-key-btn" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              + Create Key
            </button>
          </div>

          {/* Create Key Form */}
          {showCreate && (
            <div style={{ padding: '16px 24px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                id="new-key-name"
                className="input"
                placeholder="Key name (e.g. Production)"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createKey()}
                autoFocus
                style={{ maxWidth: '300px' }}
              />
              <button className="btn btn-primary btn-sm" onClick={createKey} disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          )}

          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Last Used</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 500 }}>{k.name}</td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-text2)', background: 'var(--color-surface2)', padding: '3px 8px', borderRadius: '4px' }}>
                        {k.prefix}
                      </code>
                    </td>
                    <td>
                      <span className={`badge ${k.is_active ? 'badge-green' : ''}`}
                        style={!k.is_active ? { background: 'rgba(100,116,139,0.1)', color: 'var(--color-muted)', border: '1px solid var(--color-border2)' } : {}}>
                        {k.is_active ? '● Active' : '○ Revoked'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text2)', fontSize: '0.88rem' }}>{fmt(k.last_used)}</td>
                    <td style={{ color: 'var(--color-text2)', fontSize: '0.88rem' }}>{fmt(k.created_at)}</td>
                    <td>
                      {k.is_active && (
                        <button
                          className="btn btn-sm"
                          onClick={() => revokeKey(k.id)}
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 12px', fontSize: '0.8rem' }}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Jobs ─────────────────────────────── */}
        <div className="card" style={{ marginTop: '24px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Recent Jobs</h2>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr><th>Job ID</th><th>Status</th><th>Credits</th><th>Created</th></tr>
              </thead>
              <tbody>
                {[
                  { id: '550e8400', status: 'done',    credits: 1, created: '2026-10-14T10:20:00Z' },
                  { id: 'a1b2c3d4', status: 'done',    credits: 1, created: '2026-10-14T09:15:00Z' },
                  { id: 'x9y8z7w6', status: 'failed',  credits: 0, created: '2026-10-13T18:00:00Z' },
                ].map(j => (
                  <tr key={j.id}>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-text2)' }}>{j.id}...</code></td>
                    <td>
                      <span className={`badge ${j.status === 'done' ? 'badge-green' : ''}`}
                        style={j.status === 'failed' ? { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 } : {}}>
                        {j.status === 'done' ? '✓ Done' : '✗ Failed'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text2)' }}>{j.credits}</td>
                    <td style={{ color: 'var(--color-text2)', fontSize: '0.88rem' }}>{fmt(j.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
