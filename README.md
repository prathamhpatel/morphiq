# Morphiq

**Interfaces that move.**

Interactive React components — glass, motion and depth — built to make modern
interfaces feel alive.

Open source. Thoughtful motion. No boring interfaces.

---

## Installation

Add a component straight into your project with the shadcn CLI. The source lands
in your codebase — yours to read, edit and own. No runtime dependency on Morphiq.

Any of these work. Pick one.

**1. Straight from GitHub** — nothing to configure:

```bash
npx shadcn@latest add prathamhpatel/morphiq/prism-glass
npx shadcn@latest add prathamhpatel/morphiq/ascii-field
```

**2. Register the `@morph` namespace once**, then install by short name:

```bash
npx shadcn@latest registry add "@morph=https://morphiq.prathampatel.design/r/{name}.json"

npx shadcn@latest add @morph/prism-glass
npx shadcn@latest add @morph/ascii-field
```

`registry add` writes the namespace into your `components.json` for you. If you
would rather do it by hand:

```json
{
  "registries": {
    "@morph": "https://morphiq.prathampatel.design/r/{name}.json"
  }
}
```

**3. By URL** — no config, no namespace:

```bash
npx shadcn@latest add https://morphiq.prathampatel.design/r/prism-glass.json
```

Browse what is in the registry before you install anything:

```bash
npx shadcn@latest list @morph
npx shadcn@latest view @morph/prism-glass
```

### Requirements

The shadcn CLI needs a project it can read, so make sure you have:

- a `components.json` — run `npx shadcn@latest init -d` if you don't have one
- a `jsconfig.json` or `tsconfig.json` declaring the `@/*` path alias

Without both, the CLI stops with `Invalid configuration` or
`Couldn't find tsconfig.json` before it ever reaches the registry.

## Usage

Every component is fully controlled. Each setting is a prop with a sensible
default, and none of them ship demo UI.

```jsx
import PrismGlass from '@/components/prism-glass'

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
import AsciiField from '@/components/ascii-field'

<AsciiField
  radius={51}
  speed={16}
  opacity={0.23}
  spacing={2.3}
  color="#ffffff"
  background="#071228"
/>
```

Every prop is live on the docs site, so you can dial a component in before you
install it.

## Components

| Component | What it does |
|---|---|
| **Prism Glass** | A GPU refractive lens for images and rendered textures. Spectral dispersion, frost and a directional rim light, from an SDF-defined shape — no 3D model required. |
| **ASCII Field** | A canvas of glyphs that scramble around the cursor and settle back to rest. |
| **Magnifying Dock** | A dock whose items swell as the pointer nears, on springs. |
| **Scroll Expand** | A framed panel that opens to full bleed as you scroll past it. |
| **Pressure Text** | Type that gains weight and width under the cursor. |

## What Prism Glass refracts

Prism Glass is a **texture lens**. It refracts the image or render target you
give it — it cannot see the DOM behind it, and no WebGL component can. The
browser gives shaders no access to page pixels.

There are three ways to build glass on the web, and it's worth knowing which
one you need:

1. **Texture glass** — an image goes into a shader. This is Prism Glass.
2. **Scene glass** — content is rendered into a WebGL scene, then into a
   buffer, then refracted. This is how the Morphiq landing page lets the
   cursor lens bend its own headline.
3. **Backdrop glass** — `backdrop-filter` with an SVG displacement map. The
   only technique that touches live DOM, at lower fidelity.

## Contributing

Morphiq is open source and built in the open — new components welcome.

```bash
git clone https://github.com/prathamhpatel/morphiq
cd morphiq
npm install
npm run dev
```

No configuration needed. The landing page is at `/`; the component docs sit
behind **Components** in the nav.

```
packages/prism-glass/   the published npm package
src/components/         component sources
src/site/               the WebGL landing page
src/site/components/    the docs site
registry.json           shadcn registry manifest
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add a component, how to
write a registry entry that actually installs, and what a pull request needs.

## Typeface

Set in **Author** by Satya Rajpurohit (Indian Type Foundry), from
[Fontshare](https://fontshare.com/fonts/author) — free for personal and
commercial use.

## License

[MIT](./LICENSE) — use it, ship it, sell what you build with it.

The Author typeface in `public/fonts/` carries its own licence from Fontshare and
is not covered by the MIT grant — see [NOTICE](./NOTICE).
