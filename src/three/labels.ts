import * as THREE from 'three'
import { brand, type Flavour, type Project } from '@/config/site'

const SANS = '"Archivo Variable", "Helvetica Neue", Arial, sans-serif'
const SERIF = '"Bodoni Moda Variable", Didot, Georgia, serif'

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.wrapS = THREE.RepeatWrapping
  return t
}

const spaced = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) => {
  // canvas letter-spacing is not universal — place glyphs by hand
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + tracking
  }
  return cx - x
}
const spacedWidth = (ctx: CanvasRenderingContext2D, text: string, tracking: number) => [...text].reduce((w, ch) => w + ctx.measureText(ch).width + tracking, 0)

/** Wrap-around can label for the made-up brand. u = around the can, v = up the can. */
export function canLabel(f: Flavour) {
  const W = 2048, H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  // body colour: deep at the base lifting into the flavour tone, matte-metal feel
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, f.mid)
  g.addColorStop(0.55, f.deep)
  g.addColorStop(1, '#070606')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // soft vertical sheen bands that read as brushed aluminium under print
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * W
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.018})`
    ctx.fillRect(x, 0, 2 + Math.random() * 26, H)
  }

  // wordmark, running up the can — front (centre of the texture)
  ctx.save()
  ctx.translate(W * 0.5, H * 0.5)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#f4efe6'
  ctx.textBaseline = 'middle'
  ctx.font = `900 330px ${SANS}`
  const tw = spacedWidth(ctx, brand.name, -6)
  spaced(ctx, brand.name, -tw / 2, 10, -6)
  ctx.restore()

  // glow-coloured hairlines framing the wordmark
  ctx.fillStyle = f.glow
  ctx.fillRect(W * 0.5 - 250, H * 0.08, 2, H * 0.84)
  ctx.fillRect(W * 0.5 + 250, H * 0.08, 2, H * 0.84)

  // flavour block, right of the wordmark
  ctx.fillStyle = '#f4efe6'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `italic 400 92px ${SERIF}`
  const [a, b] = f.name.split(' ')
  ctx.fillText(a, W * 0.5 + 300, H * 0.36)
  ctx.fillText(b ?? '', W * 0.5 + 300, H * 0.36 + 96)
  ctx.font = `500 25px ${SANS}`
  ctx.fillStyle = f.glow
  spaced(ctx, f.notes.toUpperCase(), W * 0.5 + 302, H * 0.36 + 170, 5)
  ctx.fillStyle = 'rgba(244,239,230,.7)'
  spaced(ctx, 'STILL ENERGY · 250 ML', W * 0.5 + 302, H * 0.86, 6)

  // left of the wordmark: quiet spec column
  ctx.font = `500 25px ${SANS}`
  ctx.fillStyle = 'rgba(244,239,230,.7)'
  const col = W * 0.5 - 640
  spaced(ctx, 'NATURAL CAFFEINE', col, H * 0.3, 6)
  ctx.font = `400 120px ${SERIF}`
  ctx.fillStyle = '#f4efe6'
  ctx.fillText(f.caffeine.replace(' mg', ''), col, H * 0.3 + 130)
  ctx.font = `500 25px ${SANS}`
  ctx.fillStyle = f.glow
  spaced(ctx, 'MG PER CAN', col, H * 0.3 + 176, 6)
  ctx.fillStyle = 'rgba(244,239,230,.7)'
  spaced(ctx, 'COLD-BREWED BOTANICALS', col, H * 0.86, 6)

  // back of the can (texture seam): small seal
  ctx.strokeStyle = 'rgba(244,239,230,.5)'
  ctx.lineWidth = 2
  for (const x of [70, W - 70]) {
    ctx.beginPath()
    ctx.arc(x, H * 0.5, 44, 0, Math.PI * 2)
    ctx.stroke()
  }
  // top & bottom rule
  ctx.fillStyle = f.glow
  ctx.fillRect(0, 26, W, 3)
  ctx.fillRect(0, H - 29, W, 3)
  return finish(c)
}

/** Cover art for a project: used on the console screen, the gallery cards and case-study headers. */
export function drawCover(ctx: CanvasRenderingContext2D, p: Project, W: number, H: number, t = 0) {
  const [deep, mid, hi] = p.palette
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, deep)
  g.addColorStop(1, mid)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // slow drifting light — the only motion on the cover
  const cx = W * (0.68 + Math.sin(t * 0.35) * 0.06), cy = H * (0.34 + Math.cos(t * 0.27) * 0.05)
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.62)
  rg.addColorStop(0, hi + 'cc')
  rg.addColorStop(0.35, hi + '33')
  rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)

  // fine concentric arcs
  ctx.strokeStyle = hi + '55'
  ctx.lineWidth = Math.max(1, W / 900)
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy, (Math.max(W, H) * 0.11 * i) + Math.sin(t * 0.5 + i) * W * 0.004, Math.PI * 0.55, Math.PI * 1.65)
    ctx.stroke()
  }

  const u = W / 100
  ctx.fillStyle = hi
  ctx.textBaseline = 'alphabetic'
  ctx.font = `500 ${u * 1.5}px ${SANS}`
  spaced(ctx, `${p.index} — ${p.kind.toUpperCase()}`, u * 6, u * 8.5, u * 0.35)
  ctx.fillStyle = '#f6f0e4'
  ctx.font = `400 ${u * 10.5}px ${SERIF}`
  const words = p.title.split(' ')
  words.forEach((w, i) => ctx.fillText(w, u * 5.6, H - u * 9 - (words.length - 1 - i) * u * 10))
  ctx.font = `500 ${u * 1.5}px ${SANS}`
  ctx.fillStyle = hi
  const yr = p.year.toUpperCase()
  spaced(ctx, yr, W - u * 6 - spacedWidth(ctx, yr, u * 0.35), u * 8.5, u * 0.35)
}

export function coverTexture(p: Project, W = 1024, H = 640) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  drawCover(ctx, p, W, H, 0)
  const tex = finish(c)
  tex.wrapS = THREE.ClampToEdgeWrapping
  return { tex, ctx, canvas: c, redraw: (t: number) => (drawCover(ctx, p, W, H, t), (tex.needsUpdate = true)) }
}

export function coverDataUrl(p: Project, W = 1600, H = 1000) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  drawCover(c.getContext('2d')!, p, W, H, 0)
  return c.toDataURL('image/jpeg', 0.9)
}
