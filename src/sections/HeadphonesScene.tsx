import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Studio, useDragRotate, useFit } from '@/three/SectionCanvas'
import { damp, easeInOut, range } from '@/lib/scroll'
import { useStore } from '@/lib/store'
import { sfx } from '@/lib/sound'

const CUP_X = 1.42, CUP_Y = -0.72

function useParts() {
  return useMemo(() => {
    const lathe = (pts: [number, number][], seg = 72) => {
      const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg)
      g.rotateZ(-Math.PI / 2) // axis → +x (pointing away from the head)
      return g
    }
    return {
      band: new THREE.TorusGeometry(CUP_X, 0.075, 18, 90, Math.PI),
      pad: new THREE.TorusGeometry(CUP_X - 0.05, 0.13, 18, 60, Math.PI * 0.52),
      shell: lathe([
        [0.0, 0.3],
        [0.3, 0.3],
        [0.56, 0.25],
        [0.68, 0.14],
        [0.72, 0],
        [0.7, -0.06],
        [0.62, -0.06],
        [0.62, 0.02],
        [0.5, 0.16],
        [0.0, 0.2],
      ]),
      plate: lathe([
        [0, 0.05],
        [0.4, 0.05],
        [0.5, 0.035],
        [0.54, 0],
        [0, 0],
      ]),
      cone: lathe([
        [0.1, 0.02],
        [0.2, 0.07],
        [0.36, 0.1],
        [0.44, 0.09],
        [0.47, 0.11],
        [0.5, 0.09],
      ]),
      basket: lathe([
        [0, 0],
        [0.52, 0],
        [0.56, 0.05],
        [0.56, 0.12],
        [0.52, 0.12],
        [0.52, 0.04],
        [0, 0.04],
      ]),
      cushion: (() => {
        const g = new THREE.TorusGeometry(0.47, 0.19, 24, 72)
        g.rotateY(Math.PI / 2)
        g.scale(0.72, 1, 1)
        return g
      })(),
      yoke: (() => {
        const g = new THREE.TorusGeometry(0.8, 0.04, 12, 48, Math.PI)
        g.rotateY(Math.PI / 2)
        return g
      })(),
    }
  }, [])
}

function useMats(anc: boolean) {
  const m = useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({ color: '#232326', metalness: 0.35, roughness: 0.5 }),
      alu: new THREE.MeshStandardMaterial({ color: '#cfccc6', metalness: 1, roughness: 0.28 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c59a56', metalness: 1, roughness: 0.25 }),
      leather: new THREE.MeshStandardMaterial({ color: '#b3a48f', metalness: 0, roughness: 0.82 }),
      cone: new THREE.MeshPhysicalMaterial({ color: '#3a3733', metalness: 0.2, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }),
      copper: new THREE.MeshStandardMaterial({ color: '#c8713f', metalness: 1, roughness: 0.3 }),
      led: new THREE.MeshBasicMaterial({ color: '#000000', toneMapped: false }),
    }),
    [],
  )
  m.led.color.set(anc ? '#9fd0ff' : '#3a2a18')
  return m
}

export default function HeadphonesScene({ progress, anc }: { progress: RefObject<number>; anc: boolean }) {
  const G = useParts()
  const M = useMats(anc)
  const fit = useFit(8)
  const setCursor = useStore((s) => s.setCursor)
  const { rot, bind } = useDragRotate({ label: 'Drag' })
  const [open, setOpen] = useState<[boolean, boolean]>([false, false])
  const openRef = useRef(open)
  openRef.current = open

  const rig = useRef<THREE.Group>(null)
  const band = useRef<THREE.Group>(null)
  const ears = useRef<({ root: THREE.Group | null; yoke: THREE.Group | null; plate: THREE.Group | null; shell: THREE.Group | null; driver: THREE.Group | null; cushion: THREE.Group | null })[]>([
    { root: null, yoke: null, plate: null, shell: null, driver: null, cushion: null },
    { root: null, yoke: null, plate: null, shell: null, driver: null, cushion: null },
  ])
  const s = useRef({ p: 0, open: [0, 0], calm: 0 })
  const key = useRef<THREE.SpotLight>(null)

  useFrame((state, dt) => {
    const st = s.current
    st.p = damp(st.p, progress.current ?? 0, 3.5, dt)
    st.calm = damp(st.calm, anc ? 1 : 0, 2, dt)
    // starts apart, comes together by ~70% of the scroll, then holds
    const e = 1 - easeInOut(range(st.p, 0.06, 0.72))
    const t = state.clock.elapsedTime
    const sway = 1 - st.calm // with ANC on, the world goes still

    if (rig.current) {
      rig.current.rotation.y = -0.6 + st.p * 0.22 + rot.current.y + Math.sin(t * 0.35) * 0.06 * sway
      rig.current.rotation.x = 0.08 + rot.current.x
      rig.current.position.y = 0.25 + Math.sin(t * 0.8) * 0.05 * sway
      rig.current.position.x = fit >= 1 ? 1.25 : 0
      rig.current.scale.setScalar(0.95 * fit)
    }
    if (band.current) band.current.position.y = e * 1.25
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(70, 22, st.calm)

    ears.current.forEach((ear, i) => {
      st.open[i] = damp(st.open[i], openRef.current[i] ? 1 : 0, 3, dt)
      const o = easeInOut(st.open[i])
      if (ear.root) ear.root.position.x = (CUP_X + e * 0.5) * (i === 0 ? -1 : 1)
      if (ear.yoke) ear.yoke.position.y = e * 0.55
      if (ear.plate) {
        ear.plate.position.x = 0.3 + e * 1.5 + o * 1.05
        ear.plate.rotation.y = o * 0.5
      }
      if (ear.shell) {
        ear.shell.position.x = e * 0.85 + o * 0.6
        ear.shell.rotation.y = o * 0.32
      }
      if (ear.driver) ear.driver.position.x = 0.03 + e * 0.12
      if (ear.cushion) ear.cushion.position.x = -0.16 - e * 0.85
    })
  })

  const toggle = (i: number) => {
    sfx.click()
    setOpen((o) => (i === 0 ? [!o[0], o[1]] : [o[0], !o[1]]))
  }

  return (
    <>
      <Studio mood={anc ? 'cool' : 'warm'} strength={anc ? 0.5 : 1} />
      <spotLight ref={key} position={[3, 6, 6]} angle={0.5} penumbra={1} intensity={70} color={anc ? '#bcd6ff' : '#ffe2bd'} />
      <group ref={rig} {...bind}>
        {/* headband */}
        <group ref={band} position-y={CUP_Y + 0.92}>
          <mesh geometry={G.band} material={M.alu} />
          <mesh geometry={G.pad} material={M.leather} rotation-z={Math.PI * 0.24} />
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * CUP_X, -0.06, 0]} material={M.brass}>
              <cylinderGeometry args={[0.1, 0.1, 0.2, 24]} />
            </mesh>
          ))}
        </group>

        {[0, 1].map((i) => (
          // each ear is built pointing +x, then the left one is mirrored
          <group key={i} ref={(g) => void (ears.current[i].root = g)} position={[i === 0 ? -CUP_X : CUP_X, CUP_Y, 0]} scale-x={i === 0 ? -1 : 1}>
            <group ref={(g) => void (ears.current[i].yoke = g)}>
              <mesh geometry={G.yoke} material={M.alu} position-x={0.05} />
              <mesh position={[0.05, 0.85, 0]} material={M.alu}>
                <cylinderGeometry args={[0.045, 0.045, 0.16, 16]} />
              </mesh>
            </group>
            <group
              onClick={(e) => {
                e.stopPropagation()
                if (e.delta < 8) toggle(i)
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                setCursor(openRef.current[i] ? 'Close' : 'Open')
              }}
              onPointerOut={() => setCursor('')}
            >
              <group ref={(g) => void (ears.current[i].plate = g)}>
                <mesh geometry={G.plate} material={M.alu} />
                <mesh position={[0.052, 0, 0]} rotation-y={Math.PI / 2} material={M.brass}>
                  <torusGeometry args={[0.3, 0.008, 8, 64]} />
                </mesh>
                <mesh position={[0.05, -0.4, 0]} material={M.led}>
                  <sphereGeometry args={[0.018, 12, 12]} />
                </mesh>
              </group>
              <group ref={(g) => void (ears.current[i].shell = g)}>
                <mesh geometry={G.shell} material={M.shell} />
              </group>
            </group>
            <group ref={(g) => void (ears.current[i].driver = g)}>
              <mesh geometry={G.basket} material={M.alu} />
              <mesh geometry={G.cone} material={M.cone} />
              <mesh position-x={0.07} material={M.shell}>
                <sphereGeometry args={[0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <mesh position-x={0.1} rotation-y={Math.PI / 2} material={M.copper}>
                <torusGeometry args={[0.2, 0.022, 10, 48]} />
              </mesh>
            </group>
            <group ref={(g) => void (ears.current[i].cushion = g)}>
              <mesh geometry={G.cushion} material={M.leather} />
            </group>
          </group>
        ))}
      </group>
    </>
  )
}
