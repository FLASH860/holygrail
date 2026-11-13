import { useStore } from './store'

// Tiny synthesised UI sounds — mechanical ticks, no samples. Off by default.
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new AudioContext())

function burst(freq: number, dur: number, gain: number, type: OscillatorType = 'triangle') {
  if (!useStore.getState().sound) return
  const a = ac()
  if (a.state === 'suspended') a.resume()
  const t = a.currentTime
  const osc = a.createOscillator()
  const g = a.createGain()
  const f = a.createBiquadFilter()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur)
  f.type = 'bandpass'
  f.frequency.value = freq * 1.5
  f.Q.value = 1.2
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(f).connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  tick: () => burst(2400, 0.035, 0.05, 'square'),
  click: () => {
    burst(1500, 0.05, 0.08, 'square')
    setTimeout(() => burst(720, 0.07, 0.06), 28)
  },
  soft: () => burst(420, 0.14, 0.05, 'sine'),
  wind: () => {
    for (let i = 0; i < 7; i++) setTimeout(() => burst(2100 + i * 60, 0.03, 0.045, 'square'), i * 55)
  },
}
