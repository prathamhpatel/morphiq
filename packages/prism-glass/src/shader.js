/* PrismGlass — proprietary. Not for redistribution. */
export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uAspect;     // view aspect (w/h)
  uniform float uImgAspect;  // image aspect (w/h)
  uniform vec2  uCenter;
  uniform vec2  uSize;
  uniform float uRadius;
  uniform float uCorner;
  uniform float uShape;
  uniform float uPx;
  uniform sampler2D uMask;
  uniform float uUseMask;
  uniform float uMaskAspect;
  uniform float uLightAngle;
  uniform float uLightInt;
  uniform float uRefraction;
  uniform float uDepth;
  uniform float uDispersion;
  uniform float uFrost;
  uniform float uSplay;
  uniform float uAlpha;      // 1 = draw only the lens, transparent elsewhere
  varying vec2 vUv;

  // signed distance to a rounded rectangle (<0 inside)
  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // map a screen uv to a "cover" sample of the image (no stretch)
  vec2 coverUv(vec2 uv) {
    vec2 s = (uAspect > uImgAspect)
      ? vec2(1.0, uImgAspect / uAspect)
      : vec2(uAspect / uImgAspect, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  vec3 sampleBG(vec2 uv, float lod) {
    return texture2D(uTex, clamp(coverUv(uv), 0.001, 0.999), lod).rgb;
  }

  // Visible-spectrum response for t in [0,1] (red → violet) built from broad,
  // heavily OVERLAPPING Gaussian lobes. Overlap is the point: no value of t
  // ever yields a pure primary, so neighbouring wavelengths blend into a
  // continuous iridescence instead of banding into discrete colour channels.
  vec3 spectrum(float t) {
    float r = exp(-pow((t - 0.16) / 0.42, 2.0));
    float g = exp(-pow((t - 0.50) / 0.42, 2.0));
    float b = exp(-pow((t - 0.84) / 0.42, 2.0));
    return vec3(r, g, b);
  }

  /* ---- cursor arrow: exact polygon SDF from the source SVG ----
     Vertices are the SVG path, centred and normalised so the arrow's height
     is 1.0, with Y flipped (SVG is y-down). Unrolled for 4 edges so there is
     no dynamic array indexing — compiles everywhere. */
  const vec2 A0 = vec2(-0.412371,  0.500000);
  const vec2 A1 = vec2( 0.411402, -0.065866);
  const vec2 A2 = vec2(-0.085669, -0.065866);
  const vec2 A3 = vec2(-0.334205, -0.496340);

  float segD2(vec2 p, vec2 a, vec2 b) {
    vec2 e = b - a;
    vec2 w = p - a;
    vec2 q = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    return dot(q, q);
  }

  // even-odd crossing test, division-free (handles horizontal edges safely)
  bool flipSide(vec2 p, vec2 a, vec2 b) {
    vec2 e = b - a;
    vec2 w = p - a;
    bvec3 c = bvec3(p.y >= a.y, p.y < b.y, e.x * w.y > e.y * w.x);
    return all(c) || all(not(c));
  }

  float sdArrow(vec2 p) {
    float d = min(min(segD2(p, A0, A1), segD2(p, A1, A2)),
                  min(segD2(p, A2, A3), segD2(p, A3, A0)));
    float s = 1.0;
    if (flipSide(p, A0, A1)) s = -s;
    if (flipSide(p, A1, A2)) s = -s;
    if (flipSide(p, A2, A3)) s = -s;
    if (flipSide(p, A3, A0)) s = -s;
    return s * sqrt(d);
  }

  float sdf(vec2 p) {
    // A mask overrides the built-in shapes: sample a signed-distance texture so
    // any silhouette (curves included) behaves like an analytic SDF.
    if (uUseMask > 0.5) {
      float fullH = 2.0 * uRadius;
      vec2  half_ = vec2(fullH * uMaskAspect, fullH) * 0.5;
      vec2  muv   = p / (2.0 * half_) + 0.5;
      if (muv.x < 0.0 || muv.x > 1.0 || muv.y < 0.0 || muv.y > 1.0) return fullH;
      return (texture2D(uMask, muv).r - 0.5) * fullH;
    }
    if (uShape > 1.5) {
      float k = 2.0 * uRadius;              // arrow height spans 2*uRadius
      return sdArrow(p / k) * k;
    }
    return (uShape < 0.5) ? length(p) - uRadius : sdRound(p, uSize, uCorner);
  }

  void main() {
    // aspect-corrected space so corners stay round
    vec2 q  = vUv - uCenter;
    vec2 qa = vec2(q.x * uAspect, q.y);
    // uShape: 0 = circle (uRadius), 1 = rounded rect / pill (uSize + uCorner)
    float d = sdf(qa);

    // Antialias the silhouette. d is a true distance, so one pixel of it is
    // uPx. Shade the transition band too and blend by coverage below — a hard
    // d > 0.0 cutoff is what makes the outline look pixelated.
    float aa = max(uPx * 1.5, 1e-6);
    if (d > aa) {
      // Outside the lens: either the plain backdrop, or nothing at all when
      // the surface is meant to sit over live page content.
      gl_FragColor = (uAlpha > 0.5)
        ? vec4(0.0)
        : vec4(sampleBG(vUv, 0.0), 1.0);
      return;
    }

    // DEPTH = reach: how far the refraction band extends in from the border.
    //   low depth → thin edge band; high depth → wider band but the CENTER
    //   still stays clear (matches the reference even at depth 100).
    float mn    = (uShape > 0.5 && uShape < 1.5) ? min(uSize.x, uSize.y) : uRadius;
    float bw    = mix(mn * 0.04, mn * 0.52, uDepth);
    float edge  = -d;                         // 0 at border → grows inward
    float t     = clamp(edge / bw, 0.0, 1.0); // 0 border, 1 inner (flat center)
    float slope = pow(1.0 - t, 1.8);          // strong at rim, 0 in the centre

    // outward normal = SDF gradient, WIDE stencil so it rotates smoothly around
    // the corners instead of flipping along the diagonals (kills the "X" seam).
    // Outward normal via a wide-stencil gradient. The wide stencil is what
    // makes the direction rotate smoothly around rounded-rect corners instead
    // of flipping along the diagonals (which would show as an "X" seam).
    float eps = 0.03;
    vec2 grad = vec2(
      sdf(qa + vec2(eps, 0.0)) - sdf(qa - vec2(eps, 0.0)),
      sdf(qa + vec2(0.0, eps)) - sdf(qa - vec2(0.0, eps))
    );
    grad = normalize(grad + 1e-6);

    // normal & tangent, in UV space (aspect-aware)
    vec2 nrm = normalize(vec2(grad.x / uAspect, grad.y));
    vec2 tng = vec2(-nrm.y, nrm.x);
    float qt = dot(q, tng);   // tangential position from the panel centre

    // REFRACTION is the MASTER strength — it gates the entire effect. At 0 the
    // glass is invisible no matter what Depth/Splay/Dispersion are.
    //   • base NORMAL refraction bends the content in the band (subtle).
    //   • SPLAY adds TANGENTIAL spread (stretch along the edge).
    // DEPTH scales the warp MAGNITUDE (quadratic → gentle mid-range, bold and
    // liquid-metal at 100), not just the reach.
    vec2 dispNormal     = -nrm * slope * (0.02 + uDepth * uDepth * 0.26);
    vec2 dispTangential = -tng * qt * slope * uSplay * 0.85;
    vec2 disp = (dispNormal + dispTangential) * uRefraction;

    // DISPERSION scales with the LOCAL WARP magnitude, so bold colour bands
    // spread through the whole distorted zone (not a thin line on the rim).
    // Quadratic response: ~invisible at 25, bold and saturated at 100.
    float dsp = uDispersion * uDispersion * uRefraction;
    float ds  = dsp * (length(disp) * 0.38 + slope * 0.008);
    vec2  dd  = nrm * ds;

    // frost = clean uniform mip blur; a touch of blur scaled to the warp size
    // keeps big displacements reading as smooth liquid glass (not fine ripples).
    // extra blur where dispersion is active merges the colour split into broad
    // smooth iridescent bands instead of fine multicoloured noise.
    float lod = slope * 0.6 + length(disp) * 5.0 + dsp * 1.3;

    // SPECTRAL dispersion: integrate many samples across the visible spectrum,
    // each displaced by a wavelength-dependent amount and weighted by its
    // spectral colour. This yields a continuous chromatic texture (real prism
    // behaviour) rather than three separated R/G/B ghost layers.
    vec3 col  = vec3(0.0);
    vec3 wsum = vec3(0.0);
    for (int i = 0; i < 28; i++) {
      float t = float(i) / 27.0;
      vec3  w = spectrum(t);
      vec2  off = dd * (t - 0.5) * 2.0;
      col  += sampleBG(vUv + disp + off, lod) * w;
      wsum += w;
    }
    col /= max(wsum, vec3(1e-4));

    // FROST: a uniform diffusing layer across the WHOLE glass — a constant
    // radius disc blur (golden-angle spiral for even, streak-free coverage).
    // Deliberately independent of slope/warp so the frosting is even everywhere,
    // the way a real etched/frosted layer on the lens behaves.
    if (uFrost > 0.001) {
      float r    = uFrost * 0.055;
      float flod = lod + uFrost * 4.5;   // mip blur carries most of the diffusion
                                         // so the 16 taps never read as ghosts
      vec3  acc  = vec3(0.0);
      for (int i = 0; i < 16; i++) {
        float fi  = float(i);
        float a   = fi * 2.39996323;                  // golden angle
        float rad = r * sqrt((fi + 0.5) / 16.0);      // uniform disc density
        vec2  o   = vec2(cos(a) / uAspect, sin(a)) * rad;
        acc += sampleBG(vUv + disp + o, flod);
      }
      col = mix(col, acc / 16.0, clamp(uFrost * 1.35, 0.0, 1.0));
    }

    // LIGHT: a bright rim STROKE at the very border, INDEPENDENT of refraction
    // (it shows even with refraction 0). Intensity = brightness; Angle = which
    // side of the rim catches the light, with a faint base glow all around.
    float rimW     = mn * 0.06;                          // stroke width from border
    float rim      = 1.0 - smoothstep(0.0, rimW, edge);  // 1 at border → 0 inward
    vec2  Ldir     = vec2(cos(uLightAngle), sin(uLightAngle));
    float facing   = max(dot(nrm, Ldir), 0.0);
    float topBias  = max(nrm.y, 0.0);   // the top of the rim always catches a bit more
    float rimLight = rim * uLightInt * (0.16 + 0.6 * facing + 0.28 * topBias);
    col += rimLight;

    // coverage: 1 well inside, 0 just outside, smooth across one pixel
    float cov = 1.0 - smoothstep(-aa, aa, d);

    if (uAlpha > 0.5) {
      // Premultiplied, so the lens composites cleanly over whatever is behind
      // it in the DOM instead of carrying its own copy of the backdrop.
      gl_FragColor = vec4(col * cov, cov);
      return;
    }

    col = mix(sampleBG(vUv, 0.0), col, cov);
    gl_FragColor = vec4(col, 1.0);
  }
`

