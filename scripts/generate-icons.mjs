import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

await mkdir('public/icons', { recursive: true })

await sharp('public/icons/icon.svg').resize(192, 192).png().toFile('public/icons/icon-192.png')

await sharp('public/icons/icon.svg').resize(512, 512).png().toFile('public/icons/icon-512.png')

await sharp('public/icons/maskable-icon.svg')
  .resize(512, 512)
  .png()
  .toFile('public/icons/maskable-icon-512.png')

console.log('PWA icons generated.')
