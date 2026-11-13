import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { Studio, useDragRotate, useFit } from '@/three/SectionCanvas'
import { WatchModel } from '@/three/WatchModel'
import { damp, easeInOut, range } from '@/lib/scroll'
import { useStore } from '@/lib/store'

export default function WatchScene({ progress }: { progress: RefObject<number> }) {
  const rig = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const smooth = useRef(0)
  const explode = useRef(0)
  const { rot, bind } = useDragRotate({ label: 'Drag' })
  const fit = useFit(9.5)
  const dark = useStore((s) => s.theme === 'dark')

  useFrame((state, dt) => {
    smooth.current = damp(smooth.current, progress.current ?? 0, 3.5, dt)
    const p = smooth.current
    // 0 → .12 hold assembled, .12 → .78 explode, then hold
    explode.current = range(p, 0.1, 0.8)
    const e = easeInOut(explode.current)
    if (rig.current) {
      rig.current.rotation.y = -0.38 - e * 0.72 + Math.sin(state.clock.elapsedTime * 0.25) * 0.03
      rig.current.rotation.x = 0.14 - e * 0.06
      rig.current.position.x = THREE.MathUtils.lerp(1.1, 0.25, e) * fit
      rig.current.scale.setScalar(THREE.MathUtils.lerp(1.2, 0.98, e) * fit)
    }
    if (spin.current) {
      spin.current.rotation.y = rot.current.y
      spin.current.rotation.x = rot.current.x
    }
  })

  return (
    <>
      <Studio mood="warm" strength={dark ? 1 : 0.9} />
      <spotLight position={[4, 6, 7]} angle={0.5} penumbra={1} intensity={60} color="#ffd9a8" />
      <spotLight position={[-6, -2, 4]} angle={0.6} penumbra={1} intensity={18} color="#a8c4ff" />
      <group ref={rig}>
        <group ref={spin} {...bind}>
          <WatchModel progress={explode} labels />
        </group>
      </group>
    </>
  )
}
