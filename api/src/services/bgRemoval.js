const http = require('http');
const sharp = require('sharp');

const REMBG_HOST = process.env.REMBG_HOST || 'localhost';
const REMBG_PORT = process.env.REMBG_PORT || 5000;
const REMBG_URL  = `http://${REMBG_HOST}:${REMBG_PORT}`;

const log = (step, msg) => {
  const time = new Date().toLocaleTimeString('bn-BD');
  console.log(`[${time}] ${step} ${msg}`);
};

/**
 * Remove background by calling the Python rembg HTTP microservice.
 *
 * Start the microservice first:
 *   python3 api/src/services/rembg_server.py
 *
 * Model: isnet-general-use (~176MB, downloads on first use)
 */
function removeBackground(imageBuffer) {
  return new Promise((resolve, reject) => {
    const sizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
    log('📡', `Calling rembg service at ${REMBG_URL}/remove (${sizeMB} MB)`);

    const options = {
      hostname: REMBG_HOST,
      port:     REMBG_PORT,
      path:     '/remove',
      method:   'POST',
      headers: {
        'Content-Type':   'application/octet-stream',
        'Content-Length': imageBuffer.length,
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];

      res.on('data', chunk => chunks.push(chunk));

      res.on('end', () => {
        const body = Buffer.concat(chunks);

        if (res.statusCode !== 200) {
          log('❌', `rembg service error: HTTP ${res.statusCode} — ${body.toString()}`);
          return reject(new Error(`rembg service returned ${res.statusCode}: ${body.toString()}`));
        }

        log('✅', `rembg done! Output: ${(body.length / 1024).toFixed(1)} KB`);
        
        // Lossless uncompressed return — ensures pristine original resolution without blurring
        resolve(body);
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        log('❌', `rembg service না চলায় সংযোগ করা যায়নি!`);
        reject(new Error(
          `rembg service is not running!\n` +
          `Please start it in a new terminal:\n\n` +
          `  python3 "${__dirname}/rembg_server.py"\n\n` +
          `Then try again.`
        ));
      } else {
        log('❌', `HTTP error: ${err.message}`);
        reject(err);
      }
    });

    req.write(imageBuffer);
    req.end();
  });
}

/**
 * Check if rembg service is running
 */
function checkRembgService() {
  return new Promise((resolve) => {
    const req = http.get(`${REMBG_URL}/health`, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ running: true, ...data });
        } catch {
          resolve({ running: true });
        }
      });
    });
    req.on('error', () => resolve({ running: false }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ running: false }); });
  });
}

module.exports = { removeBackground, checkRembgService };
