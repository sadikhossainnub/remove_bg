const crypto = require('crypto');

/**
 * REST API Key Authentication Middleware
 * Header format: Authorization: Api-Key rbg_live_xxxx
 * The raw key is never stored — only its SHA-256 hash is compared.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Api-Key ')) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: "No API key provided. Use: Authorization: Api-Key <your_key>",
        docs_url: 'https://docs.removebg.app/authentication',
      },
    });
  }

  const rawKey = authHeader.slice('Api-Key '.length).trim();

  if (!rawKey || !rawKey.startsWith('rbg_live_')) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Invalid API key format. Keys must start with "rbg_live_".',
        docs_url: 'https://docs.removebg.app/authentication',
      },
    });
  }

  // Hash the incoming key and compare to DB
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // TODO: Replace with real Prisma DB lookup
  // const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  const apiKey = MOCK_KEYS[keyHash]; // mock for now

  if (!apiKey || !apiKey.is_active) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Invalid or revoked API key. Check your key or generate a new one in the dashboard.',
        docs_url: 'https://docs.removebg.app/authentication',
      },
    });
  }

  req.apiKey = apiKey;
  req.userId = apiKey.user_id;
  next();
}

// ── Mock key store (replace with Prisma in production) ──────────
const MOCK_KEYS = {};

/**
 * Generate a new REST API key
 * Returns { raw, hash, prefix }
 */
function generateApiKey() {
  const raw = 'rbg_live_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 20) + '...';
  return { raw, hash, prefix };
}

module.exports = { authMiddleware, generateApiKey, MOCK_KEYS };
