// Generates all favicon / PWA / apple-touch icons from the branded dove SVG.
// Run with: node scripts/gen-icons.mjs
//
// Output is fully self-contained vector -> raster, so the dove brand mark stays
// crisp at every size. favicon.ico is assembled manually (sharp can't write ICO)
// by wrapping a 32x32 PNG in a single-image ICO container.

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const appDir = join(root, "app");

const DOVE_PATH =
  "M22 4c-.4-.4-1-.4-1.4 0l-2.3 2.3-1.6-.5c-3.3-1-7 .1-9.2 2.8L4 13.4 2 14.7c-.3.2-.4.6-.2.9.1.2.4.3.6.3l3.5-.3.5 2.6c0 .3.3.5.5.5l.3-.1L9.8 17c2.6 1.4 5.8 1.4 8.3-.3 2.3-1.5 3.7-4 3.5-6.7l-.1-1.3 2-2c.4-.4.4-1 0-1.4l-1.5-1.3ZM15 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z";

// `rounded` = browser tab / app icons (rounded corners).
// `maskable` = Android adaptive icons: full-bleed background, smaller dove kept
//              inside the central safe zone.
function svg({ rounded, scale }) {
  const offset = (512 - 24 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6366F1"/>
      <stop offset="1" stop-color="#4338CA"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  <g transform="translate(${offset},${offset}) scale(${scale})" fill="#FFFFFF">
    <path d="${DOVE_PATH}"/>
  </g>
</svg>`;
}

const ROUNDED = Buffer.from(svg({ rounded: true, scale: 12.5 }));
const MASKABLE = Buffer.from(svg({ rounded: false, scale: 9 }));

const png = (svgBuf, size) =>
  sharp(svgBuf, { density: 384 }).resize(size, size).png().toBuffer();

// Wrap a PNG buffer in a minimal single-image ICO container.
function pngToIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // image size
  entry.writeUInt32LE(6 + 16, 12); // offset
  return Buffer.concat([header, entry, pngBuf]);
}

const targets = [
  { buf: ROUNDED, size: 16, out: join(iconsDir, "favicon-16.png") },
  { buf: ROUNDED, size: 32, out: join(iconsDir, "favicon-32.png") },
  { buf: ROUNDED, size: 180, out: join(iconsDir, "apple-touch-icon.png") },
  { buf: ROUNDED, size: 192, out: join(iconsDir, "icon-192.png") },
  { buf: ROUNDED, size: 512, out: join(iconsDir, "icon-512.png") },
  { buf: MASKABLE, size: 192, out: join(iconsDir, "icon-maskable-192.png") },
  { buf: MASKABLE, size: 512, out: join(iconsDir, "icon-maskable-512.png") },
];

for (const t of targets) {
  await writeFile(t.out, await png(t.buf, t.size));
  console.log("wrote", t.out);
}

const ico = pngToIco(await png(ROUNDED, 32), 32);
await writeFile(join(appDir, "favicon.ico"), ico);
console.log("wrote", join(appDir, "favicon.ico"));
