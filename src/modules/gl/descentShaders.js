// ─────────────────────────────────────────────────────────────────────────────
// Shaders for "The Descent" — the atmosphere a falling wizard plunges through.
//
// One fullscreen quad paints PURE ADDITIVE LIGHT on a black canvas; the canvas
// is composited over the falling video with CSS `mix-blend-mode: screen`, so
// black adds nothing (the footage shows through) and the light blooms on top.
// Everything keys off two scroll-driven uniforms:
//   • uProgress — 0→1 depth of the fall (the surface light recedes as it rises)
//   • uVelocity — 0→1 eased scroll speed (ashes stretch into streaks; the air
//     itself smears past — the "falling fast" rush)
//
// Layers, all in the Arcane Academy key (brass-gold + ember over petrol-teal):
//   • god-rays raining from the surface far overhead (fade as you fall away)
//   • a sparse field of glowing ashes flying OUT from the shaft's vanishing point
//     in perspective — born tiny at the centre, fanning along radial lines and
//     swelling as they rush past, flickering in sharp shiny glints; speed stretches
//     them into radial streaks
//   • a slow teal depth-haze for atmosphere
//   • velocity light-smears — the shaft itself blurring past when you fall fast
// ─────────────────────────────────────────────────────────────────────────────

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // 2x2 plane already spans clip space — no projection.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// ── The falling wizard — a green-screen clip keyed to transparency ─────────────
// A second, alpha canvas sits over the footage where the static PNG wizard used
// to. This pair keys out the chroma-green background of /wizard-falling.mp4 in a
// fragment shader so the robed figure floats free over the shaft, and scrubs its
// frames by scroll exactly like the background video. The key is soft (a smooth
// band on green-dominance) and de-spilled (green pulled back toward the other
// channels) so the billowing robe and wind-blown hair keep clean edges.
export const wizardVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const wizardFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uKeyLow;   // greenness where the subject is fully opaque
  uniform float uKeyHigh;  // greenness where the screen is fully keyed out
  uniform float uSpill;    // 0..1 how hard to pull residual green off the edges
  uniform float uOpacity;  // global fade

  void main() {
    vec4 c = texture2D(uTex, vUv);
    float other = max(c.r, c.b);
    float green = c.g - other;                       // > 0 only on the screen/spill
    // soft matte: opaque on the wizard, transparent on the green
    float alpha = 1.0 - smoothstep(uKeyLow, uKeyHigh, green);
    // de-spill: where green leads, ease it back toward the neighbouring channels
    float g = min(c.g, mix(c.g, other, uSpill));
    alpha *= uOpacity;
    if (alpha < 0.004) discard;                      // no black box before the fade
    gl_FragColor = vec4(c.r, g, c.b, alpha);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uProgress;   // 0..1 depth of the fall
  uniform float uVelocity;   // 0..1 eased scroll speed
  uniform vec3  uRay;        // gold (god-rays, streaks)
  uniform vec3  uEmber;      // ember (rising motes)
  uniform vec3  uHaze;       // teal/sage (depth atmosphere)

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Sparse glowing ashes flying OUT from the shaft's vanishing point in true
  // perspective: each cinder is born tiny and dim near the centre, fans along a
  // radial line and swells as it rushes past the camera, then fades off the edge.
  // Built in polar space around vp — pow(r) compresses the centre so motes
  // accelerate outward; equal polar cells map to ever-larger screen cells, which
  // gives perspective sizing for free. Sharp, flickering, fluttering across their
  // ray; velocity stretches them along the radius into streaks.
  float ashes(vec2 uv, float A, float radialDensity, float speed, float vel, vec2 vp) {
    const float ANG_CELLS = 22.0;                                // rays around vp
    vec2 d = uv - vp;
    d.x *= A;                                                    // aspect → circular
    float r = length(d);
    float ang = atan(d.y, d.x) * 0.1591549 + 0.5;               // 0..1 turns (tiles)
    float sum = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float spd = speed * (1.0 + fi * 0.5) * (1.0 + vel * 3.0);
      // radial depth marches outward over time (and faster with the fall speed)
      float depth = pow(r, 0.6) * radialDensity - uTime * spd - fi * 7.0;
      vec2 gv = vec2(ang * ANG_CELLS + fi * 5.0, depth);
      vec2 id = floor(gv);
      float rnd = hash(id + fi * 13.3);
      float present = step(0.965, rnd);                          // far sparser
      float phase = rnd * 6.2831;
      vec2 f = fract(gv) - 0.5;
      f.x += 0.18 * sin(uTime * (1.0 + rnd) + phase);            // flutter across ray
      f.y /= (1.0 + vel * 5.0);                                  // stretch → radial streak
      float rad = mix(0.12, 0.30, hash(id + 7.7));               // tiny, varied cinders
      float spark = smoothstep(rad, 0.0, length(f));
      // sharp shiny flicker: a sin spiked to a narrow peak → brief bright glint
      float fl = max(sin(uTime * (6.0 + rnd * 4.0) + phase), 0.0);
      float glint = 0.3 + 0.7 * pow(fl, 6.0);
      float emerge = smoothstep(0.03, 0.42, r);                  // born from the centre
      sum += present * spark * glint * emerge;
    }
    return sum;
  }

  void main() {
    float A = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    float tm = uTime;
    float vel = clamp(uVelocity, 0.0, 1.0);

    vec3 col = vec3(0.0);

    // ── god-rays raining from the surface far overhead ─────────────────────────
    // A source a little above the top splays soft shafts down a cone; they fade
    // with distance, and the whole surface light recedes as the fall deepens.
    vec2  src = vec2(0.5 + 0.05 * sin(tm * 0.07), 1.20);
    vec2  rel = uv - src;
    float ang = atan(rel.x * A, -rel.y);                          // 0 straight down
    float rays = fbm(vec2(ang * 3.2, length(rel) * 1.6 - tm * 0.05));
    rays = pow(clamp(rays, 0.0, 1.0), 2.4);
    float cone = smoothstep(1.0, 0.0, abs(ang));                  // keep it overhead
    float reach = exp(-length(rel) * 1.15);
    float surface = 1.0 - 0.70 * uProgress;                       // light recedes
    col += uRay * rays * cone * reach * 0.62 * surface;
    // a soft wash of daylight clinging to the very top
    col += uRay * pow(smoothstep(0.45, 1.0, uv.y), 3.0) * 0.15 * surface;

    // ── shiny ashes flying out from the shaft's vanishing point ────────────────
    // vanishing point sits at bottom-centre (where the fall converges); ashes fan
    // out from it along the shaft's perspective lines. Ember-orange body; the
    // glint peaks bloom toward gold through the screen blend.
    vec2 vp = vec2(0.5, 0.2);
    float ash = ashes(uv, A, 14.0, 0.05, vel, vp);
    col += mix(uEmber, uRay, 0.3) * ash * 0.95;

    // ── slow teal depth-haze (atmosphere through the middle of the shaft) ───────
    float haze = fbm(vec2(uv.x * 2.0, uv.y * 1.4 - tm * 0.03));
    haze *= smoothstep(0.0, 0.45, uv.y) * smoothstep(1.0, 0.45, uv.y);
    col += uHaze * haze * 0.11;

    // ── velocity light-smears: the shaft itself blurs past when you fall fast ───
    float column = pow(vnoise(vec2(uv.x * 55.0, 7.3)), 2.0);      // which columns glint
    float smear = pow(vnoise(vec2(uv.x * 55.0, uv.y * 4.0 - tm * (2.0 + vel * 9.0))), 2.0);
    col += uRay * column * smear * vel * 0.65;

    // film grain keeps it painterly, never digital
    float grain = hash(uv * uResolution * 0.5 + fract(tm) * 91.7) - 0.5;
    col += grain * 0.02;

    col = clamp(col, 0.0, 1.5);
    // Opaque black canvas; CSS mix-blend-mode:screen turns this into pure glow.
    gl_FragColor = vec4(col, 1.0);
  }
`
