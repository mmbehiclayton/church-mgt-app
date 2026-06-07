// Generates all favicon / PWA / apple-touch icons from the dove logo.
// Run with: node scripts/gen-icons.mjs
//
// The source (public/dove.jpg) is an opaque white-background dove, so it is
// placed as a rounded white tile on the indigo brand square (matching the
// sidebar mark). favicon.ico is assembled manually (sharp can't write ICO) by
// wrapping a 32x32 PNG in a single-image ICO container.

import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const appDir = join(root, "app");
const LOGO = join(root, "public", "dove.jpg");

const INDIGO_TOP = "#6366F1";
const INDIGO_BOTTOM = "#4338CA";

const logoBuf = await readFile(LOGO);

function bgSvg(size, rounded) {
  const rx = rounded ? Math.round(size * 0.22) : 0;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${INDIGO_TOP}"/>
        <stop offset="1" stop-color="${INDIGO_BOTTOM}"/>
      </linearGradient></defs>
      <rect width="${size}" height="${size}" rx="${rx}" fill="url(#g)"/>
    </svg>`
  );
}

// Resize the dove tile and round its corners via a dest-in alpha mask.
async function roundedTile(tile) {
  const dove = await sharp(logoBuf).resize(tile, tile, { fit: "cover" }).png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}">
      <rect width="${tile}" height="${tile}" rx="${Math.round(tile * 0.18)}" fill="#fff"/>
    </svg>`
  );
  return sharp(dove).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

// `rounded` => browser/app icons (rounded square, tile at 62%).
// maskable   => Android adaptive icons (full-bleed bg, tile at 50% safe zone).
async function brandIcon(size, { rounded }) {
  const bg = await sharp(bgSvg(size, rounded)).png().toBuffer();
  const tile = await roundedTile(Math.round(size * (rounded ? 0.62 : 0.5)));
  return sharp(bg).composite([{ input: tile, gravity: "center" }]).png().toBuffer();
}

// Wrap a PNG buffer in a minimal single-image ICO container.
function pngToIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([header, entry, pngBuf]);
}

const targets = [
  { size: 16, rounded: true, out: join(iconsDir, "favicon-16.png") },
  { size: 32, rounded: true, out: join(iconsDir, "favicon-32.png") },
  { size: 180, rounded: true, out: join(iconsDir, "apple-touch-icon.png") },
  { size: 192, rounded: true, out: join(iconsDir, "icon-192.png") },
  { size: 512, rounded: true, out: join(iconsDir, "icon-512.png") },
  { size: 192, rounded: false, out: join(iconsDir, "icon-maskable-192.png") },
  { size: 512, rounded: false, out: join(iconsDir, "icon-maskable-512.png") },
];

for (const t of targets) {
  await writeFile(t.out, await brandIcon(t.size, { rounded: t.rounded }));
  console.log("wrote", t.out);
}

// Self-contained scalable favicon: indigo square + the dove tile embedded.
const dataUri = `data:image/jpeg;base64,${logoBuf.toString("base64")}`;
const tileW = Math.round(512 * 0.62);
const off = Math.round((512 - tileW) / 2);
const tileR = Math.round(tileW * 0.18);
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Church CMS dove logo">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${INDIGO_TOP}"/>
      <stop offset="1" stop-color="${INDIGO_BOTTOM}"/>
    </linearGradient>
    <clipPath id="tile"><rect x="${off}" y="${off}" width="${tileW}" height="${tileW}" rx="${tileR}"/></clipPath>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <image href="${dataUri}" x="${off}" y="${off}" width="${tileW}" height="${tileW}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tile)"/>
</svg>
`;
await writeFile(join(iconsDir, "icon.svg"), iconSvg);
console.log("wrote", join(iconsDir, "icon.svg"));

const ico = pngToIco(await brandIcon(32, { rounded: true }), 32);
await writeFile(join(appDir, "favicon.ico"), ico);
console.log("wrote", join(appDir, "favicon.ico"));
