import * as THREE from 'three'

/*
 * The page behind the glass, drawn in the scene so the lens has real pixels to
 * refract. Computed per-fragment rather than sampled from an image, so the
 * gradients stay perfectly smooth — a canvas-painted copy visibly bands.
 *
 * Geometry comes from the DOM each frame: the hero card's animated box and the
 * top of the canvas section below it.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2  uRes;       // viewport, px
  uniform vec4  uCard;      // left, top, right, bottom of the hero card, px
  uniform float uRadius;    // card corner radius, px
  uniform float uBelow;     // y where the section stack starts, px
  uniform float uBelowH;    // its full height, px

  vec3 heroGradient(float t) {
    vec3 a = vec3(9.0, 10.0, 12.0) / 255.0;
    vec3 b = vec3(6.0, 20.0, 45.0) / 255.0;
    vec3 c = vec3(9.0, 33.0, 76.0) / 255.0;
    vec3 d = vec3(8.0, 97.0, 255.0) / 255.0;
    if (t < 0.28816) return mix(a, b, t / 0.28816);
    if (t < 0.52068) return mix(b, c, (t - 0.28816) / 0.23252);
    return mix(c, d, (t - 0.52068) / 0.47932);
  }

  /* Below the hero the page swells blue and then settles back into the dark,
     so the whole site reads as one continuous surface and white type works
     the whole way down. */
  vec3 canvasGradient(float t) {
    vec3 a = vec3(8.0, 96.0, 254.0) / 255.0;
    vec3 b = vec3(30.0, 86.0, 200.0) / 255.0;
    vec3 c = vec3(10.0, 30.0, 74.0) / 255.0;
    vec3 d = vec3(7.0, 12.0, 28.0) / 255.0;
    vec3 e = vec3(5.0, 7.0, 15.0) / 255.0;
    if (t < 0.10) return mix(a, b, t / 0.10);
    if (t < 0.28) return mix(b, c, (t - 0.10) / 0.18);
    if (t < 0.58) return mix(c, d, (t - 0.28) / 0.30);
    return mix(d, e, clamp((t - 0.58) / 0.42, 0.0, 1.0));
  }

  // distance to a rounded box, negative inside
  float sdBox(vec2 p, vec2 hs, float r) {
    vec2 q = abs(p) - (hs - r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // px, origin top-left
    vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);

    vec3 col = vec3(1.0);   // the page itself

    // start the section gradient a hair early: the card's antialiased bottom
    // edge lands exactly here, and blending it against white showed as a seam
    if (p.y >= uBelow - 2.0) {
      col = canvasGradient(clamp((p.y - uBelow) / max(1.0, uBelowH), 0.0, 1.0));
    }

    vec2 centre = vec2((uCard.x + uCard.z) * 0.5, (uCard.y + uCard.w) * 0.5);
    vec2 hs = vec2((uCard.z - uCard.x) * 0.5, (uCard.w - uCard.y) * 0.5);
    float d = sdBox(p - centre, hs, min(uRadius, min(hs.x, hs.y)));
    float inside = 1.0 - smoothstep(-1.0, 1.0, d);

    float t = clamp((p.y - uCard.y) / max(1.0, uCard.w - uCard.y), 0.0, 1.0);
    col = mix(col, heroGradient(t), inside);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function makeBackdropMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uCard: { value: new THREE.Vector4(0, 0, 1, 1) },
      uRadius: { value: 36 },
      uBelow: { value: 1e6 },
      uBelowH: { value: 4050 },
    },
  })
}
