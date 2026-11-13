import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { damp, easeInOut, range } from '@/lib/scroll'
import { useStore } from '@/lib/store'
import { sfx } from '@/lib/sound'

/* ───────── procedural geometry ───────── */
function gearGeometry(teeth: number, rOuter: number, depth: number, spokes = 5) {
  const rRoot = rOuter - Math.min(0.045, rOuter * 0.22)
  const s = new THREE.Shape()
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth
    const pts: [number, number][] = [
      [rRoot, a],
      [rRoot, a + step * 0.22],
      [rOuter, a + step * 0.36],
      [rOuter, a + step * 0.64],
      [rRoot, a + step * 0.78],
    ]
    pts.forEach(([r, t], j) => (i === 0 && j === 0 ? s.moveTo(Math.cos(t) * r, Math.sin(t) * r) : s.lineTo(Math.cos(t) * r, Math.sin(t) * r)))
  }
  s.closePath()
  const hub = new THREE.Path()
  hub.absarc(0, 0, rOuter * 0.1, 0, Math.PI * 2, true)
  s.holes.push(hub)
  if (rOuter > 0.16) {
    // spoke windows
    const r0 = rOuter * 0.26, r1 = rRoot - rOuter * 0.14
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2 + 0.16, a1 = ((i + 1) / spokes) * Math.PI * 2 - 0.16
      const h = new THREE.Path()
      h.absarc(0, 0, r1, a0, a1, false)
      h.absarc(0, 0, r0, a1, a0, true)
      h.closePath()
      s.holes.push(h)
    }
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1, curveSegments: 10 })
  g.translate(0, 0, -depth / 2)
  return g
}

function sectorGeometry(r0: number, r1: number, a0: number, a1: number, depth: number) {
  const s = new THREE.Shape()
  s.absarc(0, 0, r1, a0, a1, false)
  s.absarc(0, 0, r0, a1, a0, true)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 28 })
  g.translate(0, 0, -depth / 2)
  return g
}

/** revolve an (r, z) profile around the watch axis (z) */
function ringGeometry(profile: [number, number][], segments = 96) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments)
  g.rotateX(Math.PI / 2)
  return g
}

function handGeometry(length: number, width: number, tail: number, depth = 0.012) {
  const s = new THREE.Shape()
  s.moveTo(0, -tail)
  s.lineTo(width / 2, 0)
  s.lineTo(width * 0.12, length)
  s.lineTo(-width * 0.12, length)
  s.lineTo(-width / 2, 0)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 })
}

function strapGeometry(w0: number, w1: number, length: number) {
  const s = new THREE.Shape()
  const r = 0.08
  s.moveTo(-w0 / 2, 0)
  s.lineTo(w0 / 2, 0)
  s.lineTo(w1 / 2, length - r)
  s.quadraticCurveTo(w1 / 2, length, w1 / 2 - r, length)
  s.lineTo(-w1 / 2 + r, length)
  s.quadraticCurveTo(-w1 / 2, length, -w1 / 2, length - r)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.022, bevelSegments: 4, steps: 1 })
  g.translate(0, 0, -0.035)
  return g
}

/* ───────── part system: explode offset, hover-isolate dimming, label ───────── */
type Ctx = { progress: RefObject<number>; hovered: RefObject<string | null>; setHovered: (id: string | null) => void; labels: boolean; interactive: boolean }
const WatchCtx = createContext<Ctx>(null!)

function Part({ id, label, z, explode, window: win, tier = 0, children }: { id: string; label: string; z: number; explode: number; window: [number, number]; tier?: number; children: ReactNode }) {
  const { progress, hovered, setHovered, labels, interactive } = useContext(WatchCtx)
  const group = useRef<THREE.Group>(null)
  const tag = useRef<HTMLDivElement>(null)
  const mats = useRef<THREE.Material[]>([])
  const s = useRef({ dim: 1, open: 0 })

  useEffect(() => {
    const set = new Set<THREE.Material>()
    group.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined
      if (m) set.add(m)
    })
    mats.current = [...set]
    mats.current.forEach((m) => (m.userData.baseOpacity = m.opacity))
  }, [])

  useFrame((_, dt) => {
    const p = progress.current ?? 0
    const open = easeInOut(range(p, win[0], win[1]))
    s.current.open = open
    if (group.current) group.current.position.z = z + explode * open
    const h = hovered.current
    const target = h && h !== id ? 0.1 : 1
    if (Math.abs(s.current.dim - target) > 0.002) {
      s.current.dim = damp(s.current.dim, target, 6, dt)
      for (const m of mats.current) {
        m.opacity = m.userData.baseOpacity * s.current.dim
        const tr = m.userData.baseOpacity < 1 || s.current.dim < 0.985
        if (m.transparent !== tr) {
          m.transparent = tr
          m.depthWrite = !tr
          m.needsUpdate = true
        }
      }
    }
    if (tag.current) {
      const show = h ? (h === id ? 1 : 0) : Math.min(1, open * 1.6)
      tag.current.style.opacity = String(show)
    }
  })

  const up = tier % 2 === 0
  const len = tier < 2 ? 54 : 104
  return (
    <group
      ref={group}
      position-z={z}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              if (hovered.current !== id) {
                setHovered(id)
                sfx.tick()
              }
            }
          : undefined
      }
      onPointerOut={interactive ? () => hovered.current === id && setHovered(null) : undefined}
    >
      {children}
      {labels && (
        <Html position={[0, up ? 1.12 : -1.12, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={tag} className={`watch-tag ${up ? 'is-up' : 'is-down'}`} style={{ opacity: 0, ['--len' as string]: `${len}px` }}>
            <i />
            <span className="caps">{label}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

/* ───────── materials ───────── */
function useMaterials() {
  return useMemo(() => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o)
    return {
      steel: () => std({ color: '#c9c6c0', metalness: 1, roughness: 0.3 }),
      polished: () => std({ color: '#e2dfd8', metalness: 1, roughness: 0.1 }),
      gold: () => std({ color: '#d2a865', metalness: 1, roughness: 0.2 }),
      brass: () => std({ color: '#b98f4a', metalness: 1, roughness: 0.34 }),
      rhodium: () => std({ color: '#b4b4b2', metalness: 1, roughness: 0.24 }),
      dial: () => std({ color: '#2c3442', metalness: 0.8, roughness: 0.36 }),
      leather: () => std({ color: '#3f2618', metalness: 0, roughness: 0.72 }),
      blued: () => std({ color: '#23357a', metalness: 1, roughness: 0.22 }),
      ruby: () => new THREE.MeshPhysicalMaterial({ color: '#b3122e', metalness: 0, roughness: 0.08, clearcoat: 1, emissive: '#3a0410' }),
      glass: () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.6, clearcoat: 1, depthWrite: false }),
    }
  }, [])
}

const istParts = () => {
  const now = new Date()
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000)
  return { h: ist.getHours(), m: ist.getMinutes(), s: ist.getSeconds() + ist.getMilliseconds() / 1000 }
}

type Props = {
  /** 0 = assembled, 1 = fully exploded along the axis */
  progress: RefObject<number>
  labels?: boolean
  interactive?: boolean
  onHover?: (id: string | null) => void
}

export function WatchModel({ progress, labels = false, interactive = true, onHover }: Props) {
  const M = useMaterials()
  // one stable material per call-site, so hover-isolate can fade parts independently across re-renders
  const cache = useRef(new Map<number, THREE.Material>())
  const mat = (kind: keyof typeof M, key: number) => {
    let m = cache.current.get(key)
    if (!m) cache.current.set(key, (m = M[kind]()))
    return m
  }
  const hovered = useRef<string | null>(null)
  const [, force] = useState(0)
  const setCursor = useStore((s) => s.setCursor)
  const ctx = useMemo<Ctx>(
    () => ({
      progress,
      hovered,
      labels,
      interactive,
      setHovered: (id) => {
        hovered.current = id
        onHover?.(id)
        force((n) => n + 1)
      },
    }),
    [progress, labels, interactive, onHover],
  )

  const G = useMemo(
    () => ({
      case: ringGeometry([
        [0.87, -0.17],
        [0.985, -0.17],
        [1.03, -0.11],
        [1.03, 0.05],
        [0.99, 0.1],
        [0.87, 0.1],
        [0.87, -0.17],
      ]),
      bezel: ringGeometry([
        [0.86, 0],
        [0.995, 0],
        [0.995, 0.03],
        [0.93, 0.085],
        [0.86, 0.085],
        [0.86, 0],
      ]),
      crystal: ringGeometry(
        [
          [0, 0.035],
          [0.3, 0.032],
          [0.6, 0.022],
          [0.8, 0.008],
          [0.865, 0],
        ],
        64,
      ),
      plateRim: ringGeometry([
        [0.8, -0.03],
        [0.85, -0.03],
        [0.85, 0.03],
        [0.8, 0.03],
        [0.8, -0.03],
      ]),
      strapTop: strapGeometry(0.8, 0.66, 1.75),
      strapBottom: strapGeometry(0.8, 0.6, 2.05),
      hour: handGeometry(0.44, 0.075, 0.1),
      minute: handGeometry(0.68, 0.058, 0.12),
      second: handGeometry(0.74, 0.014, 0.2, 0.006),
      bridgeA: sectorGeometry(0.2, 0.8, 0.3, 2.2, 0.05),
      bridgeB: sectorGeometry(0.34, 0.8, 2.75, 4.1, 0.05),
      bridgeC: sectorGeometry(0.5, 0.8, 4.6, 5.7, 0.05),
      gears: [gearGeometry(40, 0.34, 0.03), gearGeometry(30, 0.25, 0.028), gearGeometry(24, 0.19, 0.026), gearGeometry(18, 0.14, 0.024), gearGeometry(15, 0.1, 0.022, 3)],
      barrel: gearGeometry(56, 0.36, 0.05, 0),
    }),
    [],
  )

  const hands = useRef<{ h: THREE.Group | null; m: THREE.Group | null; s: THREE.Group | null }>({ h: null, m: null, s: null })
  const gears = useRef<(THREE.Mesh | null)[]>([])
  const balance = useRef<THREE.Group>(null)
  const crown = useRef<THREE.Group>(null)
  const wind = useRef({ turns: 0, busy: false })

  const doWind = () => {
    if (wind.current.busy) return
    wind.current.busy = true
    sfx.wind()
    gsap.to(wind.current, { turns: '+=1', duration: 3.2, ease: 'expo.inOut', onComplete: () => (wind.current.busy = false) })
  }

  // gear train layout: [x, y, ratio]
  const train: [number, number, number][] = [
    [-0.3, 0.3, 1],
    [0.22, 0.38, -1.36],
    [0.5, 0.02, 1.79],
    [0.33, -0.36, -2.43],
    [0.02, -0.5, 3.4],
  ]

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { h, m, s } = istParts()
    const w = wind.current.turns
    const TAU = Math.PI * 2
    if (hands.current.s) hands.current.s.rotation.z = -(s / 60) * TAU
    if (hands.current.m) hands.current.m.rotation.z = -((m + s / 60) / 60) * TAU - w * TAU * 12
    if (hands.current.h) hands.current.h.rotation.z = -(((h % 12) + m / 60) / 12) * TAU - w * TAU
    if (crown.current) crown.current.rotation.x = w * TAU * 6
    gears.current.forEach((g, i) => g && (g.rotation.z = (t * 0.35 + w * 24) * train[i][2]))
    // the balance beats at 4 Hz like a real escapement, only slower so the eye can follow
    if (balance.current) balance.current.rotation.z = Math.sin(t * 5.2) * 1.1
  })

  const indices = useMemo(() => Array.from({ length: 12 }, (_, i) => i), [])

  return (
    <WatchCtx.Provider value={ctx}>
      <Part id="strap" label="Strap — calf leather" z={-0.06} explode={-2.9} window={[0.0, 0.5]} tier={1}>
        <mesh geometry={G.strapTop} material={mat('leather', 1)} position={[0, 1.02, 0]} rotation-x={-0.16} />
        <mesh geometry={G.strapBottom} material={mat('leather', 2)} position={[0, -1.02, 0]} rotation-x={Math.PI + 0.16} />
        <mesh position={[0, -2.75, -0.36]} rotation-x={0.16} material={mat('steel', 3)}>
          <torusGeometry args={[0.36, 0.035, 10, 4, Math.PI * 2]} />
        </mesh>
      </Part>

      <Part id="case" label="Case — brushed steel" z={0} explode={-2.05} window={[0.06, 0.56]} tier={2}>
        <mesh geometry={G.case} material={mat('steel', 4)} />
        <mesh position-z={-0.165} rotation-x={Math.PI / 2} material={mat('steel', 5)}>
          <cylinderGeometry args={[0.9, 0.9, 0.02, 64]} />
        </mesh>
        {[
          [0.56, 1.02],
          [-0.56, 1.02],
          [0.56, -1.02],
          [-0.56, -1.02],
        ].map(([x, y], i) => (
          <RoundedBox key={i} args={[0.2, 0.46, 0.2]} radius={0.05} smoothness={3} position={[x, y, -0.05]} rotation-x={y > 0 ? -0.22 : 0.22} material={mat('steel', 6)} />
        ))}
        <group
          ref={crown}
          position={[1.12, 0, -0.03]}
          onClick={
            interactive
              ? (e) => {
                  e.stopPropagation()
                  doWind()
                }
              : undefined
          }
          onPointerOver={interactive ? () => setCursor('Wind') : undefined}
          onPointerOut={interactive ? () => setCursor('') : undefined}
        >
          <mesh rotation-z={Math.PI / 2} material={mat('gold', 7)}>
            <cylinderGeometry args={[0.105, 0.105, 0.16, 22, 1]} />
          </mesh>
          {/* generous invisible hit area so the crown is easy to click */}
          <mesh visible={false}>
            <sphereGeometry args={[0.26, 8, 8]} />
          </mesh>
        </group>
      </Part>

      <Part id="plate" label="Main plate" z={-0.1} explode={-1.25} window={[0.12, 0.62]} tier={3}>
        <mesh rotation-x={Math.PI / 2} material={mat('brass', 8)}>
          <cylinderGeometry args={[0.8, 0.8, 0.045, 72]} />
        </mesh>
        <mesh geometry={G.plateRim} material={mat('rhodium', 9)} />
        <mesh geometry={G.barrel} material={mat('brass', 10)} position={[-0.3, 0.3, 0.05]} />
      </Part>

      <Part id="gears" label="Gear train" z={-0.03} explode={-0.55} window={[0.18, 0.68]} tier={0}>
        {train.map(([x, y], i) => (
          <mesh key={i} ref={(m) => void (gears.current[i] = m)} geometry={G.gears[i]} material={mat('gold', 11)} position={[x, y, i * 0.012]} />
        ))}
        <group ref={balance} position={[-0.42, -0.3, 0.04]}>
          <mesh material={mat('gold', 12)}>
            <torusGeometry args={[0.2, 0.018, 10, 48]} />
          </mesh>
          {[0, Math.PI / 3, -Math.PI / 3].map((a, i) => (
            <mesh key={i} rotation-z={a} material={mat('gold', 13)}>
              <boxGeometry args={[0.4, 0.02, 0.012]} />
            </mesh>
          ))}
        </group>
      </Part>

      <Part id="movement" label="Bridges & jewels" z={0.02} explode={0.25} window={[0.2, 0.7]} tier={1}>
        <mesh geometry={G.bridgeA} material={mat('rhodium', 14)} />
        <mesh geometry={G.bridgeB} material={mat('rhodium', 15)} />
        <mesh geometry={G.bridgeC} material={mat('rhodium', 16)} />
        {[
          [-0.3, 0.3],
          [0.22, 0.38],
          [0.5, 0.02],
          [0.33, -0.36],
          [-0.42, -0.3],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.03]} material={mat('ruby', 17)}>
            <sphereGeometry args={[0.032, 16, 12]} />
          </mesh>
        ))}
        {[0.5, 1.9, 3.0, 3.9, 4.8, 5.5].map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.028]} rotation-x={Math.PI / 2} material={mat('blued', 18)}>
            <cylinderGeometry args={[0.026, 0.026, 0.02, 14]} />
          </mesh>
        ))}
      </Part>

      <Part id="dial" label="Dial — sunray anthracite" z={0.07} explode={1.05} window={[0.14, 0.64]} tier={2}>
        <mesh rotation-x={Math.PI / 2} material={mat('dial', 19)}>
          <cylinderGeometry args={[0.855, 0.855, 0.02, 96]} />
        </mesh>
        {indices.map((i) => {
          const a = (i / 12) * Math.PI * 2
          const big = i % 3 === 0
          return (
            <mesh key={i} position={[Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0.018]} rotation-z={-a} material={mat('gold', 20)}>
              <boxGeometry args={[big ? 0.045 : 0.026, big ? 0.17 : 0.12, 0.016]} />
            </mesh>
          )
        })}
        <mesh position-z={0.012} material={mat('gold', 21)}>
          <torusGeometry args={[0.81, 0.004, 6, 120]} />
        </mesh>
        <mesh position={[0, -0.36, 0.012]} material={mat('rhodium', 22)}>
          <torusGeometry args={[0.17, 0.006, 6, 60]} />
        </mesh>
      </Part>

      <Part id="hands" label="Hands — dauphine" z={0.1} explode={1.75} window={[0.08, 0.58]} tier={3}>
        <group ref={(g) => void (hands.current.h = g)}>
          <mesh geometry={G.hour} material={mat('gold', 23)} />
        </group>
        <group ref={(g) => void (hands.current.m = g)} position-z={0.016}>
          <mesh geometry={G.minute} material={mat('gold', 24)} />
        </group>
        <group ref={(g) => void (hands.current.s = g)} position-z={0.032}>
          <mesh geometry={G.second} material={mat('blued', 25)} />
        </group>
        <mesh position-z={0.03} rotation-x={Math.PI / 2} material={mat('gold', 26)}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 24]} />
        </mesh>
      </Part>

      <Part id="bezel" label="Bezel — polished" z={0.1} explode={2.4} window={[0.04, 0.54]} tier={0}>
        <mesh geometry={G.bezel} material={mat('polished', 27)} />
      </Part>

      <Part id="crystal" label="Sapphire crystal" z={0.17} explode={3.0} window={[0.0, 0.5]} tier={1}>
        <mesh geometry={G.crystal} material={mat('glass', 28)} renderOrder={10} />
      </Part>
    </WatchCtx.Provider>
  )
}
