import sharp from 'sharp'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const SRC = path.resolve(process.cwd(), 'public/icons/icon.svg')
const OUT = path.resolve(process.cwd(), 'public/icons')

const sizes: { name: string; size: number; padding?: number; background?: string }[] = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  // Maskable: add a safe zone padding so the icon survives circular/square masks.
  { name: 'icon-maskable-192.png', size: 192, padding: 0.18, background: '#4F46E5' },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.18, background: '#4F46E5' },
  { name: 'apple-touch-icon.png', size: 180, padding: 0.08, background: '#4F46E5' },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
]

async function main() {
  const svg = await fs.readFile(SRC)
  for (const s of sizes) {
    let img = sharp(svg).resize(s.size, s.size)
    if (s.padding) {
      const inner = Math.round(s.size * (1 - s.padding * 2))
      const pad = Math.round((s.size - inner) / 2)
      img = sharp({
        create: {
          width: s.size,
          height: s.size,
          channels: 4,
          background: s.background || '#000000',
        },
      })
        .composite([
          {
            input: await sharp(svg).resize(inner, inner).png().toBuffer(),
            top: pad,
            left: pad,
          },
        ])
        .png()
    } else {
      img = img.png()
    }
    const buf = await img.toBuffer()
    await fs.writeFile(path.join(OUT, s.name), buf)
    console.log(`Generated ${s.name} (${s.size}x${s.size})`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
