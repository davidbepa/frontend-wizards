// ─────────────────────────────────────────────────────────────────────────────
// Shaders for the "True Form" x-ray reveal.
//
// A single fullscreen quad blends three textures, in the Arcane Academy key
// (warm brass-gold + ember, painterly — never neon/digital):
//   • uPortrait   — the everyday developer (base).
//   • uWizardReal — a photoreal wizard, revealed BENEATH the dev where the cursor
//     passes via a golden-dust transmutation: a rising value-noise dissolve, with
//     gold dust-grain + embers streaming off the dissolving seam.
//   • uWizardLine — the wizard's own edges (luminous lines on black). At rest its
//     gold form softly glows and breathes while a smooth light-sweep drifts
//     top→bottom; warm ember motes drift up across the frame.
// Film grain keeps it painterly at rest.
// ─────────────────────────────────────────────────────────────────────────────

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // The geometry is a 2x2 plane that already spans clip space — no projection.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uPortrait;
  uniform sampler2D uWizardLine;
  uniform sampler2D uWizardReal;
  uniform sampler2D uTrail;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uPortraitAspect;
  uniform float uLineAspect;
  uniform float uRealAspect;
  uniform float uReveal;
  uniform float uDistortAmp;
  uniform float uWizardThreshold;
  uniform float uGrainAmp;
  uniform float uExposure;        // base-image brightness (1.0 = match source)
  uniform vec3  uGoldTint;
  uniform vec3  uEmber;
  uniform float uMagicIntensity;  // overall strength of the idle wizard glow
  uniform float uSweepSpeed;      // cycle rate of the occasional light-sweep
  uniform float uSweepBoost;      // glow under the travelling light
  uniform float uBloom;           // soft gold glow along the dissolving seam
  uniform float uSparkIntensity;  // embers lifting off the seam
  uniform float uDustBand;        // thickness of the gold-dust dissolve edge
  uniform float uDustIntensity;   // density of gold flecks in the dust

  // background-size: cover — scale UV about centre so the image never stretches.
  vec2 coverUv(vec2 uv, float imgA, float canvasA) {
    vec2 s = (canvasA > imgA) ? vec2(1.0, imgA / canvasA)
                              : vec2(canvasA / imgA, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Smooth value noise (for the dissolving gold dust).
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Sparse field of soft, twinkling motes drifting upward. uv should be
  // aspect-corrected so the motes stay round.
  float embers(vec2 uv, float tm, float density, float speed) {
    float sum = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float scale = density + fi * 9.0;
      vec2 gv = uv * scale + vec2(fi * 17.3, -tm * speed * (1.0 + fi * 0.4));
      vec2 id = floor(gv);
      vec2 f = fract(gv) - 0.5;
      float rnd = hash(id + fi * 31.7);
      float present = step(0.86, rnd);                       // sparse
      float tw = 0.5 + 0.5 * sin(tm * 3.0 + rnd * 6.2831);   // twinkle
      sum += present * smoothstep(0.45, 0.0, length(f)) * tw;
    }
    return sum;
  }

  void main() {
    float canvasA = uResolution.x / uResolution.y;
    vec2 pUv = coverUv(vUv, uPortraitAspect, canvasA);
    vec2 rUv = coverUv(vUv, uRealAspect,    canvasA);
    vec2 wUv = coverUv(vUv, uLineAspect,    canvasA);
    float tm = uTime;

    // ── trail intensity + its gradient (direction to push pixels) ──────────────
    float t = texture2D(uTrail, vUv).r;
    vec2 px = 1.0 / uResolution;
    float tx = texture2D(uTrail, vUv + vec2(px.x, 0.0)).r
             - texture2D(uTrail, vUv - vec2(px.x, 0.0)).r;
    float ty = texture2D(uTrail, vUv + vec2(0.0, px.y)).r
             - texture2D(uTrail, vUv - vec2(0.0, px.y)).r;
    vec2 grad = vec2(tx, ty);

    // ── liquid cursor push (localized; clean — no chromatic split) ─────────────
    vec2 disp = grad * uDistortAmp * (0.6 + t);

    // ── base portrait + the photoreal wizard beneath it ───────────────────────
    vec3 portrait = texture2D(uPortrait, pUv + disp).rgb;
    vec3 wreal = texture2D(uWizardReal, rUv + disp * 0.5).rgb; // gentler warp → readable

    // ── golden-dust transmutation: a soft, GRANULAR dissolve — the developer
    //    turns to rising gold dust and reforms as the wizard, with no hard edge ──
    float reveal = smoothstep(uWizardThreshold, 1.0, t) * uReveal;     // soft, wide
    vec2 dUv = vUv * vec2(canvasA, 1.0);                 // aspect-corrected
    vec2 dDrift = vec2(0.0, -tm * 0.18);                 // dust rises
    // granular threshold field: fine specks (high freq) over a large-scale drift, so
    // neighbouring pixels cross over at different reveal levels → particles, not a contour.
    float gnoise = 0.65 * vnoise(dUv * 34.0 + dDrift * 1.5)
                 + 0.35 * vnoise(dUv * 10.0 + dDrift * 0.6);
    float w = uDustBand;                                 // WIDE → feathered, no hard border
    float rr = reveal * (1.0 + 2.0 * w) - w;             // fully fills at reveal = 1
    float dissolve = smoothstep(gnoise - w, gnoise + w, rr);
    vec3 col = mix(portrait, wreal, dissolve) * uExposure;

    // ── idle MAGIC: an OCCASIONAL light-sweep washes the wizard's gold form into
    //    view then fades — between passes only the developer shows (no constant glow) ─
    vec3 lineTex = texture2D(uWizardLine, wUv).rgb;
    float lineLum = max(lineTex.r, max(lineTex.g, lineTex.b));
    float cyc = fract(tm * uSweepSpeed);                     // one cycle = sweep + quiet gap
    float sweepDur = 0.5;                                     // first half sweeps, rest is silent
    float sweepY = 1.0 - clamp(cyc / sweepDur, 0.0, 1.0);     // band drifts top → bottom
    float band = exp(-pow((vUv.y - sweepY) / 0.16, 2.0));    // soft, wide, no hard edge
    float env = smoothstep(0.0, 0.1, cyc)                    // fade the sweep in…
              * (1.0 - smoothstep(sweepDur - 0.12, sweepDur, cyc)); // …and out, then nothing
    float glow = lineLum * band * uSweepBoost * env;
    col += uGoldTint * glow * uMagicIntensity * (1.0 - reveal);

    // ── the dissolving zone IS the gold dust: a broad, soft particle band ──────
    float trans = clamp(pow(dissolve * (1.0 - dissolve) * 4.0, 0.6), 0.0, 1.0); // broad band
    vec3 goldDust = mix(uGoldTint, uEmber, 0.35);
    col = mix(col, goldDust, trans * 0.6);                             // matter glows to dust
    float specks = smoothstep(0.5, 1.0, vnoise(dUv * 48.0 + dDrift * 2.6));
    col += goldDust * specks * trans * uDustIntensity;                 // fine drifting flecks
    float motes = embers(dUv, tm, 24.0, 1.7);
    col += goldDust * motes * trans * uSparkIntensity;                 // soft motes lifting off
    col += uGoldTint * trans * uBloom * 0.45;                          // gentle glow, no hard line

    // ── film grain everywhere (painterly, not glitchy) ─────────────────────────
    float grain = hash(vUv * uResolution * 0.5 + fract(tm) * 131.7) - 0.5;
    col += grain * uGrainAmp;

    gl_FragColor = vec4(col, 1.0);
  }
`
