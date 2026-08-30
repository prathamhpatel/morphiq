import { useRef, useEffect } from 'react'
import { useBitmapField } from '../bitmap-core/engine.js'
import { createRasterSource } from '../bitmap-core/sources.js'
import '../bitmap-core/bitmap.css'

const SUPERSAMPLE = 2

/* =========================================================
   BitmapText
   Type, rasterised and dithered into particles.

   The text is laid out once into an offscreen canvas at 2× the
   cell grid and box-filtered down. That leaves real antialiased
   greys along every stem and curve, which is what the dither
   then breaks into stipple — threshold a hard-edged glyph and
   you get staircase edges instead.

   `grain` is the knob that decides whether the letterforms read
   as solid or as a cloud: it pulls the flat interior of each
   glyph down toward the midtones, where the dither has room to
   scatter it. At 0 the type is solid; at 1 it is made entirely
   of particles that still resolve as letters.
   ========================================================= */

/**
 * Text, rendered as dither.
 *
 *   <BitmapText text={'MORPH\nIQ'} grain={0.7} cell={5} dither="bayer4" />
 *
 * `fontSize` is CSS px, or 'auto' to fit the box. `letterSpacing` is in em so
 * it tracks the fitted size.
 */
export default function BitmapText({
  // --- type ---
  text = 'BITMAP',
  fontFamily = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif',
  fontWeight = 800,
  fontSize = 'auto',       // CSS px, or 'auto' to fill the box
  letterSpacing = 0,       // em
  lineHeight = 1.05,
  align = 'center',        // left · center · right
  padding = 24,            // CSS px, inset from the edges
  grain = 0.6,             // 0 = solid glyphs, 1 = pure particles

  // --- raster ---
  cell = 5,
  levels = 2,
  dither = 'bayer4',       // ordered dither keeps flat type from crawling
  ditherAmount = 1,
  serpentine = true,

  // --- tone ---
  contrast = 1,
  brightness = 0,
  invert = false,

  // --- interaction ---
  warp = 0,
  cursorRadius = 160,
  cursorStrength = 0,
  cursorLift = 0,

  // --- paint ---
  color = '#e8e4dc',
  background = '#0a0b0e',

  paused = false,
  respectReducedMotion = true,
  fullscreen = false,
  className = '',
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)

  const params = useRef({})
  params.current = {
    text, fontFamily, fontWeight, fontSize, letterSpacing, lineHeight,
    align, padding, grain,
    cell, levels, dither, ditherAmount, serpentine,
    contrast, brightness, invert,
    warp, cursorRadius, cursorStrength, cursorLift,
    color, background, paused, respectReducedMotion,
  }

  const { rebuild, refresh, repaint } = useBitmapField({
    rootRef,
    canvasRef,
    params,
    createSource: () => {
      const base = createRasterSource(
        (ctx, w, h) => {
          const p = params.current
          const lines = String(p.text ?? '').split('\n')
          if (!lines.some((l) => l.trim() !== '')) return false

          // One CSS px is SUPERSAMPLE / cell raster px, so every size the
          // caller gives in CSS px lands at the right scale on this canvas
          // no matter how coarse the grid is.
          const k = SUPERSAMPLE / Math.max(1, p.cell)
          const pad = p.padding * k
          const availW = Math.max(1, w - pad * 2)
          const availH = Math.max(1, h - pad * 2)

          const setFont = (size, lsPx) => {
            ctx.font = `${p.fontWeight} ${size}px ${p.fontFamily}`
            ctx.letterSpacing = `${lsPx}px`
          }
          const widest = () => {
            let m = 0
            for (const line of lines) {
              const lw = ctx.measureText(line).width
              if (lw > m) m = lw
            }
            return m || 1
          }

          let size
          if (p.fontSize === 'auto') {
            // Fit by width, twice: letter-spacing is proportional to the font
            // size, so the first fit shifts the measurement and the second
            // settles it. Two passes is plenty — the correction is tiny.
            setFont(100, 0)
            size = (availW * 100) / widest()
            for (let i = 0; i < 2; i++) {
              setFont(size, p.letterSpacing * size)
              size *= availW / widest()
            }
            const blockH = lines.length * p.lineHeight * size
            if (blockH > availH) size *= availH / blockH
          } else {
            size = p.fontSize * k
          }

          setFont(size, p.letterSpacing * size)
          ctx.fillStyle = '#fff'
          ctx.textBaseline = 'middle'
          ctx.textAlign = p.align
          const x = p.align === 'left' ? pad : p.align === 'right' ? w - pad : w / 2

          const step = p.lineHeight * size
          const top = (h - lines.length * step) / 2
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, top + (i + 0.5) * step)
          }
          return true
        },
        { supersample: SUPERSAMPLE }
      )

      return {
        ...base,
        fill(lum, wx, wy, n, cols, rows, t) {
          base.fill(lum, wx, wy, n, cols, rows, t)
          const g = params.current.grain
          if (!g) return
          // Pull solid interiors toward the midtones so the dither has
          // something to scatter. 0.55 is the point where a fully lit glyph
          // lands just under 50% coverage — dense enough to read, sparse
          // enough to look granular.
          const s = 1 - g * 0.55
          for (let i = 0; i < n; i++) lum[i] *= s
        },
      }
    },
  })

  // Anything that changes the layout of the type re-rasterises; grain is read
  // live every frame, so it is deliberately not in this list.
  useEffect(() => {
    refresh.current()
  }, [text, fontFamily, fontWeight, fontSize, letterSpacing, lineHeight, align, padding])

  useEffect(() => { rebuild.current() }, [cell])
  // Every prop below is read live inside the render passes rather than baked
  // into the source, so a static field — which the engine otherwise lets idle
  // — needs an explicit nudge to show the change.
  useEffect(() => {
    repaint.current()
  }, [color, background, levels, grain,
      dither, ditherAmount, serpentine, contrast, brightness, invert,
      warp, cursorRadius, cursorStrength, cursorLift, paused])


  // A webfont that arrives after first paint would otherwise leave the field
  // showing the fallback face forever, since nothing else re-triggers a raster.
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) refresh.current()
    })
    return () => { cancelled = true }
  }, [fontFamily])

  return (
    <div
      ref={rootRef}
      className={`bitmap-field${fullscreen ? ' bitmap-field--fullscreen' : ''} ${className}`.trim()}
      style={{ background: background ?? 'transparent', ...style }}
      {...rest}
    >
      <canvas className="bitmap-field__canvas" ref={canvasRef} />
    </div>
  )
}
