// src/shaders/fluid-shader.ts
// Procedural fluid shader for 山海经 (shanjing) series background.
// Uses FBM + domain warping for "ink diffusing in water" effect.
// Adapted from flowingFluid.js (kept untouched for legacy compat) and
// recolored to shanjing's vermillion-on-dark-blood palette.

export const fluidVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const fluidFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec2  uResolution;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uColorBright;
  uniform vec3  uColorMid;
  uniform vec3  uColorDeep;
  uniform vec3  uColorAccent;
  varying vec2 vUv;

  // Value noise (no external texture)
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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0) * 2.5;

    float t = uTime * 0.08;

    // Domain warping — ink-in-water look
    vec2 q = vec2(
      fbm(p + vec2(0.0, t)),
      fbm(p + vec2(5.2, 1.3) + vec2(t * 1.1, 0.0))
    );

    vec2 r = vec2(
      fbm(p + 2.5 * q + vec2(1.7, 9.2) + t * 1.4),
      fbm(p + 2.5 * q + vec2(8.3, 2.8) + t * 1.7)
    );

    float f = fbm(p + 3.5 * r);

    // Deep → mid → bright vermillion gradient with red accent on highlights
    vec3 col = mix(uColorDeep, uColorMid, clamp(f * f * 1.8, 0.0, 1.0));
    col = mix(col, uColorBright, clamp(length(q) * 0.55, 0.0, 1.0));
    col = mix(col, uColorAccent, clamp(length(r) * 0.25, 0.0, 0.4));

    // Vignette darkens edges, lifts center
    float vig = smoothstep(1.3, 0.3, length((uv - 0.5) * 2.0));
    col *= mix(0.35, 1.0, vig);

    col *= uIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`

export interface FluidShaderUniforms {
  uTime: { value: number }
  uResolution: { value: [number, number] }
  uIntensity: { value: number }
  uColorBright: { value: [number, number, number] }
  uColorMid: { value: [number, number, number] }
  uColorDeep: { value: [number, number, number] }
  uColorAccent: { value: [number, number, number] }
}

// Shanjing palette (vermillion on dark blood red — matches themes.ts shanjing theme)
export const FLUID_PALETTE = {
  // #C41E3A vermillion primary → bright highlight
  bright: [0.77, 0.12, 0.23] as [number, number, number],
  // Mid: rust red
  mid:    [0.42, 0.04, 0.04] as [number, number, number],
  // Deep: #0a0505 near-black with red tint
  deep:   [0.04, 0.02, 0.02] as [number, number, number],
  // Accent: #2a0a0a dark blood red
  accent: [0.16, 0.04, 0.04] as [number, number, number],
}
