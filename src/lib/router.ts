import gsap from 'gsap'
import { flushSync } from 'react-dom'
import { useStore, type Route } from './store'
import { lockScroll } from './scroll'
import { sfx } from './sound'

/**
 * Two "pages": the home scroll and a case-study panel.
 * Porsche-style transition — the incoming page emerges from the centre of the screen as a
 * 3D panel and expands to fill it, while the outgoing page recedes in depth and darkens.
 */
const parse = (path: string): Route => {
  const m = path.match(/^\/work\/([\w-]+)\/?$/)
  return m ? { name: 'case', slug: m[1] } : { name: 'home' }
}

let busy = false
const q = (id: string) => document.getElementById(id)!
const DUR = () => (useStore.getState().reduced ? 0.01 : 1.5)

function recede(el: HTMLElement, originY: number) {
  gsap.set(el, { transformOrigin: `50% ${originY}px`, willChange: 'transform' })
  return gsap.to(el, { scale: 0.86, duration: DUR(), ease: 'expo.inOut' })
}

async function openCase(route: Route & { name: 'case' }, animate: boolean) {
  const home = q('home'), panel = q('panel'), dim = q('dim')
  lockScroll(true)
  flushSync(() => useStore.getState().setRoute(route))
  panel.scrollTop = 0
  gsap.set(panel, { display: 'block' })
  if (!animate) {
    gsap.set(panel, { scale: 1, opacity: 1, rotateX: 0, borderRadius: 0 })
    gsap.set(dim, { opacity: 0.8, display: 'block' })
    return
  }
  sfx.soft()
  gsap.set(dim, { display: 'block' })
  gsap.to(dim, { opacity: 0.8, duration: DUR(), ease: 'expo.inOut' })
  recede(home, window.scrollY + window.innerHeight / 2)
  gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: DUR() * 0.35, ease: 'power2.out' })
  await gsap.fromTo(
    panel,
    { scale: 0.16, rotateX: 14, y: 40, borderRadius: 28, transformPerspective: 1600 },
    { scale: 1, rotateX: 0, y: 0, borderRadius: 0, duration: DUR(), ease: 'expo.inOut' },
  )
  gsap.set(panel, { clearProps: 'transform,borderRadius' })
}

async function closeCase(animate: boolean) {
  const home = q('home'), panel = q('panel'), dim = q('dim')
  if (animate) {
    sfx.soft()
    gsap.to(dim, { opacity: 0, duration: DUR(), ease: 'expo.inOut' })
    gsap.to(home, { scale: 1, duration: DUR(), ease: 'expo.inOut' })
    gsap.to(panel, { opacity: 0, duration: DUR() * 0.3, delay: DUR() * 0.7, ease: 'power2.in' })
    await gsap.to(panel, { scale: 0.16, rotateX: -14, y: 40, borderRadius: 28, transformPerspective: 1600, duration: DUR(), ease: 'expo.inOut' })
  }
  gsap.set(panel, { display: 'none', clearProps: 'transform,opacity,borderRadius' })
  gsap.set(dim, { display: 'none', opacity: 0 })
  gsap.set(home, { clearProps: 'transform,willChange,transformOrigin' })
  useStore.getState().setRoute({ name: 'home' })
  lockScroll(false)
}

/** Swap one case study for another: current panel recedes, the next emerges from centre. */
async function swapCase(route: Route & { name: 'case' }) {
  const panel = q('panel')
  await gsap.to(panel, { scale: 0.86, opacity: 0, duration: DUR() * 0.5, ease: 'expo.in' })
  flushSync(() => useStore.getState().setRoute(route))
  panel.scrollTop = 0
  gsap.to(panel, { opacity: 1, duration: DUR() * 0.35, ease: 'power2.out' })
  await gsap.fromTo(panel, { scale: 0.16, rotateX: 14, borderRadius: 28, transformPerspective: 1600 }, { scale: 1, rotateX: 0, borderRadius: 0, duration: DUR(), ease: 'expo.inOut' })
  gsap.set(panel, { clearProps: 'transform,borderRadius' })
}

async function go(route: Route, animate = true) {
  const cur = useStore.getState().route
  if (busy) return
  busy = true
  try {
    if (route.name === 'case' && cur.name === 'home') await openCase(route, animate)
    else if (route.name === 'case' && cur.name === 'case' && cur.slug !== route.slug) await swapCase(route)
    else if (route.name === 'home' && cur.name === 'case') await closeCase(animate)
  } finally {
    busy = false
  }
}

export function navigate(path: string) {
  if (busy) return
  if (path !== location.pathname) history.pushState({}, '', path)
  go(parse(path))
}

export function initRouter() {
  window.addEventListener('popstate', () => go(parse(location.pathname)))
  const initial = parse(location.pathname)
  if (initial.name === 'case') go(initial, false)
}
