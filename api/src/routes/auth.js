const express = require('express');
const crypto = require('crypto');
const { MOCK_KEYS, generateApiKey } = require('../middleware/auth');

const router = express.Router();

// In-memory user store (replace with Prisma in production)
const USERS = {};

// Seed default Super Admin
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@removebg.local';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
const superAdminHash = crypto.createHash('sha256').update(SUPERADMIN_PASSWORD).digest('hex');

if (!USERS[SUPERADMIN_EMAIL]) {
  const superAdminId = 'super-admin-001';
  USERS[SUPERADMIN_EMAIL] = {
    id: superAdminId,
    email: SUPERADMIN_EMAIL,
    name: 'Super Administrator',
    passwordHash: superAdminHash,
    role: 'superadmin',
    plan: 'enterprise',
    credits: 999999,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const { raw, hash, prefix } = generateApiKey();
  MOCK_KEYS[hash] = {
    id: 'super-admin-key',
    user_id: superAdminId,
    name: 'Super Admin Master Key',
    prefix,
    key_hash: hash,
    is_active: true,
    last_used: null,
    created_at: new Date().toISOString(),
    plan: 'enterprise',
    role: 'superadmin',
  };
}

// ─── POST /v1/auth/register ───────────────────────────────────
router.post('/register', express.json(), (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'missing_fields', message: 'email and password are required.' } });
  }

  if (USERS[email]) {
    return res.status(409).json({ error: { code: 'email_taken', message: 'An account with this email already exists.' } });
  }

  const userId = crypto.randomUUID();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  USERS[email] = {
    id: userId,
    email,
    name: name || email.split('@')[0],
    passwordHash,
    role: 'user',
    plan: 'free',
    credits: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Auto-generate first API key for new user
  const { raw, hash, prefix } = generateApiKey();
  const keyRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: 'Default Key',
    prefix,
    key_hash: hash,
    is_active: true,
    last_used: null,
    created_at: new Date().toISOString(),
    plan: 'free',
    role: 'user',
  };
  MOCK_KEYS[hash] = keyRecord;

  return res.status(201).json({
    message: 'Account created successfully!',
    user: { id: userId, email, name: USERS[email].name, plan: 'free', role: 'user', credits: 50 },
    api_key: {
      key: raw,
      prefix,
      auth_scheme: 'Api-Key',
      note: 'Save this key! It will NOT be shown again.',
    },
  });
});

// ─── POST /v1/auth/login ──────────────────────────────────────
router.post('/login', express.json(), (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'missing_fields', message: 'email and password are required.' } });
  }

  const user = USERS[email];
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  if (!user || user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: { code: 'account_suspended', message: 'This account has been suspended by an administrator.' } });
  }

  // Find user's active keys
  const userKeys = Object.values(MOCK_KEYS)
    .filter(k => k.user_id === user.id && k.is_active)
    .map(k => ({ id: k.id, name: k.name, prefix: k.prefix, created_at: k.created_at }));

  return res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role || 'user',
      credits: user.credits ?? 50,
    },
    api_keys: userKeys,
  });
});

// ─── GET /v1/auth/demo-key ────────────────────────────────────
// Development only: get a ready-to-use demo API key (no auth needed)
router.get('/demo-key', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: { code: 'not_found', message: 'Not available in production.' } });
  }

  const DEMO_USER_ID = 'demo-user-001';

  // Check if demo key already exists
  const existing = Object.entries(MOCK_KEYS).find(([, v]) => v.user_id === DEMO_USER_ID && v.is_active);
  if (existing) {
    return res.json({
      note: '⚠️ Development demo key (DO NOT use in production)',
      prefix: existing[1].prefix,
      message: 'Demo key already exists. Use register to get a fresh key with the raw value.',
    });
  }

  // Create demo user + key
  const { raw, hash, prefix } = generateApiKey();
  MOCK_KEYS[hash] = {
    id: crypto.randomUUID(),
    user_id: DEMO_USER_ID,
    name: 'Demo Key',
    prefix,
    key_hash: hash,
    is_active: true,
    last_used: null,
    created_at: new Date().toISOString(),
    plan: 'pro', // demo gets pro
  };

  return res.json({
    note: '⚠️ Development demo key (DO NOT use in production)',
    api_key: raw,
    auth_header: `Authorization: Api-Key ${raw}`,
    plan: 'pro',
  });
});

module.exports = router;
module.exports.USERS = USERS;
