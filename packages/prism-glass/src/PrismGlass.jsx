import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { easing } from 'maath'
import { vertexShader, fragmentShader } from './shader.js'
import { loadSdfTexture } from './sdf.js'

const SHAPES = { circle: 0, rect: 1, pill: 1, cursor: 2 }

// Stands in for `image` when the caller supplies a `texture` directly, so the
// loader hook stays unconditional.
const BLANK_PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

// Normalise the `size` prop: number → circle radius; [w,h] → rect/pill half-extents.
function resolveGeometry({ shape, size, radius }) {
  if (shape === 'cursor') {
    const r = (typeof size === 'number' ? size : 20) / 100
    return { shape: 2, radius: r, half: [r, r], corner: r }
  }
  if (shape === 'circle') {
    const r = (typeof size === 'number' ? size : 20) / 100
    return { shape: 0, radius: r, half: [r, r], corner: r }
  }
  const [w, h] = Array.isArray(size) ? size : [size ?? 28, size ?? 34]
  const half = [w / 100, h / 100]
  const corner =
    shape === 'pill' ? Math.min(half[0], half[1]) : (radius ?? 7) / 100
  return { shape: 1, radius: Math.min(half[0], half[1]), half, corner }
}

function Surface({ image, mask, texture, optionsRef }) {
  const matRef = useRef()
  const loaded = useTexture(image)
  const tex = texture || loaded
  const { viewport, size } = useThree()

  useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
    tex.needsUpdate = true
  }, [tex])

  const uniforms = useMemo(
    () => ({
      uTex: { value: null },
      uAspect: { value: 1 },
      uImgAspect: { value: 1 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uSize: { value: new THREE.Vector2(0.28, 0.34) },
      uRadius: { value: 0.2 },
      uCorner: { value: 0.07 },
      uShape: { value: 0 },
      uPx: { value: 0.001 },
      uMask: { value: null },
      uUseMask: { value: 0 },
      uMaskAspect: { value: 1 },
      uLightAngle: { value: 0 },
      uLightInt: { value: 1 },
      uRefraction: { value: 1 },
      uDepth: { value: 0.6 },
      uDispersion: { value: 0 },
      uFrost: { value: 0 },
      uSplay: { value: 0 },
      uAlpha: { value: 0 },
    }),
    []
  )

  const [sdf, setSdf] = useState(null)
  useEffect(() => {
    if (!mask) { setSdf(null); return }
    let alive = true
    loadSdfTexture(mask)
      .then((r) => { if (alive) setSdf(r) })
      .catch(() => { if (alive) setSdf(null) })
    return () => { alive = false }
  }, [mask])

  useFrame((state, delta) => {
    const u = matRef.current.uniforms
    const o = optionsRef.current
    const g = resolveGeometry(o)

    u.uTex.value = tex
    u.uAlpha.value = o.transparent ? 1 : 0
    u.uAspect.value = size.width / size.height
    u.uPx.value = 1 / Math.max(1, state.gl.domElement.height)
    u.uImgAspect.value = tex.image ? tex.image.width / tex.image.height : 1

    u.uShape.value = g.shape
    u.uUseMask.value = sdf ? 1 : 0
    u.uMask.value = sdf ? sdf.texture : null
    u.uMaskAspect.value = sdf ? sdf.aspect : 1
    u.uRadius.value = g.radius
    u.uCorner.value = g.corner
    u.uSize.value.set(g.half[0], g.half[1])

    u.uLightAngle.value = (o.lightAngle * Math.PI) / 180
    u.uLightInt.value = o.lightIntensity / 100
    u.uRefraction.value = o.refraction / 100
    u.uDepth.value = o.depth / 100
    u.uDispersion.value = o.dispersion / 100
    u.uFrost.value = o.frost / 100
    u.uSplay.value = o.splay / 100

    const target =
      o.mode === 'cursor'
        ? [state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5]
        : [clamp01(o.position[0]), clamp01(o.position[1])]

    if (o.follow > 0) {
      easing.damp2(u.uCenter.value, target, o.follow, delta)
    } else {
      u.uCenter.value.set(target[0], target[1])
    }
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        premultipliedAlpha
      />
    </mesh>
  )
}

/**
 * PrismGlass — a programmable liquid-glass refraction surface.
 * Renders `image` full-bleed and bends it through a glass lens.
 */
export default function PrismGlass({
  image = BLANK_PX,
  mask,
  texture,
  transparent = false,
  shape = 'circle',
  mode = 'cursor',
  size = 20,
  radius = 7,
  position = [0.5, 0.5],
  follow = 0.09,
  refraction = 100,
  depth = 60,
  dispersion = 0,
  frost = 0,
  splay = 0,
  lightAngle = 45,
  lightIntensity = 100,
  dpr = [1, 2],
  className,
  style,
}) {
  const optionsRef = useRef({})
  optionsRef.current = {
    shape, mode, size, radius, position, follow,
    refraction, depth, dispersion, frost, splay,
    lightAngle, lightIntensity, transparent,
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
        dpr={dpr}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Surface image={image} mask={mask} texture={texture} optionsRef={optionsRef} />
        </Suspense>
      </Canvas>
    </div>
  )
}
