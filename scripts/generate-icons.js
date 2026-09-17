import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * (isMaskable ? 0.38 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isMaskable) {
        // Full bleed background for maskable
        let bgR = 17, bgG = 24, bgB = 39; // #111827 Dark gray
        // Shield center
        if (dist <= r) {
          // Orange gradient
          const grad = y / height;
          const oR = Math.round(249 * (1 - grad * 0.3)); // #f97316 -> #ea580c
          const oG = Math.round(115 * (1 - grad * 0.4));
          const oB = Math.round(22 * (1 - grad * 0.4));

          // Inner ball circle
          const ballR = r * 0.55;
          if (dist <= ballR) {
            // Ball background white/cream
            const bDist = dist / ballR;
            const bVal = Math.round(255 - bDist * 30);
            // Draw ball pattern
            const isPattern = Math.abs(dx * dy) % 18 < 6 || dist < ballR * 0.25;
            if (isPattern && dist > ballR * 0.08) {
              rawData[pxOffset] = 20;
              rawData[pxOffset + 1] = 24;
              rawData[pxOffset + 2] = 33;
              rawData[pxOffset + 3] = 255;
            } else {
              rawData[pxOffset] = bVal;
              rawData[pxOffset + 1] = bVal;
              rawData[pxOffset + 2] = bVal;
              rawData[pxOffset + 3] = 255;
            }
          } else {
            rawData[pxOffset] = oR;
            rawData[pxOffset + 1] = oG;
            rawData[pxOffset + 2] = oB;
            rawData[pxOffset + 3] = 255;
          }
        } else {
          rawData[pxOffset] = bgR;
          rawData[pxOffset + 1] = bgG;
          rawData[pxOffset + 2] = bgB;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent or rounded shield
        if (dist <= r) {
          if (dist > r - 4) {
            // Gold border
            rawData[pxOffset] = 245;
            rawData[pxOffset + 1] = 158;
            rawData[pxOffset + 2] = 11;
            rawData[pxOffset + 3] = 255;
          } else {
            const grad = y / height;
            const oR = Math.round(249 * (1 - grad * 0.3));
            const oG = Math.round(115 * (1 - grad * 0.4));
            const oB = Math.round(22 * (1 - grad * 0.4));

            const ballR = r * 0.55;
            if (dist <= ballR) {
              const bDist = dist / ballR;
              const bVal = Math.round(255 - bDist * 30);
              const isPattern = Math.abs(dx * dy) % 18 < 6 || dist < ballR * 0.25;
              if (isPattern && dist > ballR * 0.08) {
                rawData[pxOffset] = 20;
                rawData[pxOffset + 1] = 24;
                rawData[pxOffset + 2] = 33;
                rawData[pxOffset + 3] = 255;
              } else {
                rawData[pxOffset] = bVal;
                rawData[pxOffset + 1] = bVal;
                rawData[pxOffset + 2] = bVal;
                rawData[pxOffset + 3] = 255;
              }
            } else {
              rawData[pxOffset] = oR;
              rawData[pxOffset + 1] = oG;
              rawData[pxOffset + 2] = oB;
              rawData[pxOffset + 3] = 255;
            }
          }
        } else {
          // Transparent
          rawData[pxOffset] = 0;
          rawData[pxOffset + 1] = 0;
          rawData[pxOffset + 2] = 0;
          rawData[pxOffset + 3] = 0;
        }
      }
    }
  }

  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate standard icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('PWA icons created successfully in public/');
