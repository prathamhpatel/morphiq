import { useEffect, useState } from 'react'
import { applyTheme, usePalette } from './theme.js'
import ThemePicker from './ThemePicker.jsx'
import MobileNav from './MobileNav.jsx'
import BitmapNoise from '../components/BitmapNoise/BitmapNoise.jsx'
import BitmapText from '../components/BitmapText/BitmapText.jsx'
import './home.css'

/*
 * Figma "Desktop - 21" (node 492:43) extended into a full landing page.
 *
 * The frame is 1633px wide in Figma and every measurement is the raw Figma
 * number multiplied by --mq-s, so the proportions hold at any viewport. The
 * three vertical rules the design establishes — 112, 814.44, 1521 — carry
 * through every section below the hero: each band splits on the middle rule,
 * statement on the left, evidence on the right. The hero sets that pattern
 * with the headline and the dither; the rest of the page keeps it.
 */

const STATS = [
  { label: 'Effects', value: '8' },
  { label: 'Customizable', value: '100%' },
  { label: 'License', value: 'Commercial' },
]

/*
 * The eight effects on the site, shipped ones first.
 *
 * `slug` is what you type; its absence is the status — an effect with no
 * install line runs here but is not in the registry yet. That is the one thing
 * a visitor most needs to know, so it is carried by the content itself rather
 * than by a badge that has to be kept in sync with it.
 */
const COMPONENTS = [
  {
    name: 'Prism Glass',
    note: 'A refractive lens with real spectral dispersion, frost and a directional rim light. Shapes come from signed distance fields, not a 3D model.',
    slug: '@morphiq/prism-glass',
  },
  {
    name: 'Magnifying Dock',
    note: 'A dock whose items swell as the pointer nears, on springs. Distance drives the scale, so the row breathes rather than one icon popping.',
    slug: '@morphiq/dock',
  },
  {
    name: 'Bitmap Noise',
    note: 'Two drifting noise layers interfere until the field breaks into patches of particles that form, dissolve and reform on their own.',
  },
  {
    name: 'Bitmap Image',
    note: 'Any image, thresholded into newsprint. Ordered Bayer or true error diffusion, with the source cached so only the dither re-runs.',
  },
  {
    name: 'Bitmap Text',
    note: 'Type rasterised into particles. One grain control takes the letterforms from solid to a cloud that still reads.',
  },
  {
    name: 'ASCII Field',
    note: 'A canvas of glyphs that scramble around the cursor and settle back to rest.',
  },
  {
    name: 'Scroll Expand',
    note: 'A framed panel that opens to full bleed as you scroll past it.',
  },
  {
    name: 'Pressure Text',
    note: 'Type that gains weight and width under the cursor, while the word keeps its measure.',
  },
]

const PRINCIPLES = [
  'Refraction, not a blur filter',
  'Every setting is a prop',
  'Source you own, not a dependency',
  'No demo UI baked in',
  'Read before you install',
]

const STACK = ['React 19', 'shadcn CLI', 'No Tailwind required', 'MIT licensed']

const INSTALL = 'npx shadcn@latest add @morphiq/prism-glass'

const REPO = 'https://github.com/prathamhpatel/morphiq'

const FOOTER = [
  {
    title: 'Components',
    links: [
      { label: 'Prism Glass', view: 'docs' },
      { label: 'Magnifying Dock', view: 'docs' },
      { label: 'ASCII Field', view: 'docs' },
      { label: 'Scroll Expand', view: 'docs' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Introduction', view: 'docs' },
      { label: 'Installation', view: 'docs' },
      { label: 'Templates', view: 'templates' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: REPO },
      { label: 'Registry', href: 'https://morphiq.prathampatel.design/r/registry.json' },
      { label: 'MIT licence', href: `${REPO}/blob/main/LICENSE` },
    ],
  },
]

/** The install line, with a control that says what it does and then what it did. */
function CopyLine({ command }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <div className="fh__install">
      <code className="fh__command">{command}</code>
      <button
        type="button"
        className="fh__copy"
        onClick={() => {
          navigator.clipboard?.writeText(command).then(
            () => setCopied(true),
            () => setCopied(false)
          )
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default function Home({ onNavigate }) {
  const { bg, ink } = usePalette()
  useEffect(applyTheme, [])

  const go = (view) => view && onNavigate?.(view)

  return (
    <div className="mq fh">
      <div className="fh__ledger">
        {/* The three vertical rules run the length of the ledger. The middle
            one drops from the nav rule rather than the top edge, which is the
            one place the design breaks its own grid — the nav reads as a
            single unbroken band because of it. */}
        <div className="fh__rules" aria-hidden="true">
          <span className="fh__v fh__v--a" />
          <span className="fh__v fh__v--b" />
          <span className="fh__v fh__v--c" />
        </div>

        <div className="fh__screen">
          <header className="fh__nav">
            <div className="fh__wordmark">
              <span className="mq-mark" aria-hidden="true" />
              <span>Morphiq</span>
            </div>

            <nav className="fh__links">
              <button type="button" onClick={() => go('docs')}>Docs</button>
              <button type="button" onClick={() => go('docs')}>Components</button>
              <button type="button" onClick={() => go('templates')}>Templates</button>
            </nav>

            <a className="fh__github" href={REPO} target="_blank" rel="noreferrer">
              <span className="mq-icon mq-icon--github" aria-hidden="true" />
              Github
            </a>

            <MobileNav
              items={[
                { label: 'Docs', onSelect: () => go('docs') },
                { label: 'Components', onSelect: () => go('docs') },
                { label: 'Templates', onSelect: () => go('templates') },
              ]}
            />
          </header>

          <section className="fh__hero">
            <div className="fh__lockup">
              <h1 className="fh__title">
                UI Components
                <br />
                that reacts
                <br />
                before you click.
              </h1>

              <button type="button" className="fh__cta" onClick={() => go('docs')}>
                Explore Components
                <span className="mq-icon mq-icon--arrow" aria-hidden="true" />
              </button>
            </div>

            <div className="fh__dither">
              {/* Dialled in on the bench. The cursor terms are negative on
                  purpose: the pointer pulls the field inward and darkens it
                  rather than blooming, so it reads as a well, not a light. */}
              <BitmapNoise
                scale={2}
                speed={0.4}
                patch={0.42}
                density={0.33}
                cell={4}
                levels={2}
                dither="bayer16"
                ditherAmount={1}
                contrast={1}
                brightness={0}
                invert={false}
                warp={0}
                cursorRadius={297}
                cursorStrength={-42}
                cursorLift={-0.4}
                color={ink}
                background={bg}
              />
            </div>
          </section>

          <div className="fh__meta">
            <p className="fh__lede">
              A collection of beautifully crafted, interactive React components
              built to make modern interfaces feel alive.
            </p>

            <dl className="fh__stats">
              {STATS.map((s) => (
                <div key={s.label} className="fh__stat">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ---- the index ---- */}
        <section className="fh__band">
          <div className="fh__split">
            <div className="fh__head">
              <p className="fh__eyebrow">Components</p>
              <h2 className="fh__h2">Eight effects. Two you can install today.</h2>
            </div>
            <p className="fh__body">
              Glass, dither, motion and depth. Each one is fully controlled —
              every setting is a prop with a sensible default, and none of them
              ship a control panel of their own. Prism Glass and the Magnifying
              Dock are in the registry; the rest are finishing their prop APIs.
            </p>
          </div>

          <ol className="fh__index">
            {COMPONENTS.map((c) => (
              <li key={c.name} className="fh__row fh__split">
                <h3 className="fh__row-name">{c.name}</h3>
                <div className="fh__row-body">
                  <p className="fh__row-note">{c.note}</p>
                  <p className="fh__row-slug">
                    {c.slug ?? 'Runs here — not in the registry yet'}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="fh__split">
            <span />
            <button type="button" className="fh__link" onClick={() => go('docs')}>
              Browse the components
            </button>
          </div>
        </section>

        {/* ---- stance ---- */}
        <section className="fh__band">
          <div className="fh__split">
            <h2 className="fh__h2">Not another component library.</h2>
            <div>
              <p className="fh__body">
                Most &ldquo;glass&rdquo; components are a blur filter under a
                white overlay. Prism Glass is a real shader: dispersion
                integrated across 28 samples of the spectrum, frost as a
                golden-angle disc blur, and edges that bend what is behind them
                rather than smearing it.
              </p>
              <ul className="fh__principles">
                {PRINCIPLES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- source ---- */}
        <section className="fh__band">
          <div className="fh__split">
            <h2 className="fh__h2">You get the source, not a dependency.</h2>
            <div>
              <p className="fh__lead">
                Installing a component copies its files into your project.
              </p>
              <p className="fh__body">
                There is no package to keep up to date and no build step of ours
                between you and the pixels. If a component is ninety percent
                right, change the other ten. This page is the proof: everything
                on it is drawn by the components themselves.
              </p>
            </div>
          </div>
        </section>

        {/* ---- install ---- */}
        <section className="fh__band">
          <div className="fh__split">
            <div className="fh__head">
              <h2 className="fh__h2">One command, then it is yours.</h2>
              <p className="fh__body">
                Components install with the shadcn CLI, straight into the folder
                your project already uses.
              </p>
            </div>
            <div>
              <CopyLine command={INSTALL} />
              <ul className="fh__chips">
                {STACK.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <button type="button" className="fh__link" onClick={() => go('docs')}>
                Read the documentation
              </button>
            </div>
          </div>
        </section>

        {/* ---- open ---- */}
        <section className="fh__band">
          <div className="fh__split">
            <h2 className="fh__h2">Built in the open.</h2>
            <div>
              <p className="fh__body">
                MIT licensed. Use it, ship it, sell what you build with it. The
                registry, the shader and this site are all in the repository —
                and new components are welcome.
              </p>
              <a className="fh__link" href={REPO} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ---- closer: the hero composition, restated ---- */}
        <section className="fh__band fh__band--end">
          <div className="fh__lockup fh__lockup--end">
            <h2 className="fh__h2 fh__h2--big">Make your interface move.</h2>
            <p className="fh__body">Start with Prism Glass. It takes one line.</p>
            <button type="button" className="fh__cta" onClick={() => go('docs')}>
              Explore Morphiq
              <span className="mq-icon mq-icon--arrow" aria-hidden="true" />
            </button>
          </div>

          <div className="fh__dither fh__dither--end">
            <BitmapText
              text="MORPHIQ"
              fontFamily="'Author', sans-serif"
              fontWeight={500}
              letterSpacing={-0.02}
              grain={0.55}
              cell={5}
              dither="bayer4"
              padding={0}
              color={ink}
              background={bg}
            />
          </div>
        </section>
      </div>

      <footer className="fh__footer">
        <div className="fh__split">
          <div className="fh__brand">
            <div className="fh__wordmark fh__wordmark--footer">
              <span className="mq-mark" aria-hidden="true" />
              <span>Morphiq</span>
            </div>
            <p className="fh__body">
              Interfaces that move. Open code, MIT licensed.
            </p>
          </div>

          <div className="fh__cols">
            {FOOTER.map((col) => (
              <nav key={col.title} className="fh__col">
                <p className="fh__eyebrow">{col.title}</p>
                {col.links.map((l) =>
                  l.href ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  ) : (
                    <button key={l.label} type="button" onClick={() => go(l.view)}>
                      {l.label}
                    </button>
                  )
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="fh__baseline">
          <p>
            &copy; 2026 Morphiq &middot;{' '}
            <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              License
            </a>
          </p>
          <p>
            created with &#9829; by{' '}
            <a href="https://prathampatel.design" target="_blank" rel="noreferrer">
              Pratham Patel
            </a>
          </p>
        </div>
      </footer>

      <ThemePicker />
    </div>
  )
}
