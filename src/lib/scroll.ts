import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, type RefObject } from 'react'
import { useStore } from './store'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function initScroll() {
  if (lenis) return lenis
  const reduced = useStore.getState().reduced
  lenis = new Lenis({
    duration: reduced ? 0.01 : 1.35,
    easing: (t) => 1 - Math.pow(1 - t, 4), // quart out — slow, weighted
    smoothWheel: !reduced,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.4,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export const getLenis = () => lenis
export const lockScroll = (lock: boolean) => (lock ? lenis?.stop() : lenis?.start())
export const scrollToEl = (target: string | HTMLElement, immediate = false) =>
  lenis?.scrollTo(target, { duration: immediate ? 0 : 2.2, immediate, easing: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2) })

/**
 * Scroll progress (0 → 1) of a tall section while its sticky stage is pinned.
 * Returned as a ref so WebGL can read it every frame without re-rendering React.
 */
export function useProgress(ref: RefObject<HTMLElement | null>, opts?: { start?: string; end?: string }) {
  const progress = useRef(0)
  useEffect(() => {
    if (!ref.current) return
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: opts?.start ?? 'top top',
      end: opts?.end ?? 'bottom bottom',
      onUpdate: (self) => (progress.current = self.progress),
    })
    progress.current = st.progress
    return () => st.kill()
  }, [ref, opts?.start, opts?.end])
  return progress
}

/** Fades/slides in children marked [data-reveal] when the element scrolls into view. */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!items.length) return
    if (useStore.getState().reduced) return
    const ctx = gsap.context(() => {
      gsap.set(items, { y: 36, opacity: 0 })
      ScrollTrigger.batch(items, {
        start: 'top 86%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.5, ease: 'expo.out', stagger: 0.12 }),
      })
    }, el)
    return () => ctx.revert()
  }, [ref])
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** Remap v from [a,b] to 0..1, clamped. */
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
export const easeInOut = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
/** Frame-rate independent damping. */
export const damp = (current: number, target: number, lambda: number, dt: number) => current + (target - current) * (1 - Math.exp(-lambda * dt))
