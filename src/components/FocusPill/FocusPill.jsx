import { useState } from 'react'
import moon from './moon.svg'
import './FocusPill.css'

/* =========================================================
   FocusPill
   Implemented from Figma (portfolio-code · node 341:397):
   a rounded pill with a crescent-moon glyph and the word
   "Focus". Exact metrics from the design — radius 58px,
   padding 10px/25px, 15px gap, 31.8×31.7 icon, 36px label.
   The dark fill + light rim follow the design's screenshot.

   Sits over a random background photo (Lorem Picsum) that
   refreshes on load and reshuffles when the pill is clicked.
   ========================================================= */

const randomSeed = () => Math.floor(Math.random() * 100000)

export default function FocusPill() {
  const [seed, setSeed] = useState(randomSeed)

  const bgStyle = {
    backgroundImage: `url(https://picsum.photos/seed/${seed}/1920/1080)`,
  }

  return (
    <div className="focus-stage">
      <div className="focus-stage__bg" style={bgStyle} aria-hidden="true" />
      <div className="focus-stage__scrim" aria-hidden="true" />

      <button
        className="focus-pill"
        type="button"
        data-node-id="341:397"
        onClick={() => setSeed(randomSeed())}
        title="Click to shuffle the background"
      >
        <span className="focus-pill__icon" data-node-id="341:407">
          <img src={moon} alt="" />
        </span>
        <span className="focus-pill__label" data-node-id="341:396">Focus</span>
      </button>
    </div>
  )
}
