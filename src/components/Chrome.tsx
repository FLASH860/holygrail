import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useStore } from '@/lib/store'
import { prepareInk, toggleTheme } from '@/lib/ink'
import { sfx } from '@/lib/sound'
import { scrollToEl } from '@/lib/scroll'
import { navigate } from '@/lib/router'
import { site } from '@/config/site'

/* ───────── Preloader: fine serif counter 0→100, then a slow curtain ───────── */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const reduced = useStore.getState().reduced
    const state = { v: 0 }
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const tl = gsap.timeline()
    tl.to(state, {
      v: 100,
      duration: reduced ? 0.2 : 2.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (count.current) count.current.textContent = String(Math.round(state.v)).padStart(3, '0')
        if (bar.current) bar.current.style.transform = `scaleX(${state.v / 100})`
      },
    })
    tl.add(() => {
      tl.pause()
      fonts.then(() => tl.resume())
    })
    tl.to(count.current, { yPercent: -110, duration: reduced ? 0.01 : 0.9, ease: 'expo.in' }, '+=0.25')
    tl.add(() => useStore.getState().setReady())
    tl.to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0.01 : 1.7, ease: 'expo.inOut' }, '-=0.1')
    tl.add(() => setGone(true))
    return () => {
      tl.kill()
    }
  }, [])

  if (gone) return null
  return (
    <div className="preloader" ref={root} style={{ clipPath: 'inset(0 0 0% 0)' }} aria-hidden>
      <div className="preloader-inner">
        <div className="preloader-count">
          <span ref={count}>000</span>
        </div>
        <div className="preloader-line">
          <i ref={bar} />
        </div>
      </div>
      <div className="preloader-name caps">
        <span>{site.name}</span>
        <span>Portfolio — MMXXVI</span>
      </div>
    </div>
  )
}

/* ───────── Cursor: small dot that grows into a label over interactive things ───────── */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null)
  const label = useStore((s) => s.cursor)
  const touch = useStore((s) => s.touch)
  const [link, setLink] = useState(false)
  const [domLabel, setDomLabel] = useState('')

  useEffect(() => {
    if (touch || !root.current) return
    document.body.classList.add('has-cursor')
    const el = root.current
    const x = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'expo.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'expo.out' })
    const move = (e: PointerEvent) => {
      x(e.clientX)
      y(e.clientY)
      el.classList.remove('is-hidden')
    }
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      const c = t.closest?.('[data-cursor]') as HTMLElement | null
      setDomLabel(c?.dataset.cursor ?? '')
      setLink(!c && !!t.closest?.('a,button,[role="button"]'))
    }
    const down = () => el.classList.add('is-down')
    const up = () => el.classList.remove('is-down')
    const leave = () => el.classList.add('is-hidden')
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      document.body.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [touch])

  if (touch) return null
  const text = domLabel || label
  return (
    <div ref={root} className={`cursor is-hidden ${text ? 'has-label' : link ? 'is-link' : ''}`} aria-hidden>
      <div className="cursor-dot">
        <span>{text}</span>
      </div>
    </div>
  )
}

/* ───────── Nav: mark, anchors, sound toggle, neumorphic theme switch ───────── */
export function Nav() {
  const ready = useStore((s) => s.ready)
  const sound = useStore((s) => s.sound)
  const theme = useStore((s) => s.theme)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ready) return
    const prep = () => prepareInk(btn.current)
    const id = window.setTimeout(prep, 1200)
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(prep, 400)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(id)
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [ready])

  const jump = (id: string) => {
    sfx.tick()
    if (useStore.getState().route.name === 'case') {
      navigate('/')
      setTimeout(() => scrollToEl(id), 1600)
    } else scrollToEl(id)
  }

  return (
    <header className={`nav ${ready ? 'is-ready' : ''}`}>
      <button className="nav-mark" onClick={() => jump('#top')} aria-label="Back to top">
        Kanishq <i>S.</i>
      </button>
      <nav className="nav-links caps" aria-label="Sections">
        <button onClick={() => jump('#objects')}>Objects</button>
        <button onClick={() => jump('#work')}>Work</button>
        <button onClick={() => jump('#about')}>About</button>
        <button onClick={() => jump('#contact')}>Contact</button>
      </nav>
      <div className="nav-tools">
        <button
          className="sound-btn"
          aria-pressed={sound}
          aria-label={sound ? 'Turn interface sound off' : 'Turn interface sound on'}
          onClick={() => {
            useStore.getState().setSound(!sound)
            setTimeout(sfx.click, 10)
          }}
        >
          <span className="sound-bars">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="caps">Sound</span>
        </button>
        <button
          ref={btn}
          className="theme-toggle"
          role="switch"
          aria-checked={theme === 'light'}
          aria-label="Toggle light and dark theme"
          onClick={() => {
            sfx.click()
            toggleTheme(btn.current)
          }}
        >
          <span className="theme-knob">
            <svg className="moon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
            </svg>
            <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4.2" fill="currentColor" />
              <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
            </svg>
          </span>
        </button>
      </div>
    </header>
  )
}
