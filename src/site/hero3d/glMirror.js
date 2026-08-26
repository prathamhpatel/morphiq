/*
 * troika needs real font FILES, and Author is licensed from Klim — its files
 * are not in this repo. Point these at your own licensed copies to render the
 * landing in Author; unset, troika falls back to its bundled default and the
 * layout is unchanged.
 */
const FACES = {
  200: import.meta.env.VITE_AUTHOR_EXTRALIGHT,
  300: import.meta.env.VITE_AUTHOR_EXTRALIGHT,
  400: import.meta.env.VITE_AUTHOR_REGULAR,
  500: import.meta.env.VITE_AUTHOR_MEDIUM,
  600: import.meta.env.VITE_AUTHOR_SEMIBOLD,
  700: import.meta.env.VITE_AUTHOR_SEMIBOLD,
}

/*
 * The landing page is drawn in WebGL so the lens can bend all of it, but
 * laying it out in three.js by hand would be miserable. So the DOM stays the
 * source of truth — it does layout, wrapping, selection, screen readers and
 * hit-testing — and every element tagged `data-gl` is mirrored into the scene.
 *
 *   data-gl="text"     -> troika Text at the element's box
 *   data-gl="surface"  -> rounded rect using its background + radius
 *
 * Adding a section is then just markup plus an attribute. The DOM copy is
 * invisible (opacity: 0) but still fully interactive.
 */

const num = (v) => parseFloat(v) || 0

function faceFor(weight) {
  const w = Math.round(num(weight) / 100) * 100
  return FACES[w] || FACES[400]
}

/** rgb()/rgba() -> hex string three understands, plus its alpha */
function parseColor(css) {
  const m = /rgba?\(([^)]+)\)/.exec(css || '')
  if (!m) return { hex: '#ffffff', alpha: 1 }
  const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n))
  const hex =
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  return { hex, alpha: a === undefined ? 1 : a }
}

/**
 * Read every mirrored element once. Positions are re-read per frame; this is
 * only for the things that decide how many meshes to build and how they look.
 */
export function collectNodes(root = document) {
  const out = []

  for (const el of root.querySelectorAll('[data-gl]')) {
    const kind = el.getAttribute('data-gl')
    const cs = getComputedStyle(el)

    if (kind === 'text') {
      const text = (el.getAttribute('data-gl-text') ?? el.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) continue

      const { hex } = parseColor(cs.getPropertyValue('--gl-color') || cs.color)

      const size = num(cs.fontSize)
      const lh = cs.lineHeight === 'normal' ? 1.2 : num(cs.lineHeight) / size
      const r = el.getBoundingClientRect()

      /* Only constrain the width of text the DOM is actually wrapping.
         troika measures a hair differently from the browser, so handing a
         single line its exact box makes it wrap where the DOM does not — and
         the extra line lands on top of whatever sits below it. */
      const wraps = r.height > size * lh * 1.5

      out.push({
        el,
        kind,
        text,
        font: faceFor(cs.fontWeight),
        size,
        lineHeight: lh,
        maxWidth: wraps ? r.width + 2 : undefined,
        letterSpacing: num(cs.letterSpacing) / num(cs.fontSize) || 0,
        align: cs.textAlign === 'center' ? 'center' : 'left',
        color: hex,
        // cap-trimmed type is anchored on the cap line, everything else on top
        anchorY: el.hasAttribute('data-gl-cap') ? 'top-cap' : 'top',
        /* Most type never changes size, so it is measured once. The header's
           does — it shrinks as the bar draws in — so those opt in to being
           re-read every frame. */
        live: el.hasAttribute('data-gl-live'),
        // the header floats over the page, so it has to draw over it too
        top: el.hasAttribute('data-gl-top'),
      })
    } else if (kind === 'surface') {
      const { hex, alpha } = parseColor(cs.backgroundColor)
      out.push({
        el,
        kind,
        color: hex,
        opacity: alpha,
        radius: num(cs.borderTopLeftRadius),
        top: el.hasAttribute('data-gl-top'),
      })
    }
  }

  return out
}
