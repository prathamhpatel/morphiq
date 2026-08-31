import { Suspense, lazy, useEffect, useState } from 'react'
import Home from './site/Home.jsx'
import Templates from './site/Templates.jsx'
import ComponentsPage from './site/components/ComponentsPage.jsx'
import { initAnalytics, trackPageView } from './site/analytics.js'
import './App.css'

// The home page is the entry point, so the lab (three.js, shaders) loads on demand.
const Dock = lazy(() => import('./components/Dock/Dock.jsx'))
const AsciiField = lazy(() => import('./components/AsciiField/AsciiField.jsx'))
const PrismGlassDemo = lazy(() => import('./demos/PrismGlassDemo.jsx'))
const ScrollExpandDemo = lazy(() => import('./demos/ScrollExpandDemo.jsx'))
const PressureTextDemo = lazy(() => import('./demos/PressureTextDemo.jsx'))
const BitmapDemo = lazy(() => import('./demos/BitmapDemo.jsx'))

const VIEWS = [
  { id: 'glass', label: 'Prism Glass' },
  { id: 'expand', label: 'Scroll Expand' },
  { id: 'pressure', label: 'Pressure Text' },
  { id: 'ascii', label: 'ASCII Field' },
  { id: 'bitmap', label: 'Bitmap' },
  { id: 'dock', label: 'Dock' },
]

/*
 * The only routes anything on the site links to. The component test benches
 * are deliberately not among them — they are raw stages with the components'
 * own debug panels, so they live behind #testingpage and nothing points at it.
 */
const ROUTES = {
  '': 'site',
  site: 'site',
  docs: 'docs',
  templates: 'templates',
  testingpage: 'lab',
}

const SITE = new Set(['site', 'docs', 'templates', 'lab'])
const hashFor = (view) => (view === 'lab' ? 'testingpage' : view)

/* Analytics page paths. Routing is on the hash, so location.pathname is always
   "/" — without these every view would collapse into one row in the report. */
const PAGES = {
  site: ['/', 'Home'],
  docs: ['/docs', 'Components'],
  templates: ['/templates', 'Templates'],
  lab: ['/testingpage', 'Lab'],
}

const pageFor = (view) =>
  PAGES[view] ?? [
    `/testingpage/${view}`,
    VIEWS.find((v) => v.id === view)?.label ?? view,
  ]

function App() {
  const [view, setView] = useState(
    () => ROUTES[window.location.hash.slice(1)] ?? 'site'
  )

  useEffect(initAnalytics, [])

  // Every view, not just the hash ones — the benches are navigation too.
  useEffect(() => {
    const [path, title] = pageFor(view)
    trackPageView(path, title)
  }, [view])

  /* Site pages own the hash so a refresh stays put; picking a bench inside the
     lab does not, so the hidden entry point survives a reload. */
  const go = (next) => {
    setView(next)
    if (SITE.has(next)) window.location.hash = hashFor(next)
  }

  if (view === 'site') return <Home onNavigate={go} />
  if (view === 'docs') return <ComponentsPage onNavigate={go} />
  if (view === 'templates') return <Templates onNavigate={go} />

  return (
    <div className="app">
      <div className="app-switcher">
        <button className="app-switcher__btn" onClick={() => go('site')}>
          &larr; Site
        </button>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={`app-switcher__btn${view === v.id ? ' is-active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Suspense fallback={null}>
        {view === 'lab' && (
          <p className="app-empty">
            Component test benches. Pick one above.
          </p>
        )}
        {view === 'glass' && <PrismGlassDemo />}
        {view === 'expand' && <ScrollExpandDemo />}
        {view === 'pressure' && <PressureTextDemo />}
        {view === 'ascii' && <AsciiField />}
        {view === 'bitmap' && <BitmapDemo />}
        {view === 'dock' && <Dock />}
      </Suspense>
    </div>
  )
}

export default App
