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

/* Every component's settings live in the page's Customize section, styled the
   same way as the dock's — the components' own floating TEST panels are hidden
   here. `state` is the starting value of each control, unchanged from the
   component's own defaults. */
const PAGES = {
  'Magnifying Dock': {
    title: 'Magnifying Dock',
    state: { magnification: 90, itemSize: 40 },
    controls: [
      { key: 'magnification', label: 'Magnification', min: 0, max: 100 },
      { key: 'itemSize', label: 'Item Size', min: 24, max: 64 },
    ],
  },
  'ASCII Field': {
    title: 'ASCII Field',
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

export default function ComponentsPage({ onNavigate }) {
  const [active, setActive] = useState('Magnifying Dock')
  const page = PAGES[active] ?? PAGES['Magnifying Dock']
  const [values, setValues] = useState(page.state)

  const pick = (name) => {
    setActive(name)
    if (PAGES[name]) setValues(PAGES[name].state)
  }

  const set = (key, n) => setValues((v) => ({ ...v, [key]: n }))

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
          <h1 className="docs__title">{page.title}</h1>

          <div className="docs__stage" key={active}>
            <Suspense fallback={null}>
              <Preview name={active} v={values} />
            </Suspense>
          </div>

          <h2 className="docs__section">Customize</h2>

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
        </main>
      </div>
    </div>
  )
}
