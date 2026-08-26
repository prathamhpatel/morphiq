# Morphiq

**Interfaces that move.**

A collection of interactive React components — glass, motion and depth —
built to make modern interfaces feel alive.

Open source. Thoughtful motion. No boring interfaces.

---

## Components

| Component | What it does |
|---|---|
| **Prism Glass** | A GPU refractive lens for images and rendered textures. Spectral dispersion, frost and a directional rim light, from an SDF-defined shape — no 3D model required. |
| **ASCII Field** | A canvas of glyphs that scramble around the cursor and settle back to rest. |
| **Magnifying Dock** | A dock whose items swell as the pointer nears, on springs. |
| **Scroll Expand** | A framed panel that opens to full bleed as you scroll past it. |
| **Pressure Text** | Type that gains weight and width under the cursor. |
| **Fluid Glass** | A live scene rendered to a buffer and refracted through the same lens. |
| **Focus Pill** | A glass pill over a shifting backdrop. |

## Getting started

```bash
git clone https://github.com/prathamhpatel/morphiq
cd morphiq
npm install
npm run dev
```

No configuration needed. The landing page is at `/`; the component docs are
behind **Components** in the nav.

## Using a component

Every component is fully controlled — each setting is a prop with a default,
and none of them carry demo UI.

```jsx
import { PrismGlass } from '@morphiq/prism-glass'

<PrismGlass
  image={photo}
  shape="circle"
  mode="cursor"
  size={20}
  refraction={100}
  depth={60}
  dispersion={60}
/>
```

```jsx
import AsciiField from './components/AsciiField/AsciiField'

<AsciiField radius={51} speed={16} opacity={0.23} spacing={2.3} />
```

## A note on what Prism Glass refracts

Prism Glass is a **texture lens**. It refracts the image or render target you
give it — it cannot see the DOM behind it, and no WebGL component can. The
browser gives shaders no access to page pixels.

There are three ways to build glass on the web, and it's worth knowing which
one you want:

1. **Texture glass** — an image goes into a shader. This is Prism Glass.
2. **Scene glass** — content is rendered into a WebGL scene, then into a
   buffer, then refracted. This is what the landing page does, so the cursor
   lens can bend the headline.
3. **Backdrop glass** — `backdrop-filter` with an SVG displacement map. The
   only technique that touches live DOM, at lower fidelity.

## Repo layout

```
packages/prism-glass/   the published component
src/components/         the component sources
src/site/               the WebGL landing page
src/site/components/    the docs site
registry.json           shadcn registry manifest
```

## Typeface

Set in **Author** by Satya Rajpurohit (Indian Type Foundry), from
[Fontshare](https://fontshare.com/fonts/author) — free for personal and
commercial use. Files are in `public/fonts/`.

## License

MIT + Commons Clause — free for personal and commercial use. You may not sell
Morphiq itself. See [LICENSE](./LICENSE).
