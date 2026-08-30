/* =========================================================
   Sources
   A "source" is anything that can answer "how bright is this
   cell?" for every cell in the grid. Three of them exist:

   - noise   — procedural, generated fresh every frame from a
               pair of pre-baked tileable fBm tiles that pan past
               each other. No input, infinite duration.
   - raster  — a static luminance buffer painted once by a draw
               callback (an image, or text) and then sampled with
               bilinear filtering so it can be warped and scrolled.

   Both expose the same two methods so the engine never has to
   know which one it is holding:

     prepare(cols, rows) -> boolean   rebuild for a new grid size
     fill(lum, wx, wy, n, cols, rows, t)   write luminance 0..1

   `wx`/`wy` are per-cell source coordinates the engine has already
   warped (cursor push, flow). Sources read them and never compute
   their own warp — that keeps warping identical across all three.
   ========================================================= */

/* ---------- deterministic RNG so a given seed always tiles the same ---------- */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (t) => t * t * (3 - 2 * t)

/**
 * One octave of tileable value noise, rendered into a size×size Float32Array.
 * `period` lattice points span the tile exactly, and lattice lookups wrap, so
 * the result tiles seamlessly in both axes — which is what lets us pan it
 * forever without ever hitting an edge.
 */
function valueNoiseTile(size, period, rng) {
  const lattice = new Float32Array(period * period)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng()

  const out = new Float32Array(size * size)
  const step = size / period
  for (let y = 0; y < size; y++) {
    const fy = y / step
    const y0 = Math.floor(fy)
    const ty = smooth(fy - y0)
    const r0 = (y0 % period) * period
    const r1 = ((y0 + 1) % period) * period
    for (let x = 0; x < size; x++) {
      const fx = x / step
      const x0 = Math.floor(fx)
      const tx = smooth(fx - x0)
      const c0 = x0 % period
      const c1 = (x0 + 1) % period
      const top = lattice[r0 + c0] + (lattice[r0 + c1] - lattice[r0 + c0]) * tx
      const bot = lattice[r1 + c0] + (lattice[r1 + c1] - lattice[r1 + c0]) * tx
      out[y * size + x] = top + (bot - top) * ty
    }
  }
  return out
}

/**
 * Fractal Brownian motion baked into a single tileable tile. Summing the
 * octaves once up front means the render loop pays for exactly one bilinear
 * lookup per layer per cell instead of re-summing octaves 80,000 times a frame
 * — this is the whole reason the noise mode stays affordable on the CPU.
 */
export function makeNoiseTile(size = 256, octaves = 4, basePeriod = 4, seed = 1) {
  const rng = mulberry32(seed)
  const out = new Float32Array(size * size)
  let amp = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    const period = basePeriod * 2 ** o
    if (period > size) break
    const layer = valueNoiseTile(size, period, rng)
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp
    norm += amp
    amp *= 0.5
  }
  // Summed octaves cluster hard around 0.5 — four averaged random layers land
  // within roughly 0.14..0.83, and blending two of those tiles narrows it
  // further. Left alone the field never leaves the midtones and dithers to flat
  // 50% static instead of patches. Stretch each tile onto the full 0..1 range
  // so `patch` has real signal to work with.
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < out.length; i++) {
    const v = (out[i] /= norm)
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const span = hi - lo || 1
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / span
  return out
}

/** Bilinear sample of a tile, wrapping on both axes. `x`/`y` are in tile px. */
function sampleWrap(tile, size, x, y) {
  let x0 = Math.floor(x)
  let y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0
  x0 = ((x0 % size) + size) % size
  y0 = ((y0 % size) + size) % size
  const x1 = x0 + 1 === size ? 0 : x0 + 1
  const y1 = y0 + 1 === size ? 0 : y0 + 1
  const r0 = y0 * size
  const r1 = y1 * size
  const top = tile[r0 + x0] + (tile[r0 + x1] - tile[r0 + x0]) * tx
  const bot = tile[r1 + x0] + (tile[r1 + x1] - tile[r1 + x0]) * tx
  return top + (bot - top) * ty
}

/** Bilinear sample of a buffer, clamping at the edges. `x`/`y` are in buffer px. */
export function sampleClamp(buf, w, h, x, y) {
  if (x < 0) x = 0
  else if (x > w - 1) x = w - 1
  if (y < 0) y = 0
  else if (y > h - 1) y = h - 1
  const x0 = x | 0
  const y0 = y | 0
  const x1 = x0 + 1 < w ? x0 + 1 : x0
  const y1 = y0 + 1 < h ? y0 + 1 : y0
  const tx = x - x0
  const ty = y - y0
  const r0 = y0 * w
  const r1 = y1 * w
  const top = buf[r0 + x0] + (buf[r0 + x1] - buf[r0 + x0]) * tx
  const bot = buf[r1 + x0] + (buf[r1 + x1] - buf[r1 + x0]) * tx
  return top + (bot - top) * ty
}

const TILE = 256

/* Blend weights for the two drifting layers, and the factor that restores the
   spread averaging them costs: 1 / sqrt(WA^2 + WB^2). */
const WA = 0.62
const WB = 0.38
const BLEND_GAIN = 1 / Math.sqrt(WA * WA + WB * WB)

/**
 * Procedural source: two fBm tiles drifting past each other on different
 * headings, then squeezed by `patch` into distinct blobs rather than a smooth
 * gradient. The counter-drift is what stops the field from reading as one
 * sheet sliding by — the interference between the two layers is what makes
 * patches appear, dissolve and reform in place.
 *
 * `params` is a live ref-like object read fresh every frame.
 */
export function createNoiseSource(params) {
  const tileA = makeNoiseTile(TILE, 4, 4, 1)
  const tileB = makeNoiseTile(TILE, 3, 6, 9)

  return {
    animated: true,
    prepare: () => true,
    fill(lum, wx, wy, n, cols, rows, t) {
      const { scale, speed, patch, drift, density } = params.current
      // A tile feature spans ~TILE/4 px; `k` maps that onto `scale` cells.
      const k = 3.2 / Math.max(scale, 0.05)
      const kb = k * 0.62
      const ax = t * speed * 9
      const ay = t * speed * 3.5
      const bx = -t * speed * 5 + drift * 40
      const by = t * speed * 7
      const lo = 0.5 - Math.max(1 - patch, 0.02) * 0.5
      const hi = 0.5 + Math.max(1 - patch, 0.02) * 0.5
      const span = hi - lo
      // How much of the field ends up lit. This belongs to the field, not to
      // the tone stage: a 50/50 dither on a light-on-dark palette already
      // reads as light-dominant, so the neutral-looking default sits below
      // half and `brightness` stays free as a user-facing control.
      const bias = density - 0.5

      for (let i = 0; i < n; i++) {
        const sx = wx[i]
        const sy = wy[i]
        const a = sampleWrap(tileA, TILE, sx * k + ax, sy * k + ay)
        const b = sampleWrap(tileB, TILE, sx * kb + bx, sy * kb + by)
        // Averaging two independent layers shrinks the spread by
        // sqrt(wa^2 + wb^2); BLEND_GAIN puts it back, so the blend costs
        // contrast-free interference rather than a washed-out field.
        let v = 0.5 + ((a - 0.5) * WA + (b - 0.5) * WB) * BLEND_GAIN
        // Squeeze the midtones outward so the field breaks into patches.
        v = (v - lo) / span
        v = v <= 0 ? 0 : v >= 1 ? 1 : smooth(v)
        v += bias
        lum[i] = v <= 0 ? 0 : v >= 1 ? 1 : v
      }
    },
  }
}

/**
 * Static source: a draw callback paints into an offscreen canvas at SS× the
 * grid resolution, which is then box-filtered down to grid resolution. That
 * supersample is what makes the difference between a jagged, unreadable
 * threshold and clean antialiased greys that dither into legible shapes.
 *
 * `draw(ctx, w, h)` returns false to signal "nothing to draw yet" (an image
 * that hasn't loaded, empty text). `prepare` returns true on success, false
 * when there is nothing to draw, or the string 'tainted' when the canvas
 * could not be read back because of cross-origin restrictions.
 */
export function createRasterSource(draw, { supersample = 2 } = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let buf = new Float32Array(0)
  let bw = 0
  let bh = 0

  return {
    // Static: the engine can skip whole frames when nothing else is moving.
    animated: false,
    prepare(cols, rows) {
      if (cols < 1 || rows < 1) return false
      const w = Math.max(1, Math.round(cols * supersample))
      const h = Math.max(1, Math.round(rows * supersample))
      canvas.width = w
      canvas.height = h
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, w, h)

      if (draw(ctx, w, h) === false) {
        bw = 0
        bh = 0
        return false
      }

      // A cross-origin image drawn without CORS headers taints the canvas and
      // makes this throw. Fail soft: the field renders empty and the component
      // surfaces the error rather than taking the page down.
      let px
      try {
        px = ctx.getImageData(0, 0, w, h).data
      } catch {
        bw = 0
        bh = 0
        return 'tainted'
      }
      if (buf.length !== cols * rows) buf = new Float32Array(cols * rows)
      bw = cols
      bh = rows

      // Box-filter SS×SS blocks down to one cell. Alpha is folded in so
      // transparent regions read as black instead of stray white fringes.
      const inv = 1 / (supersample * supersample * 255)
      for (let y = 0; y < rows; y++) {
        const y0 = Math.round(y * supersample)
        const y1 = Math.min(h, y0 + supersample)
        for (let x = 0; x < cols; x++) {
          const x0 = Math.round(x * supersample)
          const x1 = Math.min(w, x0 + supersample)
          let sum = 0
          for (let sy = y0; sy < y1; sy++) {
            let o = (sy * w + x0) * 4
            for (let sx = x0; sx < x1; sx++, o += 4) {
              const a = px[o + 3] / 255
              // Rec. 709 luma, premultiplied by coverage.
              sum += (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) * a
            }
          }
          buf[y * cols + x] = sum * inv
        }
      }
      return true
    },
    fill(lum, wx, wy, n) {
      if (!bw || !bh) {
        lum.fill(0, 0, n)
        return
      }
      for (let i = 0; i < n; i++) lum[i] = sampleClamp(buf, bw, bh, wx[i], wy[i])
    },
  }
}
