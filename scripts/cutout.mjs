// Cuts the subject out of each raw photo in assets/me → scripts/.cache/cutout-N.png
// Local stand-in for Higgsfield remove_background (account had no credits — see NOTES.md).
// Usage: node scripts/cutout.mjs
import { removeBackground } from '@imgly/background-removal-node'
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets', 'me')
const out = path.join(root, 'scripts', '.cache')
await mkdir(out, { recursive: true })

const files = (await readdir(src)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
let i = 0
for (const f of files) {
  i++
  const buf = await readFile(path.join(src, f))
  const blob = new Blob([buf], { type: 'image/jpeg' })
  const res = await removeBackground(blob, { model: 'medium', output: { format: 'image/png', quality: 1 } })
  const target = path.join(out, `cutout-${i}.png`)
  await writeFile(target, Buffer.from(await res.arrayBuffer()))
  console.log(f, '→', path.relative(root, target))
}
