// ─────────────────────────────────────────────────────────────────────────────
// Shaders for "The Observatory" — a holographic arcane console rendered in WebGL.
//
// Everything is PURE ADDITIVE LIGHT drawn on a TRANSPARENT canvas (alpha:true,
// clearColor 0x000000/0) with THREE.AdditiveBlending — so black adds nothing (the
// CSS void shows through) and overlapping cinders bloom to neon-white cores. The
// canvas floats over a dark CSS gradient; the DOM glass panels sit above it and
// frost it through backdrop-filter.
//
// Two point systems share a family of noise/colour helpers:
//   • CORE — a breathing sphere of particles whose radius is displaced by 3D fbm
//     (fluid, morphing motion); it scatters outward when the console is "off" and
//     converges to a sphere as the section assembles (uAssemble 0→1). Coloured by
//     latitude + displacement across a neon teal→gold→ember gradient.
//   • DUST — the starfield + nebula motes: slow-drifting, twinkling soft discs that
//     give the void depth. One cheap shader, driven by uSize/uColor per system.
//
// Colours arrive as brand-derived neon (bright teal from --sage, gold, ember).
// ─────────────────────────────────────────────────────────────────────────────

// Compact 3D value-noise + fbm, shared by the core displacement.
const NOISE = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }
`

// ── Core particle sphere ───────────────────────────────────────────────────────
export const coreVertex = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  uniform float uAmp;       // displacement amplitude
  uniform float uAssemble;  // 0 scattered → 1 formed
  uniform float uEnergy;    // 0..1 overall drive (pointer + assembly)

  attribute float aSeed;

  varying float vGlow;
  varying float vLat;
  varying float vSeed;

  ${NOISE}

  void main() {
    vec3 dir = normalize(position);
    float t = uTime * 0.12;

    // fluid, morphing displacement — two octaves drifting in opposite directions
    float n1 = fbm(dir * 1.7 + vec3(t, -t * 0.8, t * 0.5));
    float n2 = fbm(dir * 3.6 + vec3(-t * 1.4, t, t * 0.9));
    float disp = n1 * 0.65 + n2 * 0.35;                 // ~0..1

    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + aSeed * 6.2831);
    float radius = 1.0 + (disp - 0.4) * uAmp + uEnergy * 0.12 * pulse;

    // console "off": particles fly out into a loose shell + jitter; assembling
    // pulls them back onto the breathing sphere.
    vec3 scattered = dir * (2.3 + aSeed * 2.4)
      + 0.5 * vec3(sin(aSeed * 40.0), cos(aSeed * 31.0), sin(aSeed * 17.0));
    vec3 pos = mix(scattered, dir * radius, uAssemble);

    vLat = dir.y * 0.5 + 0.5;
    vGlow = disp;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float att = 1.0 / max(0.1, -mv.z);
    gl_PointSize = uSize * uDpr * (0.55 + aSeed * 0.95) * att
      * mix(0.35, 1.0, uAssemble) * (0.8 + uEnergy * 0.5);
  }
`

export const coreFragment = /* glsl */ `
  precision highp float;

  uniform vec3  uColA;  // neon teal (cool body)
  uniform vec3  uColB;  // gold (mid)
  uniform vec3  uColC;  // ember (hot crests)
  uniform float uTime;

  varying float vGlow;
  varying float vLat;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;

    float disc = smoothstep(1.0, 0.0, d);
    float a = disc * disc;

    vec3 col = mix(uColA, uColB, clamp(vLat * 0.7 + vGlow * 0.6, 0.0, 1.0));
    col = mix(col, uColC, smoothstep(0.55, 0.95, vGlow));         // hot crests

    float tw = 0.7 + 0.3 * sin(uTime * 3.0 + vSeed * 20.0);        // fine flicker
    gl_FragColor = vec4(col * (0.55 + vGlow * 1.3) * tw, a);
  }
`

// ── Dust: starfield + nebula motes ─────────────────────────────────────────────
export const dustVertex = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  uniform float uDrift;  // how far a mote wanders

  attribute float aSeed;

  varying float vTw;
  varying float vSeed;

  void main() {
    vec3 pos = position;
    float ph = aSeed * 6.2831;
    pos.x += sin(uTime * 0.05 + ph) * uDrift;
    pos.y += cos(uTime * 0.04 + ph * 1.3) * uDrift;
    pos.z += sin(uTime * 0.03 + ph * 0.7) * uDrift;

    vSeed = aSeed;
    vTw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.2) + ph * 5.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uDpr * (0.5 + aSeed) * (1.0 / max(0.1, -mv.z));
  }
`

export const dustFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;

  varying float vTw;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    float a = smoothstep(1.0, 0.0, d);
    a *= a * (0.35 + 0.65 * vTw);
    gl_FragColor = vec4(uColor * (0.6 + vTw * 0.8), a);
  }
`
