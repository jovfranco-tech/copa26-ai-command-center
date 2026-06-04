import { writeFileSync, mkdirSync, existsSync } from 'fs';

/**
 * Generate minimal PNG icons for PWA installability.
 * These produce valid PNGs with a gold circle on dark background.
 * For production, replace with properly designed icons from the SVG source.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

function createMinimalPNG(size) {
  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Create image data: gold circle on dark background
  const rowSize = 1 + width * 3; // filter byte + RGB per pixel
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 3;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < radius) {
        // Gold color #c9a24b
        rawData[px] = 0xc9;
        rawData[px + 1] = 0xa2;
        rawData[px + 2] = 0x4b;
      } else {
        // Dark background #080c14
        rawData[px] = 0x08;
        rawData[px + 1] = 0x0c;
        rawData[px + 2] = 0x14;
      }
    }
  }

  // Compress with deflate store (no compression, valid zlib stream)
  const deflated = deflateStore(rawData);
  const idat = createChunk('IDAT', deflated);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcVal = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([length, typeAndData, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deflateStore(data) {
  const MAX_BLOCK = 65535;
  const blocks = [];
  // zlib header (CM=8, CINFO=7, FCHECK adjusted)
  blocks.push(Buffer.from([0x78, 0x01]));

  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, MAX_BLOCK);
    const isLast = offset + blockSize >= data.length;

    const header = Buffer.alloc(5);
    header[0] = isLast ? 0x01 : 0x00;
    header.writeUInt16LE(blockSize, 1);
    header.writeUInt16LE(blockSize ^ 0xffff, 3);

    blocks.push(header);
    blocks.push(data.subarray(offset, offset + blockSize));
    offset += blockSize;
  }

  // Adler-32 checksum
  let a = 1,
    b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler[0] = (b >> 8) & 0xff;
  adler[1] = b & 0xff;
  adler[2] = (a >> 8) & 0xff;
  adler[3] = a & 0xff;
  blocks.push(adler);

  return Buffer.concat(blocks);
}

// --- Main ---
const dir = 'apps/web/static/brand';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const icon192 = createMinimalPNG(192);
const icon512 = createMinimalPNG(512);

writeFileSync(`${dir}/icon-192x192.png`, icon192);
writeFileSync(`${dir}/icon-512x512.png`, icon512);

// Maskable icon (same design; for production, add extra padding for safe zone)
writeFileSync(`${dir}/icon-maskable-512x512.png`, icon512);

console.log('[generate-pwa-icons] Created:');
console.log('  - apps/web/static/brand/icon-192x192.png');
console.log('  - apps/web/static/brand/icon-512x512.png');
console.log('  - apps/web/static/brand/icon-maskable-512x512.png');
