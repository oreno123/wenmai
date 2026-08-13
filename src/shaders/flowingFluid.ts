// Flowing-fluid-like fragment shader using FBM + domain warping.
// Produces a gold-on-warm-dark swirling dye effect that *moves*,
// unlike the static cloudTrain shader which only drifts.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform float u_intensity;
  uniform vec3  u_colorBright;
  uniform vec3  u_colorMid;
  uniform vec3  u_colorDeep;
  uniform vec3  u_colorAccent;
  varying vec2  vUv;

  // ─── Value noise (no external texture needed) ──────────
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // ─── Fractal Brownian Motion ──────────────────────────
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8); // rotate per octave to reduce axis bias
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Aspect-corrected UV centered at origin, scaled for flow rate
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.5;

    float t = u_time * 0.08;

    // ─── Domain warping: distort coordinates through nested FBM ───
    // This is what produces the "ink diffusing in water" look.
    vec2 q = vec2(
      fbm(p + vec2(0.0, t)),
      fbm(p + vec2(5.2, 1.3) + vec2(t * 1.1, 0.0))
    );

    vec2 r = vec2(
      fbm(p + 2.5 * q + vec2(1.7, 9.2) + t * 1.4),
      fbm(p + 2.5 * q + vec2(8.3, 2.8) + t * 1.7)
    );

    float f = fbm(p + 3.5 * r);

    // ─── Color mixing driven by the warped coordinates ───
    // Keep palette restrained: just deep→mid→bright, no red dab. Less noise
    // so foreground text and the glass card stay readable.
    vec3 col = mix(u_colorDeep, u_colorMid, clamp(f * f * 1.8, 0.0, 1.0));
    col = mix(col, u_colorBright, clamp(length(q) * 0.55, 0.0, 1.0));

    // Stronger vignette darkens edges AND lifts the center where the form sits
    float vig = smoothstep(1.3, 0.3, length((uv - 0.5) * 2.0));
    col *= mix(0.35, 1.0, vig);

    // Overall brightness lift so the bright gold reads against content
    col *= u_intensity;

    gl_FragColor = vec4(col, 1.0);
  }
`
