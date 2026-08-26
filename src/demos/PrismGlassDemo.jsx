import { useState } from 'react'
import { PrismGlass } from '@morphiq/prism-glass'
import backdrop from '../components/Glass/backdrop.png'
import cursorSvg from '../components/FluidGlass/cursor.svg'
import '../components/Glass/Glass.css'

/* Demo harness for the packaged component. The sliders live HERE, in the app —
   the published component exposes the same values as plain props. */
export default function PrismGlassDemo() {
  const [shape, setShape] = useState('circle')
  const [mode, setMode] = useState('cursor')
  const [refraction, setRefraction] = useState(100)
  const [depth, setDepth] = useState(60)
  const [dispersion, setDispersion] = useState(60)
  const [frost, setFrost] = useState(0)
  const [splay, setSplay] = useState(0)
  const [lightAngle, setLightAngle] = useState(45)
  const [lightIntensity, setLightIntensity] = useState(100)
  const [size, setSize] = useState(20)
  const [w, setW] = useState(28)
  const [h, setH] = useState(34)

  const isCircle = shape === 'circle' || shape === 'cursor' || shape === 'svg'

  const row = (label, value, set, min, max, step = 1, suffix = '') => (
    <label className="glass-panel__row" key={label}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))} />
      <b>{value}{suffix}</b>
    </label>
  )

  return (
    <div className="glass-shader">
      <PrismGlass
        image={backdrop}
        shape={shape === 'svg' ? 'circle' : shape}
        mask={shape === 'svg' ? cursorSvg : undefined}
        mode={mode}
        size={isCircle ? size : [w, h]}
        position={[0.5, 0.5]}
        refraction={refraction}
        depth={depth}
        dispersion={dispersion}
        frost={frost}
        splay={splay}
        lightAngle={lightAngle}
        lightIntensity={lightIntensity}
      />

      <div className="glass-panel">
        <div className="glass-panel__title">PRISM GLASS</div>

        <label className="glass-panel__row">
          <span>Shape</span>
          <select value={shape} onChange={(e) => setShape(e.target.value)}>
            <option value="circle">circle</option>
            <option value="rect">rect</option>
            <option value="pill">pill</option>
            <option value="cursor">cursor (arrow)</option>
            <option value="svg">svg mask</option>
          </select>
          <b />
        </label>
        <label className="glass-panel__row">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cursor">cursor (arrow)</option>
            <option value="svg">svg mask</option>
            <option value="static">static</option>
          </select>
          <b />
        </label>

        {isCircle
          ? row('Size', size, setSize, 4, 45)
          : [row('Width', w, setW, 4, 60), row('Height', h, setH, 4, 60)]}

        <div className="glass-panel__group">Light</div>
        {row('Angle', lightAngle, setLightAngle, -180, 180, 1, '°')}
        {row('Intensity', lightIntensity, setLightIntensity, 0, 100, 1, '%')}

        {row('Refraction', refraction, setRefraction, 0, 100)}
        {row('Depth', depth, setDepth, 0, 100)}
        {row('Dispersion', dispersion, setDispersion, 0, 100)}
        {row('Frost', frost, setFrost, 0, 100)}
        {row('Splay', splay, setSplay, 0, 100)}
      </div>
    </div>
  )
}
