import { useEffect } from 'react'
import { Cursor, Nav, Preloader } from '@/components/Chrome'
import { initScroll, lockScroll } from '@/lib/scroll'
import { initRouter } from '@/lib/router'
import { useStore } from '@/lib/store'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Home from '@/pages/Home'
import CasePage from '@/pages/CasePage'

export default function App() {
  const ready = useStore((s) => s.ready)
  const route = useStore((s) => s.route)

  useEffect(() => {
    initScroll()
    lockScroll(true)
    window.scrollTo(0, 0)
    initRouter()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (useStore.getState().route.name === 'home') lockScroll(false)
    ScrollTrigger.refresh()
  }, [ready])

  return (
    <>
      <Preloader />
      <Nav />
      <main id="home">
        <Home />
      </main>
      <div id="dim" />
      <div id="panel" data-lenis-prevent>
        {route.name === 'case' && <CasePage slug={route.slug} key={route.slug} />}
      </div>
      <div className="grain" aria-hidden />
      <Cursor />
    </>
  )
}
