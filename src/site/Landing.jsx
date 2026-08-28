import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import HeroCanvas from './hero3d/HeroCanvas.jsx'
import './Landing.css'

/**
 * Distance, in pixels of scroll, over which the hero card goes from the
 * inset/rounded resting state to full bleed. The hero is pinned for exactly
 * this long, so the white margin is consumed before the page moves on.
 */
const EXPAND_DISTANCE = 420

/* Tuned in the Prism Glass lab. Same parameter model, but these drive an SVG
   filter over the live page rather than a shader over a texture. */
const CURSOR_LENS = {
  width: 144,
  height: 144,
  refraction: 45,
  depth: 15,
  dispersion: 71,
  frost: 0,
  splay: 0,
  lightAngle: 53,
  lightIntensity: 60,
}

const NAV_LENS = {
  radius: 22,
  // a full spectrum halo is right on a small lens, loud on a 1180px bar
  rainbow: 40,
  refraction: 51,
  depth: 85,
  dispersion: 71,
  frost: 0,
  splay: 46,
  lightAngle: 53,
  lightIntensity: 60,
}

const NAV = [
  { label: 'Components', view: 'docs' },
  { label: 'Templates', view: null },
  { label: 'Docs', view: 'docs' },
  { label: 'Playground', view: 'glass' },
  { label: 'GitHub', href: 'https://github.com/prathamhpatel/morphiq' },
]

/* The real roster. `ready` marks what the registry serves today — two of six —
   which is the one thing a visitor most needs to know, so the cards carry it
   rather than the page claiming everything is installable. */
const SHOWCASE = [
  {
    name: 'Prism Glass',
    note: 'A refractive lens with real spectral dispersion, frost and a directional rim light. Shapes come from signed distance fields, not a 3D model.',
    ready: true,
  },
  {
    name: 'ASCII Field',
    note: 'A canvas of glyphs that scramble around the cursor and settle back to rest.',
    ready: true,
  },
  {
    name: 'Magnifying Dock',
    note: 'A dock whose items swell as the pointer nears, on springs. Distance drives the scale, so the row breathes.',
  },
  {
    name: 'Scroll Expand',
    note: 'A framed panel that opens to full bleed as you scroll past it.',
  },
  {
    name: 'Pressure Text',
    note: 'Type that gains weight and width under the cursor, while the word keeps its measure.',
  },
  {
    name: 'Fluid Glass',
    note: 'A live scene rendered to a buffer, then refracted through the same lens.',
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

const FOOTER = [
  {
    title: 'Components',
    links: [
      { label: 'Prism Glass', view: 'docs' },
      { label: 'ASCII Field', view: 'docs' },
      { label: 'Magnifying Dock', view: 'docs' },
      { label: 'Scroll Expand', view: 'docs' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Introduction', view: 'docs' },
      { label: 'Installation', view: 'docs' },
      { label: 'Playground', view: 'glass' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: 'https://github.com/prathamhpatel/morphiq' },
      { label: 'Registry', href: 'https://morphiq.prathampatel.design/r/registry.json' },
      { label: 'MIT licence', href: 'https://github.com/prathamhpatel/morphiq/blob/main/LICENSE' },
    ],
  },
]

export default function Landing({ onNavigate }) {
  const rootRef = useRef(null)
  const headerRef = useRef(null)

  // The nav lens builds its displacement map from the header's real size.
  const [headerBox, setHeaderBox] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const measure = () => {
      const r = header.getBoundingClientRect()
      setHeaderBox((prev) =>
        Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1
          ? prev
          : { width: r.width, height: r.height }
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  // Smooth scroll — the transform reads much better with it.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis()
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  /*
   * Scroll progress -> --expand, which drives the card inset and radius.
   *
   * The header reads three EASED tracks off the same progress rather than
   * --expand itself. Driving every value linearly off one number made the bar
   * look like it was being squashed by a slider: six ramps moving in lockstep,
   * none of them settling. Splitting them gives the move an order —
   *
   *   geo    the bar gathers: position and inset, out fast, refining late
   *   type   the lockup follows a beat behind, so it reads as layered
   *   glass  the container materialises LAST, around content already at rest
   *
   * Glass arriving last is the point. The pill means "the nav is its own
   * floating object now", so it should confirm the gather rather than
   * announce it — previously it was fully opaque by 0.7 while the type was
   * still shrinking inside it.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frame = 0

    const outCubic = (t) => 1 - Math.pow(1 - t, 3)
    const inOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    /* remap [a,b] of the scroll onto a full 0..1 track */
    const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

    const write = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, window.scrollY / EXPAND_DISTANCE))
      const set = (k, v) => root.style.setProperty(k, v.toFixed(4))

      set('--expand', p)
      set('--e-geo', outCubic(p))
      set('--e-type', outCubic(seg(p, 0.08, 1)))
      set('--e-glass', inOutCubic(seg(p, 0.3, 1)))
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }

    write()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // The shell locks scrolling for the component lab; the site needs it back.
  useEffect(() => {
    document.documentElement.classList.add('site-scroll')
    return () => document.documentElement.classList.remove('site-scroll')
  }, [])

  const go = (view) => view && onNavigate?.(view)

  return (
    <div
      className="site"
      ref={rootRef}
      style={{ '--expand-travel': `${EXPAND_DISTANCE}px` }}
    >
      {/* The hero, rendered in WebGL so the lens has real pixels to bend.
          The DOM below stays for layout, wrapping, selection and a11y. */}
      <HeroCanvas />

      <header className="site-header" ref={headerRef}>
        {/* The nav glass is a refraction pass: it bends what is behind it but
            does not dim it, so hero copy scrolling under the bar collided with
            the wordmark. This plate gives the bar something to sit on. It is a
            mirrored surface, so it draws under the header's own text. */}
        <div
          className="site-header__plate"
          data-gl="surface"
          data-gl-top
          data-gl-alpha="--e-glass"
        />

        <button
          type="button"
          className="site-wordmark"
          onClick={() => window.scrollTo({ top: 0 })}
        >
          <img
            className="site-wordmark__mark"
            src="/logo.svg"
            alt=""
            data-gl="image"
            data-gl-src="/logo.svg"
            data-gl-top
          />
          <span
            className="site-wordmark__text"
            data-gl="text"
            data-gl-live
            data-gl-top
          >
            Morphiq
          </span>
        </button>

        <nav className="site-nav">
          {NAV.map((item) =>
            item.href ? (
              <a
                key={item.label}
                className="site-nav__link"
                data-gl="text"
                data-gl-live
                data-gl-top
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                className="site-nav__link"
                data-gl="text"
                data-gl-live
                data-gl-top
                onClick={() => go(item.view)}
              >
                {item.label}
              </button>
            )
          )}
        </nav>
      </header>

      {/* Taller than the viewport by exactly the expand travel, so the hero
          stays pinned until the white margin is gone, then releases. */}
      <div className="site-hero-track">
        <section className="site-hero">
          <div className="site-hero__card" aria-hidden="true" />

          <div className="site-hero__content">
            <h1 className="site-hero__title">
              <span className="site-hero__line" data-gl="text" data-gl-cap>
                Interfaces that
              </span>
              <span className="site-hero__line">
                <span className="site-hero__move" data-gl="text" data-gl-cap>
                  move
                </span>
                <span className="site-hero__dot" data-gl="text" data-gl-cap>
                  .
                </span>
              </span>
            </h1>

            <p className="site-hero__lede" data-gl="text">
              A collection of beautifully crafted, interactive React components
              built to make modern interfaces feel alive.
            </p>

            <div className="site-hero__actions">
              <div className="site-hero__buttons">
                <button
                  type="button"
                  className="site-cta"
                  data-gl="surface"
                  onClick={() => go('glass')}
                >
                  <span className="site-cta__label" data-gl="text">
                    Explore Components
                  </span>
                </button>
              </div>

              <p className="site-hero__note" data-gl="text">
                Open source components. Thoughtful motion. No boring interfaces.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="site-canvas">
        {/* Show the work first — the brief's own point: the site should say
            "look at what Morphiq can do", not describe it. */}
        <section className="sx sx--showcase">
          <p className="sx__eyebrow" data-gl="text">Components</p>
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Six components, written to be read.
          </h2>
          <p className="sx__sub" data-gl="text">
            Glass, motion and depth. Each one is fully controlled — every
            setting is a prop with a sensible default, and none of them ship a
            control panel of their own.
          </p>

          <div className="sx__grid">
            {SHOWCASE.map((c) => (
              <article key={c.name} className="card" data-gl="surface">
                <h3 className="card__name" data-gl="text" data-gl-cap>
                  {c.name}
                </h3>
                <p className="card__note" data-gl="text">
                  {c.note}
                </p>
                <p
                  className={`card__status${c.ready ? ' is-ready' : ''}`}
                  data-gl="text"
                >
                  {c.ready ? 'Install today' : 'On the site'}
                </p>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="sx__link"
            data-gl="text"
            onClick={() => go('docs')}
          >
            Browse the components
          </button>
        </section>

        <section className="sx sx--stance">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Not another component library.
          </h2>
          <p className="sx__sub" data-gl="text">
            Most &ldquo;glass&rdquo; components are a blur filter under a white
            overlay. Prism Glass is a real shader: dispersion integrated across
            28 samples of the spectrum, frost as a golden-angle disc blur, and
            edges that bend what is behind them rather than smearing it.
          </p>

          <ul className="sx__list">
            {PRINCIPLES.map((p) => (
              <li key={p} className="sx__item" data-gl="text">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="sx sx--belief">
          <h2 className="sx__title sx__title--wide" data-gl="text" data-gl-cap>
            You get the source, not a dependency.
          </h2>
          <p className="sx__lead" data-gl="text">
            Installing a component copies its files into your project.
          </p>
          <p className="sx__sub" data-gl="text">
            There is no package to keep up to date and no build step of ours
            between you and the pixels. If a component is ninety percent right,
            change the other ten. This page is the proof: everything on it is
            drawn by the components themselves.
          </p>
        </section>

        <section className="sx sx--build">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            One command, then it is yours.
          </h2>
          <p className="sx__sub" data-gl="text">
            Components install with the shadcn CLI, straight into the folder
            your project already uses.
          </p>

          <div className="sx__install" data-gl="surface">
            <code className="sx__code" data-gl="text">
              npx shadcn@latest add @morphiq/prism-glass
            </code>
          </div>

          <ul className="sx__chips">
            {STACK.map((s) => (
              <li key={s} className="chip" data-gl="surface">
                <span className="chip__label" data-gl="text">
                  {s}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="sx__link"
            data-gl="text"
            onClick={() => onNavigate?.('docs')}
          >
            Read the documentation
          </button>
        </section>

        <section className="sx sx--open">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Built in the open.
          </h2>
          <p className="sx__sub" data-gl="text">
            MIT licensed. Use it, ship it, sell what you build with it. The
            registry, the shader and this site are all in the repository — and
            new components are welcome.
          </p>
          <a
            className="sx__link"
            data-gl="text"
            href="https://github.com/prathamhpatel/morphiq"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </section>

        <section className="sx sx--end">
          <h2 className="sx__title sx__title--big" data-gl="text" data-gl-cap>
            Make your interface move.
          </h2>
          <p className="sx__sub" data-gl="text">
            Start with Prism Glass. It takes one line.
          </p>
          <button
            type="button"
            className="site-cta"
            data-gl="surface"
            onClick={() => go('glass')}
          >
            <span className="site-cta__label" data-gl="text">
              Explore Morphiq
            </span>
          </button>
        </section>

        {/* Inside .site-canvas so the backdrop shader, which paints everything
            below the hero, can darken its ground from this element's measured
            top. Move the footer and the dark block moves with it. */}
        <footer className="site-footer">
          <div className="site-footer__top">
            <div className="site-footer__brand">
              <img
                className="site-footer__mark"
                src="/logo.svg"
                alt=""
                data-gl="image"
                data-gl-src="/logo.svg"
              />
              <p className="site-footer__line" data-gl="text">
                Interfaces that move. Open code, MIT licensed.
              </p>
            </div>

            {FOOTER.map((col) => (
              <nav key={col.title} className="site-footer__col">
                <p className="site-footer__label" data-gl="text">
                  {col.title}
                </p>
                {col.links.map((l) =>
                  l.href ? (
                    <a
                      key={l.label}
                      className="site-footer__link"
                      data-gl="text"
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <button
                      key={l.label}
                      type="button"
                      className="site-footer__link"
                      data-gl="text"
                      onClick={() => go(l.view)}
                    >
                      {l.label}
                    </button>
                  )
                )}
              </nav>
            ))}
          </div>

          <p className="site-footer__made">
            <span data-gl="text">created with</span>
            <span className="site-footer__heart" data-gl="text">
              &#9829;
            </span>
            <span data-gl="text">by</span>
            <a
              className="site-footer__who"
              data-gl="text"
              href="https://prathampatel.design"
              target="_blank"
              rel="noreferrer"
            >
              Pratham Patel
            </a>
          </p>
        </footer>
      </div>

    </div>
  )
}
