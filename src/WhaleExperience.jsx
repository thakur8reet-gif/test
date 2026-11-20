import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import whaleImageUrl from './assets/blue-whale-halftone.svg';
import { whaleVertexShader, whaleFragmentShader, ambientVertexShader, ambientFragmentShader } from './whaleShaders.js';

function particleGeometry(image, spacing = 6) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const positions = [], colors = [], sizes = [], seeds = [];
  const worldWidth = 12, worldHeight = worldWidth * canvas.height / canvas.width;
  for (let y = 0; y < canvas.height; y += spacing) for (let x = 0; x < canvas.width; x += spacing) {
    const i = (y * canvas.width + x) * 4;
    const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
    const alpha = pixels[i + 3] / 255, brightness = Math.max(r, g, b);
    if (alpha < .1 || brightness < .12) continue;
    const nx = x / canvas.width, ny = y / canvas.height;
    const px = (nx - .5) * worldWidth, py = (.5 - ny) * worldHeight;
    const depth = .12 + brightness * .22 + Math.sin((nx * 1.15 + .08) * Math.PI) * .12 + Math.cos(ny * Math.PI * 2) * .035;
    const seed = ((x * 73856093) ^ (y * 19349663)) >>> 0, rand = (seed % 10000) / 10000;
    positions.push(px, py, depth);
    colors.push(Math.min(1, .68 + r * .32), Math.min(1, .78 + g * .22), Math.min(1, .86 + b * .14));
    sizes.push(2 + brightness * 2.15 + rand * .45);
    seeds.push(rand);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aBaseColor', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  return { geometry, count: positions.length / 3 };
}

function ambientGeometry() {
  const count = 180, positions = new Float32Array(count * 3), sizes = new Float32Array(count), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - .5) * 15;
    positions[i * 3 + 1] = (Math.random() - .5) * 5.5;
    positions[i * 3 + 2] = -.5 - Math.random() * 2.5;
    sizes[i] = .7 + Math.random() * 1.3; seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geometry;
}

export default function WhaleExperience() {
  const mountRef = useRef(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer, frame = 0, whaleMaterial, ambientMaterial, whaleGeo, ambientGeo, blink;
    let disposed = false;
    const clock = new THREE.Clock(), pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#02070d');
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.set(0, 0, 18);
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch { mount.innerHTML = '<div class="webgl-fallback">WebGL could not be initialised in this browser.</div>'; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18; mount.appendChild(renderer.domElement);
    const whaleGroup = new THREE.Group(); scene.add(whaleGroup);
    const image = new Image(); image.src = whaleImageUrl;
    image.onload = () => {
      if (disposed) return;
      const result = particleGeometry(image, innerWidth < 700 ? 6 : 5); whaleGeo = result.geometry;
      whaleMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() }, uReducedMotion: { value: reduced ? 1 : 0 } },
        vertexShader: whaleVertexShader, fragmentShader: whaleFragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(whaleGeo, whaleMaterial); points.frustumCulled = false; whaleGroup.add(points);
      ambientGeo = ambientGeometry();
      ambientMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
        vertexShader: ambientVertexShader, fragmentShader: ambientFragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const ambient = new THREE.Points(ambientGeo, ambientMaterial); ambient.frustumCulled = false; scene.add(ambient);
      const eye = new THREE.Group(); eye.position.set(-4.28, -.30, .47);
      const eyeOuter = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 12), new THREE.MeshBasicMaterial({ color: 0x06111c }));
      const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(.023, 12, 10), new THREE.MeshBasicMaterial({ color: 0x66dfff }));
      eyeGlow.position.z = .035; eye.add(eyeOuter, eyeGlow); whaleGroup.add(eye);
      if (!reduced) blink = gsap.timeline({ repeat: -1, repeatDelay: 4.25 })
        .to(eye.scale, { y: .08, duration: .09, ease: 'power2.in' })
        .to(eye.scale, { y: 1, duration: .14, ease: 'power2.out' });
      whaleGroup.scale.set(.985, 1.32, .985);
      gsap.to(whaleGroup.scale, { x: 1, y: 1.32, z: 1, duration: 1.6, ease: 'power2.out' });
      mount.classList.add('is-ready'); mount.dataset.particleCount = String(result.count);
    };
    image.onerror = () => { mount.innerHTML = '<div class="webgl-fallback">Whale artwork could not be loaded.</div>'; };
    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight), aspect = w / h;
      camera.aspect = aspect; camera.position.z = Math.max(9.4, 14 / (.612 * Math.max(aspect, .55)));
      camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
      if (whaleMaterial) whaleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      if (ambientMaterial) ambientMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(mount);
    const move = e => { const r = mount.getBoundingClientRect(); target.x = ((e.clientX - r.left) / r.width - .5) * 2; target.y = ((e.clientY - r.top) / r.height - .5) * 2; };
    const leave = () => { target.x = 0; target.y = 0; };
    mount.addEventListener('pointermove', move, { passive: true }); mount.addEventListener('pointerleave', leave, { passive: true });
    const animate = () => {
      if (disposed || document.hidden) return;
      frame = requestAnimationFrame(animate); const t = clock.getElapsedTime();
      if (whaleMaterial) whaleMaterial.uniforms.uTime.value = reduced ? 0 : t;
      if (ambientMaterial) ambientMaterial.uniforms.uTime.value = reduced ? 0 : t;
      pointer.x += (target.x - pointer.x) * .035; pointer.y += (target.y - pointer.y) * .035;
      whaleGroup.rotation.y = pointer.x * .045; whaleGroup.rotation.x = -pointer.y * .025;
      whaleGroup.position.y = reduced ? 0 : Math.sin(t * .45) * .035;
      renderer.render(scene, camera);
    };
    const visibility = () => { if (document.hidden) cancelAnimationFrame(frame); else animate(); };
    document.addEventListener('visibilitychange', visibility); animate();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      mount.removeEventListener('pointermove', move); mount.removeEventListener('pointerleave', leave);
      blink?.kill(); gsap.killTweensOf(whaleGroup.scale);
      whaleGeo?.dispose(); ambientGeo?.dispose(); whaleMaterial?.dispose(); ambientMaterial?.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);
  return <section className="whale-stage" aria-label="Animated blue whale particle sculpture">
    <div className="stage-grain" aria-hidden="true"/>
    <div className="whale-canvas" ref={mountRef}/>
  </section>;
}