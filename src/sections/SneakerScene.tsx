import { useFrame, useThree } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Studio, useDragRotate } from '@/three/SectionCanvas'
import { damp, easeInOut } from '@/lib/scroll'
import { usePalette } from '@/lib/store'

const URL = '/models/sneaker.glb'
type Mapping = { material: number; variants: number[] }

export default function SneakerScene({ progress, variant, size, word }: { progress: RefObject<number>; variant: number; size: number; word: string }) {
  const gltf = useGLTF(URL, '/draco/')
  const pal = usePalette()
  const { viewport } = useThree()
  const rig = useRef<THREE.Group>(null)
  const shoe = useRef<THREE.Group>(null)
  const text = useRef<THREE.Mesh>(null)
  const s = useRef({ p: 0, scale: 1, kick: 0, kickT: 0 })
  const { rot, bind } = useDragRotate({ label: 'Spin', clampX: 0.5 })

  // centre + normalise the model once
  const model = useMemo(() => {
    const scene = gltf.scene
    scene.position.set(0, 0, 0)
    scene.scale.setScalar(1)
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const dim = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    const k = 3.3 / Math.max(dim.x, dim.y, dim.z)
    scene.scale.setScalar(k)
    scene.position.set(-c.x * k, -c.y * k, -c.z * k)
    return scene
  }, [gltf])

  // KHR_materials_variants: resolve every colourway's materials up front so swapping is instant
  const [variants, setVariants] = useState<Map<THREE.Mesh, THREE.Material[]> | null>(null)
  useEffect(() => {
    let alive = true
    const jobs: Promise<void>[] = []
    const map = new Map<THREE.Mesh, THREE.Material[]>()
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      const maps = (mesh.userData?.gltfExtensions?.KHR_materials_variants?.mappings ?? []) as Mapping[]
      if (!mesh.isMesh || !maps.length) return
      const list: THREE.Material[] = []
      map.set(mesh, list)
      for (const m of maps)
        jobs.push(
          gltf.parser.getDependency('material', m.material).then((mat: THREE.Material) => {
            m.variants.forEach((v) => (list[v] = mat))
          }),
        )
    })
    Promise.all(jobs).then(() => alive && setVariants(map))
    return () => {
      alive = false
    }
  }, [gltf, model])

  const first = useRef(true)
  useEffect(() => {
    if (!variants) return
    const apply = () => variants.forEach((list, mesh) => list[variant] && (mesh.material = list[variant]))
    if (first.current) {
      first.current = false
      apply()
      return
    }
    // one slow turn; the new material arrives as the shoe passes side-on
    s.current.kickT += Math.PI * 2
    const id = setTimeout(apply, 420)
    return () => clearTimeout(id)
  }, [variant, variants])

  const fitText = (t: THREE.Mesh) => {
    const bb = t.geometry.boundingBox
    if (!bb) return
    const w = bb.max.x - bb.min.x
    if (w > 0) t.scale.setScalar((viewport.width * 0.94) / w)
  }
  useEffect(() => {
    if (text.current) fitText(text.current)
  }, [viewport.width])

  useFrame((state, dt) => {
    const st = s.current
    st.p = damp(st.p, progress.current ?? 0, 3.5, dt)
    st.scale = damp(st.scale, 1 + (size - 9) * 0.035, 4, dt)
    st.kick = damp(st.kick, st.kickT, 2.6, dt)
    const p = easeInOut(st.p)
    const t = state.clock.elapsedTime
    const span = Math.min(viewport.width * 0.27, 3.2)
    const k = Math.min(1, viewport.width / 8.5)
    if (rig.current) {
      // travels across the word, threading through the letters: toe in front, heel behind
      rig.current.position.set(THREE.MathUtils.lerp(-span, span, p), Math.sin(t * 0.6) * 0.05 + 0.45, 0)
      rig.current.rotation.set(0.18 + rot.current.x, -0.9 + p * Math.PI * 1.6 + rot.current.y + st.kick, -0.16)
      rig.current.scale.setScalar(st.scale * k)
    }
  })

  return (
    <>
      <Studio mood="neutral" strength={1} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <Text ref={text} font="/fonts/archivo-black.woff" fontSize={1} letterSpacing={-0.045} anchorX="center" anchorY="middle" position={[0, 0.85, 0]} onSync={fitText}>
        {word}
        <meshBasicMaterial color={pal.fg} toneMapped={false} />
      </Text>
      <group ref={rig} {...bind}>
        <group ref={shoe}>
          <primitive object={model} />
        </group>
      </group>
    </>
  )
}
useGLTF.preload(URL, '/draco/')
