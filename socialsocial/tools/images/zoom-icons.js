// Zoom PNG icons by 25% without changing canvas size (visually larger)
// Usage: node tools/images/zoom-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '../../');
const iconsDir = path.join(projectRoot, 'assets', 'icons');

const targets = [
  'gold-coin.png',
  'diamond.png',
  'streak-coin.png',
];

async function zoomImage(filePath, scale = 1.25) {
  const img = sharp(filePath);
  const meta = await img.metadata();
  const { width, height } = meta;
  if (!width || !height) {
    throw new Error(`Missing metadata for ${filePath}`);
  }

  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Enlarge then crop center back to original size
  const left = Math.max(0, Math.round((newWidth - width) / 2));
  const top = Math.max(0, Math.round((newHeight - height) / 2));

  const tmpPath = filePath + '.tmp';

  await sharp(filePath)
    .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
    .extract({ left, top, width, height })
    .toFile(tmpPath);

  // Replace original
  await fs.promises.rename(tmpPath, filePath);
}

(async () => {
  for (const name of targets) {
    const filePath = path.join(iconsDir, name);
    if (!fs.existsSync(filePath)) {
      console.warn(`[skip] ${name} not found in assets/icons`);
      continue;
    }
    try {
      console.log(`[zoom] Processing ${name} ...`);
      await zoomImage(filePath, 1.25);
      console.log(`[done] ${name}`);
    } catch (err) {
      console.error(`[error] ${name}:`, err.message);
      process.exitCode = 1;
    }
  }
})();


