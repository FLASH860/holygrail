import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useStore } from '@/lib/store'
import { damp } from '@/lib/scroll'

type Props = {
  children: ReactNode
  className?: string
  camera?: { position?: [number, number, number]; fov?: number; near?: number; far?: number }
  /** tone mapping exposure */
  exposure?: number
  shadows?: boolean
}

/**
 * Lazy WebGL stage: the <Canvas> (and its GPU resources) only exists while the section is near
 * the viewport, renders only while actually visible, and is disposed when the visitor moves away.
 */
export function SectionCanvas({ children, className = '', camera, exposure = 1, shadows = false }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const lite = useStore((s) => s.lite)
  const home = useStore((s) => s.route.name === 'home')

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const a = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '110% 0px' })
    const b = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '2% 0px' })
    a.observe(el)
    b.observe(el)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [])

  return (
    <div ref={wrap} className={`stage-canvas ${className}`}>
      {near && (
        <Canvas
          frameloop={visible && home ? 'always' : 'never'}
          dpr={lite ? [1, 1.25] : [1, 1.75]}
          shadows={shadows && !lite}
          camera={{ fov: 32, near: 0.1, far: 120, position: [0, 0, 8], ...camera }}
          gl={{ antialias: !lite, alpha: true, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = exposure
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      )}
    </div>
  )
}

/** Procedural studio HDRI: soft overhead key, long side strips, a low warm kicker. No downloads. */
export function Studio({ mood = 'warm', strength = 1 }: { mood?: 'warm' | 'neutral' | 'cool'; strength?: number }) {
  const theme = useStore((s) => s.theme)
  const lite = useStore((s) => s.lite)
  const tint = mood === 'warm' ? '#ffd9ae' : mood === 'cool' ? '#bcd4ff' : '#ffffff'
  const base = theme === 'dark' ? '#2b2824' : '#a39d92'
  const k = strength * (theme === 'dark' ? 1.7 : 1.9)
  return (
    <Environment key={`${theme}-${mood}-${strength}`} resolution={lite ? 128 : 256} frames={1}>
      <color attach="background" args={[base]} />
      <Lightformer form="rect" intensity={3.2 * k} color="#fff6ea" position={[0, 6, 1]} scale={[9, 5, 1]} />
      <Lightformer form="rect" intensity={2.2 * k} color={tint} position={[-7, 1.5, 2]} scale={[1.6, 9, 1]} />
      <Lightformer form="rect" intensity={1.5 * k} color="#ffffff" position={[7, 2, -1]} scale={[1.2, 8, 1]} />
      <Lightformer form="ring" intensity={1.4 * k} color={tint} position={[3, -3, 6]} scale={3} />
      <Lightformer form="rect" intensity={0.8 * k} color={tint} position={[0, 1, -8]} scale={[12, 2, 1]} />
      <Lightformer form="rect" intensity={1.1 * k} color="#fff3e2" position={[0, 0.5, 9]} scale={[7, 7, 1]} />
      <Lightformer form="rect" intensity={0.9 * k} color="#ffffff" position={[0, -6, 0]} scale={[10, 10, 1]} />
    </Environment>
  )
}

/**
 * Drag-to-rotate with inertia. Attach `bind` handlers to a mesh/group; read `rot` in useFrame.
 * Horizontal drag only claims the gesture on touch when it is clearly horizontal, so page scroll survives.
 */
export function useDragRotate(opts?: { label?: string; speed?: number; clampX?: number; enabled?: () => boolean }) {
  const rot = useRef({ x: 0, y: 0, tx: 0, ty: 0, dragging: false, moved: 0 })
  const { gl } = useThree()
  const setCursor = useStore((s) => s.setCursor)
  const label = opts?.label ?? 'Drag'
  const speed = opts?.speed ?? 0.0065
  const clampX = opts?.clampX ?? 0.6

  useEffect(() => {
    const el = gl.domElement
    let px = 0, py = 0, id = -1
    const down = (e: PointerEvent) => {
      if (opts?.enabled && !opts.enabled()) return
      id = e.pointerId
      px = e.clientX
      py = e.clientY
      rot.current.dragging = true
      rot.current.moved = 0
    }
    const move = (e: PointerEvent) => {
      if (!rot.current.dragging || e.pointerId !== id) return
      const dx = e.clientX - px, dy = e.clientY - py
      px = e.clientX
      py = e.clientY
      rot.current.moved += Math.abs(dx) + Math.abs(dy)
      rot.current.ty += dx * speed
      if (e.pointerType === 'mouse') rot.current.tx = THREE.MathUtils.clamp(rot.current.tx + dy * speed, -clampX, clampX)
    }
    const up = () => (rot.current.dragging = false)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl, speed, clampX])

  useFrame((_, dt) => {
    rot.current.x = damp(rot.current.x, rot.current.tx, 5, dt)
    rot.current.y = damp(rot.current.y, rot.current.ty, 5, dt)
  })

  const bind = useMemo(
    () => ({
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation()
        setCursor(label)
      },
      onPointerOut: () => setCursor(''),
    }),
    [label, setCursor],
  )
  useEffect(() => () => setCursor(''), [setCursor])
  return { rot, bind }
}

/** Normalised pointer (-1..1) over the whole window, damped — for cursor-driven tilt / parallax. */
export function usePointer() {
  const p = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.tx = (e.clientX / window.innerWidth) * 2 - 1
      p.current.ty = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useFrame((_, dt) => {
    p.current.x = damp(p.current.x, p.current.tx, 3, dt)
    p.current.y = damp(p.current.y, p.current.ty, 3, dt)
  })
  return p
}

/** Scales content down on portrait / narrow canvases so nothing is cropped. */
export function useFit(designWidth: number) {
  const { viewport } = useThree()
  return Math.min(1, viewport.width / designWidth)
}
