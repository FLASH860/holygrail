import { useFrame, useThree } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { media } from '@/config/media'
import { useStore } from '@/lib/store'
import { damp, easeInOut } from '@/lib/scroll'
import { usePointer } from '@/three/SectionCanvas'

const FOV = 32
const CAM_Z = 10
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
/** visible height at world depth z for the resting camera */
const visH = (z: number) => 2 * TAN * (CAM_Z - z)

const THEME = {
  dark: { far: '#8a5a36', mid: '#4a3122', near: '#231811', grass: '#0f0b08', text: '#f1e6d2', rim: '#ffb469', halo: '#ff9d4d' },
  light: { far: '#aebcc4', mid: '#7f8f96', near: '#4f5b5e', grass: '#2b302c', text: '#1c2022', rim: '#fff1d6', halo: '#6b5a3c' },
}

const personFrag = /* glsl */ `
uniform sampler2D map; uniform float uP; uniform float uIntro; uniform vec2 uTexel; uniform vec3 uRim;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(map, vUv);
  // the light walks around him as you scroll: from behind his shoulder to a full wrap
  float ang = mix(0.5, 2.5, uP);
  vec2 dir = vec2(cos(ang), sin(ang));
  float near = texture2D(map, vUv + dir * uTexel * 5.0).a;
  float far  = texture2D(map, vUv + dir * uTexel * 16.0).a;
  float wrap = texture2D(map, vUv - dir * uTexel * 10.0).a;
  float rim = clamp(c.a - near, 0.0, 1.0) * 0.8 + clamp(c.a - far, 0.0, 1.0) * 0.55;
  float fill = clamp(c.a - wrap, 0.0, 1.0) * 0.35 * uP;
  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 col = c.rgb * mix(0.62, 1.1, uP) * mix(0.25, 1.0, uIntro);
  col += uRim * (rim * (0.18 + 1.25 * uP) + fill) * (0.35 + lum * 1.6);
  // a slow key light sweeping across the face
  float sweep = exp(-pow((vUv.x - mix(0.82, 0.42, uP)) * 3.2, 2.0)) * smoothstep(0.25, 0.9, vUv.y);
  col += c.rgb * uRim * sweep * 0.55 * uP;
  gl_FragColor = vec4(col, c.a * uIntro);
  #include <colorspace_fragment>
}`
const haloFrag = /* glsl */ `
uniform float uP; uniform vec3 uColor; uniform float uIntro;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p * vec2(1.0, 1.15));
  float core = exp(-d * d * 7.0);
  float veil = exp(-d * d * 2.2) * 0.5;
  float a = (core * (0.05 + 0.3 * uP) + veil * (0.03 + 0.12 * uP)) * uIntro * smoothstep(1.0, 0.5, d);
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`
const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

export default function HeroScene({ progress }: { progress: RefObject<number> }) {
  const theme = useStore((s) => s.theme)
  const ready = useStore((s) => s.ready)
  const lite = useStore((s) => s.lite)
  const { size, camera } = useThree()
  const aspect = size.width / size.height
  const pal = THEME[theme]
  const seq = media.me.heroSequence
  const tex = useTexture({
    skyDark: media.hero.sky.dark,
    skyLight: media.hero.sky.light,
    far: media.hero.ridgeFar,
    mid: media.hero.ridgeMid,
    near: media.hero.ridgeNear,
    grass: media.hero.foreground,
    me: media.me.hero.src,
  })
  const frames = useTexture(seq?.frames ?? [])
  useMemo(() => {
    ;[...Object.values(tex), ...frames].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
    })
  }, [tex, frames])

  const pointer = usePointer()
  const state = useRef({ p: 0, intro: 0 })
  const person = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const name = useRef<THREE.Group>(null)
  const grass = useRef<THREE.Mesh>(null)
  const nearRef = useRef<THREE.Mesh>(null)
  const textRef = useRef<THREE.Mesh>(null)

  const personMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: personFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: tex.me }, uP: { value: 0 }, uIntro: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / media.me.hero.width, 1 / media.me.hero.height) }, uRim: { value: new THREE.Color() } },
      }),
    [tex.me],
  )
  const haloMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: haloFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, uniforms: { uP: { value: 0 }, uIntro: { value: 0 }, uColor: { value: new THREE.Color() } } }),
    [],
  )
  personMat.uniforms.uRim.value.set(pal.rim)
  haloMat.uniforms.uColor.value.set(pal.halo)

  // layer geometry, sized against the resting camera so everything covers the frame with parallax margin
  const L = useMemo(() => {
    const layer = (z: number, imgAspect: number, cover: number, minHFrac: number, sink: number) => {
      const h = visH(z), w = h * aspect
      const width = Math.max(w * cover, h * minHFrac * imgAspect)
      const height = width / imgAspect
      return { z, width, height, y: -h / 2 + height / 2 - h * sink, h, w }
    }
    const pz = -3
    const ph = visH(pz), pw = ph * aspect
    const pa = media.me.hero.width / media.me.hero.height
    const personH = Math.min(ph * 0.74, (pw * 1.5) / pa)
    return {
      sky: { z: -40, h: visH(-40) * 1.3, w: Math.max(visH(-40) * aspect * 1.3, visH(-40) * 1.3 * 1.92) },
      far: layer(-24, 2880 / 820, 1.25, 0.5, -0.02),
      mid: layer(-9, 2880 / 760, 1.25, 0.42, 0.04),
      near: layer(-1.4, 2880 / 620, 1.25, 0.3, 0.12),
      grass: layer(1.6, 2880 / 760, 1.3, 0.32, 0.14),
      text: { z: -13, h: visH(-13), w: visH(-13) * aspect },
      person: { z: pz, height: personH, width: personH * pa, y: -ph / 2 + personH / 2 - ph * 0.05, h: ph },
    }
  }, [aspect])

  useFrame((_, dt) => {
    const s = state.current
    s.p = damp(s.p, progress.current ?? 0, 4, dt)
    s.intro = damp(s.intro, ready ? 1 : 0, 1.6, dt)
    const p = easeInOut(Math.min(1, s.p * 1.15))
    const i = s.intro
    const px = lite ? 0 : pointer.current.x, py = lite ? 0 : pointer.current.y

    // camera: slow push-in, slight rise; the pointer shifts it for real depth parallax
    camera.position.set(px * 0.42, 0.12 + p * 0.5 + py * 0.22, CAM_Z + (1 - i) * 1.6 - p * 2.3)
    camera.lookAt(px * 0.1, 0.15 + p * 0.55, -14)

    personMat.uniforms.uP.value = p
    personMat.uniforms.uIntro.value = Math.min(1, i * 1.2)
    haloMat.uniforms.uP.value = p
    haloMat.uniforms.uIntro.value = i
    if (seq && frames.length) personMat.uniforms.map.value = frames[Math.min(frames.length - 1, Math.floor(p * frames.length))]

    if (person.current) {
      person.current.rotation.y = (p - 0.25) * 0.16 + px * 0.05 // he turns, a few degrees
      person.current.scale.setScalar(1 + p * 0.05)
    }
    if (halo.current) halo.current.scale.setScalar(1 + p * 0.35)
    // layers separate in depth
    if (name.current) name.current.position.y = L.text.h * (0.21 + p * 0.05) - (1 - i) * 1.2
    if (grass.current) grass.current.position.y = L.grass.y - p * L.grass.h * 0.2
    if (nearRef.current) nearRef.current.position.y = L.near.y - p * L.near.h * 0.07
    if (textRef.current) (textRef.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, i * 1.1)
  })

  const fit = (t: THREE.Mesh) => {
    const bb = t.geometry.boundingBox
    if (!bb) return
    const width = bb.max.x - bb.min.x
    if (width > 0) t.scale.setScalar((L.text.w * 0.9) / width)
  }

  return (
    <>
      <mesh position={[0, L.sky.h * 0.06, L.sky.z]} renderOrder={0}>
        <planeGeometry args={[L.sky.w, L.sky.h]} />
        <meshBasicMaterial map={theme === 'dark' ? tex.skyDark : tex.skyLight} toneMapped={false} depthWrite={false} />
      </mesh>

      <Plane l={L.far} map={tex.far} color={pal.far} order={1} />

      <group ref={name} position={[0, 0, L.text.z]}>
        <Text ref={textRef} font="/fonts/bodoni-moda.woff" fontSize={1} letterSpacing={-0.015} anchorX="center" anchorY="middle" renderOrder={2} onSync={fit}>
          KANISHQ
          <meshBasicMaterial color={pal.text} toneMapped={false} transparent depthWrite={false} />
        </Text>
      </group>

      <Plane l={L.mid} map={tex.mid} color={pal.mid} order={3} />

      <mesh ref={halo} position={[L.person.width * 0.02, L.person.y + L.person.height * 0.2, L.person.z - 0.4]} renderOrder={4} material={haloMat}>
        <planeGeometry args={[L.person.height * 2.1, L.person.height * 2.1]} />
      </mesh>
      <mesh ref={person} position={[0, L.person.y, L.person.z]} renderOrder={5} material={personMat}>
        <planeGeometry args={[L.person.width, L.person.height]} />
      </mesh>

      <Plane ref={nearRef} l={L.near} map={tex.near} color={pal.near} order={6} />
      <Plane ref={grass} l={L.grass} map={tex.grass} color={pal.grass} order={7} />
    </>
  )
}

function Plane({ l, map, color, order, ref }: { l: { z: number; width: number; height: number; y: number }; map: THREE.Texture; color: string; order: number; ref?: RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={ref} position={[0, l.y, l.z]} renderOrder={order}>
      <planeGeometry args={[l.width, l.height]} />
      <meshBasicMaterial map={map} color={color} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
