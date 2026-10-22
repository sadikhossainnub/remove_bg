'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Tab = 'overview' | 'users' | 'jobs' | 'keys' | 'system';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  credits: number;
  isActive: boolean;
  createdAt: string;
  keysCount: number;
  activeKeysCount: number;
}

interface JobItem {
  id: string;
  type: string;
  fileName?: string;
  sizeBytes?: number;
  status: string;
  processTime?: string;
  errorMessage?: string;
  createdAt: string;
  ip?: string;
}

interface KeyItem {
  id: string;
  name: string;
  prefix: string;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
  user_email: string;
  role: string;
}

export default function AdminPage() {
  const [token, setToken] = useState<string>('');
  const [isAuth, setIsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMethod, setLoginMethod] = useState<'secret' | 'credentials'>('secret');

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Search & Filter
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Edit / Create User Modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    plan: 'free',
    credits: 100,
  });

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Check existing token
  useEffect(() => {
    const saved = localStorage.getItem('rbg_superadmin_token');
    if (saved) {
      setToken(saved);
      setIsAuth(true);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const payload = loginMethod === 'secret'
        ? { secret: secretInput.trim() }
        : { email: emailInput.trim(), password: passwordInput.trim() };

      const res = await fetch(`${API}/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Login failed');

      localStorage.setItem('rbg_superadmin_token', data.token);
      setToken(data.token);
      setIsAuth(true);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rbg_superadmin_token');
    setToken('');
    setIsAuth(false);
  };

  const fetchDashboardData = useCallback(async (adminToken: string) => {
    setLoadingData(true);
    const headers = { 'x-admin-secret': adminToken };

    try {
      const [statsRes, usersRes, jobsRes, keysRes, sysRes] = await Promise.all([
        fetch(`${API}/v1/admin/stats`, { headers }),
        fetch(`${API}/v1/admin/users`, { headers }),
        fetch(`${API}/v1/admin/jobs`, { headers }),
        fetch(`${API}/v1/admin/keys`, { headers }),
        fetch(`${API}/v1/admin/system`, { headers }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        setJobs(d.jobs || []);
      }
      if (keysRes.ok) {
        const d = await keysRes.json();
        setKeys(d.keys || []);
      }
      if (sysRes.ok) {
        const d = await sysRes.json();
        setSystemInfo(d);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoadingData(false);
    }
  }, [API]);

  useEffect(() => {
    if (isAuth && token) {
      fetchDashboardData(token);
    }
  }, [isAuth, token, fetchDashboardData]);

  // User Actions
  const handleToggleUserActive = async (user: UserItem) => {
    try {
      const res = await fetch(`${API}/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': token,
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) fetchDashboardData(token);
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`${API}/v1/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': token,
        },
        body: JSON.stringify({
          role: editingUser.role,
          plan: editingUser.plan,
          credits: editingUser.credits,
          name: editingUser.name,
        }),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchDashboardData(token);
      }
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This will revoke all their API keys.`)) return;
    try {
      const res = await fetch(`${API}/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': token },
      });
      if (res.ok) fetchDashboardData(token);
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': token,
        },
        body: JSON.stringify(newUserData),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewUserData({ name: '', email: '', password: '', role: 'user', plan: 'free', credits: 100 });
        fetchDashboardData(token);
      } else {
        const d = await res.json();
        alert(d?.error?.message || 'Create user failed');
      }
    } catch (err) {
      alert('Error creating user');
    }
  };

  const handleToggleKey = async (keyId: string) => {
    try {
      const res = await fetch(`${API}/v1/admin/keys/${keyId}/toggle`, {
        method: 'PATCH',
        headers: { 'x-admin-secret': token },
      });
      if (res.ok) fetchDashboardData(token);
    } catch (err) {
      alert('Toggle key failed');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchUser.toLowerCase()));
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ─── If not authenticated, show Super Admin Login Screen ───
  if (!isAuth) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="badge badge-violet" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
              🛡️ Restricted Area
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Super Admin Portal</h1>
            <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem', marginTop: '6px' }}>
              Please authenticate to access system controls.
            </p>
          </div>

          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', marginBottom: '20px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              <button
                type="button"
                onClick={() => setLoginMethod('secret')}
                style={{
                  flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, fontSize: '0.85rem',
                  background: loginMethod === 'secret' ? 'var(--color-primary)' : 'transparent',
                  color: loginMethod === 'secret' ? '#fff' : 'var(--color-text2)',
                }}>
                🔑 Master Secret
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('credentials')}
                style={{
                  flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, fontSize: '0.85rem',
                  background: loginMethod === 'credentials' ? 'var(--color-primary)' : 'transparent',
                  color: loginMethod === 'credentials' ? '#fff' : 'var(--color-text2)',
                }}>
                👤 Email & Password
              </button>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loginMethod === 'secret' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>
                    Super Admin Secret Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter SUPERADMIN_SECRET (e.g. superadmin123)"
                    value={secretInput}
                    onChange={e => setSecretInput(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--color-surface2)',
                      border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                    }}
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>
                      Admin Email
                    </label>
                    <input
                      type="email"
                      placeholder="admin@removebg.local"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', background: 'var(--color-surface2)',
                        border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text)', fontSize: '0.9rem',
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '6px', fontWeight: 600 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', background: 'var(--color-surface2)',
                        border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text)', fontSize: '0.9rem',
                      }}
                      required
                    />
                  </div>
                </>
              )}

              {authError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.85rem' }}>
                  ❌ {authError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {authLoading ? 'Verifying...' : '⚡ Login as Super Admin'}
              </button>

              {/* Quick default credential helper */}
              <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('secret');
                    setSecretInput('superadmin123');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Auto-fill default secret (`superadmin123`)
                </button>
              </div>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            <Link href="/" style={{ color: 'var(--color-text2)', textDecoration: 'none' }}>← Return to Homepage</Link>
          </p>
        </div>
      </main>
    );
  }

  // ─── Authenticated Super Admin Dashboard ───
  return (
    <main style={{ minHeight: '100vh', padding: '36px 0 60px' }}>
      <div className="container">

        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-violet" style={{ fontSize: '0.8rem' }}>👑 Super Admin</span>
              <span className="badge badge-green">Live System Active</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Admin Console</h1>
            <p style={{ color: 'var(--color-text2)', fontSize: '0.95rem' }}>
              Full control over users, API keys, AI microservice, and system jobs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => fetchDashboardData(token)}
              className="btn btn-outline btn-sm"
              disabled={loadingData}>
              {loadingData ? '🔄 Refreshing...' : '🔄 Refresh Data'}
            </button>
            <button onClick={handleLogout} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Stat Cards Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-text)' }}>
              {stats?.totalUsers ?? users.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: '4px' }}>
              ● {stats?.activeUsers ?? users.filter(u => u.isActive).length} Active accounts
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase' }}>System Jobs</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-primary-glow)' }}>
              {stats?.totalJobs ?? jobs.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', marginTop: '4px' }}>
              Success Rate: <strong style={{ color: 'var(--color-success)' }}>{stats?.successRate ?? '100%'}</strong>
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase' }}>Active API Keys</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent)' }}>
              {stats?.activeKeys ?? keys.filter(k => k.is_active).length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', marginTop: '4px' }}>
              Total generated: {stats?.totalKeys ?? keys.length}
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', fontWeight: 600, textTransform: 'uppercase' }}>rembg AI Service</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: systemInfo?.rembgMicroservice?.running ? '#10b981' : '#f59e0b'
              }} />
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                {systemInfo?.rembgMicroservice?.running ? 'Online (5000)' : 'Checking/Offline'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text2)', marginTop: '6px' }}>
              Model: {systemInfo?.rembgMicroservice?.model || 'isnet-general-use'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
          {[
            { id: 'overview', label: '📊 System Overview' },
            { id: 'users',    label: `👥 Users (${users.length})` },
            { id: 'jobs',     label: `⚡ System Jobs (${jobs.length})` },
            { id: 'keys',     label: `🔑 API Keys (${keys.length})` },
            { id: 'system',   label: '⚙️ AI & Server Health' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? 'var(--color-primary-glow)' : 'var(--color-text2)',
                borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s ease',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: USERS ─────────────────────────────────── */}
        {(activeTab === 'overview' || activeTab === 'users') && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Users Management</h2>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem' }}>View, upgrade plans, modify roles, or toggle account access.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search user by email/name..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'var(--color-surface2)',
                    border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)', fontSize: '0.85rem', width: '220px',
                  }}
                />
                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  style={{
                    padding: '8px 12px', background: 'var(--color-surface2)',
                    border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)', fontSize: '0.85rem',
                  }}>
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-sm">
                  + Add User
                </button>
              </div>
            </div>

            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>User / Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Plan</th>
                    <th>Credits</th>
                    <th>Keys</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px' }}>
                        No users found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name || 'Unnamed'}</strong>
                        </td>
                        <td>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{u.email}</code>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'superadmin' ? 'badge-violet' : u.role === 'admin' ? 'badge-cyan' : ''}`}
                            style={u.role === 'user' ? { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text2)' } : {}}>
                            {u.role === 'superadmin' ? '👑 Super Admin' : u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.plan === 'enterprise' ? 'badge-green' : u.plan === 'pro' ? 'badge-violet' : 'badge-cyan'}`}>
                            {u.plan.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{u.credits}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text2)' }}>
                            {u.activeKeysCount} / {u.keysCount} active
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-green' : ''}`}
                            style={!u.isActive ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : {}}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setEditingUser(u)}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              className="btn btn-sm"
                              style={{
                                padding: '4px 10px', fontSize: '0.78rem',
                                background: u.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                color: u.isActive ? 'var(--color-warning)' : 'var(--color-success)',
                                border: '1px solid currentColor',
                              }}>
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            {u.role !== 'superadmin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="btn btn-sm"
                                style={{
                                  padding: '4px 8px', fontSize: '0.78rem',
                                  background: 'rgba(239,68,68,0.1)', color: '#f87171',
                                  border: '1px solid rgba(239,68,68,0.2)'
                                }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SYSTEM JOBS ───────────────────────────── */}
        {(activeTab === 'jobs' || activeTab === 'overview') && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Real-Time System Jobs</h2>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem' }}>Live tracking of background removal executions across the API.</p>
              </div>
              <span className="badge badge-cyan">{jobs.length} Jobs recorded</span>
            </div>

            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Process Time</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px' }}>
                        No jobs processed yet in this session. Try removing a background in the App!
                      </td>
                    </tr>
                  ) : (
                    jobs.map(j => (
                      <tr key={j.id}>
                        <td>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-primary-glow)' }}>
                            #{j.id}
                          </code>
                        </td>
                        <td>
                          <span className="badge badge-violet" style={{ fontSize: '0.75rem' }}>{j.type}</span>
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>
                          {j.fileName || 'N/A'} {j.sizeBytes ? `(${(j.sizeBytes / 1024).toFixed(0)} KB)` : ''}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {j.processTime || '-'}
                        </td>
                        <td>
                          <span className={`badge ${j.status === 'done' ? 'badge-green' : 'badge-danger'}`}
                            style={j.status === 'failed' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : {}}>
                            {j.status === 'done' ? '✓ Done' : '✗ Failed'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text2)', fontSize: '0.82rem' }}>
                          {new Date(j.createdAt).toLocaleTimeString()} · {new Date(j.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: API KEYS MONITOR ──────────────────────── */}
        {activeTab === 'keys' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Global API Keys Monitor</h2>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem' }}>Monitor and control API keys for all users across the system.</p>
              </div>
              <span className="badge badge-violet">{keys.length} Keys total</span>
            </div>

            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Key Name</th>
                    <th>Prefix</th>
                    <th>Owner</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 600 }}>{k.name}</td>
                      <td>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', background: 'var(--color-surface2)', padding: '2px 8px', borderRadius: '4px' }}>
                          {k.prefix}
                        </code>
                      </td>
                      <td style={{ color: 'var(--color-text2)', fontSize: '0.85rem' }}>{k.user_email}</td>
                      <td>
                        <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{k.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${k.is_active ? 'badge-green' : ''}`}
                          style={!k.is_active ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : {}}>
                          {k.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleKey(k.id)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 10px', fontSize: '0.78rem',
                            background: k.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: k.is_active ? '#f87171' : 'var(--color-success)',
                            border: '1px solid currentColor',
                          }}>
                          {k.is_active ? 'Revoke Key' : 'Activate Key'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: SYSTEM & AI HEALTH ───────────────────── */}
        {activeTab === 'system' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="card">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>🤖 rembg Microservice</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Status</span>
                  <span className={`badge ${systemInfo?.rembgMicroservice?.running ? 'badge-green' : 'badge-danger'}`}>
                    {systemInfo?.rembgMicroservice?.running ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Port</span>
                  <code style={{ fontFamily: 'var(--font-mono)' }}>5000</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Model</span>
                  <span>{systemInfo?.rembgMicroservice?.model || 'isnet-general-use'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Backend Script</span>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>api/src/services/rembg_server.py</code>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>🖥️ Express API Server</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Port</span>
                  <code style={{ fontFamily: 'var(--font-mono)' }}>4000</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Node Version</span>
                  <span>{systemInfo?.nodeVersion || process.version}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Platform</span>
                  <span>{systemInfo?.platform || 'linux'} ({systemInfo?.arch || 'x64'})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ color: 'var(--color-text2)' }}>Uptime</span>
                  <span>{systemInfo?.uptime || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── MODAL: EDIT USER ───────────────────────────────── */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Edit User Details</h3>
            <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Modify role, subscription plan, and credit balance for <code>{editingUser.email}</code>.
            </p>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Name</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Plan</label>
                <select
                  value={editingUser.plan}
                  onChange={e => setEditingUser({ ...editingUser, plan: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Credits</label>
                <input
                  type="number"
                  value={editingUser.credits}
                  onChange={e => setEditingUser({ ...editingUser, credits: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-sm btn-outline">Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE USER ─────────────────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Create New Account</h3>
            <p style={{ color: 'var(--color-text2)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Create a user directly with administrative privileges and plan allocation.
            </p>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUserData.name}
                  onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newUserData.email}
                  onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newUserData.password}
                  onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Role</label>
                  <select
                    value={newUserData.role}
                    onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Plan</label>
                  <select
                    value={newUserData.plan}
                    onChange={e => setNewUserData({ ...newUserData, plan: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '4px', fontWeight: 600 }}>Credits</label>
                <input
                  type="number"
                  value={newUserData.credits}
                  onChange={e => setNewUserData({ ...newUserData, credits: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface2)', border: '1px solid var(--color-border2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-sm btn-outline">Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

