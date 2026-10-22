const express = require('express');
const multer  = require('multer');
const axios   = require('axios');
const { removeBackground } = require('../services/bgRemoval');
const { v4: uuidv4 } = require('uuid');
const { recordJob } = require('./jobs');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const log = (step, msg) => {
  const time = new Date().toLocaleTimeString('bn-BD');
  console.log(`[${time}] ${step} ${msg}`);
};

// ─── POST /remove ──────────────────────────────────────────────
router.post('/', upload.single('image_file'), async (req, res) => {
  const jobId = uuidv4().slice(0, 8);

  console.log('\n' + '═'.repeat(50));
  log('🆕', `New Job: #${jobId}`);
  log('🌐', `From: ${req.ip}`);

  try {
    let imageBuffer;

    // ── Step 1: Image source
    if (req.file) {
      const sizeMB = (req.file.size / 1024 / 1024).toFixed(2);
      log('📁', `Step 1 — File upload: ${req.file.originalname} (${sizeMB} MB, ${req.file.mimetype})`);
      imageBuffer = req.file.buffer;

    } else if (req.body?.image_url) {
      log('🔗', `Step 1 — URL fetch: ${req.body.image_url}`);
      const response = await axios.get(req.body.image_url, {
        responseType: 'arraybuffer',
        timeout: 15_000,
      });
      imageBuffer = Buffer.from(response.data);
      log('✅', `Step 1 — Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    } else {
      log('❌', 'Step 1 — No image provided!');
      return res.status(400).json({ error: 'Provide image_file or image_url.' });
    }

    // ── Step 2: AI Processing
    log('🤖', 'Step 2 — Sending to rembg AI...');
    const t2 = Date.now();

    const resultBuffer = await removeBackground(imageBuffer);

    const aiTime = ((Date.now() - t2) / 1000).toFixed(1);
    log('✅', `Step 2 — AI done in ${aiTime}s | Output: ${(resultBuffer.length / 1024).toFixed(1)} KB`);

    // ── Step 3: Send response
    log('📤', `Step 3 — Sending PNG to client...`);
    res.set({
      'Content-Type':        'image/png',
      'Content-Disposition': `attachment; filename="removed-bg-${jobId}.png"`,
      'X-Job-ID':            jobId,
      'X-Process-Time':      `${aiTime}s`,
    });

    res.send(resultBuffer);
    log('🎉', `Step 3 — Job #${jobId} complete!\n`);
    console.log('═'.repeat(50) + '\n');

    recordJob({
      id: jobId,
      type: req.file ? 'file_upload' : 'image_url',
      fileName: req.file?.originalname || 'url_image',
      sizeBytes: imageBuffer?.length,
      status: 'done',
      processTime: `${aiTime}s`,
      createdAt: new Date().toISOString(),
      ip: req.ip,
    });

  } catch (err) {
    log('❌', `Job #${jobId} FAILED: ${err.message}`);
    console.log('═'.repeat(50) + '\n');

    recordJob({
      id: jobId,
      type: req.file ? 'file_upload' : 'image_url',
      fileName: req.file?.originalname || 'url_image',
      status: 'failed',
      errorMessage: err.message,
      createdAt: new Date().toISOString(),
      ip: req.ip,
    });

    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /remove/async ────────────────────────────────────────
router.post('/async', express.json(), async (req, res) => {
  const { image_url } = req.body || {};
  if (!image_url) return res.status(400).json({ error: 'image_url required.' });

  const jobId = uuidv4().slice(0, 8);
  log('📋', `Async Job #${jobId} queued for: ${image_url}`);

  setImmediate(async () => {
    log('🔄', `Async Job #${jobId} — Starting...`);
    try {
      const response     = await axios.get(image_url, { responseType: 'arraybuffer', timeout: 15_000 });
      const resultBuffer = await removeBackground(Buffer.from(response.data));
      log('✅', `Async Job #${jobId} — Done (${(resultBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      log('❌', `Async Job #${jobId} — Failed: ${e.message}`);
    }
  });

  return res.status(202).json({ job_id: jobId, status: 'processing' });
});

module.exports = router;
