import { Suspense, lazy, useState } from 'react'
import Landing from './site/Landing.jsx'
import ComponentsPage from './site/components/ComponentsPage.jsx'
import './App.css'

// The landing is the entry point, so the lab (three.js, shaders) loads on demand.
const Dock = lazy(() => import('./components/Dock/Dock.jsx'))
const AsciiField = lazy(() => import('./components/AsciiField/AsciiField.jsx'))
const FocusPill = lazy(() => import('./components/FocusPill/FocusPill.jsx'))
const FluidGlass = lazy(() => import('./components/FluidGlass/FluidGlass.jsx'))
const PrismGlassDemo = lazy(() => import('./demos/PrismGlassDemo.jsx'))
const ScrollExpandDemo = lazy(() => import('./demos/ScrollExpandDemo.jsx'))
const PressureTextDemo = lazy(() => import('./demos/PressureTextDemo.jsx'))

const VIEWS = [
  { id: 'glass', label: 'Prism Glass' },
  { id: 'expand', label: 'Scroll Expand' },
  { id: 'pressure', label: 'Pressure Text' },
  { id: 'fluid3d', label: 'Fluid Glass' },
  { id: 'ascii', label: 'ASCII Field' },
  { id: 'focus', label: 'Focus Pill' },
  { id: 'dock', label: 'Dock' },
]

function App() {
  const [view, setView] = useState('site')

  if (view === 'site') return <Landing onNavigate={setView} />
  if (view === 'docs') return <ComponentsPage onNavigate={setView} />

  return (
    <div className="app">
      <div className="app-switcher">
        <button className="app-switcher__btn" onClick={() => setView('site')}>
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
        {view === 'glass' && <PrismGlassDemo />}
        {view === 'expand' && <ScrollExpandDemo />}
        {view === 'pressure' && <PressureTextDemo />}
        {view === 'fluid3d' && <FluidGlass />}
        {view === 'ascii' && <AsciiField />}
        {view === 'focus' && <FocusPill />}
        {view === 'dock' && <Dock />}
      </Suspense>
    </div>
  )
}

export default App
