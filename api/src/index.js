require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const removeRoute  = require('./routes/remove');
const jobsRoute    = require('./routes/jobs');
const authRoute    = require('./routes/auth');
const accountRoute = require('./routes/account');
const apiKeysRoute = require('./routes/apiKeys');
const adminRoute   = require('./routes/admin');
const convertRoute = require('./routes/convert');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Request Logger ───────────────────────────────────────────
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    const time = new Date().toLocaleTimeString('bn-BD');
    console.log(`[${time}] ➡️  ${req.method} ${req.path}`);
  }
  next();
});

// ─── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── Routes ────────────────────────────────────────────────────
app.use('/remove', removeRoute);
app.use('/v1/remove', removeRoute);

app.use('/jobs',   jobsRoute);
app.use('/v1/jobs', jobsRoute);

app.use('/auth',   authRoute);
app.use('/v1/auth', authRoute);

app.use('/account', accountRoute);
app.use('/v1/account', accountRoute);

app.use('/api-keys', apiKeysRoute);
app.use('/v1/api-keys', apiKeysRoute);

app.use('/admin',  adminRoute);
app.use('/v1/admin', adminRoute);

app.use('/convert', convertRoute);
app.use('/v1/convert', convertRoute);

// ─── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[⚠️ ] 404 — ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// ─── Error Handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`[❌] Unhandled error:`, err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  const { checkRembgService } = require('./services/bgRemoval');

  console.log('\n' + '═'.repeat(50));
  console.log('🚀 Remove BG API Started!');
  console.log('═'.repeat(50));
  console.log(`📡 URL     : http://localhost:${PORT}`);
  console.log(`📂 Endpoint: POST /remove`);
  console.log('═'.repeat(50));

  // Wait for rembg microservice (retries for 10s — both start together via concurrently)
  let rembg = { running: false };
  const maxTries = 20;
  for (let i = 0; i < maxTries; i++) {
    rembg = await checkRembgService();
    if (rembg.running) break;
    if (i === 0) process.stdout.write(`⏳ Waiting for rembg service`);
    else process.stdout.write('.');
    await new Promise(r => setTimeout(r, 500));
  }
  if (rembg.running) {
    if (process.stdout._prevWaiting) process.stdout.write('\n');
    console.log(`✅ rembg service  : http://localhost:5000 (${rembg.status || 'running'})`);
    console.log(`🤖 Model          : ${rembg.model || 'isnet-general-use'}`);
  } else {
    process.stdout.write('\n');
    console.log(`⚠️  rembg service  : NOT RUNNING`);
    console.log(`\n   ❗ Please start the rembg service in a new terminal:`);
    console.log(`   python3 src/services/rembg_server.py\n`);
  }
  console.log('═'.repeat(50));
  console.log('⏳ Ready to receive images...\n');
});
