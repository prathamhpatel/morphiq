import type { CSSProperties } from 'react'

export interface PrismGlassProps {
  /** Image URL rendered full-bleed behind (and refracted by) the glass. */
  image: string
  /** Silhouette (SVG or PNG) used as the lens outline. Overrides `shape`.
   *  Converted to a signed-distance field on load, so curves work. */
  mask?: string
  /** Lens outline. `pill` is a rounded rect with fully-rounded ends. */
  shape?: 'circle' | 'rect' | 'pill' | 'cursor'
  /** `cursor` follows the pointer; `static` sits at `position`. */
  mode?: 'cursor' | 'static'
  /** circle/cursor: radius i.e. half-height (0-100). rect/pill: `[width, height]`. */
  size?: number | [number, number]
  /** Corner radius (0-100) for `shape="rect"`. Ignored otherwise. */
  radius?: number
  /** Position in `static` mode, normalised `[x, y]` from 0 to 1. */
  position?: [number, number]
  /** Follow easing. 0 snaps instantly; higher trails more. */
  follow?: number
  /** Master strength (0-100). At 0 the glass is invisible. */
  refraction?: number
  /** Reach of the refraction band and the warp magnitude (0-100). */
  depth?: number
  /** Spectral colour separation (0-100). */
  dispersion?: number
  /** Uniform frosting across the lens (0-100). */
  frost?: number
  /** Tangential stretch along the edge (0-100). */
  splay?: number
  /** Direction of the rim light, in degrees. */
  lightAngle?: number
  /** Rim light brightness (0-100). */
  lightIntensity?: number
  /** Device pixel ratio passed to the renderer. */
  dpr?: number | [number, number]
  className?: string
  style?: CSSProperties
}

export declare function PrismGlass(props: PrismGlassProps): JSX.Element
