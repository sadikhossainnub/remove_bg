const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─── GET /v1/account ─────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  return res.json({
    id: req.userId,
    plan: req.apiKey?.plan || 'free',
    credits: {
      total: 500,
      used: 47,
      remaining: 453,
      resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    },
  });
});

module.exports = router;
