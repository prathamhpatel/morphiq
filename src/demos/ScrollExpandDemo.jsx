import ScrollExpand from '../components/ScrollExpand/ScrollExpand.jsx'
import photo from './dusk.webp'
import './scroll-expand-demo.css'

/* Demo host for ScrollExpand. The lab locks the page, so this
   provides its own scroller — the component finds it on its own. */

export default function ScrollExpandDemo(props = {}) {
  return (
    <div className="sxd">
      <section className="sxd__lead">
        <p className="sxd__eyebrow">ScrollExpand</p>
        <h2>A panel that opens as you pass it.</h2>
        <p className="sxd__note">Keep scrolling.</p>
      </section>

      <ScrollExpand
        media={<img src={photo} alt="" decoding="async" />}
        width={props.width ?? 42}
        height={props.height ?? 58}
        radius={props.radius ?? 24}
        endRadius={props.endRadius ?? 0}
        zoom={props.zoom ?? 1.35}
        scrim={props.scrim ?? 0.45}
        travel={props.travel ?? 1.2}
        hold={props.hold ?? 0.35}
        smoothing={props.smoothing ?? 0.03}
        falloff={props.falloff ?? 'linear'}
      >
        <div className="sxd__caption" data-sx="out">
          Interfaces
          <br />
          that move.
        </div>

        <div className="sxd__hint" data-sx="hint">
          scroll
        </div>

        <div className="sxd__reveal" data-sx="in">
          <h3>Full bleed.</h3>
          <p>
            One eased value drives the frame, the corner radius, the push-in on
            the media and every slot in here.
          </p>
        </div>
      </ScrollExpand>

      <section className="sxd__tail">
        <p>…and the page carries on.</p>
      </section>
    </div>
  )
}
