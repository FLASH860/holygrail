import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { SectionCanvas } from '@/three/SectionCanvas'
import { useProgress, useReveal } from '@/lib/scroll'
import { brand, flavours } from '@/config/site'
import { sfx } from '@/lib/sound'

const CansScene = lazy(() => import('./CansScene'))
const N = flavours.length

export function Cans() {
  const track = useRef<HTMLElement>(null)
  const progress = useProgress(track, { start: 'top bottom', end: 'bottom bottom' })
  const [active, setActive] = useState(2)
  const [focused, setFocused] = useState(false)
  useReveal(track)

  const cycle = useCallback((dir: number) => {
    sfx.tick()
    setActive((a) => (a + dir + N) % N)
  }, [])
  const select = useCallback((i: number) => setActive(i), [])
  const focus = useCallback(() => setFocused(true), [])

  // leave focus mode when the section scrolls away, or on Escape
  useEffect(() => {
    if (!focused) return
    const el = track.current!
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setFocused(false), { threshold: 0.2 })
    io.observe(el)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setFocused(false)
    window.addEventListener('keydown', key)
    return () => {
      io.disconnect()
      window.removeEventListener('keydown', key)
    }
  }, [focused])

  const f = flavours[active]
  return (
    <section className={`track cans ${focused ? 'is-focused' : ''}`} ref={track} style={{ height: '180vh', ['--glow' as string]: f.glow, ['--deep' as string]: f.deep }}>
      <div className="stage">
        <SectionCanvas camera={{ position: [0, 0.75, 8.4], fov: 30 }} exposure={1.1}>
          <CansScene active={active} focused={focused} progress={progress} onSelect={select} onFocus={focus} onCycle={cycle} />
        </SectionCanvas>

        <div className="overlay cans-overlay">
          <div className="cans-head">
            <p className="caps eyebrow" data-reveal>
              Object 02 — The Can
            </p>
            <p className="cans-brand" data-reveal aria-label={brand.name}>
              {brand.name}
            </p>
            <p className="caps muted" data-reveal>
              {brand.tagline} — an invented brand
            </p>
          </div>

          <div className="cans-nav">
            <button className="cans-arrow" onClick={() => cycle(-1)} aria-label="Previous flavour" data-cursor="Prev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <div className="cans-name" key={f.id}>
              <span className="caps num muted">
                {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
              </span>
              <span className="cans-flavour serif">{f.name}</span>
            </div>
            <button className="cans-arrow" onClick={() => cycle(1)} aria-label="Next flavour" data-cursor="Next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <aside className="cans-panel" aria-hidden={!focused}>
            <p className="caps" style={{ color: f.glow }}>
              {brand.name} — {String(active + 1).padStart(2, '0')}
            </p>
            <h3 className="display">{f.name}</h3>
            <p className="cans-notes caps">{f.notes}</p>
            <p className="lede">{f.text}</p>
            <dl className="cans-spec">
              <div>
                <dt className="caps">Caffeine</dt>
                <dd className="serif num">{f.caffeine}</dd>
              </div>
              <div>
                <dt className="caps">Volume</dt>
                <dd className="serif num">250 ml</dd>
              </div>
              <div>
                <dt className="caps">Sugar</dt>
                <dd className="serif num">0 g</dd>
              </div>
            </dl>
            <button
              className="pill caps"
              tabIndex={focused ? 0 : -1}
              onClick={() => {
                sfx.click()
                setFocused(false)
              }}
            >
              Back to the shelf
            </button>
          </aside>

          <ul className="hints caps">
            <li>{focused ? 'Drag — spin the can' : 'Drag or arrows — cycle'}</li>
            <li>{focused ? 'Esc — back' : 'Click the centre can — open'}</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
