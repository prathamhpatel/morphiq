import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Dock from '../../components/Dock/Dock.jsx'
import { applyTheme, usePalette } from '../theme.js'
import ThemePicker from '../ThemePicker.jsx'
import MobileNav from '../MobileNav.jsx'

/* The other components are shown exactly as the lab shows them — same
   modules, same props, same built-in control panels. Nothing about their
   behaviour is re-tuned for this page; only their positioning is contained
   so they sit inside the preview panel instead of covering the viewport. */
const AsciiField = lazy(() => import('../../components/AsciiField/AsciiField.jsx'))
const ScrollExpandDemo = lazy(() => import('../../demos/ScrollExpandDemo.jsx'))
const PrismGlass = lazy(() =>
  import('@morphiq/prism-glass').then((m) => ({ default: m.PrismGlass }))
)
/* The Prism Glass preview refracts our own artwork rather than a stock photo
   — the lens breaking across the wordmark reads as the component arguing for
   itself. The bench uses the same two files; one copy, not two. */
import backdrop from '../../components/PrismGlass/morphiqbg.png'
import cursorMask from '../../components/PrismGlass/cursor.svg'
import registryManifest from '../../../registry.json'
import './ComponentsPage.css'

/* ------------------------------------------------------------ real source ---

   The Code tab shows the component's actual files, read straight off disk at
   build time, and its dependencies come from the registry manifest — the same
   file the shadcn CLI installs from. Nothing here is a copy that can drift
   from what someone actually gets when they run `add`.

   Loaded lazily: these are whole source files, and most visits never open the
   Code tab. */
const RAW = {
  ...import.meta.glob('../../components/**/*.{jsx,js,css}', {
    query: '?raw',
    import: 'default',
  }),
  ...import.meta.glob('../../../packages/**/src/*.{jsx,js}', {
    query: '?raw',
    import: 'default',
  }),
}

/* Glob keys are relative to this file; registry paths are relative to the repo
   root. Resolve the former into the latter so the two can be matched. */
const HERE = 'src/site/components'
function repoPath(relative) {
  const parts = HERE.split('/')
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.' && seg !== '') parts.push(seg)
  }
  return parts.join('/')
}

const SOURCES = Object.fromEntries(
  Object.entries(RAW).map(([key, load]) => [repoPath(key), load])
)

const REGISTRY = Object.fromEntries(
  registryManifest.items.map((item) => [item.name, item])
)


/* =========================================================
   ComponentsPage
   Figma: "Components" (454:456).

   Plain DOM, unlike the landing — only the landing runs in
   WebGL. The preview panel hosts a live Magnifying Dock, and
   the two sliders under "Customize" drive it for real rather
   than sitting there as decoration.
   ========================================================= */

const NAV = [
  { label: 'Docs', view: null },
  { label: 'Components', view: null, active: true },
  { label: 'Templates', view: 'templates' },
]

const SIDEBAR = [
  { title: 'Get Started', items: ['Introduction', 'Installation'] },
  {
    title: 'Components',
    items: ['Magnifying Dock', 'ASCII Field', 'Scroll Expand', 'Prism Glass'],
  },
]

/* ---------------------------------------------------------- prose pages ---

   Get Started has no component to preview, so those two entries render written
   docs instead of a stage and a Customize panel. Blocks rather than raw HTML:
   the page owns the type scale, and a block cannot smuggle in its own styling.

     p     paragraph          list  bulleted list
     h     section heading    note  an aside worth not missing
     code  fenced block       cols  two-column term/definition rows          */

const DOC_PAGES = {
  Introduction: {
    title: 'Introduction',
    lede: 'Morphiq is a set of eight interactive React effects — glass, dither, motion and depth — built to make interfaces feel alive rather than merely work.',
    blocks: [
      { kind: 'h', text: 'Open code, not a dependency' },
      {
        kind: 'p',
        text: 'Installing a Morphiq component copies its source into your project. There is no package to keep up to date and no build step of ours between you and the pixels — the files are yours to read, edit and own. If a component is 90% right, change the other 10%.',
      },
      {
        kind: 'p',
        text: 'That is the shadcn registry model, and it is the reason every component here is written to be read: no clever indirection, no configuration objects, and comments that explain the parts that are genuinely surprising.',
      },

      { kind: 'h', text: 'Every setting is a prop' },
      {
        kind: 'p',
        text: 'Components ship fully controlled. Each one has a sensible default for every setting, so it looks right the moment you drop it in, and nothing is hidden behind internal state you cannot reach. None of them render demo UI or control panels of their own — what you see on these pages is this site driving real props.',
      },

      { kind: 'h', text: 'What is here' },
      {
        kind: 'cols',
        rows: [
          ['Prism Glass', 'A GPU refractive lens for images and render targets — spectral dispersion, frost and a directional rim light from an SDF-defined shape, with no 3D model involved.'],
          ['Magnifying Dock', 'A dock whose items swell as the pointer nears, on springs.'],
          ['ASCII Field', 'A canvas of glyphs that scramble around the cursor and settle back to rest.'],
          ['Bitmap Noise', 'A self-generating dither field — two drifting noise layers interfering into patches of particles.'],
          ['Bitmap Image', 'Any image thresholded into newsprint, by ordered Bayer or true error diffusion.'],
          ['Bitmap Text', 'Type rasterised into particles, from solid letterforms to a cloud that still reads.'],
          ['Scroll Expand', 'A framed panel that opens to full bleed as you scroll past it.'],
          ['Pressure Text', 'Type that gains weight and width under the cursor.'],
        ],
      },
      {
        kind: 'note',
        text: 'Two are shipped and installable today: Prism Glass and Magnifying Dock. The other six run on this site while their prop APIs are finished.',
      },

      { kind: 'h', text: 'What Prism Glass refracts' },
      {
        kind: 'p',
        text: 'Worth knowing before you reach for it: Prism Glass is a texture lens. A shader can only sample a texture — it can never see the DOM — so the lens bends the image or render target you hand it, not the page behind it.',
      },
      {
        kind: 'p',
        text: 'To refract something, put that something in the scene. The preview above does exactly that: it hands the lens a real image, and the lens bends those pixels.',
      },

      { kind: 'h', text: 'License' },
      {
        kind: 'p',
        text: 'MIT. Use it, ship it, sell what you build with it. The Author typeface used on this site carries its own licence from Fontshare and is not covered by that grant.',
      },
    ],
  },

  Installation: {
    title: 'Installation',
    lede: 'Components install with the shadcn CLI. Pick whichever of the three routes below suits your project — they all put the same source in your codebase.',
    blocks: [
      { kind: 'h', text: 'Before you start' },
      {
        kind: 'p',
        text: 'The CLI reads your project before it reaches any registry, so two files have to exist or it stops with Invalid configuration:',
      },
      {
        kind: 'list',
        items: [
          'components.json — run npx shadcn@latest init -d if you do not have one',
          'jsconfig.json or tsconfig.json declaring the @/* path alias',
        ],
      },

      { kind: 'h', text: '1. Straight from GitHub' },
      { kind: 'p', text: 'Nothing to configure. Works because the registry manifest sits at the repository root.' },
      {
        kind: 'code',
        text: 'npx shadcn@latest add prathamhpatel/morphiq/prism-glass\nnpx shadcn@latest add prathamhpatel/morphiq/dock',
        pm: true,
      },

      { kind: 'h', text: '2. Register the namespace' },
      { kind: 'p', text: 'Do this once and every component is a short name from then on. The CLI writes the entry into your components.json for you.' },
      {
        kind: 'code',
        text: 'npx shadcn@latest registry add "@morphiq=https://morphiq.prathampatel.design/r/{name}.json"\n\nnpx shadcn@latest add @morphiq/prism-glass\nnpx shadcn@latest add @morphiq/dock',
        pm: true,
      },
      { kind: 'p', text: 'Or add it by hand:' },
      {
        kind: 'code',
        text: '{\n  "registries": {\n    "@morphiq": "https://morphiq.prathampatel.design/r/{name}.json"\n  }\n}',
        label: 'components.json',
      },

      { kind: 'h', text: '3. By URL' },
      { kind: 'p', text: 'No config, no namespace.' },
      {
        kind: 'code',
        text: 'npx shadcn@latest add https://morphiq.prathampatel.design/r/prism-glass.json',
        pm: true,
      },

      { kind: 'h', text: 'Look before you install' },
      {
        kind: 'code',
        text: 'npx shadcn@latest list @morphiq\nnpx shadcn@latest view @morphiq/prism-glass',
        pm: true,
      },

      { kind: 'h', text: 'What lands in your project' },
      {
        kind: 'p',
        text: 'Each component arrives as a self-contained folder under whatever your components.json alias points at. Nothing else in your project is touched, and nothing is left pointing back at us.',
      },
      {
        kind: 'code',
        label: 'files',
        text: `src/
└─ components/
   ├─ prism-glass/
   │  ├─ index.js          the import target
   │  ├─ PrismGlass.jsx    the component
   │  ├─ shader.js         GLSL: refraction, dispersion, frost, rim light
   │  └─ sdf.js            shape masks
   └─ ascii-field/
      ├─ index.js
      ├─ AsciiField.jsx
      └─ AsciiField.css`,
      },
      {
        kind: 'p',
        text: 'Keeping each component in its own folder is what lets its files import each other by name. It also keeps generic names like shader.js out of your components root, where they would collide with your own.',
      },

      { kind: 'h', text: 'Check it worked' },
      {
        kind: 'p',
        text: 'Build once after installing. A component that renders in isolation can still be missing a package, and the CLI reports success either way — it installs what a registry declares, so an under-declared entry produces files that will not compile.',
      },
      {
        kind: 'note',
        text: 'If a build fails on a missing package straight after installing, that is our bug and not yours. Open an issue with the resolve error and we will fix the entry.',
      },

      { kind: 'h', text: 'Using them' },
      {
        kind: 'p',
        text: 'Each component installs into its own folder with an index, so the folder name alone is the import. Both of these resolve to the same file:',
      },
      {
        kind: 'code',
        label: 'jsx',
        text: "import PrismGlass from '@/components/prism-glass'   // from anywhere\nimport PrismGlass from './prism-glass'              // from a file beside it",
      },
      {
        kind: 'p',
        text: 'The alias works wherever you import from. The relative form is shorter but depends on where your own file sits — it resolves when that file lives in the same components folder the CLI installed into.',
      },
      {
        kind: 'code',
        text: "import PrismGlass from '@/components/prism-glass'\n\n<PrismGlass\n  image={photo}\n  shape=\"circle\"\n  mode=\"cursor\"\n  size={20}\n  refraction={100}\n  depth={60}\n  dispersion={60}\n/>",
      },
      {
        kind: 'code',
        text: "import AsciiField from '@/components/ascii-field'\n\n<AsciiField\n  radius={51}\n  speed={16}\n  opacity={0.23}\n  spacing={2.3}\n  color=\"#ffffff\"\n  background=\"#071228\"\n/>",
      },
      {
        kind: 'note',
        text: 'Prism Glass pulls in three, @react-three/fiber, @react-three/drei and maath; ASCII Field pulls in gsap and @gsap/react. The CLI installs whatever a component needs when you add it.',
      },

      { kind: 'h', text: 'Dialling one in' },
      {
        kind: 'p',
        text: 'Every prop on these pages is live. Open a component in the sidebar, set it up under Customize until it looks the way you want, then copy those values across — the defaults you see are the defaults you get.',
      },
    ],
  },
}

/* Every component's settings live in the page's Customize section, styled the
   same way as the dock's — the components' own floating TEST panels are hidden
   here. `state` is the starting value of each control, unchanged from the
   component's own defaults. */
const PAGES = {
  'Magnifying Dock': {
    registry: 'dock',
    title: 'Magnifying Dock',
    blurb: 'A dock whose items swell as the pointer nears, on springs. Distance drives the scale, so the whole row breathes rather than one icon popping.',
    install: 'npx shadcn@latest add @morphiq/dock',
    usage: `import Dock from '@/components/dock/Dock'

<Dock
  baseSize={40}
  magnifiedSize={90}
/>`,
    state: {
      magnification: 90, itemSize: 40,
      surface: '#08101e', border: '#142544', itemBorder: '#0c1f43',
      accent: '#639aff', icon: '#ffffff',
    },
    controls: [
      { key: 'magnification', label: 'Magnification', min: 0, max: 100 },
      { key: 'itemSize', label: 'Item Size', min: 24, max: 64 },
      { key: 'surface', label: 'Surface', kind: 'color' },
      { key: 'border', label: 'Border', kind: 'color' },
      { key: 'itemBorder', label: 'Item Border', kind: 'color' },
      { key: 'accent', label: 'Accent', kind: 'color' },
      { key: 'icon', label: 'Icon', kind: 'color' },
    ],
  },
  'ASCII Field': {
    registry: 'ascii-field',
    title: 'ASCII Field',
    blurb: 'A canvas of glyphs that scramble around the cursor and settle back to rest — a sprite atlas, a loop and a GSAP timeline.',
    usage: `import AsciiField from '@/components/ascii-field'

<AsciiField
  radius={51}
  speed={16}
  opacity={0.23}
  spacing={2.3}
  color="#ffffff"
  background="#071228"
/>`,
    state: {
      radius: 51, speed: 16, opacity: 23, spacing: 230,
      rest: '.', color: '#ffffff', background: '#071228',
    },
    controls: [
      { key: 'radius', label: 'Radius', min: 40, max: 400, suffix: 'px' },
      { key: 'speed', label: 'Speed', min: 1, max: 60, suffix: '/s' },
      { key: 'opacity', label: 'Opacity', min: 0, max: 100, suffix: '%' },
      // the field crowds below this, so 126% is the floor
      { key: 'spacing', label: 'Spacing', min: 126, max: 250, suffix: '%' },
      { key: 'rest', label: 'Rest', kind: 'text', maxLength: 1 },
      { key: 'color', label: 'Color', kind: 'color' },
      { key: 'background', label: 'Background', kind: 'color' },
    ],
  },
  'Scroll Expand': {
    title: 'Scroll Expand',
    blurb: 'A framed panel that opens to full bleed as you scroll past it. JS writes two custom properties and CSS does the rest, so children can join the animation without any wiring.',
    usage: `import ScrollExpand from '@/components/scroll-expand/ScrollExpand'

<ScrollExpand
  width={62}
  height={48}
  smoothing={0.12}
/>`,
    state: {
      width: 42, height: 58, radius: 24, endRadius: 0, zoom: 135,
      scrim: 45, travel: 120, hold: 35, smoothing: 3, falloff: 'linear',
    },
    controls: [
      { key: 'width', label: 'Width', min: 20, max: 100, suffix: '%' },
      { key: 'height', label: 'Height', min: 20, max: 100, suffix: '%' },
      { key: 'radius', label: 'Radius', min: 0, max: 60, suffix: 'px' },
      { key: 'endRadius', label: 'End Radius', min: 0, max: 60, suffix: 'px' },
      { key: 'zoom', label: 'Media Zoom', min: 100, max: 200, suffix: '%' },
      { key: 'scrim', label: 'Scrim', min: 0, max: 100, suffix: '%' },
      { key: 'travel', label: 'Travel', min: 40, max: 300, suffix: '%' },
      { key: 'hold', label: 'Hold', min: 0, max: 200, suffix: '%' },
      { key: 'smoothing', label: 'Smoothing', min: 0, max: 30 },
      { key: 'falloff', label: 'Falloff', kind: 'select', options: ['linear', 'smooth', 'sharp'] },
    ],
  },
  'Prism Glass': {
    registry: 'prism-glass',
    title: 'Prism Glass',
    blurb: 'A GPU refractive lens — spectral dispersion, uniform frost and a directional rim light, from an SDF-defined shape with no 3D model involved. It refracts the texture you hand it, not the DOM behind it.',
    install: 'npx shadcn@latest add @morphiq/prism-glass',
    usage: `import PrismGlass from '@/components/prism-glass'

<PrismGlass
  image={photo}
  shape="circle"
  mode="cursor"
  size={20}
  refraction={100}
  depth={60}
  dispersion={60}
/>`,
    state: {
      shape: 'circle', mode: 'cursor', size: 20, w: 28, h: 34,
      lightAngle: 45, lightIntensity: 100, refraction: 100,
      depth: 60, dispersion: 60, frost: 0, splay: 0,
    },
    controls: [
      { key: 'shape', label: 'Shape', kind: 'select', options: ['circle', 'rect', 'pill', 'cursor', 'svg'] },
      { key: 'mode', label: 'Mode', kind: 'select', options: ['cursor', 'svg', 'static'] },
      { key: 'size', label: 'Size', min: 4, max: 45, when: (v) => ROUND.has(v.shape) },
      { key: 'w', label: 'Width', min: 4, max: 60, when: (v) => !ROUND.has(v.shape) },
      { key: 'h', label: 'Height', min: 4, max: 60, when: (v) => !ROUND.has(v.shape) },
      { key: 'lightAngle', label: 'Angle', min: -180, max: 180, suffix: '\u00b0' },
      { key: 'lightIntensity', label: 'Intensity', min: 0, max: 100, suffix: '%' },
      { key: 'refraction', label: 'Refraction', min: 0, max: 100 },
      { key: 'depth', label: 'Depth', min: 0, max: 100 },
      { key: 'dispersion', label: 'Dispersion', min: 0, max: 100 },
      { key: 'frost', label: 'Frost', min: 0, max: 100 },
      { key: 'splay', label: 'Splay', min: 0, max: 100 },
    ],
  },
}

const ROUND = new Set(['circle', 'cursor', 'svg'])

/* The colour inputs are <input type="color">, which only accepts a literal
   hex — so blends have to be resolved here rather than left as color-mix(). */
const hex = (c) => parseInt(c.slice(1), 16)
function mix(from, to, amount) {
  const a = hex(from)
  const b = hex(to)
  const ch = (shift) => {
    const x = (a >> shift) & 255
    const y = (b >> shift) & 255
    return Math.round(x + (y - x) * amount)
  }
  return (
    '#' +
    [ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')
  )
}

function Preview({ name, v }) {
  if (name === 'ASCII Field') {
    return (
      <AsciiField
        radius={v.radius}
        speed={v.speed}
        opacity={v.opacity / 100}
        spacing={v.spacing / 100}
        rest={v.rest}
        color={v.color}
        background={v.background}
      />
    )
  }
  if (name === 'Scroll Expand') {
    return (
      <ScrollExpandDemo
        width={v.width}
        height={v.height}
        radius={v.radius}
        endRadius={v.endRadius}
        zoom={v.zoom / 100}
        scrim={v.scrim / 100}
        travel={v.travel / 100}
        hold={v.hold / 100}
        smoothing={v.smoothing / 100}
        falloff={v.falloff}
      />
    )
  }
  if (name === 'Prism Glass') {
    return (
      <PrismGlass
        image={backdrop}
        shape={v.shape === 'svg' ? 'circle' : v.shape}
        mask={v.shape === 'svg' ? cursorMask : undefined}
        mode={v.mode}
        size={ROUND.has(v.shape) ? v.size : [v.w, v.h]}
        position={[0.5, 0.5]}
        refraction={v.refraction}
        depth={v.depth}
        dispersion={v.dispersion}
        frost={v.frost}
        splay={v.splay}
        lightAngle={v.lightAngle}
        lightIntensity={v.lightIntensity}
      />
    )
  }
  return (
    <Dock
      baseSize={v.itemSize}
      magnifiedSize={Math.round(v.itemSize * (1 + (v.magnification / 100) * 0.8))}
      surface={v.surface}
      border={v.border}
      itemBorder={v.itemBorder}
      accent={v.accent}
      icon={v.icon}
    />
  )
}

/* ------------------------------------------------------------- live code ---

   Kept directly below Preview on purpose: these two must agree branch for
   branch. If they drift, someone copies a snippet that does not produce the
   component they are looking at — which is worse than no snippet at all.
   Every transform here (opacity/100, spacing/100) mirrors one up there. */
const n = (x) => (Number.isInteger(x) ? x : +x.toFixed(2))

function snippetFor(name, v) {
  if (name === 'ASCII Field') {
    return `import AsciiField from '@/components/ascii-field'

<AsciiField
  radius={${v.radius}}
  speed={${v.speed}}
  opacity={${n(v.opacity / 100)}}
  spacing={${n(v.spacing / 100)}}
  rest="${v.rest}"
  color="${v.color}"
  background="${v.background}"
/>`
  }

  if (name === 'Scroll Expand') {
    return `import ScrollExpand from '@/components/scroll-expand'

<ScrollExpand
  width={${v.width}}
  height={${v.height}}
  radius={${v.radius}}
  endRadius={${v.endRadius}}
  zoom={${n(v.zoom / 100)}}
  scrim={${n(v.scrim / 100)}}
  travel={${n(v.travel / 100)}}
  hold={${n(v.hold / 100)}}
  smoothing={${n(v.smoothing / 100)}}
  falloff="${v.falloff}"
/>`
  }

  if (name === 'Prism Glass') {
    const shape = v.shape === 'svg' ? 'circle' : v.shape
    const size = ROUND.has(v.shape) ? `{${v.size}}` : `{[${v.w}, ${v.h}]}`
    const mask = v.shape === 'svg' ? '\n  mask={cursorMask}' : ''
    return `import PrismGlass from '@/components/prism-glass'

<PrismGlass
  image={photo}
  shape="${shape}"${mask}
  mode="${v.mode}"
  size=${size}
  position={[0.5, 0.5]}
  refraction={${v.refraction}}
  depth={${v.depth}}
  dispersion={${v.dispersion}}
  frost={${v.frost}}
  splay={${v.splay}}
  lightAngle={${v.lightAngle}}
  lightIntensity={${v.lightIntensity}}
/>`
  }

  return `import Dock from '@/components/dock'

<Dock
  baseSize={${v.itemSize}}
  magnifiedSize={${Math.round(v.itemSize * (1 + (v.magnification / 100) * 0.8))}}
  surface="${v.surface}"
  border="${v.border}"
  itemBorder="${v.itemBorder}"
  accent="${v.accent}"
  icon="${v.icon}"
/>`
}

/* Files and dependencies come from the registry entry when there is one, so a
   documented component and an installed one can never disagree. Components not
   yet in the registry name their own files instead. */
const entryFor = (page) => (page.registry ? REGISTRY[page.registry] : null)
const filesFor = (page) =>
  entryFor(page)?.files.map((f) => f.path) ?? page.sourceFiles ?? []
const depsFor = (page) => entryFor(page)?.dependencies ?? page.deps ?? []

/** The component's real files, fetched on demand — the Code tab is rarely the
    first thing anyone opens, and these are whole source files. */
function SourceFiles({ paths }) {
  const [texts, setTexts] = useState(null)
  const key = paths.join('|')

  useEffect(() => {
    let cancelled = false
    setTexts(null)
    Promise.all(
      paths.map((path) => (SOURCES[path] ? SOURCES[path]() : Promise.resolve(null)))
    ).then((loaded) => {
      if (!cancelled) setTexts(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  if (!texts) return <p className="pane__hint">Reading source&hellip;</p>

  return paths.map((path, i) =>
    texts[i] == null ? null : (
      <CodeBlock key={path} text={texts[i]} label={path.split('/').pop()} />
    )
  )
}

function Control({ c, value, onChange }) {
  return (
    <div className="control">
      <label className="control__label" htmlFor={c.key}>
        {c.label}
      </label>
      <div className="control__row">
        {c.kind === 'select' ? (
          <select
            id={c.key}
            className="control__select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {c.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : c.kind === 'text' ? (
          <input
            id={c.key}
            className="control__text"
            type="text"
            maxLength={c.maxLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : c.kind === 'color' ? (
          <>
            <input
              id={c.key}
              className="control__color"
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <span className="control__value">{value}</span>
          </>
        ) : (
          <>
            <input
              id={c.key}
              className="control__range"
              type="range"
              min={c.min}
              max={c.max}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="control__value">
              {value}
              {c.suffix ?? ''}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- doc chrome ---

   The furniture a component library's docs are expected to have: a trail
   showing where you are, an "on this page" rail, code you can copy in one
   click and in your own package manager, and a way to the next page. */

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* Flat reading order, derived from the sidebar so the two can never disagree */
const ORDER = SIDEBAR.flatMap((g) => g.items)

const groupOf = (name) =>
  SIDEBAR.find((g) => g.items.includes(name))?.title ?? 'Components'

const PM = [
  { id: 'npm', label: 'npm', run: 'npx', add: 'npm install' },
  { id: 'pnpm', label: 'pnpm', run: 'pnpm dlx', add: 'pnpm add' },
  { id: 'yarn', label: 'yarn', run: 'yarn dlx', add: 'yarn add' },
  { id: 'bun', label: 'bun', run: 'bunx --bun', add: 'bun add' },
]

/** Rewrite the runner and the install verb for the chosen package manager. */
const forPm = (text, pm) =>
  text
    .replace(/^npx /gm, `${pm.run} `)
    .replace(/^npm install /gm, `${pm.add} `)

function CopyButton({ text }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(t)
  }, [done])

  return (
    <button
      type="button"
      className={`code__copy${done ? ' is-done' : ''}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => setDone(true),
          () => {}
        )
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ text, label, pm }) {
  const [mgr, setMgr] = useState('npm')
  const shown = pm ? forPm(text, PM.find((p) => p.id === mgr)) : text

  return (
    <div className="code">
      <div className="code__bar">
        {pm ? (
          <div className="code__tabs" role="tablist">
            {PM.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === mgr}
                className={`code__tab${p.id === mgr ? ' is-active' : ''}`}
                onClick={() => setMgr(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="code__label">{label ?? 'jsx'}</span>
        )}

        <CopyButton text={shown} />
      </div>

      <pre className="code__body">
        <code>{shown}</code>
      </pre>
    </div>
  )
}

function Breadcrumb({ group, page }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <span>Docs</span>
      <span className="crumbs__sep">/</span>
      <span>{group}</span>
      <span className="crumbs__sep">/</span>
      <span className="crumbs__here">{page}</span>
    </nav>
  )
}

function Toc({ items }) {
  const [seen, setSeen] = useState(items[0]?.id)
  const [listRef, mark] = useTravellingMark(seen, '.toc__link.is-active')

  useEffect(() => {
    if (!items.length) return
    setSeen(items[0].id)
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter(Boolean)
    if (!els.length) return

    /* Top-biased margin: a heading counts as "current" once it reaches the
       upper third, which is where you actually read it. */
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting)
        if (hit.length) setSeen(hit[0].target.id)
      },
      { rootMargin: '-80px 0px -66% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <aside className="toc">
      <p className="toc__title">On this page</p>
      <ul className="toc__list" ref={listRef}>
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`toc__link${i.id === seen ? ' is-active' : ''}`}
            >
              {i.text}
            </a>
          </li>
        ))}
        <span className="toc__mark" style={mark} aria-hidden="true" />
      </ul>
    </aside>
  )
}

function PageNav({ active, onPick }) {
  const i = ORDER.indexOf(active)
  const prev = i > 0 ? ORDER[i - 1] : null
  const next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null
  if (!prev && !next) return null

  return (
    <nav className="pagenav">
      {prev ? (
        <button type="button" className="pagenav__item" onClick={() => onPick(prev)}>
          <span className="pagenav__dir">Previous</span>
          <span className="pagenav__name">{prev}</span>
        </button>
      ) : (
        <span />
      )}

      {next ? (
        <button
          type="button"
          className="pagenav__item pagenav__item--next"
          onClick={() => onPick(next)}
        >
          <span className="pagenav__dir">Next</span>
          <span className="pagenav__name">{next}</span>
        </button>
      ) : (
        <span />
      )}
    </nav>
  )
}

/* ---------------------------------------------------------- the indicator ---

   Morphiq is a refraction library, so its navigation borrows the one thing
   the library actually does: a light that travels and splits. Rather than a
   marker blinking off one item and on at another, ONE element measures the
   active item and moves to it. The gradient runs cool -> accent -> warm, which
   is the dispersion the shader produces; at 2px it reads as an accent line
   with a hint of iridescence at the ends.

   Measurement, not CSS: the items are text of different widths, so the only
   honest source for where the light should sit is the live box. */
function useTravellingMark(activeKey, selector) {
  const ref = useRef(null)
  const [mark, setMark] = useState(null)

  useLayoutEffect(() => {
    const measure = () => {
      const host = ref.current
      const el = host?.querySelector(selector)
      if (!el) return setMark(null)
      setMark({
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      })
    }

    measure()
    /* Re-measure when the boxes can move underneath us: a resize reflows the
       row, and a late webfont changes every width. */
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => window.removeEventListener('resize', measure)
  }, [activeKey, selector])

  const style = mark
    ? { '--my': `${mark.y}px`, '--mh': `${mark.h}px`, opacity: 1 }
    : { opacity: 0 }

  return [ref, style]
}

function SideGroup({ group, active, onPick }) {
  const [listRef, mark] = useTravellingMark(active, '.side-link.is-active')

  return (
    <section className="side-group">
      <h2 className="side-group__title">{group.title}</h2>
      <ul className="side-group__list" ref={listRef}>
        {group.items.map((item) => (
          <li key={item}>
            <button
              type="button"
              className={`side-link${item === active ? ' is-active' : ''}`}
              onClick={() => onPick(item)}
            >
              {item}
            </button>
          </li>
        ))}
        <span className="side-mark" style={mark} aria-hidden="true" />
      </ul>
    </section>
  )
}

function DocBlocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.kind === 'h')
      return (
        <h2 key={i} id={slug(b.text)} className="prose__h">
          {b.text}
        </h2>
      )
    if (b.kind === 'code')
      return <CodeBlock key={i} text={b.text} label={b.label} pm={b.pm} />
    if (b.kind === 'note') return <p key={i} className="prose__note">{b.text}</p>
    if (b.kind === 'list') {
      return (
        <ul key={i} className="prose__list">
          {b.items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )
    }
    if (b.kind === 'cols') {
      return (
        <dl key={i} className="prose__cols">
          {b.rows.map(([term, def]) => (
            <div key={term} className="prose__row">
              <dt>{term}</dt>
              <dd>{def}</dd>
            </div>
          ))}
        </dl>
      )
    }
    return <p key={i} className="prose__p">{b.text}</p>
  })
}

export default function ComponentsPage({ onNavigate }) {
  const [active, setActive] = useState('Magnifying Dock')
  const doc = DOC_PAGES[active]
  const page = PAGES[active] ?? PAGES['Magnifying Dock']
  const palette = usePalette()

  /* Two components paint with explicit colours rather than inheriting from the
     page. Their own defaults are standalone — that is what an installed copy
     gets — so it is this page that maps them onto the site's pair, the same way
     any host would map them onto its own. */
  const paintFor = (name, { bg, ink }) => {
    if (name === 'ASCII Field') return { color: ink, background: bg }
    if (name === 'Magnifying Dock') {
      return {
        surface: ink,
        border: mix(ink, bg, 0.22),
        itemBorder: mix(ink, bg, 0.14),
        accent: mix(ink, bg, 0.5),
        icon: bg,
      }
    }
    return {}
  }

  const seed = (name) => ({
    ...(PAGES[name]?.state ?? {}),
    ...paintFor(name, palette),
  })

  const [values, setValues] = useState(() => seed('Magnifying Dock'))

  const pick = (name) => {
    setActive(name)
    if (PAGES[name]) setValues(seed(name))
  }

  /* Changing the theme repaints the preview too — a picker that restyled the
     chrome but left the component on its old colours would show the one thing
     the page is about in the wrong palette.

     Only colours still sitting where the last theme put them are rewritten. A
     value the reader has actually chosen is theirs, and survives; the previous
     paint is remembered for exactly that comparison. */
  const painted = useRef(paintFor('Magnifying Dock', palette))

  useEffect(() => {
    const next = paintFor(active, palette)
    /* Read the previous paint into a local before handing the updater to
       React: the updater runs on the next render, by which point the ref has
       already moved on, and every colour would compare equal to the paint it
       is being asked to replace. */
    const prev = painted.current
    painted.current = next

    setValues((v) => {
      const out = { ...v }
      for (const [key, value] of Object.entries(next)) {
        if (v[key] === prev[key]) out[key] = value
      }
      return out
    })
  }, [palette.bg, palette.ink, active])

  const set = (key, n) => setValues((v) => ({ ...v, [key]: n }))

  /* Preview by default, and back to it on every page change — landing on Code
     for a component you have not looked at yet is the wrong first screen. */
  const [tab, setTab] = useState('preview')
  useEffect(() => setTab('preview'), [active])

  /* An install command is what "shipped" means here: source, dependencies and
     the install block are the three halves of one promise, and a component
     whose prop API is still moving should not be inviting anyone to copy its
     internals. Unshipped pages stop at the preview and the usage snippet. */
  const shipped = Boolean(page.install)
  const deps = shipped ? depsFor(page) : []
  const sourcePaths = shipped ? filesFor(page) : []

  /* The rail mirrors whatever the page actually renders: prose headings for a
     written page, the fixed section stack for a component page. */
  const tocItems = doc
    ? doc.blocks
        .filter((b) => b.kind === 'h')
        .map((b) => ({ id: slug(b.text), text: b.text }))
    : [
        { id: 'preview', text: tab === 'code' ? 'Code' : 'Preview' },
        ...(tab === 'preview'
          ? [
              { id: 'customize', text: 'Customize' },
              { id: 'props', text: 'Your settings' },
            ]
          : []),
        ...(page.install
          ? [
              { id: 'dependencies', text: 'Dependencies' },
              { id: 'installation', text: 'Installation' },
            ]
          : []),
      ]

  useEffect(applyTheme, [])

  return (
    <div className="mq docs">
      <div className="docs__rules" aria-hidden="true">
        <span className="docs__v docs__v--a" />
        <span className="docs__v docs__v--b" />
        <span className="docs__v docs__v--c" />
        <span className="docs__v docs__v--d" />
      </div>

      <header className="docs__bar">
        <div className="docs__lead">
          <button
            type="button"
            className="docs__wordmark"
            onClick={() => onNavigate?.('site')}
          >
            <span className="mq-mark" aria-hidden="true" />
            Morphiq
          </button>

          <nav className="docs__nav">
            {NAV.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`docs__navlink${item.active ? ' is-active' : ''}`}
                onClick={() => item.view && onNavigate?.(item.view)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="docs__tools">
          <label className="docs__search">
            <span className="mq-icon mq-icon--search" aria-hidden="true" />
            <input type="search" placeholder="Search" />
          </label>

          <a
            className="docs__github"
            href="https://github.com/prathamhpatel/morphiq"
            target="_blank"
            rel="noreferrer"
          >
            <span className="mq-icon mq-icon--github" aria-hidden="true" />
            Github
          </a>
        </div>

        <MobileNav
          current="Components"
          items={NAV.map((item) => ({
            label: item.label,
            onSelect: () => item.view && onNavigate?.(item.view),
          }))}
        />
      </header>

      <div className="docs__body">
        <aside className="docs__side">
          {SIDEBAR.map((group) => (
            <SideGroup
              key={group.title}
              group={group}
              active={active}
              onPick={pick}
            />
          ))}
        </aside>

        <main className="docs__main">
          <Breadcrumb group={groupOf(active)} page={doc ? doc.title : page.title} />

          <h1 className="docs__title">{doc ? doc.title : page.title}</h1>

          {doc ? (
            <article className="prose">
              <p className="prose__lede">{doc.lede}</p>
              <DocBlocks blocks={doc.blocks} />
            </article>
          ) : (
            <>
              <p className="prose__lede prose__lede--tight">{page.blurb}</p>

              {/* Say it before the controls, not after: nobody should dial a
                  component in, open Code, and only then find out they cannot
                  install it. */}
              {shipped ? null : (
                <p className="prose__note">
                  <strong>Preview only.</strong> {page.title} runs here while
                  its props are still settling, so there is no install command
                  or source to copy yet. It ships to the registry soon.
                </p>
              )}

              {/* Preview and Code are two views of one thing: the code is
                  generated from the same values driving the component above,
                  so what you copy is what you dialled in — not a fixed
                  example someone has to translate. */}
              <div className="pane" id="preview">
                <div className="pane__tabs" role="tablist">
                  {['preview', 'code'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      className={`pane__tab${tab === t ? ' is-active' : ''}`}
                      onClick={() => setTab(t)}
                    >
                      {t === 'preview' ? 'Preview' : 'Code'}
                    </button>
                  ))}
                </div>

                {tab === 'preview' ? (
                  <div className="docs__stage" key={active}>
                    <Suspense fallback={null}>
                      <Preview name={active} v={values} />
                    </Suspense>
                  </div>
                ) : (
                  <>
                    <p className="pane__hint">
                      Usage — with the settings you have dialled in on the
                      Preview tab.
                    </p>
                    <CodeBlock text={snippetFor(active, values)} label="usage.jsx" />

                    {shipped ? (
                      <>
                        <p className="pane__hint">
                          Component source — the files the CLI copies into your
                          project, verbatim.
                        </p>
                        <SourceFiles paths={sourcePaths} />
                      </>
                    ) : null}
                  </>
                )}
              </div>

              {tab === 'preview' ? (
                <>
                  <h2 id="customize" className="docs__section">Customize</h2>

                  <div className="docs__controls">
                    {page.controls
                      .filter((c) => !c.when || c.when(values))
                      .map((c) => (
                        <Control
                          key={c.key}
                          c={c}
                          value={values[c.key]}
                          onChange={(n) => set(c.key, n)}
                        />
                      ))}
                  </div>

                  <h2 id="props" className="docs__section">Your settings</h2>
                  <p className="pane__hint">
                    Every change above rewrites this. Copy it and the component
                    comes out exactly as you have it here.
                  </p>
                  <CodeBlock text={snippetFor(active, values)} label="jsx" />
                </>
              ) : null}

              {shipped ? (
                <>
                  <h2 id="dependencies" className="docs__section">Dependencies</h2>
                  {deps.length ? (
                    <>
                      <p className="pane__hint">
                        The CLI installs these for you. Copying the source by
                        hand instead? Add them yourself:
                      </p>
                      <CodeBlock text={`npm install ${deps.join(' ')}`} pm />
                    </>
                  ) : (
                    <p className="pane__hint">
                      None. Plain React — no third-party packages to install.
                    </p>
                  )}
                </>
              ) : null}

              {page.install ? (
                <>
                  <h2 id="installation" className="docs__section">Installation</h2>
                  <CodeBlock text={page.install} pm />
                </>
              ) : null}
            </>
          )}

          <PageNav active={active} onPick={pick} />
        </main>

        <Toc items={tocItems} />
      </div>

      <ThemePicker />
    </div>
  )
}
