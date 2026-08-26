import * as THREE from 'three'

/* A solid rounded rectangle, used for the CTA. It has to be a mesh in the
   scene rather than a DOM box, or the lens has nothing to bend where the
   button is and the cursor vanishes underneath it. */
export function makeRoundedRect(color = '#000000') {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 8 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 uSize;
      uniform float uRadius;
      uniform vec3 uColor;
      uniform float uOpacity;

      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        vec2 hs = uSize * 0.5;
        float r = min(uRadius, min(hs.x, hs.y));
        vec2 q = abs(p) - (hs - r);
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        float a = 1.0 - smoothstep(-1.0, 1.0, d);
        if (a <= 0.001) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `,
  })
}
