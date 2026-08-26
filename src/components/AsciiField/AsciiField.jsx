import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import './AsciiField.css'

gsap.registerPlugin(useGSAP)

/* =========================================================
   AsciiField
   A full-screen grid of ASCII glyphs, all resting at "0".
   A circular cursor zone scrambles the characters: fastest at
   the exact center of the cursor, slowing toward the
   circumference, frozen outside the radius, and snapping back
   to "0" the moment the cursor leaves.

   Rendering is speed-proof: a static field of "0"s is
   pre-rendered to an offscreen canvas and blitted in full every
   frame (erasing the previous scramble wherever it was), then
   only the glyphs inside the current circle are drawn on top —
   so nothing can tear no matter how fast the pointer moves.

   The loop runs on gsap.ticker; the cursor is smoothed with
   gsap.quickTo. Radius / speed / color are live-tunable via the
   control panel.
   ========================================================= */

// Printable ASCII glyphs (33..126) — the pool every cell samples from.
const GLYPHS = Array.from({ length: 126 - 33 + 1 }, (_, i) =>
  String.fromCharCode(33 + i)
)
const REST = 255 // sentinel index meaning "resting" — drawn as the typed rest char

const BASE_CELL_W = 9   // base cell width  — the aspect ratio the spacing keeps
const BASE_CELL_H = 16  // base cell height — 9:16, scaled together by "spacing"
const FONT_SIZE = 15    // px monospace glyph size (fixed — spacing widens the gaps)
const FALLOFF = 1.7     // >1 concentrates scramble speed toward the center
const FONT = `${FONT_SIZE}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
const BG = '#0a0b0e'   // default; the `background` prop overrides it

/**
 * A canvas field of glyphs that scramble around the cursor and settle back
 * to rest. Fully controlled — every knob is a prop with a default.
 *
 *   <AsciiField radius={170} speed={26} opacity={0.4} spacing={1} />
 */
export default function AsciiField({
  radius = 170,          // cursor influence, px
  speed = 26,            // glyph changes per second at the centre
  color = '#ffffff',     // glyph colour
  opacity = 0.4,         // resting baseline opacity
  spacing = 1,           // cell scale, keeps the 9:16 ratio
  rest = '0',            // the resting glyph; '' leaves cells empty
  background = BG,
  className = '',
  style,
  ...rest_
}) {
  const canvasRef = useRef(null)
  const rootRef = useRef(null)

  // Live parameters the render loop reads each frame without re-running setup.
  const params = useRef({ radius, speed, color, opacity, spacing, rest, background })
  params.current.radius = radius
  params.current.speed = speed
  params.current.color = color
  params.current.opacity = opacity
  params.current.spacing = spacing
  params.current.rest = rest
  params.current.background = background

  /* Repaint the baseline when anything baked into it changes. The background
     is part of the glyph sprite atlas, so a colour change has to rebuild
     rather than wait for cells to turn over. */
  const redrawStatic = useRef(() => {})
  useEffect(() => {
    redrawStatic.current()
  }, [color, opacity, rest])

  // Rebuild the whole grid (cell size, buffers, baseline) when spacing changes.
  const rebuild = useRef(() => {})
  useEffect(() => {
    rebuild.current()
  }, [spacing, background])

  useGSAP(
    () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Offscreen baseline: the whole field rendered as "0"s.
      const staticCanvas = document.createElement('canvas')
      const sctx = staticCanvas.getContext('2d')

      const cursor = { x: -9999, y: -9999 }
      const xTo = gsap.quickTo(cursor, 'x', { duration: 0.2, ease: 'power3' })
      const yTo = gsap.quickTo(cursor, 'y', { duration: 0.2, ease: 'power3' })

      let cols = 0
      let rows = 0
      let w = 0
      let h = 0
      let dpr = 1
      let cellW = BASE_CELL_W
      let cellH = BASE_CELL_H
      let glyphIdx = new Uint8Array(0)
      let accum = new Float32Array(0)

      // A random glyph that is never the current resting char, so the disc
      // never flashes a stray "resting" glyph while it's scrambling.
      const rand = () => {
        const pool = GLYPHS.length
        const g = Math.floor(Math.random() * pool)
        const excl = GLYPHS.indexOf(params.current.rest)
        return g === excl ? (g + 1) % pool : g
      }

      // Paint the static "0" baseline — centered in each cell, dimmed to the
      // chosen opacity so the field can read as sparse instead of "so full".
      const buildStatic = () => {
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        sctx.font = FONT
        sctx.textBaseline = 'middle'
        sctx.textAlign = 'center'
        sctx.fillStyle = params.current.background
        sctx.fillRect(0, 0, w, h)
        sctx.globalAlpha = params.current.opacity
        sctx.fillStyle = params.current.color
        const restChar = params.current.rest || ' '
        for (let row = 0; row < rows; row++) {
          const y = row * cellH + cellH / 2
          for (let col = 0; col < cols; col++) sctx.fillText(restChar, col * cellW + cellW / 2, y)
        }
        sctx.globalAlpha = 1
      }
      redrawStatic.current = buildStatic

      // Size everything to the viewport and rebuild the buffers + baseline.
      const build = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2)
        w = rootRef.current.clientWidth
        h = rootRef.current.clientHeight

        // Scale both cell dimensions by the same spacing factor → the gap
        // between glyphs grows horizontally and vertically at the 9:16 ratio.
        cellW = BASE_CELL_W * params.current.spacing
        cellH = BASE_CELL_H * params.current.spacing
        cols = Math.ceil(w / cellW)
        rows = Math.ceil(h / cellH)

        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
        staticCanvas.width = w * dpr
        staticCanvas.height = h * dpr

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.font = FONT
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'

        const count = cols * rows
        glyphIdx = new Uint8Array(count)
        accum = new Float32Array(count)
        glyphIdx.fill(REST)

        buildStatic()
      }
      rebuild.current = build

      const tick = (time, deltaMs) => {
        const dt = Math.min(deltaMs, 50) / 1000
        const { radius, speed, color } = params.current

        // Blit the full baseline: instantly resets the entire field to "0",
        // erasing wherever last frame's circle was — this is what makes fast
        // movement tear-free.
        ctx.drawImage(staticCanvas, 0, 0, w, h)

        const cx0 = cursor.x
        const cy0 = cursor.y
        const c0 = Math.max(0, Math.floor((cx0 - radius) / cellW))
        const c1 = Math.min(cols - 1, Math.ceil((cx0 + radius) / cellW))
        const r0 = Math.max(0, Math.floor((cy0 - radius) / cellH))
        const r1 = Math.min(rows - 1, Math.ceil((cy0 + radius) / cellH))
        if (c1 < c0 || r1 < r0) return

        const r2 = radius * radius
        for (let row = r0; row <= r1; row++) {
          const cy = row * cellH + cellH / 2
          for (let col = c0; col <= c1; col++) {
            const cx = col * cellW + cellW / 2
            const dx = cx - cx0
            const dy = cy - cy0
            const d2 = dx * dx + dy * dy
            if (d2 >= r2) continue

            const f = Math.pow(1 - Math.sqrt(d2) / radius, FALLOFF)
            const i = row * cols + col

            // The moment a resting cell enters the disc, activate it with a
            // random glyph. This makes the whole circle scramble on contact —
            // independent of pointer speed — so a fast sweep can no longer
            // leave un-flipped "0"s behind. Re-randomisation speed still falls
            // off from center (fastest) to circumference (slowest).
            if (glyphIdx[i] === REST) glyphIdx[i] = rand()

            accum[i] += speed * f * dt
            if (accum[i] >= 1) {
              glyphIdx[i] = rand()
              accum[i] -= Math.floor(accum[i])
            }

            // Overwrite the baseline "0" with the scrambled glyph (full
            // opacity — the disc stays bright even when the field is dimmed).
            // Cells inside the disc are always non-zero now, so this never
            // re-draws (and blurs) a resting "0" over the crisp baseline.
            ctx.fillStyle = params.current.background
            ctx.fillRect(col * cellW, row * cellH, cellW, cellH)
            ctx.fillStyle = color
            ctx.fillText(GLYPHS[glyphIdx[i]], cx, cy)
          }
        }
      }

      build()

      const onMove = (e) => {
        const rect = rootRef.current.getBoundingClientRect()
        xTo(e.clientX - rect.left)
        yTo(e.clientY - rect.top)
      }
      const onLeave = () => {
        xTo(-9999)
        yTo(-9999)
      }

      window.addEventListener('mousemove', onMove)
      rootRef.current.addEventListener('mouseleave', onLeave)
      window.addEventListener('resize', build)
      gsap.ticker.add(tick)

      return () => {
        window.removeEventListener('mousemove', onMove)
        rootRef.current?.removeEventListener('mouseleave', onLeave)
        window.removeEventListener('resize', build)
        gsap.ticker.remove(tick)
        redrawStatic.current = () => {}
      }
    },
    { scope: rootRef }
  )

  return (
    <div
      className={`ascii-field ${className}`.trim()}
      ref={rootRef}
      style={{ background, ...style }}
      {...rest_}
    >
      <canvas className="ascii-field__canvas" ref={canvasRef} />
    </div>
  )
}
