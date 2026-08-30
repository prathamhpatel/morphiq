import { useRef, useEffect } from 'react'
import { useBitmapField } from '../bitmap-core/engine.js'
import { createNoiseSource } from '../bitmap-core/sources.js'
import '../bitmap-core/bitmap.css'

/* =========================================================
   BitmapNoise
   A dithered field with no input at all — patches of particles
   that form, drift, dissolve and reform on their own.

   Two pre-baked fBm noise tiles pan past each other on different
   headings; where they agree the field is bright, where they
   disagree it falls dark. The interference between the two is
   what makes patches appear to *evolve in place* rather than
   slide across the screen as one sheet. `patch` then squeezes
   the midtones outward so the result breaks into islands instead
   of reading as a smooth gradient.

   Everything is quantised through the shared bitmap engine, so
   the output is real 1-bit dither, not a blurred texture.
   ========================================================= */

/**
 * A self-generating dither field.
 *
 *   <BitmapNoise scale={2} speed={0.4} patch={0.55} dither="bayer8" />
 */
export default function BitmapNoise({
  // --- field ---
  scale = 2,               // patch size, in cells — bigger is blobbier
  speed = 0.4,             // drift rate; 0 freezes the field
  patch = 0.42,            // 0 = smooth gradient, 1 = hard islands
  density = 0.36,          // fraction of the field that ends up lit
  drift = 0,               // constant lateral push on the second layer

  // --- raster ---
  cell = 4,                // px per cell
  levels = 2,              // 2 = 1-bit; higher posterises
  dither = 'bayer8',       // bayer2|4|8|16 · floyd · atkinson · jarvis · none
  ditherAmount = 1,
  serpentine = true,       // alternate scan direction (error diffusion only)

  // --- tone ---
  contrast = 1,
  brightness = 0,
  invert = false,

  // --- interaction ---
  warp = 0,                // flow-field shear, in cells
  cursorRadius = 160,      // px
  cursorStrength = 0,      // px of outward push at the centre
  cursorLift = 0,          // luminance added at the centre

  // --- paint ---
  color = '#e8e4dc',
  background = '#0a0b0e',  // null renders transparent

  paused = false,
  respectReducedMotion = true,
  fullscreen = false,
  className = '',
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)

  // Live parameters: the loop reads these every frame, so changing a prop
  // retunes the field in place instead of restarting it.
  const params = useRef({})
  params.current = {
    scale, speed, patch, density, drift,
    cell, levels, dither, ditherAmount, serpentine,
    contrast, brightness, invert,
    warp, cursorRadius, cursorStrength, cursorLift,
    color, background, paused, respectReducedMotion,
  }

  const { rebuild, repaint } = useBitmapField({
    rootRef,
    canvasRef,
    params,
    createSource: () => createNoiseSource(params),
  })

  // Cell size changes the grid geometry; everything else is read live by the
  // render passes and only needs a nudge for the frames where the field is
  // paused and therefore not redrawing on its own.
  useEffect(() => { rebuild.current() }, [cell])
  useEffect(() => {
    repaint.current()
  }, [color, background, levels, dither, ditherAmount, serpentine,
      contrast, brightness, invert, scale, patch, density, drift, paused])

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
