import { useFrame, useThree } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { flavours } from '@/config/site'
import { canLabel } from '@/three/labels'
import { Studio, useFit } from '@/three/SectionCanvas'
import { damp, easeOut, range } from '@/lib/scroll'
import { palette, useStore } from '@/lib/store'
import { sfx } from '@/lib/sound'

const N = flavours.length
const R = 3.6 // arc radius
const STEP = 0.4 // radians between neighbours
const BODY_H = 1.5, BODY_R = 0.33

function useCanGeometry() {
  return useMemo(() => {
    const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64)
    const h = BODY_H / 2
    return {
      body: new THREE.CylinderGeometry(BODY_R, BODY_R, BODY_H, 72, 1, true),
      top: lathe([
        [BODY_R, h],
        [BODY_R - 0.012, h + 0.05],
        [0.285, h + 0.13],
        [0.272, h + 0.165],
        [0.285, h + 0.18],
        [0.285, h + 0.195],
        [0.262, h + 0.195],
        [0.255, h + 0.165],
        [0, h + 0.16],
      ]),
      bottom: lathe([
        [0, -h - 0.075],
        [0.17, -h - 0.085],
        [0.235, -h - 0.11],
        [0.25, -h - 0.105],
        [0.27, -h - 0.06],
        [BODY_R - 0.008, -h - 0.012],
        [BODY_R, -h],
      ]),
    }
  }, [])
}

type Props = {
  active: number
  focused: boolean
  progress: RefObject<number>
  onSelect: (i: number) => void
  onFocus: () => void
  onCycle: (dir: number) => void
}

export default function CansScene({ active, focused, progress, onSelect, onFocus, onCycle }: Props) {
  const G = useCanGeometry()
  const lite = useStore((s) => s.lite)
  const theme = useStore((s) => s.theme)
  const setCursor = useStore((s) => s.setCursor)
  const { camera, gl, scene } = useThree()
  const fit = useFit(7.5)

  const labels = useMemo(() => flavours.map(canLabel), [])
  useEffect(() => () => labels.forEach((t) => t.dispose()), [labels])
  const mats = useMemo(
    () => ({
      alu: new THREE.MeshStandardMaterial({ color: '#d8d6d2', metalness: 1, roughness: 0.22 }),
      label: labels.map((map) => new THREE.MeshPhysicalMaterial({ map, metalness: 0.62, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.25 })),
      ring: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      pedestal: new THREE.MeshStandardMaterial({ color: '#141312', metalness: 0.9, roughness: 0.28 }),
    }),
    [labels],
  )

  const cans = useRef<(THREE.Group | null)[]>([])
  const inner = useRef<(THREE.Group | null)[]>([])
  const s = useRef({ pos: active, focus: 0, enter: 0, spin: 0, spinT: 0, tilt: 0, tiltT: 0 })
  const bg = useMemo(() => new THREE.Color(palette[theme].bg), [])
  const target = useMemo(() => new THREE.Color(), [])
  const ringColor = useMemo(() => new THREE.Color(), [])
  const floorMat = useRef<THREE.MeshStandardMaterial>(null)
  const refs = useRef({ active, focused })
  refs.current = { active, focused }

  // drag: cycle the carousel when browsing, rotate the can freely when focused
  useEffect(() => {
    const el = gl.domElement
    let down = false, px = 0, acc = 0, moved = 0
    const onDown = (e: PointerEvent) => {
      down = true
      px = e.clientX
      acc = 0
      moved = 0
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - px
      px = e.clientX
      moved += Math.abs(dx)
      if (refs.current.focused) {
        s.current.spinT += dx * 0.01
        if (e.pointerType === 'mouse') s.current.tiltT = THREE.MathUtils.clamp(s.current.tiltT + e.movementY * 0.006, -0.7, 0.7)
      } else {
        acc += dx
        if (Math.abs(acc) > 90) {
          onCycle(acc < 0 ? 1 : -1)
          acc = 0
        }
      }
    }
    const onUp = () => (down = false)
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl, onCycle])

  useEffect(() => {
    setCursor(focused ? 'Spin' : '')
    if (!focused) {
      s.current.spinT = Math.round(s.current.spinT / (Math.PI * 2)) * Math.PI * 2
      s.current.tiltT = 0
    }
  }, [focused])

  useFrame((state, dt) => {
    const st = s.current
    const t = state.clock.elapsedTime
    // shortest way round the ring
    let d = active - st.pos
    d = ((((d + N / 2) % N) + N) % N) - N / 2
    st.pos = damp(st.pos, st.pos + d, 3.2, dt)
    st.focus = damp(st.focus, focused ? 1 : 0, 2.6, dt)
    st.enter = damp(st.enter, range(progress.current ?? 0, 0.02, 0.3), 3, dt)
    st.spin = damp(st.spin, st.spinT, 5, dt)
    st.tilt = damp(st.tilt, st.tiltT, 5, dt)
    const f = st.focus, enter = easeOut(st.enter)

    for (let i = 0; i < N; i++) {
      const can = cans.current[i], inn = inner.current[i]
      if (!can || !inn) continue
      let off = i - st.pos
      off = ((((off + N / 2) % N) + N) % N) - N / 2
      const a = off * STEP
      const centre = Math.max(0, 1 - Math.abs(off))
      const spread = 1 + f * 2.4 * (1 - centre)
      can.position.set(Math.sin(a) * R * spread, 0.1 + Math.sin(t * 0.7 + i * 1.3) * 0.045 + (1 - enter) * (-2.4 - Math.abs(off) * 0.5) + centre * 0.1, Math.cos(a) * R - R + centre * f * 0.5)
      can.rotation.z = -a * 0.42 * (1 - f * centre)
      can.rotation.y = a * 0.5
      can.scale.setScalar((0.86 + centre * 0.2) * (1 - f * (1 - centre) * 0.25))
      inn.rotation.y = Math.PI - 0.75 + Math.sin(t * 0.3 + i) * 0.12 * (1 - f) + (centre > 0.5 ? st.spin : 0)
      inn.rotation.x = centre > 0.5 ? st.tilt : 0
    }

    // camera: fly in on focus, sliding the can toward the left third
    const cz = THREE.MathUtils.lerp(8.4, 5.4, f) / Math.max(fit, 0.62)
    camera.position.set(THREE.MathUtils.lerp(0, 1.3 * fit, f), THREE.MathUtils.lerp(0.75, 0.25, f), cz)
    camera.lookAt(THREE.MathUtils.lerp(0, 1.3 * fit, f), THREE.MathUtils.lerp(0.3, 0.15, f), 0)

    // background drifts to the flavour colour while focused
    const fl = flavours[active]
    target.set(palette[theme].bg).lerp(new THREE.Color(fl.deep), 0.25 + f * 0.75)
    bg.lerp(target, 1 - Math.exp(-3 * dt))
    scene.background = bg
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(bg)
    ringColor.lerp(new THREE.Color(fl.glow), 1 - Math.exp(-3 * dt))
    mats.ring.color.copy(ringColor).multiplyScalar(1.8)
    if (floorMat.current) floorMat.current.color.copy(bg).multiplyScalar(1.15)
  })

  return (
    <>
      <fog attach="fog" args={[palette[theme].bg, 7, 16]} />
      <Studio mood="neutral" strength={0.9} />
      <spotLight position={[0, 6, 3]} angle={0.42} penumbra={1} intensity={90} color="#fff2e0" />

      {flavours.map((fl, i) => (
        <group
          key={fl.id}
          ref={(g) => void (cans.current[i] = g)}
          onClick={(e) => {
            e.stopPropagation()
            if (e.delta > 8) return
            sfx.click()
            if (i === refs.current.active) {
              if (!refs.current.focused) onFocus()
            } else onSelect(i)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setCursor(i === refs.current.active ? (refs.current.focused ? 'Spin' : 'Open') : 'Select')
          }}
          onPointerOut={() => setCursor('')}
        >
          <group ref={(g) => void (inner.current[i] = g)}>
            <mesh geometry={G.body} material={mats.label[i]} />
            <mesh geometry={G.top} material={mats.alu} />
            <mesh geometry={G.bottom} material={mats.alu} />
            <mesh position={[0, BODY_H / 2 + 0.168, 0.06]} rotation-x={-Math.PI / 2} material={mats.alu}>
              <capsuleGeometry args={[0.045, 0.1, 4, 12]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* lit pedestal */}
      <group position={[0, -1.05, 0]}>
        <mesh material={mats.pedestal}>
          <cylinderGeometry args={[0.78, 0.9, 0.2, 64]} />
        </mesh>
        <mesh position-y={0.105} rotation-x={Math.PI / 2} material={mats.ring}>
          <torusGeometry args={[0.6, 0.012, 8, 96]} />
        </mesh>
        <mesh position-y={0.102} rotation-x={-Math.PI / 2} material={mats.pedestal}>
          <circleGeometry args={[0.58, 64]} />
        </mesh>
      </group>

      {/* glossy floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={-1.15}>
        <planeGeometry args={[40, 40]} />
        {lite ? (
          <meshStandardMaterial ref={floorMat} color="#111" metalness={0.8} roughness={0.35} />
        ) : (
          <MeshReflectorMaterial ref={floorMat as never} resolution={512} blur={[280, 90]} mixBlur={1} mixStrength={7} roughness={0.85} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#151515" metalness={0.7} mirror={0.6} />
        )}
      </mesh>

      {!lite && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.5} luminanceThreshold={1.05} luminanceSmoothing={0.2} radius={0.7} />
        </EffectComposer>
      )}
    </>
  )
}
