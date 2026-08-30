import { useRef, useEffect } from 'react'
import { useBitmapField } from '../bitmap-core/engine.js'
import { createRasterSource } from '../bitmap-core/sources.js'
import '../bitmap-core/bitmap.css'

const SUPERSAMPLE = 2

/* =========================================================
   BitmapImage
   Converts an image into a dithered bitmap.

   The image is drawn once into an offscreen canvas at 2× the
   cell grid and box-filtered down, so every cell gets a properly
   antialiased grey before it is thresholded. Skipping that step
   is the usual reason naive dither looks like broken JPEG rather
   than newsprint — a hard threshold of a hard-edged source has
   no midtones left to diffuse.

   Because the source is cached as a luminance buffer, the frame
   loop only re-dithers. With no warp and a still pointer it does
   not even do that: the engine skips identical frames outright.
   ========================================================= */

/** True when `src` will need CORS to be read back out of a canvas. */
function isCrossOrigin(src) {
  if (!/^https?:/i.test(src)) return false
  try {
    return new URL(src, window.location.href).origin !== window.location.origin
  } catch {
    return false
  }
}

/**
 * An image, rendered as dither.
 *
 *   <BitmapImage src={url} cell={4} dither="floyd" fit="cover" />
 *
 * `src` accepts a URL, a data/blob URL, or anything canvas can draw directly
 * (an HTMLImageElement, ImageBitmap, HTMLCanvasElement or HTMLVideoElement).
 */
export default function BitmapImage({
  // --- source ---
  src,
  fit = 'cover',           // cover · contain · fill
  focusX = 0.5,            // crop anchor, 0..1
  focusY = 0.5,

  // --- raster ---
  cell = 4,
  levels = 2,
  dither = 'floyd',        // error diffusion suits photographs best
  ditherAmount = 1,
  serpentine = true,

  // --- tone ---
  contrast = 1.1,
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

  onStatus,                // 'ready' | 'empty' | 'tainted'
  paused = false,
  respectReducedMotion = true,
  fullscreen = false,
  className = '',
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const params = useRef({})
  params.current = {
    fit, focusX, focusY,
    cell, levels, dither, ditherAmount, serpentine,
    contrast, brightness, invert,
    warp, cursorRadius, cursorStrength, cursorLift,
    color, background, paused, respectReducedMotion, onStatus,
  }

  const { rebuild, refresh, repaint } = useBitmapField({
    rootRef,
    canvasRef,
    params,
    createSource: () =>
      createRasterSource(
        (ctx, w, h) => {
          const img = imageRef.current
          if (!img) return false
          const iw = img.naturalWidth || img.videoWidth || img.width
          const ih = img.naturalHeight || img.videoHeight || img.height
          if (!iw || !ih) return false

          const p = params.current
          if (p.fit === 'fill') {
            ctx.drawImage(img, 0, 0, w, h)
            return true
          }
          // cover takes the larger scale (crop), contain the smaller
          // (letterbox); the offset formula is the same either way, since
          // the leftover space just changes sign.
          const s =
            p.fit === 'contain'
              ? Math.min(w / iw, h / ih)
              : Math.max(w / iw, h / ih)
          const dw = iw * s
          const dh = ih * s
          ctx.drawImage(img, (w - dw) * p.focusX, (h - dh) * p.focusY, dw, dh)
          return true
        },
        { supersample: SUPERSAMPLE }
      ),
  })

  // Load the image, then hand it to the source. A cross-origin URL is tried
  // with CORS first because that is the only way the pixels can be read back;
  // if the host refuses, retry without so the image at least displays for any
  // future non-readback use, and report the failure.
  useEffect(() => {
    if (!src) {
      imageRef.current = null
      refresh.current()
      return
    }
    if (typeof src !== 'string') {
      imageRef.current = src
      refresh.current()
      return
    }

    let cancelled = false
    const load = (withCors) => {
      const img = new Image()
      if (withCors) img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (cancelled) return
        imageRef.current = img
        refresh.current()
      }
      img.onerror = () => {
        if (cancelled) return
        if (withCors) return load(false)
        imageRef.current = null
        params.current.onStatus?.('empty')
        refresh.current()
      }
      img.src = src
    }
    load(isCrossOrigin(src))

    return () => {
      cancelled = true
    }
  }, [src])

  // Re-rasterise only when the framing changes; re-lay-out on cell size;
  // repaint on colour.
  useEffect(() => { refresh.current() }, [fit, focusX, focusY])
  useEffect(() => { rebuild.current() }, [cell])
  // Every prop below is read live inside the render passes rather than baked
  // into the source, so a static field — which the engine otherwise lets idle
  // — needs an explicit nudge to show the change.
  useEffect(() => {
    repaint.current()
  }, [color, background, levels,
      dither, ditherAmount, serpentine, contrast, brightness, invert,
      warp, cursorRadius, cursorStrength, cursorLift, paused])


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
