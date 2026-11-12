// worlds/engine/garden.ts — The Garden of Growth
//
// A formal garden at mid-morning: a paved walk between hedges and flower
// beds, a round terrace with a still basin, and a plaster colonnade curving
// behind it, back-lit so the arches throw long shadows towards you.
// Saving a quote opens a new bloom beside the path.

import * as THREE from "three";
import { WORLDS } from "../config";
import {
  Kit, World, archGeo, coursedTex, flat, glow, makeMotes, makeSky, noiseTex, seeded, std, sunLight, damp,
} from "./kit";

export function buildGarden(compact: boolean): World {
  const cfg = WORLDS.garden;
  const r = seeded(11);
  const root = new THREE.Group();
  const k = new Kit();

  const M = {
    lawn: std({ map: noiseTex(3, [124, 143, 100], { a: 0.13, n: 9000, seed: 2 }), roughness: 1 }),
    stone: std({ map: coursedTex(2.4, { cols: 4, rows: 6, base: [224, 214, 196], vary: 8, joint: "#b9ad98", jointW: 1.5 }), roughness: 0.86 }),
    plaster: std({ map: noiseTex(2.5, [241, 233, 219], { a: 0.035 }), roughness: 0.95 }),
    trim: flat("#E4D9C7", 0.8),
    bark: flat("#5E4E42", 0.95),
    leafA: std({ map: noiseTex(0.6, [112, 132, 92], { a: 0.2, n: 8000, seed: 31 }), roughness: 1 }),
    leafB: std({ map: noiseTex(0.6, [138, 154, 110], { a: 0.2, n: 8000, seed: 32 }), roughness: 1 }),
    leafC: std({ map: noiseTex(0.6, [86, 106, 80], { a: 0.2, n: 8000, seed: 33 }), roughness: 1 }),
    cypress: std({ map: noiseTex(0.5, [62, 84, 68], { a: 0.22, n: 8000, seed: 34 }), roughness: 1 }),
    soil: flat("#4A3D34", 1),
    terracotta: flat("#B5775A", 0.85),
    water: flat("#A9C0C8", 0.05, 1, { envMapIntensity: 2.2 }),
    hill: flat("#9FB093", 1),
  };
  M.water.userData.noShadow = true;

  // ground, walk, terrace
  k.add(M.lawn, new THREE.CircleGeometry(130, 48), 0, 0, 0, -Math.PI / 2);
  k.box(M.stone, 2.6, 0.06, 15, 0, 0, 9.5);
  k.box(M.trim, 3.0, 0.03, 15, 0, 0, 9.5);
  const TZ = -3; // terrace centre
  k.cyl(M.trim, 5.6, 5.6, 0.08, 0, 0, TZ, 56);
  k.cyl(M.stone, 5.3, 5.3, 0.18, 0, 0, TZ, 56);

  // basin with a slender fountain
  k.cyl(M.trim, 1.95, 2.05, 0.46, 0, 0.18, TZ, 44);
  k.cyl(M.water, 1.78, 1.78, 0.02, 0, 0.63, TZ, 44);
  k.cyl(M.trim, 0.14, 0.24, 1.15, 0, 0.6, TZ, 16);
  k.cyl(M.trim, 0.85, 0.2, 0.16, 0, 1.75, TZ, 28);
  k.cyl(M.water, 0.78, 0.78, 0.02, 0, 1.9, TZ, 28);

  // colonnade: seven arches on an arc behind the terrace
  const R = 10.6, STEP = (22 * Math.PI) / 180;
  for (let i = -3; i <= 3; i++) {
    const a = i * STEP;
    k.push(R * Math.sin(a), 0, TZ - R * Math.cos(a), -a);
    k.add(M.plaster, archGeo(4.08, 6, 2.5, 4.9, 0.62));
    k.box(M.trim, 4.3, 0.2, 0.9, 0, 6, 0);
    k.box(M.trim, 4.16, 0.12, 0.74, 0, 5.72, 0);
    for (const s of [-1, 1]) {
      k.box(M.trim, 0.86, 0.34, 0.78, s * 1.61, 0, 0);
      k.box(M.trim, 0.8, 0.12, 0.72, s * 1.61, 2.38, 0); // impost at the spring of the arch
    }
    k.pop();
  }

  // hedges and beds along the walk
  for (const s of [-1, 1]) {
    k.box(M.leafC, 0.55, 0.62, 12.6, s * 1.95, 0, 9.3);
    k.box(M.soil, 1.7, 0.1, 12.6, s * 3.15, 0, 9.3);
    for (let i = 0; i < 16; i++)
      k.sph(i % 2 ? M.leafB : M.leafA, 0.5 + r() * 0.2, s * (2.6 + r() * 1.1), 0.22, 3.4 + i * 0.78 + r() * 0.3, 1.2, 0.55, 1.2, 1);
    // urns with clipped spheres at the terrace steps
    k.cyl(M.terracotta, 0.46, 0.3, 0.72, s * 2.15, 0.06, 2.3, 20);
    k.sph(M.leafC, 0.62, s * 2.15, 1.3, 2.3);
  }

  // cypresses: the tall punctuation of the garden
  const cyp = (x: number, z: number, h: number) => {
    k.cyl(M.bark, 0.09, 0.12, 0.7, x, 0, z, 8);
    k.sph(M.cypress, 0.62, x, 0.6 + h / 2, z, 1, h / 1.24, 1, 2);
  };
  for (const s of [-1, 1]) {
    cyp(s * 4.6, 6.6, 5.6); cyp(s * 6.9, 1.6, 6.2);
    cyp(s * 13.5, -6, 7); cyp(s * 15.5, -9.5, 6.4);
  }

  // broad trees beyond the arches
  const tree = (x: number, z: number, h: number, spread: number) => {
    k.cyl(M.bark, 0.2, 0.32, h, x, 0, z, 10);
    const mats = [M.leafA, M.leafB, M.leafC];
    for (let i = 0; i < (compact ? 6 : 9); i++) {
      const a = r() * Math.PI * 2, d = r() * spread * 0.75;
      k.sph(mats[i % 3], spread * (0.5 + r() * 0.3), x + Math.cos(a) * d, h + spread * (0.25 + r() * 0.55), z + Math.sin(a) * d, 1, 0.82, 1, compact ? 2 : 3);
    }
  };
  for (let i = 0; i < 11; i++) {
    const a = ((i - 5) / 5) * 1.5, d = 17 + r() * 13;
    tree(d * Math.sin(a) + (r() - 0.5) * 3, TZ - d * Math.cos(a), 3 + r() * 1.6, 2.6 + r() * 1.4);
  }
  // far hills, softened by the haze
  for (let i = 0; i < 6; i++)
    k.sph(M.hill, 46, -150 + i * 60 + r() * 20, -18, -150 - r() * 40, 1.5, 0.52 + r() * 0.2, 1, 3);

  root.add(k.build());

  // flowers in the beds (instanced, each its own colour)
  const palette = ["#B79BC6", "#E7B6BC", "#F7EDD4", "#E7C58C", "#8D6AA8", "#F2D3C4"].map((c) => new THREE.Color(c));
  const bloomGeo = new THREE.IcosahedronGeometry(0.048, 1);
  bloomGeo.scale(1, 0.7, 1);
  const bloomMat = std({ roughness: 0.7 });
  const N = compact ? 460 : 950;
  const flowers = new THREE.InstancedMesh(bloomGeo, bloomMat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const s = i % 2 ? 1 : -1, big = 0.7 + r() * 0.9;
    m4.compose(v.set(s * (2.45 + r() * 1.45), 0.4 + r() * 0.3, 3.2 + r() * 8.6), q, sc.setScalar(big));
    flowers.setMatrixAt(i, m4);
    flowers.setColorAt(i, palette[(r() * palette.length) | 0]);
  }
  flowers.castShadow = false;
  root.add(flowers);

  // blooms that open when a quote is saved
  const SAVED = 36;
  const savedGeo = new THREE.IcosahedronGeometry(0.115, 2);
  savedGeo.scale(1, 0.62, 1);
  const saved = new THREE.InstancedMesh(savedGeo, std({ roughness: 0.55, emissive: "#F7E3B0", emissiveIntensity: 0.18 }), SAVED);
  const spots: { p: THREE.Vector3; s: number; goal: number }[] = [];
  for (let i = 0; i < SAVED; i++) {
    const s = i % 2 ? 1 : -1;
    // Up the path, between the quote and the menu tray, so a new bloom opens
    // where it can be seen (nearer spots sat behind the tray).
    spots.push({ p: new THREE.Vector3(s * (2.4 + r() * 0.9), 0.74 + r() * 0.16, 8.2 - (i / SAVED) * 5 + r() * 0.4), s: 0, goal: 0 });
    saved.setColorAt(i, palette[i % palette.length]);
    saved.setMatrixAt(i, m4.makeScale(0, 0, 0));
  }
  root.add(saved);
  let nextSpot = 0;
  const spark = glow(1.6, "#FFE9B8", 0);
  root.add(spark);

  // two butterflies wandering over the beds
  const wingGeo = new THREE.CircleGeometry(0.06, 10);
  wingGeo.scale(1, 0.78, 1);
  wingGeo.translate(0.058, 0, 0);
  const flies = [0, 1].map((i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: i ? "#F3E2B2" : "#CDB3DC", side: THREE.DoubleSide });
    const a = new THREE.Mesh(wingGeo, mat), b = new THREE.Mesh(wingGeo, mat);
    b.scale.x = -1;
    g.add(a, b);
    root.add(g);
    return { g, a, b, ph: i * 2.6 };
  });

  // water glint
  const glint = glow(1.3, "#FFF6DC", 0.5);
  glint.position.set(0.3, 0.7, TZ + 0.4);
  root.add(glint);

  const motes = makeMotes({ count: compact ? 60 : 130, box: [18, 7, 22], center: [0, 3.4, 5], color: "#FFFDF2", size: 0.045, drift: [0.06, 0.015, 0.02], opacity: 0.85, additive: false });
  root.add(motes);

  // light: low sun from ahead-left, so shadows reach towards the viewer
  const sunBase = new THREE.Vector3(-11, 12, -15);
  const sun = sunLight("#FFE4BC", 3.3, [sunBase.x, sunBase.y, sunBase.z], 24);
  sun.target.position.set(0, 0, 2);
  root.add(sun, sun.target, new THREE.HemisphereLight("#E3EDF4", "#93A67E", 1.25));

  const sky = makeSky({
    top: cfg.sky[0], mid: cfg.sky[1], horizon: cfg.sky[2], ground: "#C6CDB0",
    sunDir: new THREE.Vector3(-0.56, 0.5, -0.66), sunColor: "#FFF1D2", sunSharp: 700, halo: 0.42,
  });

  let lx = 0;
  return {
    root, sky, sun,
    fog: new THREE.Fog("#EFE8D8", 28, 150),
    exposure: 1.0,
    envIntensity: 0.55,
    liveShadows: true,
    camera: { pos: [0, 1.75, 15.5], target: [0, 3.5, 0], fov: 42, tallFov: 60, sway: 0.05 },
    tick(t, dt, pointer) {
      (motes.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      // the light leans gently with the pointer
      lx = damp(lx, pointer.x, 1.5, dt);
      sun.position.set(sunBase.x + lx * 4, sunBase.y, sunBase.z);
      glint.material.opacity = 0.32 + Math.sin(t * 1.3) * 0.14;
      for (const f of flies) {
        const a = t * 0.32 + f.ph;
        f.g.position.set(Math.sin(a) * 3.1 + Math.sin(a * 2.7) * 0.5, 1.15 + Math.sin(a * 3.1) * 0.3, 8.5 + Math.cos(a * 1.3) * 3.2);
        f.g.rotation.y = a * 1.3;
        const flap = Math.sin(t * 16 + f.ph) * 0.9;
        f.a.rotation.y = flap; f.b.rotation.y = -flap;
      }
      let moved = false;
      for (let i = 0; i < SAVED; i++) {
        const s = spots[i];
        if (Math.abs(s.goal - s.s) > 0.002) {
          s.s = damp(s.s, s.goal, 3.2, dt);
          saved.setMatrixAt(i, m4.compose(s.p, q, sc.setScalar(s.s)));
          moved = true;
        }
      }
      if (moved) saved.instanceMatrix.needsUpdate = true;
      spark.material.opacity = damp(spark.material.opacity, 0, 1.6, dt);
    },
    pulse() {
      const s = spots[nextSpot % SAVED];
      nextSpot++;
      s.goal = 1;
      s.s = Math.min(s.s, 0.05);
      spark.position.copy(s.p);
      spark.material.opacity = 0.9;
    },
  };
}
