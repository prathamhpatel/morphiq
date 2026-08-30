import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { bayerMatrix, DIFFUSION_KERNELS, ORDERED_SIZES } from './dither.js'

gsap.registerPlugin(useGSAP)

/* =========================================================
   Bitmap engine
   The shared render pipeline behind BitmapNoise, BitmapImage and
   BitmapText. Everything except "how bright is this cell?" lives
   here; that one question is answered by a source (see sources.js).

   Per frame, in four passes over a cols×rows grid:

     1  warp     — per-cell source coordinates, displaced by the
                   pointer and by an optional flow field
     2  source   — luminance 0..1 at those coordinates
     3  tone     — contrast, brightness, invert, cursor lift
     4  dither   — quantise to `levels`, then colour into an
                   ImageData at *grid* resolution

   The last step is the one that makes this cheap enough to run on
   the CPU at full-bleed: we never draw cells. We write one pixel
   per cell into a cols×rows ImageData, then let the GPU blow it up
   with `imageSmoothingEnabled = false`. A 4px cell on a 1440×900
   viewport is a 360×225 buffer — 81,000 pixels, not 81,000 draw
   calls — and the nearest-neighbour upscale is free.
   ========================================================= */

const MAX_DPR = 2

/**
 * Resolve any CSS colour — hex, rgb(), hsl(), a named colour, `transparent` —
 * to [r, g, b, a]. Painting onto a cleared 1×1 canvas means the browser does
 * the parsing, so we inherit every colour syntax it supports for free.
 */
function resolveColor(css) {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = css == null ? 'transparent' : css
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}

/**
 * A `levels`-entry ramp from background to foreground, packed as native-endian
 * RGBA words. Writing one Uint32 per cell instead of four bytes roughly
 * quarters the colour pass; building the words through a byte view rather than
 * shifting keeps it correct on big-endian machines.
 */
function buildPalette(levels, color, background) {
  const [fr, fg, fb, fa] = resolveColor(color)
  const [br, bg_, bb, ba] = resolveColor(background)
  const pal = new Uint32Array(levels)
  const bytes = new Uint8Array(4)
  const word = new Uint32Array(bytes.buffer)
  for (let i = 0; i < levels; i++) {
    const t = levels === 1 ? 1 : i / (levels - 1)
    bytes[0] = br + (fr - br) * t
    bytes[1] = bg_ + (fg - bg_) * t
    bytes[2] = bb + (fb - bb) * t
    bytes[3] = ba + (fa - ba) * t
    pal[i] = word[0]
  }
  return pal
}

/**
 * Wires a source to a canvas: sizing, the pointer, the gsap ticker, and the
 * four render passes. Returns imperative handles the calling component fires
 * from its own effects — the same live-params pattern the rest of the library
 * uses, so changing a prop never tears down the loop.
 *
 *   rebuild()  grid geometry changed (cell size, element resized)
 *   refresh()  the source's own input changed (new image, new text)
 *   repaint()  palette changed (colour, background, levels)
 */
export function useBitmapField({ rootRef, canvasRef, params, createSource }) {
  const rebuild = useRef(() => {})
  const refresh = useRef(() => {})
  const repaint = useRef(() => {})

  useGSAP(
    () => {
      const canvas = canvasRef.current
      const root = rootRef.current
      const ctx = canvas.getContext('2d')
      const source = createSource()

      // The grid-resolution buffer everything is composed into.
      const grid = document.createElement('canvas')
      const gctx = grid.getContext('2d')

      let cols = 0
      let rows = 0
      let count = 0
      let w = 0
      let h = 0
      let dpr = 1
      let cellPx = 4

      let lum = new Float32Array(0)
      let wx = new Float32Array(0)
      let wy = new Float32Array(0)
      let lift = new Float32Array(0)
      let err = new Float32Array(0)
      let idx = new Uint8Array(0)
      let imageData = null
      let out32 = null
      let palette = new Uint32Array(2)
      let ready = false

      // Own clock: integrating our own delta means changing `speed` eases into
      // the new rate instead of jumping the field to a different phase.
      let clock = 0

      const cursor = { x: -1e5, y: -1e5 }
      const xTo = gsap.quickTo(cursor, 'x', { duration: 0.28, ease: 'power3' })
      const yTo = gsap.quickTo(cursor, 'y', { duration: 0.28, ease: 'power3' })

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')

      const makePalette = () => {
        const p = params.current
        palette = buildPalette(Math.max(2, p.levels | 0), p.color, p.background)
      }
      repaint.current = () => {
        makePalette()
        draw()
      }

      const refreshSource = () => {
        const result = source.prepare(cols, rows)
        ready = result === true
        // 'ready' | 'empty' | 'tainted' — only the image component listens, to
        // tell "still loading" apart from "this file can never be read".
        params.current.onStatus?.(result === true ? 'ready' : result || 'empty')
        draw()
      }
      refresh.current = refreshSource

      const build = () => {
        const p = params.current
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
        w = root.clientWidth
        h = root.clientHeight
        if (w < 1 || h < 1) return

        cellPx = Math.max(1, p.cell)
        cols = Math.max(1, Math.ceil(w / cellPx))
        rows = Math.max(1, Math.ceil(h / cellPx))
        count = cols * rows

        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
        ctx.imageSmoothingEnabled = false

        grid.width = cols
        grid.height = rows
        imageData = gctx.createImageData(cols, rows)
        out32 = new Uint32Array(imageData.data.buffer)

        lum = new Float32Array(count)
        wx = new Float32Array(count)
        wy = new Float32Array(count)
        lift = new Float32Array(count)
        err = new Float32Array(count)
        idx = new Uint8Array(count)

        makePalette()
        refreshSource()
      }
      rebuild.current = build

      const animating = () => {
        const p = params.current
        if (p.paused) return false
        if (p.respectReducedMotion && reduced?.matches) return false
        return true
      }

      /* ---- pass 1: warped source coordinates, in cell space ---- */
      const warpPass = () => {
        const p = params.current
        const R = p.cursorRadius / cellPx
        const push = p.cursorStrength / cellPx
        const cx = cursor.x / cellPx
        const cy = cursor.y / cellPx
        const active = R > 0 && (push !== 0 || p.cursorLift !== 0) && cursor.x > -1e4
        const r2 = R * R
        const flow = p.warp
        const t = clock

        for (let y = 0, i = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++, i++) {
            let sx = x
            let sy = y
            let f = 0

            if (active) {
              const dx = x - cx
              const dy = y - cy
              const d2 = dx * dx + dy * dy
              if (d2 < r2) {
                const d = Math.sqrt(d2) || 1e-4
                f = 1 - d / R
                f *= f
                const s = (f * push) / d
                sx += dx * s
                sy += dy * s
              }
            }

            // Cheap analytic flow: two crossed waves read as a slow liquid
            // shear without needing a second noise texture per frame.
            if (flow !== 0) {
              sx += Math.sin(sy * 0.09 + t * 0.9) * flow
              sy += Math.cos(sx * 0.075 - t * 0.7) * flow
            }

            wx[i] = sx
            wy[i] = sy
            lift[i] = f
          }
        }
      }

      /* ---- pass 3: tone ---- */
      const tonePass = () => {
        const p = params.current
        const contrast = p.contrast
        const bright = p.brightness
        const cl = p.cursorLift
        const inv = p.invert
        for (let i = 0; i < count; i++) {
          let v = (lum[i] - 0.5) * contrast + 0.5 + bright + lift[i] * cl
          if (inv) v = 1 - v
          lum[i] = v < 0 ? 0 : v > 1 ? 1 : v
        }
      }

      /* ---- pass 4: dither + colour ---- */
      let bayer = bayerMatrix(8)
      let bayerN = 8
      let bayerKey = 'bayer8'

      const ditherPass = () => {
        const p = params.current
        const levels = Math.max(2, p.levels | 0)
        const q = levels - 1
        const amount = p.ditherAmount
        const mode = p.dither

        if (mode === 'none' || amount === 0) {
          for (let i = 0; i < count; i++) {
            const v = Math.round(lum[i] * q)
            out32[i] = palette[v]
          }
          return
        }

        const ordered = ORDERED_SIZES[mode]
        if (ordered) {
          if (bayerKey !== mode) {
            bayer = bayerMatrix(ordered)
            bayerN = ordered
            bayerKey = mode
          }
          // The threshold offset is scaled by the quantisation step, so a
          // 2-level field gets the full ±0.5 kick and a 16-level one only
          // dithers across the gap between its own neighbouring levels.
          const k = amount / q
          for (let y = 0, i = 0; y < rows; y++) {
            const brow = (y % bayerN) * bayerN
            for (let x = 0; x < cols; x++, i++) {
              let v = Math.round((lum[i] + bayer[brow + (x % bayerN)] * k) * q)
              if (v < 0) v = 0
              else if (v > q) v = q
              out32[i] = palette[v]
            }
          }
          return
        }

        // Error diffusion. Sequential by definition — each cell's rounding
        // error is pushed into cells that haven't been visited yet — which is
        // precisely why this look can't be a shader.
        const kernel = DIFFUSION_KERNELS[mode] || DIFFUSION_KERNELS.floyd
        const klen = kernel.length
        err.set(lum)
        const serp = p.serpentine

        for (let y = 0; y < rows; y++) {
          const l2r = !serp || (y & 1) === 0
          const row = y * cols
          const start = l2r ? 0 : cols - 1
          const stop = l2r ? cols : -1
          const step = l2r ? 1 : -1

          for (let x = start; x !== stop; x += step) {
            const i = row + x
            const old = err[i]
            let v = Math.round(old * q)
            if (v < 0) v = 0
            else if (v > q) v = q
            idx[i] = v
            const e = (old - v / q) * amount
            if (e === 0) continue

            for (let k = 0; k < klen; k++) {
              const kern = kernel[k]
              const nx = x + (l2r ? kern[0] : -kern[0])
              if (nx < 0 || nx >= cols) continue
              const ny = y + kern[1]
              if (ny >= rows) continue
              err[ny * cols + nx] += e * kern[2]
            }
          }
        }
        for (let i = 0; i < count; i++) out32[i] = palette[idx[i]]
      }

      const draw = () => {
        if (!imageData || count === 0) return
        warpPass()
        if (ready) source.fill(lum, wx, wy, count, cols, rows, clock)
        else lum.fill(0)
        tonePass()
        ditherPass()
        gctx.putImageData(imageData, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(grid, 0, 0, cols * cellPx * dpr, rows * cellPx * dpr)
      }

      // A static source with no warp and a still pointer produces a byte-for-byte
      // identical frame every tick. Detecting that and returning early means a
      // dithered image or headline costs nothing once it has settled, instead of
      // re-running four passes 60 times a second forever.
      let lastCx = NaN
      let lastCy = NaN

      const tick = (time, deltaMs) => {
        if (!animating()) return
        const p = params.current

        if (!source.animated && p.warp === 0) {
          const live = p.cursorRadius > 0 && (p.cursorStrength !== 0 || p.cursorLift !== 0)
          if (!live) return
          if (cursor.x === lastCx && cursor.y === lastCy) return
          lastCx = cursor.x
          lastCy = cursor.y
          draw()
          return
        }

        clock += Math.min(deltaMs, 50) / 1000
        draw()
      }

      build()

      const onMove = (e) => {
        const rect = root.getBoundingClientRect()
        xTo(e.clientX - rect.left)
        yTo(e.clientY - rect.top)
      }
      const onLeave = () => {
        xTo(-1e5)
        yTo(-1e5)
      }

      // ResizeObserver rather than window.resize: these can live inside a
      // sized container, not just full-bleed.
      const ro = new ResizeObserver(() => build())
      ro.observe(root)
      window.addEventListener('pointermove', onMove, { passive: true })
      root.addEventListener('pointerleave', onLeave)
      reduced?.addEventListener?.('change', draw)
      gsap.ticker.add(tick)

      return () => {
        ro.disconnect()
        window.removeEventListener('pointermove', onMove)
        root.removeEventListener('pointerleave', onLeave)
        reduced?.removeEventListener?.('change', draw)
        gsap.ticker.remove(tick)
        rebuild.current = () => {}
        refresh.current = () => {}
        repaint.current = () => {}
      }
    },
    { scope: rootRef }
  )

  return { rebuild, refresh, repaint }
}

/** Props every bitmap component shares, and their defaults. */
export const BASE_DEFAULTS = {
  cell: 4,
  levels: 2,
  dither: 'bayer8',
  ditherAmount: 1,
  serpentine: true,
  contrast: 1,
  brightness: 0,
  invert: false,
  warp: 0,
  cursorRadius: 160,
  cursorStrength: 0,
  cursorLift: 0,
  color: '#e8e4dc',
  background: '#0a0b0e',
  paused: false,
  respectReducedMotion: true,
}
