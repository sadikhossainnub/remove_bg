const rateLimit = require('express-rate-limit');

const PLAN_LIMITS = {
  free:       { windowMs: 60_000, max: 5 },
  pro:        { windowMs: 60_000, max: 60 },
  enterprise: { windowMs: 60_000, max: 500 },
};

function createRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    max: (req) => {
      const plan = req.apiKey?.plan || 'free';
      return PLAN_LIMITS[plan]?.max ?? 5;
    },
    // Use apiKey id if authenticated, otherwise safe IP string
    keyGenerator: (req) => {
      if (req.apiKey?.id) return req.apiKey.id;
      const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      return String(raw).split(',')[0].trim().replace(/^::ffff:/, '');
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Please slow down.',
          docs_url: 'https://docs.removebg.app/rate-limits',
        },
      });
    },
  });
}

module.exports = { createRateLimiter };
