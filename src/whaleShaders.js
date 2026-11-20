export const whaleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uReducedMotion;
attribute float aSize;
attribute float aSeed;
attribute vec3 aBaseColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float x = p.x;
  float tailWeight = smoothstep(2.35, 5.65, x);
  float phase = uTime * 1.72;
  float wave = sin(phase - (x + 5.8) * 0.72);
  float motion = 1.0 - uReducedMotion;
  p.y += wave * 0.055 * smoothstep(-3.2, 5.8, x) * motion;
  float pivotX = 2.62;
  float angle = sin(phase) * 0.22 * tailWeight * motion;
  float lx = p.x - pivotX;
  float ly = p.y;
  p.x = pivotX + lx * cos(angle) - ly * sin(angle);
  p.y = lx * sin(angle) + ly * cos(angle);
  p.y += wave * 0.16 * tailWeight * motion;
  p.z += sin(phase + 0.7) * 0.62 * tailWeight * motion;
  p.z += sin(uTime * 1.35 + aSeed * 19.0) * 0.012 * motion;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uPixelRatio * (42.0 / max(1.0, -mv.z)));
  float pulse = 0.90 + 0.10 * sin(uTime * 1.4 + aSeed * 8.0);
  vColor = aBaseColor * pulse;
  vAlpha = 0.84 + 0.16 * pulse;
}`;
export const whaleFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;
  float core = 1.0 - smoothstep(0.04, 0.30, d);
  float halo = 1.0 - smoothstep(0.18, 0.50, d);
  gl_FragColor = vec4(vColor * (0.92 + core * 0.90), (halo * 0.58 + core * 0.58) * vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export const ambientVertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aSeed;
varying float vOpacity;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.22 + aSeed * 5.0) * 0.10;
  p.x += cos(uTime * 0.16 + aSeed * 7.0) * 0.07;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (28.0 / max(1.0, -mv.z));
  vOpacity = 0.15 + 0.25 * (0.5 + 0.5 * sin(uTime * 0.5 + aSeed * 9.0));
}`;
export const ambientFragmentShader = /* glsl */ `
varying float vOpacity;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = (1.0 - smoothstep(0.05, 0.5, d)) * vOpacity;
  gl_FragColor = vec4(0.38, 0.78, 0.96, a * 0.52);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;