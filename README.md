# Blue Whale — Extracted Three.js Particle Geometry

This replaces the earlier approximate React whale with a reusable Three.js particle system extracted from the exact 1280×427 reference image supplied in chat.

## Extraction
- 2,248 visible halftone dot centres detected from the reference image.
- 1,124 evenly sampled centres stored as a compact gzip-compressed binary asset.
- Coordinates are decoded into a Three.js BufferGeometry at runtime.
- Each point exposes brightness, size, tail weight, belly weight and seed attributes.

## Run
```bash
npm install
npm run dev
```

## Reuse
```js
import { createWhalePoints } from "./WhaleParticles.js";

const whale = await createWhalePoints({
  bodyColor: "#087fca",
  highlightColor: "#8beeff",
  bellyColor: "#27cfff",
  tailSwing: 0.20,
  waveAmplitude: 0.11,
  glow: 0.42
});
scene.add(whale.points);

// In your render loop:
whale.update(clock.getElapsedTime());

// Change colours at runtime:
whale.setColors({ body: "#1266ff", highlight: "#b5f5ff", belly: "#32c8ff" });

// Expose other shader controls:
whale.material.uniforms.uTailSwing.value = 0.28;
whale.material.uniforms.uWaveAmplitude.value = 0.15;
whale.material.uniforms.uGlow.value = 0.6;
whale.material.uniforms.uPointScale.value = 1.25;
```

## Files
- `src/whaleParticleData.js`: compact extracted particle coordinates.
- `src/WhaleParticles.js`: BufferGeometry factory, GLSL shaders, colours and animation uniforms.
- `src/main.js`: standalone Three.js demo with live controls.
- `src/style.css`: minimal dark presentation.

This is an image-derived 2.5D point cloud, not a full anatomical 3D scan. The data is kept separate from the renderer so future features can be added without repeating the extraction.