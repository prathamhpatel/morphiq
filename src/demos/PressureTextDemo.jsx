import PressureText from '../components/PressureText/PressureText.jsx'
import './pressure-text-demo.css'

/* Demo host for PressureText. Author ships as static cuts, so the
   ramp is a crossfade between adjacent weights — move the cursor
   across the type to see it. */

export default function PressureTextDemo() {
  return (
    <div className="ptd">
      <p className="ptd__eyebrow">PressureText · Author Extralight + synthetic axes</p>

      <h2 className="ptd__line">
        <PressureText text="Interfaces" radius={2.8} spread={1} />
      </h2>

      <h2 className="ptd__line ptd__line--accent">
        <PressureText text="that move." radius={2.8} spread={1} />
      </h2>

      <p className="ptd__note">
        The word keeps its width — a letter under the cursor takes its
        extra space from the others.
      </p>
    </div>
  )
}
