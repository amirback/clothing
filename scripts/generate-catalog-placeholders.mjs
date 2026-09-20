/**
 * Generates placeholder garment images for the MVP catalog.
 *
 * These are flat silhouettes, not product photos: they make the whole flow
 * runnable out of the box, but the try-on model needs REAL photos to produce a
 * good result. Replace them before launch — see README, "Как заменить каталог".
 *
 * Raster PNG (not SVG) because try-on models only accept raster input.
 * Written with zlib only, so the repo needs no image dependency.
 *
 * Usage: node scripts/generate-catalog-placeholders.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SIZE = 768;
const OUT_DIR = path.join(process.cwd(), "public", "catalog");

/** ---------- tiny raster engine ---------- */

function createCanvas(size, background) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 3] = background[0];
    pixels[i * 3 + 1] = background[1];
    pixels[i * 3 + 2] = background[2];
  }
  return { size, pixels };
}

function setPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const offset = (y * canvas.size + x) * 3;
  canvas.pixels[offset] = color[0];
  canvas.pixels[offset + 1] = color[1];
  canvas.pixels[offset + 2] = color[2];
}

/** Scanline polygon fill (even-odd rule), with 2x vertical supersampling. */
function fillPolygon(canvas, points, color, shade) {
  const ys = points.map((p) => p[1]);
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const bottom = Math.min(canvas.size - 1, Math.ceil(Math.max(...ys)));

  for (let y = top; y <= bottom; y += 1) {
    const crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      const withinSpan = y + 0.5 >= Math.min(y1, y2) && y + 0.5 < Math.max(y1, y2);
      if (!withinSpan) continue;
      crossings.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.round(crossings[i]));
      const to = Math.min(canvas.size - 1, Math.round(crossings[i + 1]));
      for (let x = from; x <= to; x += 1) {
        // Soft left-to-right gradient so the shape reads as fabric, not a flat blob.
        const t = shade ? 0.88 + 0.12 * (1 - (x - from) / Math.max(1, to - from)) : 1;
        setPixel(canvas, x, y, [
          Math.round(color[0] * t),
          Math.round(color[1] * t),
          Math.round(color[2] * t),
        ]);
      }
    }
  }
}

function drawStripes(canvas, points, base, stripe, period) {
  fillPolygon(canvas, points, base, true);
  const ys = points.map((p) => p[1]);
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const bottom = Math.min(canvas.size - 1, Math.ceil(Math.max(...ys)));
  for (let y = top; y <= bottom; y += 1) {
    if (Math.floor(y / period) % 2 !== 0) continue;
    const crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (!(y + 0.5 >= Math.min(y1, y2) && y + 0.5 < Math.max(y1, y2))) continue;
      crossings.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      for (let x = Math.round(crossings[i]); x <= Math.round(crossings[i + 1]); x += 1) {
        setPixel(canvas, x, y, stripe);
      }
    }
  }
}

function drawDots(canvas, points, base, dot) {
  fillPolygon(canvas, points, base, true);
  const ys = points.map((p) => p[1]);
  const xs = points.map((p) => p[0]);
  for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y += 46) {
    for (let x = Math.floor(Math.min(...xs)); x < Math.ceil(Math.max(...xs)); x += 46) {
      if (!insidePolygon(points, x, y)) continue;
      for (let dy = -7; dy <= 7; dy += 1) {
        for (let dx = -7; dx <= 7; dx += 1) {
          if (dx * dx + dy * dy > 49) continue;
          if (!insidePolygon(points, x + dx, y + dy)) continue;
          setPixel(canvas, x + dx, y + dy, dot);
        }
      }
    }
  }
}

function insidePolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** ---------- PNG encoding ---------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(canvas) {
  const { size, pixels } = canvas;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ---------- garment silhouettes (coordinates in a 768x768 box) ---------- */

const tee = (sleeve = 1) => [
  [286, 150], [482, 150],
  [520, 168], [614, 250], [560 + 20 * sleeve, 330], [516, 268],
  [516, 620], [252, 620],
  [252, 268], [208 - 20 * sleeve, 330], [154, 250], [248, 168],
];

const longSleeve = [
  [286, 140], [482, 140],
  [524, 160], [628, 300], [640, 470], [564, 486], [520, 330],
  [520, 640], [248, 640],
  [248, 330], [204, 486], [128, 470], [140, 300], [244, 160],
];

const hoodie = [
  [300, 150], [468, 150],
  [520, 176], [624, 316], [636, 470], [560, 486], [520, 344],
  [520, 634], [248, 634],
  [248, 344], [208, 486], [132, 470], [144, 316], [248, 176],
];

const dress = [
  [300, 146], [468, 146],
  [512, 168], [596, 250], [548, 320], [508, 268],
  [560, 660], [208, 660],
  [260, 268], [220, 320], [172, 250], [256, 168],
];

const jeans = [
  [268, 150], [500, 150],
  [512, 300], [520, 640], [420, 640], [396, 380],
  [372, 640], [272, 640], [260, 300],
];

const shorts = [
  [272, 200], [496, 200],
  [508, 300], [512, 468], [412, 468], [384, 356],
  [356, 468], [256, 468], [260, 300],
];

const skirt = [
  [296, 196], [472, 196],
  [520, 300], [568, 560], [200, 560], [248, 300],
];

const WHITE_BG = [248, 248, 249];

const ITEMS = [
  { file: "tee-white.png", shape: tee(), color: [242, 242, 244] },
  { file: "tee-black.png", shape: tee(), color: [38, 38, 42] },
  { file: "tee-stripe.png", shape: tee(), color: [238, 240, 245], pattern: "stripes", accent: [42, 72, 148] },
  { file: "shirt-blue.png", shape: longSleeve, color: [148, 188, 226] },
  { file: "hoodie-grey.png", shape: hoodie, color: [148, 150, 156] },
  { file: "hoodie-olive.png", shape: hoodie, color: [104, 112, 78] },
  { file: "sweater-cream.png", shape: longSleeve, color: [232, 220, 196] },
  { file: "jacket-denim.png", shape: longSleeve, color: [74, 106, 148] },
  { file: "jeans-blue.png", shape: jeans, color: [62, 92, 138] },
  { file: "jeans-black.png", shape: jeans, color: [44, 44, 48] },
  { file: "shorts-beige.png", shape: shorts, color: [214, 196, 164] },
  { file: "skirt-black.png", shape: skirt, color: [40, 40, 44] },
  { file: "dress-red.png", shape: dress, color: [176, 52, 58] },
  { file: "dress-floral.png", shape: dress, color: [236, 228, 236], pattern: "dots", accent: [188, 96, 124] },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const item of ITEMS) {
  const canvas = createCanvas(SIZE, WHITE_BG);
  if (item.pattern === "stripes") {
    drawStripes(canvas, item.shape, item.color, item.accent, 26);
  } else if (item.pattern === "dots") {
    drawDots(canvas, item.shape, item.color, item.accent);
  } else {
    fillPolygon(canvas, item.shape, item.color, true);
  }
  writeFileSync(path.join(OUT_DIR, item.file), encodePng(canvas));
  console.log(`generated ${item.file}`);
}

console.log(`\n${ITEMS.length} placeholder images -> public/catalog/`);
