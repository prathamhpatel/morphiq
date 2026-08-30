/* =========================================================
   Dither kernels
   Two families, and they are not interchangeable:

   - Ordered (Bayer): a fixed threshold map tiled over the grid.
     Every cell is independent, so it parallelises trivially and
     produces the stable crosshatch you know from early Mac and
     Amiga art. Because cells don't talk to each other, an animated
     source stays temporally stable — no crawling.

   - Error diffusion (Floyd–Steinberg, Atkinson, Jarvis): quantise a
     cell, then push the rounding error into cells not yet visited.
     Inherently sequential — each cell depends on its neighbours —
     which is exactly why this look cannot be done as a per-pixel
     shader, and why the whole component stays on the CPU.
   ========================================================= */

/**
 * Recursive Bayer threshold matrix. `n` must be a power of two (2, 4, 8, 16).
 * Returns a Float32Array of n*n thresholds centred on zero, i.e. in
 * (-0.5, 0.5), ready to be added to a luminance before quantising.
 */
export function bayerMatrix(n) {
  let m = [0]
  let s = 1
  while (s < n) {
    const w = s * 2
    const next = new Array(w * w)
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = m[y * s + x] * 4
        next[y * w + x] = v
        next[y * w + (x + s)] = v + 2
        next[(y + s) * w + x] = v + 3
        next[(y + s) * w + (x + s)] = v + 1
      }
    }
    m = next
    s = w
  }
  const total = n * n
  const out = new Float32Array(total)
  for (let i = 0; i < total; i++) out[i] = (m[i] + 0.5) / total - 0.5
  return out
}

/* Error-diffusion kernels as flat [dx, dy, weight] triples. dx is mirrored
   automatically on right-to-left rows when serpentine scanning is on. */
export const DIFFUSION_KERNELS = {
  floyd: [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16],
  ],
  atkinson: [
    [1, 0, 1 / 8],
    [2, 0, 1 / 8],
    [-1, 1, 1 / 8],
    [0, 1, 1 / 8],
    [1, 1, 1 / 8],
    [0, 2, 1 / 8],
  ],
  jarvis: [
    [1, 0, 7 / 48],
    [2, 0, 5 / 48],
    [-2, 1, 3 / 48],
    [-1, 1, 5 / 48],
    [0, 1, 7 / 48],
    [1, 1, 5 / 48],
    [2, 1, 3 / 48],
    [-2, 2, 1 / 48],
    [-1, 2, 3 / 48],
    [0, 2, 5 / 48],
    [1, 2, 3 / 48],
    [2, 2, 1 / 48],
  ],
}

export const ORDERED_SIZES = { bayer2: 2, bayer4: 4, bayer8: 8, bayer16: 16 }
