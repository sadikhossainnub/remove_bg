const express = require('express');
const crypto = require('crypto');
const { USERS } = require('./auth');
const { MOCK_KEYS, generateApiKey } = require('../middleware/auth');
const { jobsList } = require('./jobs');
const { checkRembgService } = require('../services/bgRemoval');

const router = express.Router();
const SUPERADMIN_SECRET = process.env.SUPERADMIN_SECRET || 'superadmin123';

// ─── Super Admin Middleware ─────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  const secretHeader = req.headers['x-admin-secret'];
  const querySecret  = req.query.secret;
  const authHeader   = req.headers['authorization'] || '';

  // 1. Direct Secret Header or Query
  if (secretHeader === SUPERADMIN_SECRET || querySecret === SUPERADMIN_SECRET) {
    req.isSuperAdmin = true;
    return next();
  }

  // 2. Bearer token matching secret
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token === SUPERADMIN_SECRET) {
      req.isSuperAdmin = true;
      return next();
    }
  }

  // 3. API Key belonging to superadmin
  if (authHeader.startsWith('Api-Key ')) {
    const rawKey = authHeader.slice('Api-Key '.length).trim();
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = MOCK_KEYS[hash];
    if (key && key.is_active && key.role === 'superadmin') {
      req.isSuperAdmin = true;
      return next();
    }
  }

  return res.status(403).json({
    error: {
      code: 'forbidden',
      message: 'Super Admin access required. Provide X-Admin-Secret header or login as Super Admin.',
    },
  });
}

// ─── POST /admin/login ─────────────────────────────────────────
router.post('/login', express.json(), (req, res) => {
  const { secret, email, password } = req.body || {};

  // Login by Secret
  if (secret && secret === SUPERADMIN_SECRET) {
    return res.json({
      success: true,
      token: SUPERADMIN_SECRET,
      user: {
        email: process.env.SUPERADMIN_EMAIL || 'admin@removebg.local',
        name: 'Super Administrator',
        role: 'superadmin',
      },
    });
  }

  // Login by Email + Password
  if (email && password) {
    const user = USERS[email];
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user && user.passwordHash === passwordHash && user.role === 'superadmin') {
      return res.json({
        success: true,
        token: SUPERADMIN_SECRET,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }
  }

  return res.status(401).json({
    error: { code: 'unauthorized', message: 'Invalid Super Admin credentials or secret.' },
  });
});

// ─── GET /admin/stats ──────────────────────────────────────────
router.get('/stats', requireSuperAdmin, async (req, res) => {
  const usersArray = Object.values(USERS);
  const totalUsers  = usersArray.length;
  const activeUsers = usersArray.filter(u => u.isActive !== false).length;

  const keysArray = Object.values(MOCK_KEYS);
  const totalKeys  = keysArray.length;
  const activeKeys = keysArray.filter(k => k.is_active).length;

  const totalJobs  = jobsList.length;
  const doneJobs   = jobsList.filter(j => j.status === 'done').length;
  const failedJobs = jobsList.filter(j => j.status === 'failed').length;

  const rembgStatus = await checkRembgService();
  const memory = process.memoryUsage();

  return res.json({
    stats: {
      totalUsers,
      activeUsers,
      totalKeys,
      activeKeys,
      totalJobs,
      doneJobs,
      failedJobs,
      successRate: totalJobs > 0 ? `${Math.round((doneJobs / totalJobs) * 100)}%` : '100%',
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: Math.round(memory.rss / 1024 / 1024),
      nodeVersion: process.version,
      rembg: rembgStatus,
    },
  });
});

// ─── GET /admin/users ──────────────────────────────────────────
router.get('/users', requireSuperAdmin, (req, res) => {
  const users = Object.values(USERS).map(u => {
    const userKeys = Object.values(MOCK_KEYS).filter(k => k.user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || 'user',
      plan: u.plan || 'free',
      credits: u.credits ?? 50,
      isActive: u.isActive !== false,
      createdAt: u.createdAt,
      keysCount: userKeys.length,
      activeKeysCount: userKeys.filter(k => k.is_active).length,
    };
  });

  return res.json({ users });
});

// ─── POST /admin/users ─────────────────────────────────────────
router.post('/users', requireSuperAdmin, express.json(), (req, res) => {
  const { email, name, password, role, plan, credits } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: { message: 'email and password are required' } });
  }
  if (USERS[email]) {
    return res.status(409).json({ error: { message: 'User already exists' } });
  }

  const userId = crypto.randomUUID();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  USERS[email] = {
    id: userId,
    email,
    name: name || email.split('@')[0],
    passwordHash,
    role: role || 'user',
    plan: plan || 'free',
    credits: Number(credits) || 50,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  return res.status(201).json({ message: 'User created by Super Admin', user: USERS[email] });
});

// ─── PATCH /admin/users/:userId ────────────────────────────────
router.patch('/users/:userId', requireSuperAdmin, express.json(), (req, res) => {
  const { userId } = req.params;
  const user = Object.values(USERS).find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }

  const { role, plan, credits, isActive, name } = req.body || {};
  if (role !== undefined) user.role = role;
  if (plan !== undefined) user.plan = plan;
  if (credits !== undefined) user.credits = Number(credits);
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (name !== undefined) user.name = name;

  return res.json({ message: 'User updated successfully', user });
});

// ─── DELETE /admin/users/:userId ───────────────────────────────
router.delete('/users/:userId', requireSuperAdmin, (req, res) => {
  const { userId } = req.params;
  const email = Object.keys(USERS).find(e => USERS[e].id === userId);

  if (!email) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }

  // Deactivate their keys
  Object.values(MOCK_KEYS).forEach(k => {
    if (k.user_id === userId) k.is_active = false;
  });

  delete USERS[email];
  return res.json({ message: `User ${email} deleted successfully.` });
});

// ─── GET /admin/jobs ───────────────────────────────────────────
router.get('/jobs', requireSuperAdmin, (req, res) => {
  return res.json({ jobs: jobsList });
});

// ─── GET /admin/keys ───────────────────────────────────────────
router.get('/keys', requireSuperAdmin, (req, res) => {
  const keys = Object.values(MOCK_KEYS).map(k => {
    const user = Object.values(USERS).find(u => u.id === k.user_id);
    return {
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      is_active: k.is_active,
      created_at: k.created_at,
      last_used: k.last_used,
      user_email: user?.email || 'unknown',
      role: k.role || user?.role || 'user',
    };
  });
  return res.json({ keys });
});

// ─── PATCH /admin/keys/:keyId/toggle ───────────────────────────
router.patch('/keys/:keyId/toggle', requireSuperAdmin, (req, res) => {
  const key = Object.values(MOCK_KEYS).find(k => k.id === req.params.keyId);
  if (!key) return res.status(404).json({ error: { message: 'Key not found' } });

  key.is_active = !key.is_active;
  return res.json({ message: `Key ${key.is_active ? 'activated' : 'revoked'}`, is_active: key.is_active });
});

// ─── GET /admin/system ─────────────────────────────────────────
router.get('/system', requireSuperAdmin, async (req, res) => {
  const rembg = await checkRembgService();
  return res.json({
    status: 'online',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
    uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    rembgMicroservice: rembg,
  });
});

module.exports = router;

