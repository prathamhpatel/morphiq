import { useEffect, useRef } from 'react'
import './ScrollExpand.css'

/* =========================================================
   ScrollExpand
   A framed panel pinned to the viewport that opens out to
   full bleed as you scroll past it, with the media inside
   settling back from a slight push-in.

   The whole component pushes exactly two numbers across the
   JS/CSS boundary — `--sx-p` (raw progress) and `--sx-e`
   (eased) — on one element. Every visual mapping (frame
   inset, corner radius, media zoom, scrim, slot fades) is a
   CSS calc() off those. So anything you drop inside can join
   the animation with a line of CSS and no wiring:

     .my-caption { opacity: calc(1 - var(--sx-e)); }

   Two stock slots are wired already: data-sx="out" leaves as
   the panel opens, data-sx="in" arrives at the end.

   The pin is `position: sticky`, so there is no measured
   stage/track bookkeeping to keep in sync — the track's own
   height sets the scroll budget. Progress is read against
   whichever scroller actually owns the component, so it works
   on the page or inside an overflow container. The rAF loop
   only runs while the track is on screen, and the smoothing
   is integrated against real frame delta rather than an
   assumed 60Hz, so it settles identically on a 120Hz display.
   ========================================================= */

const EASES = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
}

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Nearest ancestor that actually scrolls, or the window. */
function scrollerFor(node) {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el)
    if (overflowY === 'auto' || overflowY === 'scroll') return el
  }
  return window
}

export default function ScrollExpand({
  media,
  width = 42,
  height = 58,
  radius = 24,
  endRadius = 0,
  zoom = 1.35,
  scrim = 0.45,
  travel = 1.2,
  hold = 0.35,
  smoothing = 0.09,
  ease = 'inOut',
  onProgress,
  className = '',
  style,
  children,
  ...rest
}) {
  const trackRef = useRef(null)
  const pinRef = useRef(null)

  // Read live from a ref so changing these never restarts the loop.
  const live = useRef({})
  live.current = { travel, smoothing, ease, onProgress }

  useEffect(() => {
    const track = trackRef.current
    const pin = pinRef.current
    if (!track || !pin) return

    const scroller = scrollerFor(track)
    const snap = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let last = 0
    let target = 0
    let value = 0
    let watching = false

    const read = () => {
      const { travel: t } = live.current
      const span = pin.offsetHeight * Math.max(0.01, t)
      const origin =
        scroller === window ? 0 : scroller.getBoundingClientRect().top
      return clamp01((origin - track.getBoundingClientRect().top) / span)
    }

    const write = (p) => {
      const { ease: e, onProgress: cb } = live.current
      const fn = typeof e === 'function' ? e : EASES[e] || EASES.inOut
      const eased = fn(p)
      track.style.setProperty('--sx-p', p.toFixed(4))
      track.style.setProperty('--sx-e', eased.toFixed(4))
      cb?.(p, eased)
    }

    const frame = (now) => {
      const tau = live.current.smoothing
      // Real elapsed time, capped so a backgrounded tab doesn't jump.
      const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60
      last = now

      value += (target - value) * (1 - Math.exp(-dt / tau))

      if (Math.abs(target - value) < 5e-4) {
        value = target
        raf = 0
        last = 0
        write(value)
        return
      }
      write(value)
      raf = requestAnimationFrame(frame)
    }

    const sync = () => {
      target = read()
      if (snap || live.current.smoothing <= 0) {
        value = target
        write(value)
        return
      }
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    // Only listen while the track is anywhere near the viewport.
    const watch = (on) => {
      if (on === watching) return
      watching = on
      if (on) {
        scroller.addEventListener('scroll', sync, { passive: true })
        sync()
      } else {
        scroller.removeEventListener('scroll', sync)
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        // Settle on whichever end we left through.
        value = target = read()
        write(value)
      }
    }

    const io = new IntersectionObserver((entries) => watch(entries[0].isIntersecting), {
      root: scroller === window ? null : scroller,
      rootMargin: '20% 0px',
    })
    io.observe(track)

    const ro = new ResizeObserver(sync)
    ro.observe(pin)

    window.addEventListener('resize', sync)
    write(0)

    return () => {
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', sync)
      scroller.removeEventListener('scroll', sync)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const vars = {
    '--sx-w': width,
    '--sx-h': height,
    '--sx-r': radius,
    '--sx-r-end': endRadius,
    '--sx-zoom': zoom,
    '--sx-scrim': scrim,
    '--sx-travel': travel,
    '--sx-hold': hold,
    ...style,
  }

  return (
    <div
      ref={trackRef}
      className={`scroll-expand ${className}`.trim()}
      style={vars}
      {...rest}
    >
      <div ref={pinRef} className="scroll-expand__pin">
        <div className="scroll-expand__frame">
          <div className="scroll-expand__media">{media}</div>
          <div className="scroll-expand__scrim" aria-hidden="true" />
        </div>

        {children ? <div className="scroll-expand__stage">{children}</div> : null}
      </div>
    </div>
  )
}
