import { useEffect, useRef, useState } from 'react'
import { PALETTES, pairFor, usePalette, setPalette, setMode, shuffle } from './theme.js'

/*
 * The palette control.
 *
 * The site draws a random pair on a first visit, which is the point — but a
 * random ground is a poor host for components that bring their own colour, the
 * Magnifying Dock's dark pill above all. This lets someone settle on a pair and
 * flip the ground, and the choice is remembered.
 *
 * Every swatch renders as the pair itself, split on the diagonal: the control
 * is drawn in the thing it controls, so there is no legend to read. It is the
 * resolved pair, not the stored one — ground first, ink second — so a swatch
 * shows what picking it will actually do, and the whole grid flips when the
 * appearance does.
 */
export default function ThemePicker() {
  const { index, mode } = usePalette()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // Escape closes, and so does a click anywhere else — the panel sits over the
  // page, so it must not need a second trip to the trigger to dismiss.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className="tp" ref={rootRef}>
      {open ? (
        <div className="tp__panel" role="group" aria-label="Theme">
          <p className="tp__label">Palette</p>
          <div className="tp__grid">
            {PALETTES.map((pair, i) => (
              <button
                key={pair.join()}
                type="button"
                className={`tp__swatch${i === index ? ' is-active' : ''}`}
                style={(({ bg, ink }) => ({ '--a': bg, '--b': ink }))(
                  pairFor(i, mode)
                )}
                aria-label={`Palette ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setPalette(i)}
              />
            ))}
          </div>

          <p className="tp__label">Appearance</p>
          <div className="tp__modes">
            {['light', 'dark'].map((m) => (
              <button
                key={m}
                type="button"
                className={`tp__mode${m === mode ? ' is-active' : ''}`}
                aria-pressed={m === mode}
                onClick={() => setMode(m)}
              >
                {m === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>

          <button type="button" className="tp__shuffle" onClick={shuffle}>
            Shuffle
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="tp__trigger"
        aria-expanded={open}
        aria-label="Theme"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tp__chip" aria-hidden="true" />
        Theme
      </button>
    </div>
  )
}
