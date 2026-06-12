// ─────────────────────────────────────────────────────────────────────────────
// Shaders for "Behind the Wall" — a monster frozen in ice.
//
// A single ice surface (carried by a perspective-tilting group) composites two
// textures in the cold key of frozen petrol-teal:
//   • uMonster — a looping video of the creature lunging at the wall (the trapped
//     chaos of a codebase: legacy bugs, race conditions, the dread module).
//   • uIce     — a frozen-rock texture: the wall itself.
//
// The cursor only ROTATES the pane (handled on the CPU). Two depth cues sell the
// frozen-behind-glass look:
//   • PARALLAX — the creature is sampled with an offset that slides against the
//     tilt (uParallax), so it sits behind the fixed ice and shifts as the pane
//     turns.
//   • DISTORTION — the ice's own relief refracts the view, bending the creature
//     along the wall's ridges and veins (uDistort).
// Clarity through the ice is constant (uReveal), lifting a touch as the creature
// pounds the wall. No fracture lines — just frost, glow and the shape behind it.
// ─────────────────────────────────────────────────────────────────────────────

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Real perspective: the plane lives in a group that tilts toward the cursor.
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uMonster;
  uniform sampler2D uIce;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uMonsterAspect;
  uniform float uIceAspect;
  uniform vec2  uParallax;     // monster offset from the tilt → parallax vs the ice
  uniform float uReveal;       // constant clarity of the creature through the ice
  uniform float uDistort;      // how hard the ice relief refracts the creature
  uniform vec3  uCrackColor;   // icy glow hue (pressure bloom)
  uniform vec3  uMonsterTint;  // cools the creature into the frozen palette

  // background-size: cover — scale UV about centre so a texture never stretches.
  vec2 coverUv(vec2 uv, float imgA, float canvasA) {
    vec2 s = (canvasA > imgA) ? vec2(1.0, imgA / canvasA)
                              : vec2(canvasA / imgA, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

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

  void main() {
    float canvasA = uResolution.x / uResolution.y;
    float tm = uTime;

    // ── the creature pounds the wall: periodic, sharp pressure pulses ──────────
    float slam  = pow(0.5 + 0.5 * sin(tm * 1.7), 4.0);
    float slam2 = pow(0.5 + 0.5 * sin(tm * 2.3 + 1.5), 6.0);
    float impact = max(slam, slam2 * 0.7);

    // ── the ice (the wall surface) + its relief, used to refract the creature ──
    vec2  iceUv  = coverUv(vUv, uIceAspect, canvasA);
    vec3  iceTex = texture2D(uIce, iceUv).rgb;
    float e   = 0.0025;
    float il  = lum(iceTex);
    float ilx = lum(texture2D(uIce, iceUv + vec2(e, 0.0)).rgb);
    float ily = lum(texture2D(uIce, iceUv + vec2(0.0, e)).rgb);
    vec2  iceGrad = vec2(ilx - il, ily - il);            // the wall's ridges/veins
    // refraction through the ice + a faint living shimmer
    vec2  warp = iceGrad * uDistort
               + 0.0025 * vec2(sin(tm * 0.7 + vUv.y * 9.0),
                               cos(tm * 0.6 + vUv.x * 9.0));

    // constant clarity (the cursor does NOT reveal); lifts slightly on each pound
    float reveal = clamp(uReveal + 0.12 * impact, 0.0, 1.0);
    vec2  aspct = vec2(canvasA, 1.0);

    // ── the milky frosted ICE WALL — the base across the whole widescreen frame ─
    vec3 wall = mix(iceTex, vec3(0.17, 0.31, 0.41), 0.32) * 0.9;

    // ── the MONSTER: CONTAIN by height, kept CENTRED, so the whole creature
    //    stays in frame no matter how wide the wall gets; outside its square it
    //    yields to the ice. ──────────────────────────────────────────────────
    vec2 sq     = vec2((vUv.x - 0.5) * canvasA + 0.5, vUv.y); // square, centred space
    vec2 mc     = (sq - 0.5) * 1.35 + vec2(0.5, 0.5);         // zoom OUT → whole creature, centred
    vec2 baseUv = mc + uParallax + warp;                      // parallax + refraction
    // soft mask of the centred creature region (wider feather on the sides)
    float monMask = smoothstep(0.5, 0.34, abs(sq.x - 0.5))
                  * smoothstep(0.5, 0.4, abs(sq.y - 0.5));

    // chromatic split through thick glass
    float ca = 0.005 * (1.0 - reveal * 0.6);
    vec3 monster;
    monster.r = texture2D(uMonster, baseUv + vec2(ca, 0.0)).r;
    monster.g = texture2D(uMonster, baseUv).g;
    monster.b = texture2D(uMonster, baseUv - vec2(ca, 0.0)).b;
    monster *= uMonsterTint;
    // lift the creature out of the near-black plate so its form reads behind glass
    vec3 creature = pow(clamp(monster, 0.0, 1.0), vec3(0.85)) * 1.45;
    // atmospheric depth: the creature is the deepest layer, so it hazes cold
    creature = mix(creature, vec3(0.16, 0.28, 0.38), 0.12);
    float mLum = max(creature.r, max(creature.g, creature.b));

    // composite the creature INTO the wall, only within the centred region
    float trapped = (0.26 + 0.46 * reveal) * monMask;
    vec3 col = mix(wall, creature, trapped);
    // its lit edges bloom through the ice (eyes, silvered horns)
    col += creature * smoothstep(0.55, 1.0, mLum) * (0.35 + 0.5 * reveal) * monMask;
    // its molten eyes burn through even the frost
    float eyes = smoothstep(0.22, 0.6, monster.b) * smoothstep(0.08, 0.45, monster.r)
               * (1.0 - smoothstep(0.4, 0.7, monster.g));
    col += vec3(0.62, 0.32, 1.0) * eyes * (0.45 + 0.55 * reveal) * monMask;

    // the whole wall flushes cold as the creature pounds it (no cursor)
    col += uCrackColor * impact * 0.05;

    // ── icy detail suspended at three depths → the wall reads as a thick slab,
    //    each stratum parallaxing at its own rate as the pane turns ─────────────
    float deep = smoothstep(0.74, 1.0,
      vnoise((iceUv + uParallax * 0.55) * aspct * 38.0 + tm * 0.15));  // far inside
    float mid  = smoothstep(0.80, 1.0,
      vnoise((iceUv + uParallax * 0.28) * aspct * 72.0 - tm * 0.12));  // mid-slab
    float near = smoothstep(0.86, 1.0,
      vnoise(iceUv * aspct * 120.0 + tm * 0.2));                       // on the surface
    col += vec3(0.62, 0.80, 1.0) * deep * 0.05;
    col += vec3(0.74, 0.88, 1.0) * mid  * 0.07;
    col += vec3(0.90, 0.95, 1.0) * near * 0.10;

    // ── frosty fade toward the far ends + top/bottom → frames the centre ───────
    vec2  pc   = (vUv - 0.5) * aspct;                  // aspect-corrected
    float ends = smoothstep(canvasA * 0.32, canvasA * 0.5, abs(pc.x));
    float tb   = smoothstep(0.34, 0.5, abs(pc.y));
    float frame = max(ends, tb);
    col = mix(col, mix(col, vec3(0.72, 0.86, 0.96), 0.5), frame * 0.4);

    // film grain + a gentle vignette into the band's ends
    float grain = hash(vUv * uResolution * 0.5 + fract(tm) * 57.3) - 0.5;
    col += grain * 0.03;
    col *= 0.84 + 0.16 * (1.0 - frame);

    gl_FragColor = vec4(col, 1.0);
  }
`
