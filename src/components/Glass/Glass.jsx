import { useRef, useMemo, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { easing } from 'maath'
import backdropUrl from './backdrop.png'
import './Glass.css'

/* =========================================================
   Glass  —  a programmable "Liquid Glass" component.

   A screen-space refraction shader (not CSS glassmorphism). A
   rounded-rect glass surface is described by a signed-distance
   field; per pixel the shader bends the background along the
   SDF's normal, splits it into RGB (dispersion), optionally
   frosts it, and adds a directional specular highlight.

   Props map 1:1 to the control panel:
     lightAngle, lightIntensity, refraction, depth,
     dispersion, frost, splay
   ========================================================= */

import { vertexShader, fragmentShader, makeGlassUniforms, applyGlassParams } from './glassShader.js'


function GlassSurface({ paramsRef }) {
  const matRef = useRef()
  const tex = useTexture(backdropUrl)
  const { viewport, size } = useThree()

  useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
    tex.needsUpdate = true
  }, [tex])

  const uniforms = useMemo(() => makeGlassUniforms(), [])

  useFrame((state, delta) => {
    const u = matRef.current.uniforms

    u.uTex.value = tex
    u.uAspect.value = size.width / size.height
    u.uImgAspect.value = tex.image ? tex.image.width / tex.image.height : 1
    applyGlassParams(u, paramsRef.current)

    // circular cursor: the lens follows the pointer with a little easing
    easing.damp2(
      u.uCenter.value,
      [state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5],
      0.09,
      delta
    )
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

export default function Glass() {
  const [lightAngle, setLightAngle] = useState(170)
  const [lightIntensity, setLightIntensity] = useState(100)
  const [refraction, setRefraction] = useState(100)
  const [depth, setDepth] = useState(59)
  const [dispersion, setDispersion] = useState(0)
  const [frost, setFrost] = useState(0)
  const [splay, setSplay] = useState(0)
  const [size, setSize] = useState(18)

  const paramsRef = useRef({})
  paramsRef.current = { lightAngle, lightIntensity, refraction, depth, dispersion, frost, splay, size }

  return (
    <div className="glass-shader">
      <Canvas gl={{ antialias: true }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GlassSurface paramsRef={paramsRef} />
        </Suspense>
      </Canvas>

      <div className="glass-panel">
        <div className="glass-panel__title">LIQUID GLASS</div>

        <div className="glass-panel__group">Light</div>
        <label className="glass-panel__row">
          <span>Angle</span>
          <input type="range" min="-180" max="180" step="1" value={lightAngle}
            onChange={(e) => setLightAngle(Number(e.target.value))} />
          <b>{lightAngle}°</b>
        </label>
        <label className="glass-panel__row">
          <span>Intensity</span>
          <input type="range" min="0" max="100" step="1" value={lightIntensity}
            onChange={(e) => setLightIntensity(Number(e.target.value))} />
          <b>{lightIntensity}%</b>
        </label>

        <label className="glass-panel__row">
          <span>Refraction</span>
          <input type="range" min="0" max="100" step="1" value={refraction}
            onChange={(e) => setRefraction(Number(e.target.value))} />
          <b>{refraction}</b>
        </label>
        <label className="glass-panel__row">
          <span>Depth</span>
          <input type="range" min="0" max="100" step="1" value={depth}
            onChange={(e) => setDepth(Number(e.target.value))} />
          <b>{depth}</b>
        </label>
        <label className="glass-panel__row">
          <span>Dispersion</span>
          <input type="range" min="0" max="100" step="1" value={dispersion}
            onChange={(e) => setDispersion(Number(e.target.value))} />
          <b>{dispersion}</b>
        </label>
        <label className="glass-panel__row">
          <span>Frost</span>
          <input type="range" min="0" max="100" step="1" value={frost}
            onChange={(e) => setFrost(Number(e.target.value))} />
          <b>{frost}</b>
        </label>
        <label className="glass-panel__row">
          <span>Splay</span>
          <input type="range" min="0" max="100" step="1" value={splay}
            onChange={(e) => setSplay(Number(e.target.value))} />
          <b>{splay}</b>
        </label>
        <label className="glass-panel__row">
          <span>Size</span>
          <input type="range" min="4" max="45" step="1" value={size}
            onChange={(e) => setSize(Number(e.target.value))} />
          <b>{size}</b>
        </label>
      </div>
    </div>
  )
}
