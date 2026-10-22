const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const { generateApiKey, MOCK_KEYS } = require('../middleware/auth');

const router = express.Router();

// ─── GET /v1/api-keys ─────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const userKeys = Object.values(MOCK_KEYS)
    .filter(k => k.user_id === req.userId)
    .map(k => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      is_active: k.is_active,
      last_used: k.last_used,
      created_at: k.created_at,
    }));

  return res.json({ keys: userKeys });
});

// ─── POST /v1/api-keys ────────────────────────────────────────
router.post('/', authMiddleware, express.json(), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: { code: 'missing_name', message: 'Key name is required.' } });

  const { raw, hash, prefix } = generateApiKey();
  const keyRecord = {
    id: crypto.randomUUID(),
    user_id: req.userId,
    name,
    prefix,
    key_hash: hash,
    is_active: true,
    last_used: null,
    created_at: new Date().toISOString(),
    plan: req.apiKey?.plan || 'free',
  };

  MOCK_KEYS[hash] = keyRecord;

  return res.status(201).json({
    id: keyRecord.id,
    name: keyRecord.name,
    key: raw,                    // shown ONCE only
    prefix,
    auth_scheme: 'Api-Key',
    created_at: keyRecord.created_at,
  });
});

// ─── DELETE /v1/api-keys/:keyId ───────────────────────────────
router.delete('/:keyId', authMiddleware, (req, res) => {
  const entry = Object.entries(MOCK_KEYS).find(
    ([, v]) => v.id === req.params.keyId && v.user_id === req.userId
  );

  if (!entry) return res.status(404).json({ error: { code: 'not_found', message: 'API key not found.' } });

  const [hash] = entry;
  MOCK_KEYS[hash].is_active = false;

  return res.status(204).send();
});

module.exports = router;
