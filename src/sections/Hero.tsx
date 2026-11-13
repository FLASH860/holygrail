import { lazy, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SectionCanvas } from '@/three/SectionCanvas'
import { useProgress } from '@/lib/scroll'
import { useStore } from '@/lib/store'
import { site } from '@/config/site'
import { media } from '@/config/media'

const HeroScene = lazy(() => import('./HeroScene'))

export function Hero() {
  const track = useRef<HTMLElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const progress = useProgress(track)
  const ready = useStore((s) => s.ready)

  useEffect(() => {
    if (!ready || !overlay.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-hero-in]', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.9, ease: 'expo.out', stagger: 0.14, delay: 0.9 })
      gsap.to('.hero-fade', { opacity: 0, y: -30, ease: 'none', scrollTrigger: { trigger: track.current, start: 'top top', end: '45% bottom', scrub: true } })
      gsap.fromTo('.hero-end', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: track.current, start: '55% bottom', end: 'bottom bottom', scrub: true } })
    }, overlay)
    return () => ctx.revert()
  }, [ready])

  return (
    <section id="top" className="track hero" ref={track} style={{ height: '260vh' }}>
      <div className="stage">
        <SectionCanvas camera={{ position: [0, 0, 10], fov: 32, far: 200 }}>
          <HeroScene progress={progress} />
        </SectionCanvas>
        <div className="hero-vignette" aria-hidden />
        <div className="overlay hero-overlay" ref={overlay}>
          <h1 className="sr-only">{site.name}</h1>
          <div className="hero-top hero-fade">
            <p className="caps" data-hero-in>
              Portfolio — MMXXVI
            </p>
            <p className="caps" data-hero-in>
              {site.location}
            </p>
          </div>
          <div className="hero-bottom hero-fade">
            <div>
              <p className="hero-last serif" data-hero-in aria-hidden>
                <em>{site.last}</em>
              </p>
              <p className="hero-role" data-hero-in>
                {site.role}
              </p>
            </div>
            <div className="hero-scroll caps" data-hero-in>
              <span>Scroll</span>
              <i />
            </div>
          </div>
          <p className="hero-end serif">
            Every object here is built, <em>lit</em> and interactive.
          </p>
        </div>
        {/* keeps the portrait discoverable without WebGL / for crawlers */}
        <img className="sr-only" src={media.me.hero.src} alt={`Portrait of ${site.name}`} loading="lazy" />
      </div>
    </section>
  )
}

/* About — portrait as a stack of real depth layers that tilt with the cursor */
export function About() {
  const root = useRef<HTMLElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const touch = useStore((s) => s.touch)

  useEffect(() => {
    const el = root.current, c = card.current
    if (!el || !c) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.about-img', { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.fromTo('.about-plate', { yPercent: 40 }, { yPercent: -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.fromTo('.about-word', { xPercent: 8 }, { xPercent: -14, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      const items = el.querySelectorAll('[data-reveal]')
      gsap.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.6, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
    }, el)
    if (touch) return () => ctx.revert()
    const rx = gsap.quickTo(c, 'rotationX', { duration: 1.4, ease: 'expo.out' })
    const ry = gsap.quickTo(c, 'rotationY', { duration: 1.4, ease: 'expo.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ry(((e.clientX - r.left) / r.width - 0.5) * 16)
      rx(-((e.clientY - r.top) / r.height - 0.5) * 12)
    }
    el.addEventListener('pointermove', move)
    return () => {
      el.removeEventListener('pointermove', move)
      ctx.revert()
    }
  }, [touch])

  return (
    <section id="about" className="about" ref={root}>
      <div className="about-word serif" aria-hidden>
        Considered
      </div>
      <div className="about-grid">
        <div className="about-copy">
          <p className="caps eyebrow" data-reveal>
            About
          </p>
          <h2 className="display" data-reveal>
            I build things that feel <em>inevitable.</em>
          </h2>
          <p className="lede" data-reveal>
            I am {site.first} — a developer who designs, and a designer who ships. I care about the half-second after a click: the weight of a transition, the way light falls on an object, the
            quiet confidence of an interface that does not need to explain itself.
          </p>
          <p className="lede" data-reveal>
            This site is the proof of method. Nothing here is a video; every object is modelled, lit and running live in your browser.
          </p>
          <dl className="about-facts" data-reveal>
            <div>
              <dt className="caps">Focus</dt>
              <dd>Product engineering, interface design, WebGL</dd>
            </div>
            <div>
              <dt className="caps">Based</dt>
              <dd>{site.location}</dd>
            </div>
            <div>
              <dt className="caps">Status</dt>
              <dd>Open to select work</dd>
            </div>
          </dl>
        </div>
        <div className="about-stage">
          <div className="about-card" ref={card}>
            <div className="about-back" />
            <div className="about-ring" />
            <img className="about-img" src={media.me.about.src} width={media.me.about.width} height={media.me.about.height} alt={`${site.name}, portrait`} loading="lazy" draggable={false} />
            <div className="about-frame" />
            <div className="about-plate">
              <span className="caps">Kanishq Surendran</span>
              <span className="caps muted">N° 001 — Self</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
