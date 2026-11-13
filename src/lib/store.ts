import { create } from 'zustand'

export type Theme = 'dark' | 'light'
export type Route = { name: 'home' } | { name: 'case'; slug: string }

const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const narrow = typeof window !== 'undefined' && window.innerWidth < 820
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type State = {
  theme: Theme
  setTheme: (t: Theme) => void
  sound: boolean
  setSound: (s: boolean) => void
  cursor: string
  setCursor: (label: string) => void
  ready: boolean
  setReady: () => void
  route: Route
  setRoute: (r: Route) => void
  /** phones / tablets / small windows get lighter scenes */
  lite: boolean
  touch: boolean
  reduced: boolean
}

export const useStore = create<State>((set) => ({
  theme: (typeof document !== 'undefined' && (document.documentElement.dataset.theme as Theme)) || 'dark',
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0b0a' : '#ece7dd')
    try {
      localStorage.setItem('theme', theme)
    } catch {}
    set({ theme })
  },
  sound: false,
  setSound: (sound) => set({ sound }),
  cursor: '',
  setCursor: (cursor) => set((s) => (s.cursor === cursor ? s : { cursor })),
  ready: false,
  setReady: () => set({ ready: true }),
  route: { name: 'home' },
  setRoute: (route) => set({ route }),
  lite: coarse || narrow,
  touch: coarse,
  reduced,
}))

/** Theme-aware palette for WebGL scenes (CSS variables can't reach shaders). */
export const palette = {
  dark: { bg: '#0c0b0a', bg2: '#151311', fg: '#ebe5d9', muted: '#8d857a', accent: '#c9a56b' },
  light: { bg: '#ece7dd', bg2: '#e0d9cc', fg: '#15130f', muted: '#6f685d', accent: '#8a6a34' },
} as const

export const usePalette = () => palette[useStore((s) => s.theme)]
