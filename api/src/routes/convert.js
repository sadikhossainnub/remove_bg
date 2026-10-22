const express = require('express');
const multer  = require('multer');
const sharp   = require('sharp');

const router = express.Router();
const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Helper: Embed clean Base64 raster into scalable SVG
function createEmbeddedSvg(pngBuffer, width, height, mimeType = 'image/png') {
  const b64 = pngBuffer.toString('base64');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" 
     height="${height}" 
     viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="data:${mimeType};base64,${b64}" />
</svg>`;
}

// POST /convert/png-to-svg
router.post('/png-to-svg', upload.single('image'), async (req, res) => {
  let inputBuffer = null;
  let filename = 'converted.svg';

  try {
    if (req.file && req.file.buffer) {
      inputBuffer = req.file.buffer;
      const baseName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, "") : 'converted';
      filename = `${baseName}.svg`;
    } else if (req.body && req.body.image) {
      const b64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      inputBuffer = Buffer.from(b64Data, 'base64');
    }

    if (!inputBuffer) {
      return res.status(400).json({ error: 'ছবি পাওয়া যায়নি। অনুগ্রহ করে একটি PNG/JPG ছবি পাঠান।' });
    }

    // Process & analyze image dimensions with sharp
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Convert/normalize to optimized PNG buffer
    const pngBuffer = await sharp(inputBuffer)
      .png({ quality: 100, compressionLevel: 6 })
      .toBuffer();

    const svgString = createEmbeddedSvg(pngBuffer, width, height, 'image/png');

    // If client requested JSON (e.g. from frontend UI)
    const acceptHeader = req.headers['accept'] || '';
    if (acceptHeader.includes('application/json') || req.query.format === 'json') {
      return res.json({
        success: true,
        width,
        height,
        filename,
        svg: svgString,
        dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
      });
    }

    // Direct download response
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(svgString);

  } catch (error) {
    console.error('[Convert Error]', error);
    return res.status(500).json({ error: 'কনভার্ট করতে সমস্যা হয়েছে: ' + error.message });
  }
});

// Universal Convert route (supports png to webp, jpeg, etc.)
router.post('/format', upload.single('image'), async (req, res) => {
  try {
    const targetFormat = (req.body.format || req.query.format || 'svg').toLowerCase();
    const inputBuffer = req.file?.buffer || (req.body.image ? Buffer.from(req.body.image.replace(/^data:image\/\w+;base64,/, ''), 'base64') : null);

    if (!inputBuffer) {
      return res.status(400).json({ error: 'ছবি পাওয়া যায়নি।' });
    }

    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    if (targetFormat === 'svg') {
      const pngBuffer = await sharp(inputBuffer).png().toBuffer();
      const svgString = createEmbeddedSvg(pngBuffer, width, height);
      return res.json({
        success: true,
        svg: svgString,
        dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
      });
    }

    let transformer = sharp(inputBuffer);
    let mime = 'image/png';
    if (targetFormat === 'webp') {
      transformer = transformer.webp({ quality: 90 });
      mime = 'image/webp';
    } else if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
      transformer = transformer.jpeg({ quality: 90 });
      mime = 'image/jpeg';
    } else {
      transformer = transformer.png();
      mime = 'image/png';
    }

    const outputBuffer = await transformer.toBuffer();
    return res.json({
      success: true,
      dataUrl: `data:${mime};base64,${outputBuffer.toString('base64')}`,
      format: targetFormat
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

