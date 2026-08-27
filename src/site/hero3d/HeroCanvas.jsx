import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { easing } from 'maath'
import {
  vertexShader,
  fragmentShader,
} from '../../../packages/prism-glass/src/shader.js'
import { loadSdfTexture } from '../../../packages/prism-glass/src/sdf.js'
import cursorMask from '../../components/FluidGlass/cursor.svg'
import { collectNodes } from './glMirror.js'
import { makeBackdropMaterial } from './backdropMaterial.js'
import { makeRoundedRect } from './roundedRect.js'

/* =========================================================
   HeroCanvas
   The whole landing page, drawn in WebGL so the Prism Glass
   lens can bend every part of it. A shader samples a texture
   and can never see the DOM, so anything the lens must touch
   has to live in the scene.

   The DOM is still the source of truth: it lays out, wraps,
   selects, reads out to screen readers and takes the clicks.
   Everything tagged `data-gl` is mirrored here each frame —
   see glMirror.js. Adding a section is markup, not shader
   plumbing.

   Two passes run over the rendered scene: the svg-masked
   cursor lens, which roams the whole viewport, and a static
   pill under the nav bar.
   ========================================================= */

const CURSOR_LENS = {
  size: 7,
  lightAngle: 53,
  lightIntensity: 60,
  refraction: 45,
  depth: 15,
  dispersion: 71,
  frost: 0,
  splay: 0,
}

const NAV_LENS = {
  lightAngle: 45,
  lightIntensity: 100,
  refraction: 100,
  depth: 61,
  dispersion: 33,
  frost: 0,
  splay: 0,
}

const px = (v) => (v ? parseFloat(v) : 0)

/** The page boxes the backdrop and the nav lens are pinned to. */
function readFrame() {
  const card = document.querySelector('.site-hero__card')
  const below = document.querySelector('.site-canvas')
  const header = document.querySelector('.site-header')
  const site = document.querySelector('.site')
  if (!card) return null

  const cr = card.getBoundingClientRect()
  const expand = site
    ? parseFloat(getComputedStyle(site).getPropertyValue('--expand')) || 0
    : 0

  return {
    card: [cr.left, cr.top, cr.right, cr.bottom],
    radius: px(getComputedStyle(card).borderTopLeftRadius),
    below: below ? below.getBoundingClientRect().top : 1e6,
    belowH: below ? below.getBoundingClientRect().height : 4050,
    header: header ? header.getBoundingClientRect() : null,
    /* --in is an unregistered custom property, so getPropertyValue returns the
       literal clamp() token rather than a number — recompute from --expand. */
    reveal: Math.min(1, Math.max(0, expand / 0.7)),
  }
}

function Content({ nodes, backdrop = null }) {
  const { viewport } = useThree()
  const W = viewport.width
  const H = viewport.height

  const textRefs = useRef([])
  const surfRefs = useRef([])
  const imgRefs = useRef([])

  const surfaceMats = useMemo(
    () =>
      nodes.map((n) =>
        n.kind === 'surface' ? makeRoundedRect(n.color) : null
      ),
    [nodes]
  )

  /* Image nodes load asynchronously, so they arrive after the first frames.
     Each plane stays hidden until its own texture is in. */
  const [imageTex, setImageTex] = useState({})

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let live = true
    const loaded = []

    nodes.forEach((n, i) => {
      if (n.kind !== 'image' || !n.src) return
      loader.load(n.src, (t) => {
        if (!live) return t.dispose()
        t.colorSpace = THREE.SRGBColorSpace
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        t.generateMipmaps = true
        t.anisotropy = 8
        loaded.push(t)
        setImageTex((m) => ({ ...m, [i]: t }))
      })
    })

    return () => {
      live = false
      loaded.forEach((t) => t.dispose())
      setImageTex({})
    }
  }, [nodes])

  useFrame(() => {
    const f = backdrop ? readFrame() : null
    if (f) {
      const u = backdrop.uniforms
      u.uRes.value.set(W, H)
      u.uCard.value.set(...f.card)
      u.uRadius.value = f.radius
      u.uBelow.value = f.below
      u.uBelowH.value = f.belowH
    }

    const pad = 200
    nodes.forEach((n, i) => {
      const r = n.el.getBoundingClientRect()
      const off = r.bottom < -pad || r.top > H + pad || r.width === 0

      if (n.kind === 'text') {
        const t = textRefs.current[i]
        if (!t) return
        t.visible = !off
        if (off) return
        const x = n.align === 'center' ? r.left + r.width / 2 : r.left
        t.position.set(x - W / 2, H / 2 - r.top, n.top ? 0.6 : 0.03)

        if (n.live) {
          const size = parseFloat(getComputedStyle(n.el).fontSize) || n.size
          if (Math.abs(t.fontSize - size) > 0.1) {
            t.fontSize = size
            t.sync?.()
          }
        }
      } else if (n.kind === 'image') {
        const m = imgRefs.current[i]
        if (!m) return
        m.visible = !off && !!imageTex[i]
        if (off) return
        /* Same z as text so the mark sits with the wordmark it replaced,
           above the page sections rather than behind them. */
        m.position.set(
          r.left + r.width / 2 - W / 2,
          H / 2 - (r.top + r.height / 2),
          n.top ? 0.6 : 0.03
        )
        m.scale.set(r.width, r.height, 1)
      } else {
        const m = surfRefs.current[i]
        if (!m) return
        m.visible = !off
        if (off) return
        m.position.set(
          r.left + r.width / 2 - W / 2,
          H / 2 - (r.top + r.height / 2),
          n.top ? 0.5 : 0.01
        )
        m.scale.set(r.width, r.height, 1)
        const mat = surfaceMats[i]
        if (mat) {
          mat.uniforms.uSize.value.set(r.width, r.height)
          mat.uniforms.uRadius.value = n.radius
          mat.uniforms.uOpacity.value = n.opacity
        }
      }
    })
  })

  return (
    <group>
      {backdrop ? (
        <mesh position={[0, 0, -1]}>
          <planeGeometry args={[W, H]} />
          <primitive object={backdrop} attach="material" />
        </mesh>
      ) : null}

      {nodes.map((n, i) =>
        n.kind === 'text' ? (
          <Text
            key={i}
            ref={(el) => (textRefs.current[i] = el)}
            font={n.font}
            fontSize={n.size}
            lineHeight={n.lineHeight}
            letterSpacing={n.letterSpacing}
            maxWidth={n.maxWidth}
            textAlign={n.align}
            anchorX={n.align === 'center' ? 'center' : 'left'}
            anchorY={n.anchorY}
            color={n.color}
            sdfGlyphSize={n.size > 60 ? 128 : 64}
          >
            {n.text}
          </Text>
        ) : n.kind === 'image' ? (
          <mesh key={i} ref={(el) => (imgRefs.current[i] = el)} visible={false}>
            <planeGeometry />
            <meshBasicMaterial
              map={imageTex[i] || null}
              transparent
              toneMapped={false}
            />
          </mesh>
        ) : (
          <mesh key={i} ref={(el) => (surfRefs.current[i] = el)}>
            <planeGeometry />
            <primitive object={surfaceMats[i]} attach="material" />
          </mesh>
        )
      )}
    </group>
  )
}

function makeTarget() {
  const t = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
  })
  t.texture.wrapS = t.texture.wrapT = THREE.ClampToEdgeWrapping
  return t
}

function makeUniforms() {
  return {
    uTex: { value: null },
    uAspect: { value: 1 },
    uImgAspect: { value: 1 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uSize: { value: new THREE.Vector2(0.28, 0.34) },
    uRadius: { value: 0.07 },
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
  }
}

function apply(u, p) {
  u.uLightAngle.value = (p.lightAngle * Math.PI) / 180
  u.uLightInt.value = p.lightIntensity / 100
  u.uRefraction.value = p.refraction / 100
  u.uDepth.value = p.depth / 100
  u.uDispersion.value = p.dispersion / 100
  u.uFrost.value = p.frost / 100
  u.uSplay.value = p.splay / 100
}

function Scene({ nodes }) {
  const { size, viewport, camera, gl } = useThree()

  /* The canvas is pointer-events:none so the page stays usable, which means
     R3F's own pointer never updates — track it off the window. That is also
     what lets the lens roam the entire viewport. */
  const pointer = useRef([0.5, 0.5])
  useMemo(() => {
    if (typeof window === 'undefined') return
    const onMove = (e) => {
      pointer.current = [
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight,
      ]
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const backdrop = useMemo(() => makeBackdropMaterial(), [])
  const cursorU = useMemo(makeUniforms, [])
  const navU = useMemo(makeUniforms, [])
  const cursorMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: cursorU,
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
      }),
    [cursorU]
  )
  const navMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: navU,
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
      }),
    [navU]
  )

  const content = useMemo(() => makeTarget(), [])
  const stage = useMemo(() => makeTarget(), [])
  const bufSize = useMemo(() => new THREE.Vector2(), [])

  const [scene] = useState(() => {
    const s = new THREE.Scene()
    s.background = new THREE.Color('#ffffff')
    return s
  })

  /* The header is drawn in its own scene, laid over the glass AFTER the pill
     pass — inside the page scene the lens would refract the wordmark and the
     links along with everything else behind it. */
  const [overlay] = useState(() => new THREE.Scene())

  const pageNodes = useMemo(() => nodes.filter((n) => !n.top), [nodes])
  const topNodes = useMemo(() => nodes.filter((n) => n.top), [nodes])

  const [mask, setMask] = useState(null)
  useMemo(() => {
    loadSdfTexture(cursorMask).then(setMask).catch(() => {})
  }, [])

  const quad = useMemo(() => {
    const s = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1))
    s.add(mesh)
    return { scene: s, camera: cam, mesh }
  }, [])

  const mip = (target) => {
    const tex = gl.properties.get(target.texture).__webglTexture
    if (!tex) return
    const ctx = gl.getContext()
    ctx.bindTexture(ctx.TEXTURE_2D, tex)
    ctx.generateMipmap(ctx.TEXTURE_2D)
    gl.resetState()
  }

  useFrame((state, delta) => {
    /* Buffers in DEVICE pixels. Sized in CSS px they get upscaled to the
       backbuffer on the way out and every glyph softens. */
    const buf = gl.getDrawingBufferSize(bufSize)
    content.setSize(buf.x, buf.y)
    stage.setSize(buf.x, buf.y)

    gl.setRenderTarget(content)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    mip(content)

    const aspect = size.width / size.height
    const pxUnit = 1 / Math.max(1, buf.y)
    const f = readFrame()

    /* Order matters: the nav pill goes down first and the cursor runs LAST,
       so the cursor sits ON TOP of the bar. Run it the other way and the pill
       pass re-refracts the cursor and swallows it as it crosses the header. */

    const nu = navMat.uniforms
    nu.uTex.value = content.texture
    nu.uAspect.value = aspect
    nu.uImgAspect.value = aspect
    nu.uPx.value = pxUnit
    nu.uShape.value = 1
    nu.uUseMask.value = 0

    if (f?.header) {
      const h = f.header
      const on = f.reveal > 0.01
      const halfW = on ? h.width / (2 * size.height) : 0
      const halfH = on ? h.height / (2 * size.height) : 0
      nu.uSize.value.set(halfW, halfH)
      nu.uCorner.value = Math.min(halfW, halfH)
      nu.uRadius.value = Math.min(halfW, halfH)
      nu.uCenter.value.set(
        (h.left + h.width / 2) / size.width,
        1 - (h.top + h.height / 2) / size.height
      )
      apply(nu, {
        ...NAV_LENS,
        refraction: NAV_LENS.refraction * f.reveal,
        lightIntensity: NAV_LENS.lightIntensity * f.reveal,
      })
    }

    quad.mesh.material = navMat
    gl.setRenderTarget(stage)
    gl.render(quad.scene, quad.camera)

    /* The header goes on top of the glass, not through it. Keep the colour
       but drop the depth the fullscreen pass left behind, or it occludes
       everything the overlay tries to draw. */
    gl.autoClear = false
    gl.clear(false, true, false)
    gl.render(overlay, camera)
    gl.autoClear = true

    gl.setRenderTarget(null)
    mip(stage)

    const cu = cursorMat.uniforms
    cu.uTex.value = stage.texture
    cu.uAspect.value = aspect
    cu.uImgAspect.value = aspect
    cu.uPx.value = pxUnit
    cu.uShape.value = 0
    cu.uRadius.value = CURSOR_LENS.size / 100
    cu.uUseMask.value = mask ? 1 : 0
    cu.uMask.value = mask ? mask.texture : null
    cu.uMaskAspect.value = mask ? mask.aspect : 1
    apply(cu, CURSOR_LENS)

    /* The mask is centred on uCenter, but an arrow points from its top-left —
       shift the lens so the TIP lands on the real pointer. Measured against
       the render, not derived: the glyph does not fill its box. */
    const r = CURSOR_LENS.size / 100
    easing.damp2(
      cu.uCenter.value,
      [pointer.current[0] + (r * 0.48) / aspect, pointer.current[1] - r * 0.64],
      0.09,
      delta
    )
  })

  return (
    <>
      {createPortal(<Content nodes={pageNodes} backdrop={backdrop} />, scene)}
      {createPortal(<Content nodes={topNodes} />, overlay)}

      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <primitive object={cursorMat} attach="material" />
      </mesh>
    </>
  )
}

export default function HeroCanvas() {
  const [nodes, setNodes] = useState([])

  // Re-read the mirrored elements when the page can reflow under them.
  useEffect(() => {
    const collect = () => setNodes(collectNodes())
    collect()
    document.fonts?.ready.then(collect)
    window.addEventListener('resize', collect)
    return () => window.removeEventListener('resize', collect)
  }, [])

  return (
    <div className="site-hero3d" aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], zoom: 1 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene nodes={nodes} />
      </Canvas>
    </div>
  )
}
