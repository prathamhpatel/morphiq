import * as THREE from 'three'

/* Turn any silhouette (SVG / PNG) into a signed-distance-field texture, so the
   shader can treat an arbitrary shape exactly like an analytic SDF.
   Encoding: r = 0.5 on the outline, <0.5 inside, >0.5 outside, in units of the
   padded image height. Bilinear filtering of an SDF keeps edges sharp. */

const SQRT2 = Math.SQRT2

// two-pass chamfer distance transform; `seed[i] === 1` means distance 0
function chamfer(seed, W, H) {
  const d = new Float32Array(W * H)
  d.fill(1e9)
  for (let i = 0; i < W * H; i++) if (seed[i]) d[i] = 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + 1)
      if (y > 0) v = Math.min(v, d[i - W] + 1)
      if (x > 0 && y > 0) v = Math.min(v, d[i - W - 1] + SQRT2)
      if (x < W - 1 && y > 0) v = Math.min(v, d[i - W + 1] + SQRT2)
      d[i] = v
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      let v = d[i]
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1)
      if (y < H - 1) v = Math.min(v, d[i + W] + 1)
      if (x < W - 1 && y < H - 1) v = Math.min(v, d[i + W + 1] + SQRT2)
      if (x > 0 && y < H - 1) v = Math.min(v, d[i + W - 1] + SQRT2)
      d[i] = v
    }
  }
  return d
}

function build(img, res) {
  // rasterise at `res` tall for precision, with padding so outside distances grow
  const ar = img.width / img.height
  const iw = Math.max(1, Math.round(res * ar))
  const ih = res
  const pad = Math.round(Math.max(iw, ih) * 0.35)
  const W = iw + pad * 2
  const H = ih + pad * 2

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(img, pad, pad, iw, ih)
  const px = ctx.getImageData(0, 0, W, H).data

  // opaque = inside; if the art has no alpha, fall back to "not white"
  let maxA = 0
  for (let i = 3; i < px.length; i += 4) if (px[i] > maxA) maxA = px[i]
  const useAlpha = maxA > 8

  const inside = new Uint8Array(W * H)
  const outside = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const o = i * 4
    const on = useAlpha
      ? px[o + 3] > 127
      : px[o + 3] > 127 && (px[o] + px[o + 1] + px[o + 2]) / 3 < 240
    inside[i] = on ? 1 : 0
    outside[i] = on ? 0 : 1
  }

  const dOut = chamfer(inside, W, H)  // outside → nearest shape pixel
  const dIn = chamfer(outside, W, H)  // inside  → nearest background pixel

  // encode, flipping vertically (canvas is y-down, GL textures are y-up)
  const data = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W
    const dst = y * W
    for (let x = 0; x < W; x++) {
      const i = src + x
      const signed = inside[i] ? -dIn[i] : dOut[i]
      const enc = 0.5 + signed / H
      data[dst + x] = Math.max(0, Math.min(255, Math.round(enc * 255)))
    }
  }

  const texture = new THREE.DataTexture(data, W, H, THREE.RedFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return { texture, aspect: W / H }
}

export function loadSdfTexture(url, res = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try { resolve(build(img, res)) } catch (e) { reject(e) }
    }
    img.onerror = reject
    img.src = url
  })
}
