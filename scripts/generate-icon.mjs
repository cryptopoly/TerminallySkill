/**
 * Generate PNG app icon from the SVG source.
 * Produces build/icon.png (1024x1024) for electron-builder.
 *
 * Usage: node scripts/generate-icon.mjs
 */
import sharp from 'sharp'
import { mkdirSync, readFileSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svgPath = resolve(root, 'build/icon.svg')
const pngPath = resolve(root, 'build/icon.png')
const linuxIconDir = resolve(root, 'build/icons')
const linuxIconSizes = [16, 24, 32, 48, 64, 128, 256, 512]

const svg = readFileSync(svgPath)

await sharp(svg)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath)

rmSync(linuxIconDir, { recursive: true, force: true })
mkdirSync(linuxIconDir, { recursive: true })

await Promise.all(
  linuxIconSizes.map((size) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(resolve(linuxIconDir, `${size}x${size}.png`))
  )
)

console.log(`Generated ${pngPath} (1024x1024)`)
console.log(`Generated Linux icon set in ${linuxIconDir}`)
