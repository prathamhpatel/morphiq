import { Suspense, lazy, useEffect, useState } from 'react'
import Dock from '../../components/Dock/Dock.jsx'

/* The other components are shown exactly as the lab shows them — same
   modules, same props, same built-in control panels. Nothing about their
   behaviour is re-tuned for this page; only their positioning is contained
   so they sit inside the preview panel instead of covering the viewport. */
const AsciiField = lazy(() => import('../../components/AsciiField/AsciiField.jsx'))
const ScrollExpandDemo = lazy(() => import('../../demos/ScrollExpandDemo.jsx'))
const PrismGlass = lazy(() =>
  import('@morphiq/prism-glass').then((m) => ({ default: m.PrismGlass }))
)
import searchIcon from './icons/search.svg'
import githubIcon from './icons/github.svg'
import backdrop from '../../components/Glass/backdrop.png'
import cursorMask from '../../components/FluidGlass/cursor.svg'
import './ComponentsPage.css'

/* =========================================================
   ComponentsPage
   Figma: "Components" (454:456).

   Plain DOM, unlike the landing — only the landing runs in
   WebGL. The preview panel hosts a live Magnifying Dock, and
   the two sliders under "Customize" drive it for real rather
   than sitting there as decoration.
   ========================================================= */

const NAV = ['Components', 'Templates', 'Docs']

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
    lede: 'Morphiq is a set of interactive React components — glass, motion and depth — built to make interfaces feel alive rather than merely work.',
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
          ['ASCII Field', 'A canvas of glyphs that scramble around the cursor and settle back to rest.'],
          ['Magnifying Dock', 'A dock whose items swell as the pointer nears, on springs.'],
          ['Scroll Expand', 'A framed panel that opens to full bleed as you scroll past it.'],
          ['Pressure Text', 'Type that gains weight and width under the cursor.'],
        ],
      },
      {
        kind: 'note',
        text: 'Prism Glass and ASCII Field are in the registry and installable today. The rest are on the site while their prop APIs are finished.',
      },

      { kind: 'h', text: 'What Prism Glass refracts' },
      {
        kind: 'p',
        text: 'Worth knowing before you reach for it: Prism Glass is a texture lens. A shader can only sample a texture — it can never see the DOM — so the lens bends the image or render target you hand it, not the page behind it.',
      },
      {
        kind: 'p',
        text: 'To refract something, put that something in the scene. This site’s landing page does exactly that: the whole page is mirrored into WebGL so the cursor lens has real pixels to bend.',
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
        text: 'npx shadcn@latest add prathamhpatel/morphiq/prism-glass\nnpx shadcn@latest add prathamhpatel/morphiq/ascii-field',
        pm: true,
      },

      { kind: 'h', text: '2. Register the namespace' },
      { kind: 'p', text: 'Do this once and every component is a short name from then on. The CLI writes the entry into your components.json for you.' },
      {
        kind: 'code',
        text: 'npx shadcn@latest registry add "@morph=https://morphiq.prathampatel.design/r/{name}.json"\n\nnpx shadcn@latest add @morph/prism-glass\nnpx shadcn@latest add @morph/ascii-field',
        pm: true,
      },
      { kind: 'p', text: 'Or add it by hand:' },
      {
        kind: 'code',
        text: '{\n  "registries": {\n    "@morph": "https://morphiq.prathampatel.design/r/{name}.json"\n  }\n}',
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
        text: 'npx shadcn@latest list @morph\nnpx shadcn@latest view @morph/prism-glass',
        pm: true,
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
    title: 'Magnifying Dock',
    blurb: 'A dock whose items swell as the pointer nears, on springs. Distance drives the scale, so the whole row breathes rather than one icon popping.',
    usage: `import Dock from '@/components/dock/Dock'

<Dock
  baseSize={40}
  magnifiedSize={90}
/>`,
    state: { magnification: 90, itemSize: 40 },
    controls: [
      { key: 'magnification', label: 'Magnification', min: 0, max: 100 },
      { key: 'itemSize', label: 'Item Size', min: 24, max: 64 },
    ],
  },
  'ASCII Field': {
    title: 'ASCII Field',
    blurb: 'A canvas of glyphs that scramble around the cursor and settle back to rest — a sprite atlas, a loop and a GSAP timeline.',
    install: 'npx shadcn@latest add @morph/ascii-field',
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
    title: 'Prism Glass',
    blurb: 'A GPU refractive lens — spectral dispersion, uniform frost and a directional rim light, from an SDF-defined shape with no 3D model involved. It refracts the texture you hand it, not the DOM behind it.',
    install: 'npx shadcn@latest add @morph/prism-glass',
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
    />
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
  { id: 'npm', label: 'npm', run: 'npx' },
  { id: 'pnpm', label: 'pnpm', run: 'pnpm dlx' },
  { id: 'yarn', label: 'yarn', run: 'yarn dlx' },
  { id: 'bun', label: 'bun', run: 'bunx --bun' },
]

/** Rewrite `npx <pkg>` for the chosen package manager, leaving the rest alone. */
const forPm = (text, run) =>
  run === 'npx' ? text : text.replace(/^npx /gm, `${run} `)

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
  const shown = pm ? forPm(text, PM.find((p) => p.id === mgr).run) : text

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
      <ul className="toc__list">
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
  const [values, setValues] = useState(page.state)

  const pick = (name) => {
    setActive(name)
    if (PAGES[name]) setValues(PAGES[name].state)
  }

  const set = (key, n) => setValues((v) => ({ ...v, [key]: n }))

  /* The rail mirrors whatever the page actually renders: prose headings for a
     written page, the fixed section stack for a component page. */
  const tocItems = doc
    ? doc.blocks
        .filter((b) => b.kind === 'h')
        .map((b) => ({ id: slug(b.text), text: b.text }))
    : [
        { id: 'preview', text: 'Preview' },
        { id: 'customize', text: 'Customize' },
        ...(page.install ? [{ id: 'installation', text: 'Installation' }] : []),
        ...(page.usage ? [{ id: 'usage', text: 'Usage' }] : []),
      ]

  // The app shell locks html/body overflow for the component lab; this page
  // is a normal document and needs it back, same as the landing does.
  useEffect(() => {
    document.documentElement.classList.add('site-scroll')
    return () => document.documentElement.classList.remove('site-scroll')
  }, [])

  return (
    <div className="docs">
      <header className="docs__bar">
        <div className="docs__lead">
          <button
            type="button"
            className="docs__wordmark"
            onClick={() => onNavigate?.('site')}
          >
            Morphiq
          </button>

          <nav className="docs__nav">
            {NAV.map((label) => (
              <button
                key={label}
                type="button"
                className={`docs__navlink${label === 'Components' ? ' is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="docs__tools">
          <label className="docs__search">
            <img src={searchIcon} alt="" />
            <input type="search" placeholder="Search" />
          </label>

          <a
            className="docs__github"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            <img src={githubIcon} alt="" />
            Github
          </a>
        </div>
      </header>

      <div className="docs__body">
        <aside className="docs__side">
          {SIDEBAR.map((group) => (
            <section key={group.title} className="side-group">
              <h2 className="side-group__title">{group.title}</h2>
              <ul className="side-group__list">
                {group.items.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className={`side-link${item === active ? ' is-active' : ''}`}
                      onClick={() => pick(item)}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
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

              <h2 id="preview" className="docs__section docs__section--first">
                Preview
              </h2>

              <div className="docs__stage" key={active}>
                <Suspense fallback={null}>
                  <Preview name={active} v={values} />
                </Suspense>
              </div>

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

              {page.install ? (
                <>
                  <h2 id="installation" className="docs__section">Installation</h2>
                  <CodeBlock text={page.install} pm />
                </>
              ) : null}

              {page.usage ? (
                <>
                  <h2 id="usage" className="docs__section">Usage</h2>
                  <CodeBlock text={page.usage} label="jsx" />
                </>
              ) : null}
            </>
          )}

          <PageNav active={active} onPick={pick} />
        </main>

        <Toc items={tocItems} />
      </div>
    </div>
  )
}
