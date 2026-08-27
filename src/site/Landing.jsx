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
  { label: 'GitHub', href: 'https://github.com' },
]

const SHOWCASE = [
  { name: 'Liquid Glass', note: 'Interfaces with depth, blur and light.' },
  { name: 'Morphing Cards', note: 'Components that transform as you interact.' },
  { name: 'Aurora', note: 'Dynamic backgrounds for immersive interfaces.' },
  { name: 'Magnetic Buttons', note: 'Buttons that respond to your cursor.' },
  { name: 'Text Motion', note: 'Typography that does not just sit there.' },
]

const PRINCIPLES = [
  'Beautiful by default',
  'Interactive and animated',
  'Built for React',
  'Easy to customize',
  'Made for real products',
]

const STACK = ['React + TypeScript', 'Tailwind CSS', 'Composable APIs', 'Fully customizable']

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

  // Scroll progress -> --expand, which drives the card inset and radius.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frame = 0

    const write = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, window.scrollY / EXPAND_DISTANCE))
      root.style.setProperty('--expand', p.toFixed(4))
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
        <button
          type="button"
          className="site-wordmark"
          data-gl="text"
          data-gl-live
          data-gl-top
          onClick={() => window.scrollTo({ top: 0 })}
        >
          Morphiq
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
            Built to make your UI feel different.
          </h2>
          <p className="sx__sub" data-gl="text">
            Animated cards, glass effects, buttons, navigation, backgrounds,
            text effects, loaders and interactive elements — designed to work
            beautifully together.
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
              </article>
            ))}
          </div>

          <button type="button" className="sx__link" data-gl="text" onClick={() => go('glass')}>
            Browse all components
          </button>
        </section>

        <section className="sx sx--stance">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Not another component library.
          </h2>
          <p className="sx__sub" data-gl="text">
            Morphiq is built for developers who care about how an interface
            feels, not just how it functions.
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
            We believe interfaces shouldn&rsquo;t feel static.
          </h2>
          <p className="sx__lead" data-gl="text">
            The web is interactive. Your UI should be too.
          </p>
          <p className="sx__sub" data-gl="text">
            Morphiq combines thoughtful design, motion, depth and interaction to
            create components that feel alive without getting in the way.
          </p>
        </section>

        <section className="sx sx--build">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Copy. Customize. Create.
          </h2>
          <p className="sx__sub" data-gl="text">
            Production-ready components, without spending hours recreating
            beautiful interactions from scratch.
          </p>

          <div className="sx__install" data-gl="surface">
            <code className="sx__code" data-gl="text">npm install morphiq</code>
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

          <button type="button" className="sx__link" data-gl="text">
            Read the documentation
          </button>
        </section>

        <section className="sx sx--open">
          <h2 className="sx__title" data-gl="text" data-gl-cap>
            Built in the open.
          </h2>
          <p className="sx__sub" data-gl="text">
            Morphiq is open source and made for the community. Use it, customize
            it, build something amazing with it — and if you make something
            cool, share it back.
          </p>
          <a
            className="sx__link"
            data-gl="text"
            href="https://github.com"
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
          <p className="sx__sub" data-gl="text">Start building with Morphiq.</p>
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
      </div>

    </div>
  )
}
