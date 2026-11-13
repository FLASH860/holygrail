import { lazy, useRef, useState } from 'react'
import { SectionCanvas } from '@/three/SectionCanvas'
import { useProgress, useReveal } from '@/lib/scroll'
import { sfx } from '@/lib/sound'

const SneakerScene = lazy(() => import('./SneakerScene'))

// order matches the variants baked into the model
const WAYS = [
  { name: 'Midnight', swatch: 'linear-gradient(135deg,#1b2238 50%,#3b4a7a 50%)' },
  { name: 'Beach', swatch: 'linear-gradient(135deg,#e6b9b4 50%,#f4f1ec 50%)' },
  { name: 'Street', swatch: 'linear-gradient(135deg,#232221 50%,#f0605f 50%)' },
]
const SIZES = [7, 8, 9, 10, 11]

export function Sneaker() {
  const track = useRef<HTMLElement>(null)
  const progress = useProgress(track)
  const [variant, setVariant] = useState(0)
  const [size, setSize] = useState(9)
  useReveal(track)

  return (
    <section className="track sneaker" ref={track} style={{ height: '320vh' }}>
      <div className="stage">
        <SectionCanvas camera={{ position: [0, 0, 9], fov: 30 }} exposure={1.05}>
          <SneakerScene progress={progress} variant={variant} size={size} word="STRIDE" />
        </SectionCanvas>
        <div className="overlay sneaker-overlay">
          <p className="caps eyebrow sneaker-eyebrow" data-reveal>
            Object 03 — The Sneaker
          </p>
          <div className="sneaker-panel">
            <div data-reveal>
              <h2 className="sneaker-title">
                Runner <span className="serif">K/1</span>
              </h2>
              <p className="lede">The shoe passes through the word, not over it. Depth is the layout.</p>
            </div>
            <div className="sneaker-ctl" data-reveal>
              <p className="caps muted">
                Colourway — <span style={{ color: 'var(--fg)' }}>{WAYS[variant].name}</span>
              </p>
              <div className="swatches" role="radiogroup" aria-label="Colourway">
                {WAYS.map((w, i) => (
                  <button
                    key={w.name}
                    role="radio"
                    aria-checked={variant === i}
                    aria-label={w.name}
                    className="swatch"
                    style={{ background: w.swatch }}
                    onClick={() => {
                      sfx.click()
                      setVariant(i)
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="sneaker-ctl" data-reveal>
              <p className="caps muted">
                Size — <span style={{ color: 'var(--fg)' }}>UK {size}</span>
              </p>
              <div className="sizes" role="radiogroup" aria-label="Size">
                {SIZES.map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={size === n}
                    className="size num"
                    onClick={() => {
                      sfx.tick()
                      setSize(n)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ul className="hints caps">
            <li>Scroll — travel</li>
            <li>Drag — spin</li>
            <li>Swatches — swap material</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
