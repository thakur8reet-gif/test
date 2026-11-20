import "./style.css";
import * as THREE from "three";
import { createWhalePoints } from "./WhaleParticles.js";

const mount = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#02060a");
const camera = new THREE.OrthographicCamera(-6.5, 6.5, 2.17, -2.17, 0.1, 80);
camera.position.set(0, 0, 18);

let whale;
const clock = new THREE.Clock();
let frame = 0;
let disposed = false;

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  const aspect = width / height;
  const halfWidth = 6.5;
  const halfHeight = halfWidth / aspect;
  camera.left = -halfWidth; camera.right = halfWidth;
  camera.top = halfHeight; camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

async function init() {
  try {
    whale = await createWhalePoints({
      bodyColor: "#087fca",
      highlightColor: "#8beeff",
      bellyColor: "#27cfff",
      tailSwing: 0.20,
      waveAmplitude: 0.11,
      glow: 0.42
    });
    if (disposed) {
      whale.geometry.dispose(); whale.material.dispose();
      return;
    }
    scene.add(whale.points);
    mount.classList.add("ready");
    document.querySelector("#bodyColor").addEventListener("input", e => whale.setColors({ body: e.target.value }));
    document.querySelector("#highlightColor").addEventListener("input", e => whale.setColors({ highlight: e.target.value }));
    document.querySelector("#bellyColor").addEventListener("input", e => whale.setColors({ belly: e.target.value }));
    document.querySelector("#tailSwing").addEventListener("input", e => whale.material.uniforms.uTailSwing.value = Number(e.target.value));
    document.querySelector("#glow").addEventListener("input", e => whale.material.uniforms.uGlow.value = Number(e.target.value));
  } catch (error) {
    console.error("Whale particle initialisation failed:", error);
    mount.innerHTML = '<p class="error">Unable to initialise the whale particle scene. Check WebGL support.</p>';
  }
}

function animate() {
  if (disposed || document.hidden) return;
  frame = requestAnimationFrame(animate);
  if (whale) whale.update(clock.getElapsedTime());
  renderer.render(scene, camera);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(frame);
  else animate();
});
const observer = new ResizeObserver(resize);
observer.observe(mount);
resize();
init();
animate();

window.addEventListener("beforeunload", () => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer.disconnect();
  if (whale) { whale.geometry.dispose(); whale.material.dispose(); }
  renderer.dispose();
});