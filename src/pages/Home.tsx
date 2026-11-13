import { navigate } from '@/lib/router'

export default function Home() {
  return (
    <>
      <section id="top" className="track" style={{ height: '160vh' }}>
        <div className="stage" style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="caps muted">Step 1 — skeleton</p>
            <h1 className="display">
              Kanishq <em>Surendran</em>
            </h1>
            <button className="pill caps" style={{ marginTop: 32 }} data-cursor="Open" onClick={() => navigate('/work/property-wallet')}>
              Test page transition
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
