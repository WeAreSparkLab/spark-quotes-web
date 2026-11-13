// worlds/engine/summit.ts — The Summit
//
// An observatory terrace above a sea of cloud at golden hour. A brass
// armillary turns slowly at the centre of a compass-inlaid floor; peaks stand
// out of the cloud beyond the rail, and the first stars are out overhead.
// Saving a quote lights a new star.

import * as THREE from "three";
import { WORLDS } from "../config";
import { Kit, World, coursedTex, flat, glow, makeMotes, makeSky, noiseTex, seeded, std, sunLight, damp } from "./kit";

/**
 * A mountain range as one height-field: a handful of summits shaped by ridged
 * noise, so the skyline has spurs, saddles and shoulders rather than cones.
 */
function range(compact: boolean) {
  const SX = 1300, SZ = 460, NX = compact ? 120 : 190, NZ = compact ? 46 : 72, BASE = -34;
  const g = new THREE.PlaneGeometry(SX, SZ, NX, NZ);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -390);

  const r = seeded(19);
  const table = new Float32Array(4096).map(() => r());
  const h2 = (x: number, y: number) => table[(Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) & 4095];
  const vn = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const ridged = (x: number, y: number) => {
    let amp = 0.5, f = 1, s = 0;
    for (let o = 0; o < 5; o++) {
      const n = 1 - Math.abs(vn(x * f, y * f) * 2 - 1);
      s += n * n * amp;
      amp *= 0.5; f *= 2.07;
    }
    return s;
  };
  // [x, z, summit height above the terrace, spread]
  const summits = [
    [-200, -400, 44, 96], [-20, -450, 54, 120], [140, -400, 42, 92], [290, -350, 34, 84], [-340, -320, 30, 84],
    [50, -265, 21, 54], [-115, -235, 15, 44], [470, -410, 40, 100], [-520, -410, 40, 110], [210, -260, 12, 40],
  ];

  const p = g.attributes.position;
  const rough = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let env = 0;
    for (const [sx, sz, sh, sr] of summits) {
      const dx = (x - sx) / sr, dz = (z - sz) / (sr * 0.8);
      env = Math.max(env, (sh - BASE) * Math.exp(-(dx * dx + dz * dz)));
    }
    const n = ridged(x * 0.011 + 3.1, z * 0.011 + 7.7);
    rough[i] = n;
    p.setY(i, BASE + env * (0.42 + 0.72 * n));
  }
  g.computeVertexNormals();

  const nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const rock = new THREE.Color("#463F62"), rock2 = new THREE.Color("#6B5C7C"), snow = new THREE.Color("#F4E8E2"), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), up = nrm.getY(i);
    const s = THREE.MathUtils.smoothstep(y + rough[i] * 10, 6, 22) * THREE.MathUtils.smoothstep(up, 0.42, 0.72);
    c.copy(rock).lerp(rock2, rough[i]).lerp(snow, s);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

export function buildSummit(compact: boolean): World {
  const cfg = WORLDS.summit;
  const r = seeded(41);
  const root = new THREE.Group();
  const sunDir = new THREE.Vector3(0.42, 0.055, -1).normalize();
  const FOG = "#C7958C";

  const sky = makeSky({
    top: cfg.sky[0], mid: cfg.sky[1], horizon: cfg.sky[2], ground: "#B98A8E",
    sunDir, sunColor: "#FFD2A0", sunSharp: 1800, halo: 1.25, stars: 1,
  });

  // one continuous range, kept low on the horizon so snow never sits behind the words
  const rangeMesh = new THREE.Mesh(range(compact), std({ vertexColors: true, roughness: 0.96 }));
  root.add(rangeMesh);

  // the cloud sea
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLit: { value: new THREE.Color("#F8D2AE") },
      uShade: { value: new THREE.Color("#5A4E82") },
      uFog: { value: new THREE.Color(FOG) },
      uSun: { value: new THREE.Vector2(sunDir.x, sunDir.z).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uLit, uShade, uFog; uniform vec2 uSun;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.; a *= .5; } return s; }
      void main() {
        vec2 p = vW.xz * .024 + vec2(uTime * .007, uTime * .002);
        float n = fbm(p);
        // light the billows from the sun's side by comparing against a shifted sample
        float n2 = fbm(p + uSun * .16);
        float lit = clamp(.5 + (n - n2) * 6., 0., 1.);
        vec3 c = mix(uShade, uLit, smoothstep(.12, .92, lit * .62 + n * .5));
        float dist = length(vW - cameraPosition);
        c = mix(c, uFog, smoothstep(90., 520., dist));
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), cloudMat);
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.set(0, -11, -400);
  root.add(clouds);

  // a few nearer billows drifting past, for depth
  const billows: THREE.Sprite[] = [];
  for (let i = 0; i < (compact ? 6 : 10); i++) {
    const s = glow(1, i % 2 ? "#F3C3A4" : "#B79CC0", 0.34, false);
    (s.material as THREE.SpriteMaterial).fog = false;
    s.position.set((r() - 0.5) * 260, -9 + r() * 4, -40 - r() * 150);
    s.scale.set(70 + r() * 60, 12 + r() * 9, 1);
    billows.push(s);
    root.add(s);
  }

  // the terrace
  const k = new Kit();
  const M = {
    paving: std({ map: coursedTex(2.2, { cols: 4, rows: 6, base: [150, 138, 150], vary: 8, joint: "#6f647a", jointW: 1.5, seed: 6 }), roughness: 0.82 }),
    stone: std({ map: noiseTex(2.5, [176, 163, 170], { a: 0.05, seed: 14 }), roughness: 0.9 }),
    stoneDark: flat("#5B5068", 0.9),
    brass: flat("#C89B5E", 0.28, 1),
    zinc: flat("#8C88A2", 0.58, 0.45),
    dark: flat("#231F2C", 0.6, 0.3),
    lit: std({ color: "#FFE2B4", emissive: "#FFC47E", emissiveIntensity: 2.4, roughness: 0.8 }),
  };
  M.lit.userData.noShadow = true;
  const PZ = 4.5, PR = 8.2;
  k.cyl(M.stoneDark, PR + 0.35, PR + 0.9, 3, 0, -3.2, PZ, 64);
  k.cyl(M.stone, PR + 0.3, PR + 0.3, 0.22, 0, -0.2, PZ, 64);
  k.cyl(M.paving, PR, PR, 0.06, 0, 0, PZ, 64);
  // compass inlaid in brass
  for (const [ro, ri] of [[4.6, 4.5], [2.5, 2.44], [1.25, 1.2]]) {
    const ring = new THREE.RingGeometry(ri, ro, 72);
    k.add(M.brass, ring, 0, 0.066, PZ, -Math.PI / 2);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, long = i % 4 === 0, len = long ? 3.25 : i % 2 === 0 ? 2.0 : 1.2;
    k.push(0, 0, PZ, a);
    k.box(M.brass, long ? 0.07 : 0.035, 0.012, len, 0, 0.062, 1.25 + len / 2);
    k.pop();
  }
  // rail around the far edge
  for (let i = -9; i <= 9; i++) {
    const a = (i / 9) * 1.75;
    k.cyl(M.brass, 0.028, 0.028, 1.05, Math.sin(a) * (PR - 0.25), 0.06, PZ - Math.cos(a) * (PR - 0.25), 8);
  }
  for (const [y, tube] of [[1.1, 0.04], [0.6, 0.022]]) {
    const t = new THREE.TorusGeometry(PR - 0.25, tube, 8, 90, 3.5);
    k.add(M.brass, t, 0, y, PZ, Math.PI / 2, 0, -Math.PI / 2 - 3.5 / 2);
  }
  // armillary on a plinth
  k.cyl(M.stone, 0.42, 0.5, 0.18, 0, 0.06, PZ, 24);
  k.cyl(M.stone, 0.26, 0.32, 0.95, 0, 0.24, PZ, 24);
  k.cyl(M.stone, 0.4, 0.3, 0.12, 0, 1.19, PZ, 24);
  k.cyl(M.brass, 0.03, 0.05, 0.25, 0, 1.31, PZ, 10);

  // observatory to the left
  const OX = -8.6, OZ = -5.4;
  k.cyl(M.stoneDark, 4.1, 4.5, 3.4, OX, -3.3, OZ, 40);
  k.cyl(M.stone, 3.5, 3.6, 3.3, OX, 0, OZ, 40);
  k.cyl(M.brass, 3.62, 3.62, 0.12, OX, 3.3, OZ, 40);
  k.add(M.zinc, new THREE.SphereGeometry(3.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), OX, 3.42, OZ);
  k.push(OX, 3.42, OZ, -0.75);
  k.add(M.dark, new THREE.TorusGeometry(3.52, 0.34, 4, 40, Math.PI * 0.52), 0, 0, 0, 0, Math.PI / 2, 0); // shutter slit
  k.cyl(M.brass, 0.2, 0.26, 3.2, 0, 2.4, 1.4, 14, -0.72, 0);
  k.pop();
  for (const a of [0.55, 1.15]) {
    k.push(OX, 0, OZ, a);
    k.box(M.lit, 0.62, 1.25, 0.1, 0, 1.2, 3.56);
    k.box(M.dark, 0.74, 0.07, 0.14, 0, 1.13, 3.56);
    k.pop();
  }
  k.box(M.stone, 3.4, 0.22, 2.2, -6.9, -0.2, 0.2, 0.62); // bridge to the terrace

  // beacon to the right
  const BX = 9.6, BZ = -3.2;
  k.cyl(M.stoneDark, 1.5, 1.9, 3.2, BX, -3.3, BZ, 24);
  k.cyl(M.stone, 1.3, 1.3, 0.25, BX, -0.2, BZ, 24);
  k.cyl(M.dark, 0.07, 0.11, 6.4, BX, 0.05, BZ, 10);
  k.cyl(M.brass, 0.3, 0.3, 0.06, BX, 6.4, BZ, 16);
  k.cyl(M.lit, 0.2, 0.2, 0.42, BX, 6.46, BZ, 16);
  k.cyl(M.brass, 0.05, 0.34, 0.26, BX, 6.88, BZ, 16);
  k.box(M.stone, 3.0, 0.22, 1.6, 7.6, -0.2, 0.6, -0.5);
  root.add(k.build());

  const beacon = glow(3.4, "#FFC98A", 0.8);
  beacon.position.set(BX, 6.67, BZ);
  const winGlow = glow(5, "#FFB877", 0.28);
  winGlow.position.set(OX + 2.6, 1.6, OZ + 3.2);
  root.add(beacon, winGlow);

  // the armillary's rings
  const arm = new THREE.Group();
  arm.position.set(0, 2.3, PZ);
  const rings = [0.82, 0.7, 0.58].map((rad, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.022, 10, 64), M.brass);
    m.castShadow = true;
    m.rotation.set(i * 0.9, i * 0.5, 0);
    arm.add(m);
    return m;
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 2), M.brass);
  arm.add(core);
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 6), M.brass);
  axis.rotation.z = 0.41;
  arm.add(axis);
  root.add(arm);

  // stars that come out when a quote is saved
  const STARS = 30;
  const stars = Array.from({ length: STARS }, () => {
    const s = glow(9, "#FFF3DA", 0);
    (s.material as THREE.SpriteMaterial).fog = false;
    const az = (r() - 0.5) * 1.5, el = 0.42 + r() * 0.5;
    s.position.set(Math.sin(az) * Math.cos(el) * 300, Math.sin(el) * 300, -Math.cos(az) * Math.cos(el) * 300);
    root.add(s);
    return { s, goal: 0, a: 0, flare: 0 };
  });
  let nextStar = 0;

  const ice = makeMotes({ count: compact ? 50 : 110, box: [26, 10, 26], center: [0, 4, 3], color: "#FFE6C8", size: 0.04, drift: [0.12, -0.02, 0.05], opacity: 0.8 });
  root.add(ice);

  const sun = sunLight("#FFBE86", 3.4, [16, 5.5, -26], 20);
  sun.target.position.set(0, 0.5, 2);
  root.add(sun, sun.target, new THREE.HemisphereLight("#9A90CC", "#3A335A", 1.1));

  let spin = 0.12;
  return {
    root, sky, sun,
    fog: new THREE.Fog(FOG, 80, 620),
    exposure: 1.0,
    envIntensity: 0.6,
    liveShadows: true,
    camera: { pos: [0, 2.05, 15.6], target: [0, 7.4, -22], fov: 42, tallFov: 60, sway: 0.04 },
    tick(t, dt) {
      cloudMat.uniforms.uTime.value = t;
      (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (ice.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      spin = damp(spin, 0.12, 0.7, dt);
      rings[0].rotation.x += dt * spin;
      rings[1].rotation.y += dt * spin * 1.4;
      rings[2].rotation.z += dt * spin * 0.8;
      arm.rotation.y += dt * spin * 0.3;
      beacon.material.opacity = 0.7 + Math.sin(t * 0.9) * 0.14;
      billows.forEach((b, i) => {
        b.position.x += dt * (0.8 + (i % 3) * 0.4);
        if (b.position.x > 190) b.position.x = -190;
      });
      for (const st of stars) {
        st.a = damp(st.a, st.goal, 1.2, dt);
        st.flare = damp(st.flare, 0, 1.4, dt);
        if (st.a < 0.003) continue;
        st.s.material.opacity = st.a * (0.8 + Math.sin(t * 1.7 + st.s.position.x) * 0.15);
        st.s.scale.setScalar(9 + st.flare * 22);
      }
    },
    pulse() {
      const st = stars[nextStar % STARS];
      nextStar++;
      st.goal = 1;
      st.flare = 1;
      spin = 1.6;
    },
  };
}
