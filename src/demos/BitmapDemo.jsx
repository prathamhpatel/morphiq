import { useState, useEffect, useRef } from 'react'
import BitmapNoise from '../components/BitmapNoise/BitmapNoise.jsx'
import BitmapImage from '../components/BitmapImage/BitmapImage.jsx'
import BitmapText from '../components/BitmapText/BitmapText.jsx'
import './bitmap-demo.css'

/* Demo host for the three bitmap components. They share one engine, so the
   raster and tone controls are common to all three and only the top group
   changes with the mode. Drop an image anywhere on the stage in image mode. */

const DITHERS = ['bayer2', 'bayer4', 'bayer8', 'bayer16', 'floyd', 'atkinson', 'jarvis', 'none']

function Slider({ label, value, set, min, max, step = 1, fmt }) {
  return (
    <label className="bmd__row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
      />
      <output>{fmt ? fmt(value) : value}</output>
    </label>
  )
}

function Check({ label, value, set }) {
  return (
    <label className="bmd__row bmd__row--check">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
    </label>
  )
}

export default function BitmapDemo() {
  const [mode, setMode] = useState('noise')

  // shared raster + tone
  const [cell, setCell] = useState(4)
  const [levels, setLevels] = useState(2)
  const [dither, setDither] = useState('bayer8')
  const [ditherAmount, setDitherAmount] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [brightness, setBrightness] = useState(0)
  const [invert, setInvert] = useState(false)
  const [warp, setWarp] = useState(0)
  const [cursorRadius, setCursorRadius] = useState(180)
  const [cursorStrength, setCursorStrength] = useState(0)
  const [cursorLift, setCursorLift] = useState(0)
  const [color, setColor] = useState('#e8e4dc')
  const [background, setBackground] = useState('#0a0b0e')

  // noise
  const [scale, setScale] = useState(2)
  const [speed, setSpeed] = useState(0.4)
  const [patch, setPatch] = useState(0.42)
  const [density, setDensity] = useState(0.36)

  // image
  const [src, setSrc] = useState('')
  const [fit, setFit] = useState('cover')
  const [status, setStatus] = useState('empty')
  const [over, setOver] = useState(false)
  const objectUrl = useRef('')

  // text
  const [text, setText] = useState('BIT\nMAP')
  const [grain, setGrain] = useState(0.6)
  const [weight, setWeight] = useState(800)

  const takeFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    setSrc(objectUrl.current)
  }
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    []
  )

  const shared = {
    cell, levels, dither, ditherAmount,
    contrast, brightness, invert,
    warp, cursorRadius, cursorStrength, cursorLift,
    color, background,
  }

  return (
    <div className="bmd">
      <div
        className="bmd__stage"
        onDragOver={(e) => {
          if (mode !== 'image') return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (mode !== 'image') return
          e.preventDefault()
          setOver(false)
          takeFile(e.dataTransfer.files?.[0])
        }}
      >
        {mode === 'noise' && (
          <BitmapNoise {...shared} scale={scale} speed={speed} patch={patch} density={density} />
        )}
        {mode === 'image' && (
          <BitmapImage {...shared} src={src} fit={fit} onStatus={setStatus} />
        )}
        {mode === 'text' && (
          <BitmapText {...shared} text={text} grain={grain} fontWeight={weight} />
        )}
        {mode === 'image' && (
          <div className={`bmd__drop${over ? ' is-over' : ''}`}>Drop an image</div>
        )}
      </div>

      <div className="bmd__panel">
        <div className="bmd__modes">
          {['noise', 'image', 'text'].map((m) => (
            <button
              key={m}
              className={`bmd__mode${mode === m ? ' is-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'noise' && (
          <>
            <div className="bmd__group">Field</div>
            <Slider label="scale" value={scale} set={setScale} min={0.3} max={8} step={0.1} fmt={(v) => v.toFixed(1)} />
            <Slider label="speed" value={speed} set={setSpeed} min={0} max={2} step={0.02} fmt={(v) => v.toFixed(2)} />
            <Slider label="patch" value={patch} set={setPatch} min={0} max={1} step={0.02} fmt={(v) => v.toFixed(2)} />
            <Slider label="density" value={density} set={setDensity} min={0.05} max={0.95} step={0.01} fmt={(v) => v.toFixed(2)} />
          </>
        )}

        {mode === 'image' && (
          <>
            <div className="bmd__group">Source</div>
            <label className="bmd__row">
              <span>fit</span>
              <select value={fit} onChange={(e) => setFit(e.target.value)}>
                <option>cover</option>
                <option>contain</option>
                <option>fill</option>
              </select>
            </label>
            <label className="bmd__file">
              file
              <input type="file" accept="image/*" onChange={(e) => takeFile(e.target.files?.[0])} />
            </label>
            <div className="bmd__note">
              {status === 'tainted'
                ? 'That image is cross-origin without CORS headers, so its pixels cannot be read.'
                : status === 'ready'
                  ? 'Loaded. Try floyd or atkinson for photographs.'
                  : 'Drop a file on the stage, or pick one above.'}
            </div>
          </>
        )}

        {mode === 'text' && (
          <>
            <div className="bmd__group">Type</div>
            <label className="bmd__row">
              <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            </label>
            <Slider label="grain" value={grain} set={setGrain} min={0} max={1} step={0.02} fmt={(v) => v.toFixed(2)} />
            <Slider label="weight" value={weight} set={setWeight} min={100} max={900} step={100} />
          </>
        )}

        <div className="bmd__group">Raster</div>
        <Slider label="cell" value={cell} set={setCell} min={1} max={20} />
        <Slider label="levels" value={levels} set={setLevels} min={2} max={16} />
        <label className="bmd__row">
          <span>dither</span>
          <select value={dither} onChange={(e) => setDither(e.target.value)}>
            {DITHERS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <Slider label="amount" value={ditherAmount} set={setDitherAmount} min={0} max={1.5} step={0.02} fmt={(v) => v.toFixed(2)} />

        <div className="bmd__group">Tone</div>
        <Slider label="contrast" value={contrast} set={setContrast} min={0.1} max={4} step={0.05} fmt={(v) => v.toFixed(2)} />
        <Slider label="brightness" value={brightness} set={setBrightness} min={-0.5} max={0.5} step={0.01} fmt={(v) => v.toFixed(2)} />
        <Check label="invert" value={invert} set={setInvert} />

        <div className="bmd__group">Motion</div>
        <Slider label="warp" value={warp} set={setWarp} min={0} max={12} step={0.1} fmt={(v) => v.toFixed(1)} />
        <Slider label="radius" value={cursorRadius} set={setCursorRadius} min={0} max={500} />
        <Slider label="push" value={cursorStrength} set={setCursorStrength} min={-160} max={160} />
        <Slider label="lift" value={cursorLift} set={setCursorLift} min={-1} max={1} step={0.02} fmt={(v) => v.toFixed(2)} />

        <div className="bmd__group">Paint</div>
        <label className="bmd__row">
          <span>color</span>
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="bmd__row">
          <span>background</span>
          <input type="text" value={background} onChange={(e) => setBackground(e.target.value)} />
        </label>
      </div>
    </div>
  )
}
