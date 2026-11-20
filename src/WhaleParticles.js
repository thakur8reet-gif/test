import * as THREE from "three";
import { decodeWhaleParticles, PARTICLE_COUNT } from "./whaleParticleData.js";

export { PARTICLE_COUNT };

/** Rebuild the extracted dot centres as an editable Three.js BufferGeometry. */
export async function createWhaleGeometry() {
  const particles = await decodeWhaleParticles();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const brightness = new Float32Array(PARTICLE_COUNT);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const tailWeight = new Float32Array(PARTICLE_COUNT);
  const bellyWeight = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);

  particles.forEach((p, i) => {
    const j = i * 3;
    positions[j] = p.x; positions[j + 1] = p.y; positions[j + 2] = p.z;
    brightness[i] = p.brightness; sizes[i] = p.size;
    tailWeight[i] = p.tailWeight; bellyWeight[i] = p.bellyWeight; seeds[i] = p.seed;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aTailWeight", new THREE.BufferAttribute(tailWeight, 1));
  geometry.setAttribute("aBellyWeight", new THREE.BufferAttribute(bellyWeight, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uPointScale;
uniform float uTailSwing;
uniform float uWaveAmplitude;
uniform float uAnimate;
attribute float aBrightness;
attribute float aSize;
attribute float aTailWeight;
attribute float aBellyWeight;
attribute float aSeed;
varying float vBrightness;
varying float vBelly;
varying float vSeed;
void main() {
  vec3 p = position;
  float motion = uAnimate;
  float along = clamp((p.x + 6.0) / 12.0, 0.0, 1.0);
  float phase = uTime * 1.45 - along * 5.2;
  p.y += sin(phase) * uWaveAmplitude * smoothstep(0.12, 0.88, along) * motion;

  // Rear-body/tail deformation with a soft anatomical transition.
  float tail = aTailWeight;
  float angle = sin(uTime * 1.65) * uTailSwing * tail * motion;
  float pivotX = 3.35;
  vec2 local = vec2(p.x - pivotX, p.y);
  float c = cos(angle), s = sin(angle);
  vec2 rotated = mat2(c, -s, s, c) * local;
  p.x = pivotX + mix(local.x, rotated.x, tail);
  p.y = mix(local.y, rotated.y, tail);
  p.z += sin(uTime * 1.65 + 0.8) * 0.48 * tail * motion;
  p.z += sin(uTime * 0.8 + aSeed * 6.2831) * 0.018 * motion;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uPointScale * uPixelRatio * (18.0 / max(1.0, -mv.z)));
  vBrightness = aBrightness; vBelly = aBellyWeight; vSeed = aSeed;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uBodyColor;
uniform vec3 uHighlightColor;
uniform vec3 uBellyColor;
uniform float uGlow;
uniform float uOpacity;
varying float vBrightness;
varying float vBelly;
varying float vSeed;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;
  float core = 1.0 - smoothstep(0.12, 0.34, d);
  float halo = 1.0 - smoothstep(0.20, 0.50, d);
  vec3 color = mix(uBodyColor, uHighlightColor, smoothstep(0.28, 0.92, vBrightness));
  color = mix(color, uBellyColor, clamp(vBelly * 0.72, 0.0, 0.72));
  color *= 0.92 + 0.08 * sin(vSeed * 45.0);
  float alpha = (core * 0.88 + halo * uGlow * 0.34) * uOpacity;
  gl_FragColor = vec4(color * (0.82 + core * 0.38), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createWhaleMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uPointScale: { value: options.pointScale ?? 1 },
      uTailSwing: { value: options.tailSwing ?? 0.20 },
      uWaveAmplitude: { value: options.waveAmplitude ?? 0.11 },
      uAnimate: { value: options.animate === false ? 0 : 1 },
      uBodyColor: { value: new THREE.Color(options.bodyColor ?? "#087fca") },
      uHighlightColor: { value: new THREE.Color(options.highlightColor ?? "#8beeff") },
      uBellyColor: { value: new THREE.Color(options.bellyColor ?? "#27cfff") },
      uGlow: { value: options.glow ?? 0.42 },
      uOpacity: { value: options.opacity ?? 0.98 }
    },
    vertexShader, fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
}

/** Async factory returning editable points, geometry, material and helpers. */
export async function createWhalePoints(options = {}) {
  const geometry = await createWhaleGeometry();
  const material = createWhaleMaterial(options);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function setColors({ body, highlight, belly } = {}) {
    if (body) material.uniforms.uBodyColor.value.set(body);
    if (highlight) material.uniforms.uHighlightColor.value.set(highlight);
    if (belly) material.uniforms.uBellyColor.value.set(belly);
  }
  function update(timeSeconds) {
    material.uniforms.uTime.value = timeSeconds;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }
  return { points, geometry, material, setColors, update };
}