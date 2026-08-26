# @morphiq/prism-glass

Programmable liquid-glass refraction for React. Real spectral dispersion,
uniform frost, and a directional rim light — rendered on WebGL.

```bash
npm i @morphiq/prism-glass     # or yarn / pnpm / bun add
```

Peer deps: `react`, `react-dom`, `three`, `@react-three/fiber`,
`@react-three/drei`, `maath`.

## Usage

```jsx
import { PrismGlass } from '@morphiq/prism-glass'

<PrismGlass image="/photo.jpg" shape="circle" size={20} dispersion={60} />
```

### Cursor lens
```jsx
<PrismGlass image={photo} shape="circle" mode="cursor" size={22} />
```

### Static bar
```jsx
<PrismGlass image={photo} shape="pill" mode="static"
            size={[34, 6]} position={[0.5, 0.9]} />
```

### Panel
```jsx
<PrismGlass image={photo} shape="rect" mode="static"
            size={[28, 34]} radius={7} dispersion={40} frost={20} />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `image` | `string` | — | Image refracted by the glass |
| `shape` | `'circle' \| 'rect' \| 'pill'` | `'circle'` | Lens outline |
| `mode` | `'cursor' \| 'static'` | `'cursor'` | Follow pointer, or sit at `position` |
| `size` | `number \| [w,h]` | `20` | Radius (circle) or extents (rect/pill) |
| `radius` | `number` | `7` | Corner radius for `rect` |
| `position` | `[x,y]` | `[0.5,0.5]` | Placement in `static` mode (0–1) |
| `follow` | `number` | `0.09` | Follow easing; `0` snaps |
| `refraction` | `number` | `100` | Master strength — `0` hides the glass |
| `depth` | `number` | `60` | Band reach + warp magnitude |
| `dispersion` | `number` | `0` | Spectral colour separation |
| `frost` | `number` | `0` | Uniform frosting |
| `splay` | `number` | `0` | Tangential stretch along the edge |
| `lightAngle` | `number` | `45` | Rim light direction, degrees |
| `lightIntensity` | `number` | `100` | Rim light brightness |

Licensed — see `LICENSE`.
