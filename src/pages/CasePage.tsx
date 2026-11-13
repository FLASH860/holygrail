import { navigate } from '@/lib/router'
import { projects } from '@/config/site'

export default function CasePage({ slug }: { slug: string }) {
  const p = projects.find((x) => x.slug === slug) ?? projects[0]
  return (
    <article style={{ minHeight: '160vh', padding: '160px var(--pad)' }}>
      <button className="pill caps" onClick={() => navigate('/')}>Close</button>
      <h1 className="display" style={{ marginTop: 40 }}>{p.title}</h1>
      <p className="lede" style={{ marginTop: 24 }}>{p.summary}</p>
    </article>
  )
}
