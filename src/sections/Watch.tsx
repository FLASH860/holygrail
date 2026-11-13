import { lazy, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SectionCanvas } from '@/three/SectionCanvas'
import { useProgress, useReveal } from '@/lib/scroll'

const WatchScene = lazy(() => import('./WatchScene'))

export function Watch() {
  const track = useRef<HTMLElement>(null)
  const progress = useProgress(track)
  useReveal(track)
  useEffect(() => {
    const ctx = gsap.context(() => {
      // the copy steps aside while the movement comes apart
      gsap.to('.watch-copy', { opacity: 0, x: -40, ease: 'none', scrollTrigger: { trigger: track.current, start: '8% top', end: '24% top', scrub: true } })
      gsap.fromTo('.watch-outro', { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: track.current, start: '78% bottom', end: '92% bottom', scrub: true } })
    }, track)
    return () => ctx.revert()
  }, [])

  return (
    <section id="objects" className="track watch" ref={track} style={{ height: '420vh' }}>
      <div className="stage">
        <div className="watch-glow" aria-hidden />
        <SectionCanvas camera={{ position: [0, 0, 11], fov: 30 }} exposure={1.05}>
          <WatchScene progress={progress} />
        </SectionCanvas>
        <div className="overlay watch-overlay">
          <div className="watch-copy">
            <p className="caps eyebrow" data-reveal>
              Object 01 — The Watch
            </p>
            <h2 className="display" data-reveal>
              Calibre <em>K·01</em>
            </h2>
            <p className="lede" data-reveal>
              One hundred and forty parts would be honest. Nine are enough to show how I think: every layer has a job, and nothing hides behind the dial. It keeps my time — Indian Standard.
            </p>
          </div>
          <p className="watch-outro serif">
            Nine layers. <em>One job each.</em>
          </p>
          <ul className="hints caps" data-reveal>
            <li>Scroll — disassemble</li>
            <li>Drag — rotate</li>
            <li>Hover — isolate a part</li>
            <li>Click the crown — wind</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
