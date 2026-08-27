/* troika needs font FILES rather than CSS, so it reads them straight out of
   public/ — same Author faces the DOM side uses. */
const FACES = {
  200: '/fonts/Author-Extralight.otf',
  300: '/fonts/Author-Extralight.otf',
  400: '/fonts/Author-Regular.otf',
  500: '/fonts/Author-Medium.otf',
  600: '/fonts/Author-Semibold.otf',
  700: '/fonts/Author-Semibold.otf',
}

/*
 * The landing page is drawn in WebGL so the lens can bend all of it, but
 * laying it out in three.js by hand would be miserable. So the DOM stays the
 * source of truth — it does layout, wrapping, selection, screen readers and
 * hit-testing — and every element tagged `data-gl` is mirrored into the scene.
 *
 *   data-gl="text"     -> troika Text at the element's box
 *   data-gl="surface"  -> rounded rect using its background + radius
 *   data-gl="image"    -> textured plane filling its box, from data-gl-src
 *
 * A surface can fade with `data-gl-alpha="--some-prop"`, naming a custom
 * property holding a plain number that the frame loop multiplies into its
 * alpha.
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
    } else if (kind === 'image') {
      /* Deliberately NOT reading computed opacity: the DOM copy sits at
         opacity 0 so the scene owns the pixels, so the element can never
         report its intended value. */
      out.push({
        el,
        kind,
        src: el.getAttribute('data-gl-src') || el.getAttribute('src'),
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
        /* A surface's alpha is read ONCE here, so anything that needs to fade
           has to name a custom property the frame loop can re-read:

             data-gl-alpha="--e-glass"

           CSS `opacity` is not an option — `.site [data-gl] { opacity: 0 }`
           pins every mirrored element to zero, so the computed value is always
           0 and tells the scene nothing. */
        alphaVar: el.getAttribute('data-gl-alpha'),
      })
    }
  }

  return out
}
