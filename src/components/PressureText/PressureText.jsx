import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import './PressureText.css'

/* =========================================================
   PressureText
   Type that reacts to the cursor — letters thicken and widen
   under the pointer while their neighbours give up the space,
   so the word keeps its overall width.

   Author has no variable axis (no `fvar` table, six separate
   OTFs), so both axes are synthesised — and neither is done by
   swapping or blending cuts, because a crossfade reads as one
   weight dissolving into another rather than a glyph growing:

   · weight — a single cut, thickened continuously with
     `-webkit-text-stroke`. The outline grows outward from the
     real letterform, so it morphs instead of cross-dissolving.
   · width  — each letter's box is scaled, then ALL the boxes
     are normalised so their widths still sum to the natural
     total. The letter under the cursor takes space from the
     others; the word itself never changes width.

   Because of that normalisation the resting state always lands
   back on the font's own metrics, whatever `spread` is set to.
   ========================================================= */

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

const FALLOFF = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  sharp: (t) => t * t,
}

export default function PressureText({
  text = '',
  weight = 200,
  bold = 0.075,
  spread = 0.9,
  radius = 3.2,
  smoothing = 0.03,
  falloff = 'linear',
  className = '',
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const chars = useMemo(() => Array.from(text), [text])

  const live = useRef({})
  live.current = { radius, smoothing, falloff, spread }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const cells = Array.from(root.querySelectorAll('.pressure-text__char'))
    if (!cells.length) return

    const hoverable =
      window.matchMedia('(hover: hover)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let last = 0
    let onScreen = true

    let px = -1e5
    let py = -1e5
    let tx = -1e5
    let ty = -1e5

    let natural = []
    let boxes = []
    let reach = 0

    /* Natural widths at the resting weight. Measured with the boxes released
       so we read the font's own metrics, not last frame's stretched ones. */
    const remeasure = () => {
      root.classList.remove('is-live')
      natural = cells.map((el) => el.offsetWidth)
      root.classList.add('is-live')

      const fs = parseFloat(getComputedStyle(root).fontSize) || 16
      reach = fs * Math.max(0.01, live.current.radius)

      cells.forEach((el, i) => el.style.setProperty('--pt-w', `${natural[i]}px`))
      boxes = cells.map((el) => {
        const r = el.getBoundingClientRect()
        return { el, x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })
    }

    const paint = () => {
      const shape = FALLOFF[live.current.falloff] || FALLOFF.linear
      const s = live.current.spread

      // Pressure per letter, and the width each one would like to have.
      let wanted = 0
      let total = 0
      const press = new Array(boxes.length)

      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i]
        const f = shape(clamp01(1 - Math.hypot(b.x - px, b.y - py) / reach))
        press[i] = f
        wanted += natural[i] * (1 + f * s)
        total += natural[i]
      }

      // Hand out the same total space, just distributed differently — this is
      // what keeps the word the same width while the letters trade.
      const k = wanted > 0 ? total / wanted : 1

      for (let i = 0; i < boxes.length; i++) {
        const el = boxes[i].el
        el.style.setProperty('--pt-f', press[i].toFixed(3))
        el.style.setProperty('--pt-sx', ((1 + press[i] * s) * k).toFixed(4))
      }
    }

    const frame = (now) => {
      const tau = live.current.smoothing
      const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60
      last = now

      const k = tau <= 0 ? 1 : 1 - Math.exp(-dt / tau)
      px += (tx - px) * k
      py += (ty - py) * k
      paint()

      if (Math.abs(tx - px) < 0.4 && Math.abs(ty - py) < 0.4) {
        px = tx
        py = ty
        paint()
        raf = 0
        last = 0
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf && onScreen) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    const onMove = (e) => {
      tx = e.clientX
      ty = e.clientY
      kick()
    }

    const onGeometry = () => {
      remeasure()
      paint()
    }

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) {
        remeasure()
        kick()
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    io.observe(root)

    remeasure()
    paint()

    if (hoverable) window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onGeometry, { passive: true })
    window.addEventListener('resize', onGeometry)
    document.fonts?.ready.then(onGeometry)

    return () => {
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onGeometry)
      window.removeEventListener('resize', onGeometry)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [chars.length])

  const vars = {
    '--pt-weight': weight,
    '--pt-bold': bold,
    ...style,
  }

  return (
    <span
      ref={rootRef}
      className={`pressure-text ${className}`.trim()}
      style={vars}
      aria-label={text}
      {...rest}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          className={`pressure-text__char${ch === ' ' ? ' is-space' : ''}`}
          aria-hidden="true"
        >
          <span className="pressure-text__glyph">{ch === ' ' ? ' ' : ch}</span>
        </span>
      ))}
    </span>
  )
}
