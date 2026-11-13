import { lazy, useRef, useState } from 'react'
import { SectionCanvas } from '@/three/SectionCanvas'
import { useProgress, useReveal } from '@/lib/scroll'
import { sfx } from '@/lib/sound'

const HeadphonesScene = lazy(() => import('./HeadphonesScene'))

export function Headphones() {
  const track = useRef<HTMLElement>(null)
  const progress = useProgress(track)
  const [anc, setAnc] = useState(false)
  useReveal(track)

  return (
    <section className={`track phones ${anc ? 'is-anc' : ''}`} ref={track} style={{ height: '340vh' }}>
      <div className="stage">
        <div className="phones-glow" aria-hidden />
        <SectionCanvas camera={{ position: [0, 0, 9.5], fov: 30 }} exposure={1.05}>
          <HeadphonesScene progress={progress} anc={anc} />
        </SectionCanvas>
        <div className="overlay">
          <div className="phones-copy">
            <p className="caps eyebrow" data-reveal>
              Object 04 — The Headphones
            </p>
            <h2 className="display" data-reveal>
              {anc ? (
                <>
                  Now, <em>nothing.</em>
                </>
              ) : (
                <>
                  Built for <em>quiet.</em>
                </>
              )}
            </h2>
            <p className="lede" data-reveal>
              Cushion, driver, shell, plate, band. Scroll and they find each other. Open a cup to see what makes the sound — then switch the noise off.
            </p>
          </div>
          <div className="anc" data-reveal>
            <div>
              <p className="caps muted">Active noise cancelling</p>
              <p className="anc-state serif">{anc ? 'On' : 'Off'}</p>
            </div>
            <button
              className="anc-switch"
              role="switch"
              aria-checked={anc}
              aria-label="Toggle active noise cancelling"
              data-cursor={anc ? 'Off' : 'On'}
              onClick={() => {
                sfx.click()
                setAnc((a) => !a)
              }}
            >
              <span />
            </button>
          </div>
          <ul className="hints caps">
            <li>Scroll — assemble</li>
            <li>Drag — rotate</li>
            <li>Click a cup — reveal the driver</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
