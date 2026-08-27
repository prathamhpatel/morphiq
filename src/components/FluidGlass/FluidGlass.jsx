import { useRef, useMemo, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import { Image } from '@react-three/drei'
import { easing } from 'maath'
import {
  vertexShader,
  fragmentShader,
  makeGlassUniforms,
  applyGlassParams,
} from '../Glass/glassShader.js'
import morphiqBg from './morphiqbg.png'
import './FluidGlass.css'

/* =========================================================
   FluidGlass  (original — no third-party component code, no
   downloaded models or images)

   The "fluid glass" technique, reimplemented from scratch on the
   same MIT libraries ReactBits happens to use:

     1. The content is portaled into an
        offscreen THREE.Scene and rendered into an FBO each frame.
     2. A fullscreen plane shows that buffer as the background.
     3. A glass lens mesh refracts the SAME buffer via drei's
        MeshTransmissionMaterial — so the refraction matches the
        background exactly, which is what reads as "fluid glass".
     4. The lens eases toward the pointer with maath.

   The lens is procedural (a biconvex LatheGeometry — no .glb) and
   the backdrop is our own artwork, so nothing here is copied.
   ========================================================= */

/* Intrinsic size of morphiqbg.png. Hardcoded rather than read off the
   texture: the cover fit has to be right on the first frame, and the image
   decodes asynchronously. */
const BG_ASPECT = 1212 / 586

// Everything that lives behind the glass.
function Content() {
  const { width: W, height: H } = useThree((s) => s.viewport)

  /* Cover fit — fill the frame on the constrained axis and let the other one
     crop. Scaling to the viewport directly would stretch a 2.07:1 image to
     whatever shape the panel happens to be. The 1.02 kills the hairline of
     background that anti-aliasing leaves along the edges. */
  const wide = W / H > BG_ASPECT
  const w = (wide ? W : H * BG_ASPECT) * 1.02
  const h = (wide ? W / BG_ASPECT : H) * 1.02

  return (
    <group>
      {/* The artwork already carries the wordmark, so it is the whole scene:
          no panel collage, no headline, and no darkening scrim over it. The
          lens has real content to bend wherever the pointer goes. */}
      <Image
        url={morphiqBg}
        position={[0, 0, -1]}
        scale={[w, h]}
        toneMapped={false}
      />
    </group>
  )
}


/* The content scene is rendered into an offscreen buffer, then the shared
   Liquid Glass shader (the calibrated one) runs over that buffer as a
   fullscreen pass — so FluidGlass gets exactly the same glass as the Glass
   component, but refracting a live 3D scene instead of a static photo. */
function FluidScene({ paramsRef }) {
  const matRef = useRef()
  const { size, viewport, camera } = useThree()

  // offscreen target with mipmaps (frost + dispersion blur sample mip levels)
  const target = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
    })
    t.texture.wrapS = t.texture.wrapT = THREE.ClampToEdgeWrapping
    return t
  }, [])

  const [scene] = useState(() => {
    const s = new THREE.Scene()
    s.background = new THREE.Color('#0b0d16')
    return s
  })

  const uniforms = useMemo(() => makeGlassUniforms(), [])

  useFrame((state, delta) => {
    const { gl } = state
    target.setSize(size.width, size.height)

    // 1. render the content scene into the buffer
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)

    // Build the mip chain by hand. A render-target texture with a mipmap
    // minFilter but no chain is INCOMPLETE and samples pure black, and three
    // doesn't reliably generate it for nested renders. The chain is what makes
    // the frost / dispersion LOD blur smooth instead of showing discrete taps.
    const glTex = gl.properties.get(target.texture).__webglTexture
    if (glTex) {
      const ctx = gl.getContext()
      ctx.bindTexture(ctx.TEXTURE_2D, glTex)
      ctx.generateMipmap(ctx.TEXTURE_2D)
      gl.resetState()   // keep three's texture-binding cache in sync
    }

    // 2. drive the glass over it
    const u = matRef.current.uniforms
    u.uTex.value = target.texture
    u.uAspect.value = size.width / size.height
    u.uPx.value = 1 / Math.max(1, gl.domElement.height)
    u.uImgAspect.value = size.width / size.height  // buffer matches the screen
    applyGlassParams(u, paramsRef.current)

    easing.damp2(
      u.uCenter.value,
      [state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5],
      0.09,
      delta
    )
  })

  return (
    <>
      {createPortal(
        <Suspense fallback={null}>
          <Content />
        </Suspense>,
        scene
      )}

      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
    </>
  )
}

export default function FluidGlass() {
  const [lightAngle, setLightAngle] = useState(45)
  const [lightIntensity, setLightIntensity] = useState(100)
  const [refraction, setRefraction] = useState(100)
  const [depth, setDepth] = useState(60)
  const [dispersion, setDispersion] = useState(60)
  const [frost, setFrost] = useState(0)
  const [splay, setSplay] = useState(0)
  const [size, setSize] = useState(20)

  const paramsRef = useRef({})
  paramsRef.current = { lightAngle, lightIntensity, refraction, depth, dispersion, frost, splay, size }

  const row = (label, value, set, min, max, step, suffix = '') => (
    <label className="lens-panel__row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))} />
      <b>{value}{suffix}</b>
    </label>
  )

  return (
    <div className="fluid-glass">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: false, antialias: true }} dpr={[1, 2]}>
        <color attach="background" args={['#0b0d16']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <FluidScene paramsRef={paramsRef} />
      </Canvas>

      <div className="lens-panel">
        <div className="lens-panel__title">FLUID GLASS</div>
        {row('Angle', lightAngle, setLightAngle, -180, 180, 1, '°')}
        {row('Intensity', lightIntensity, setLightIntensity, 0, 100, 1, '%')}
        {row('Refraction', refraction, setRefraction, 0, 100, 1)}
        {row('Depth', depth, setDepth, 0, 100, 1)}
        {row('Dispersion', dispersion, setDispersion, 0, 100, 1)}
        {row('Frost', frost, setFrost, 0, 100, 1)}
        {row('Splay', splay, setSplay, 0, 100, 1)}
        {row('Size', size, setSize, 4, 45, 1)}
      </div>
    </div>
  )
}
