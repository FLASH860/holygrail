import { flushSync } from 'react-dom'
import { useStore, type Theme } from './store'

/**
 * Ink-bleed theme transition.
 *
 * A WebGL noise shader renders an expanding ink blot (thresholded fractal noise, centred on the
 * toggle button) into a sprite sheet of FRAMES steps. The View Transitions API then snapshots the
 * old theme, and the live new theme is revealed through that sheet used as a CSS mask, stepped
 * frame by frame — so real DOM text and every WebGL canvas change theme along an organic,
 * soaking edge that spreads outward from the button.
 */
const COLS = 8, ROWS = 8, FRAMES = COLS * ROWS
const FW = 384, FH = 216

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uGrid; uniform vec2 uOrigin; uniform float uAspect; uniform float uSeed;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<6;i++){ v += a*noise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }
void main(){
  vec2 g = vUv * uGrid;
  vec2 cell = floor(g);
  vec2 uv = fract(g);
  uv.y = 1.0 - uv.y;                                  // frame-local, top-left origin like CSS
  float frame = cell.x + (uGrid.y - 1.0 - cell.y) * uGrid.x;
  float t = frame / (uGrid.x * uGrid.y - 1.0);
  vec2 p = (uv - uOrigin) * vec2(uAspect, 1.0);
  float d = length(p);
  float ang = atan(p.y, p.x);
  // paper fibre: coarse blotches + fine feathering, static in space so the edge "soaks" into it
  float n = fbm(p * 2.6 + uSeed) * 0.62 + fbm(p * 9.0 - uSeed) * 0.26 + fbm(vec2(ang * 2.5, d * 1.5) + uSeed) * 0.22;
  float reach = length(vec2(max(uOrigin.x, 1.0 - uOrigin.x) * uAspect, max(uOrigin.y, 1.0 - uOrigin.y)));
  float eased = t * t * (3.0 - 2.0 * t);
  float radius = eased * (reach + 0.75);
  float edge = d + (n - 0.5) * (0.22 + 0.7 * eased);
  float a = smoothstep(radius, radius - 0.012, edge);
  // a second, wetter front running slightly ahead gives the darker rim of soaking ink
  a = max(a, 0.0);
  if (t <= 0.0) a = 0.0;
  if (t >= 1.0) a = 1.0;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`

let sheetUrl: string | null = null
let building: Promise<void> | null = null
let origin = { x: 0.9, y: 0.05 }

function render(): Promise<string> {
  const c = document.createElement('canvas')
  c.width = COLS * FW
  c.height = ROWS * FH
  const gl = c.getContext('webgl', { premultipliedAlpha: false, alpha: true, preserveDrawingBuffer: true })!
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }'))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.bindAttribLocation(prog, 0, 'p')
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(gl.getUniformLocation(prog, 'uGrid'), COLS, ROWS)
  gl.uniform2f(gl.getUniformLocation(prog, 'uOrigin'), origin.x, origin.y)
  gl.uniform1f(gl.getUniformLocation(prog, 'uAspect'), window.innerWidth / window.innerHeight)
  gl.uniform1f(gl.getUniformLocation(prog, 'uSeed'), Math.random() * 40)
  gl.viewport(0, 0, c.width, c.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  return new Promise((resolve) =>
    c.toBlob((blob) => {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      resolve(URL.createObjectURL(blob!))
    }, 'image/png'),
  )
}

/** Pre-render the sheet for the toggle's current screen position (call on idle + resize). */
export function prepareInk(button?: HTMLElement | null) {
  if (button) {
    const r = button.getBoundingClientRect()
    origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
  }
  building = render().then(async (url) => {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => {})
    if (sheetUrl) URL.revokeObjectURL(sheetUrl)
    sheetUrl = url
    document.documentElement.style.setProperty('--ink-sheet', `url(${url})`)
    keepWarm(url)
  })
  return building
}

// An off-screen element using the sheet keeps it decoded so the first mask frame never flashes.
let warm: HTMLDivElement | null = null
function keepWarm(url: string) {
  if (!warm) {
    warm = document.createElement('div')
    warm.setAttribute('aria-hidden', 'true')
    warm.style.cssText = 'position:fixed;left:-10px;top:-10px;width:4px;height:4px;pointer-events:none;opacity:.01;background-size:100% 100%'
    document.body.appendChild(warm)
  }
  warm.style.backgroundImage = `url(${url})`
}

let running = false
export async function toggleTheme(button?: HTMLElement | null) {
  const { theme, setTheme, reduced } = useStore.getState()
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
  if (running) return
  if (!doc.startViewTransition || reduced) {
    setTheme(next)
    return
  }
  running = true
  try {
    if (!sheetUrl) await prepareInk(button)
    else await building
    document.documentElement.classList.add('ink-transition')
    const vt = doc.startViewTransition(() => flushSync(() => setTheme(next)))
    await vt.ready
    const frames: Keyframe[] = []
    for (let i = 0; i < FRAMES; i++) {
      const col = i % COLS, row = Math.floor(i / COLS)
      frames.push({ maskPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`, webkitMaskPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`, easing: 'step-end', offset: i / (FRAMES - 1) })
    }
    document.documentElement.animate(frames, { duration: 1900, easing: 'linear', fill: 'both', pseudoElement: '::view-transition-new(root)' })
    await vt.finished
  } catch {
    if (useStore.getState().theme !== next) setTheme(next)
  } finally {
    document.documentElement.classList.remove('ink-transition')
    running = false
    // fresh blot shape next time
    prepareInk(button)
  }
}
