// worlds/engine/sunroom.ts — The Sunshine Room
//
// A tall garden room in late-morning sun. Light comes through the glazed
// wall and roof and lays the pattern of the glazing bars across a plain
// plaster wall — which is where the words sit, as if lettered there.
// Below: a tiled floor, a bright rug, an armchair, a pot of tea, an orange
// tree. A mobile turns overhead; saving a quote gives it a spin.

import * as THREE from "three";
import { WORLDS } from "../config";
import { Kit, World, coursedTex, flat, glow, makeMotes, makeSky, noiseTex, planksTex, seeded, softTex, std, sunLight, damp } from "./kit";

export function buildSunroom(compact: boolean): World {
  const cfg = WORLDS.sunroom;
  const r = seeded(57);
  const root = new THREE.Group();
  const k = new Kit();

  const M = {
    wall: std({ map: noiseTex(3, [244, 233, 213], { a: 0.03, seed: 3 }), roughness: 0.96 }),
    coral: std({ map: noiseTex(3, [214, 128, 102], { a: 0.04, seed: 5 }), roughness: 0.95 }),
    white: flat("#F6F1E7", 0.6),
    tile: std({ map: coursedTex(2.4, { cols: 4, rows: 4, base: [196, 122, 88], alt: [238, 224, 200], vary: 7, joint: "#a8947f", jointW: 1.2, bond: false, seed: 8 }), roughness: 0.55 }),
    walnut: std({ map: planksTex(1.2, [112, 78, 56], 6, 17), roughness: 0.55 }),
    oak: std({ map: planksTex(1.2, [196, 160, 116], 6, 9), roughness: 0.6 }),
    teal: flat("#2F8088", 0.9),
    tealGlaze: flat("#2B7C86", 0.25),
    mustard: flat("#DDA63A", 0.92),
    coralSoft: flat("#E07A5F", 0.92),
    cream: flat("#F4EBDA", 0.4),
    plum: flat("#5B3F6B", 0.85),
    terracotta: flat("#B5714F", 0.85),
    soil: flat("#3D332D", 1),
    bark: flat("#6A5546", 0.95),
    leafA: std({ map: noiseTex(0.5, [84, 124, 82], { a: 0.2, n: 7000, seed: 31 }), roughness: 0.8 }),
    leafB: std({ map: noiseTex(0.5, [118, 150, 96], { a: 0.2, n: 7000, seed: 32 }), roughness: 0.8 }),
    orange: std({ color: "#F29A2E", roughness: 0.6, emissive: "#F29A2E", emissiveIntensity: 0.12 }),
    brass: flat("#C89B5E", 0.3, 1),
    shade: std({ color: "#FFF3DC", emissive: "#FFD9A0", emissiveIntensity: 0.9, roughness: 0.9 }),
    outside: flat("#A9C29A", 1),
  };
  M.shade.userData.noShadow = true;

  const W = 5.6, BACK = -5, FRONT = 7, H = 6.9, RIDGE = 8.9;

  // floor, back wall, skirting
  k.box(M.tile, W * 2, 0.1, FRONT - BACK, 0, -0.1, (FRONT + BACK) / 2);
  k.box(M.wall, W * 2 + 0.6, H, 0.3, 0, 0, BACK - 0.15);
  k.box(M.white, W * 2, 0.22, 0.06, 0, 0, BACK + 0.03);
  // right wall: coral, with shelves
  k.box(M.coral, 0.3, H, FRONT - BACK, W + 0.15, 0, (FRONT + BACK) / 2);
  for (const y of [1.5, 2.25, 3.0]) k.box(M.white, 0.34, 0.05, 2.6, W - 0.17, y, -2.6);
  const things = [M.teal, M.mustard, M.cream, M.plum, M.coralSoft];
  for (const y of [1.55, 2.3, 3.05]) {
    let z = -3.75;
    while (z < -1.5) {
      const w = 0.05 + r() * 0.07, h = 0.26 + r() * 0.2;
      if (r() < 0.78) k.box(things[(r() * 5) | 0], 0.22, h, w, W - 0.17, y, z + w / 2);
      else k.cyl(things[(r() * 5) | 0], 0.07, 0.1, 0.24, W - 0.17, y, z + 0.1, 14);
      z += w + 0.012 + (r() < 0.15 ? 0.3 : 0);
    }
  }

  // left wall: glazed, on a low plinth
  k.box(M.wall, 0.3, 0.55, FRONT - BACK, -W - 0.15, 0, (FRONT + BACK) / 2);
  k.box(M.white, 0.4, 0.06, FRONT - BACK, -W - 0.12, 0.55, (FRONT + BACK) / 2);
  for (let z = BACK; z <= FRONT + 0.01; z += 1.2) k.box(M.white, 0.1, H - 0.6, 0.1, -W - 0.05, 0.6, z);
  for (const y of [2.6, 4.7, H - 0.12]) k.box(M.white, 0.09, 0.09, FRONT - BACK, -W - 0.05, y, (FRONT + BACK) / 2);

  // glazed roof: rafters to a ridge, with purlins
  for (let z = BACK; z <= FRONT + 0.01; z += 1.2)
    for (const s of [-1, 1])
      k.beam(M.white, new THREE.Vector3(s * (W + 0.1), H, z), new THREE.Vector3(0, RIDGE, z), 0.09, 0.14);
  k.box(M.white, 0.14, 0.2, FRONT - BACK, 0, RIDGE - 0.1, (FRONT + BACK) / 2);
  for (const s of [-1, 1])
    for (const f of [0.36, 0.7]) k.box(M.white, 0.07, 0.07, FRONT - BACK, s * W * (1 - f), H + (RIDGE - H) * f, (FRONT + BACK) / 2);
  // gable above the back wall
  k.box(M.white, W * 2 + 0.6, 0.16, 0.34, 0, H, BACK - 0.15);
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) k.box(M.white, 0.09, (RIDGE - H) * (1 - Math.abs(x) / (W + 0.1)), 0.1, x, H, BACK - 0.1);

  // greenery glimpsed outside the glass
  for (let i = 0; i < 14; i++) k.sph(M.outside, 1.5 + r() * 1.3, -W - 7 - r() * 7, 0.6 + r() * 1.6, BACK - 2 + i * 1.3, 1, 0.95, 1, 3);

  // sideboard against the back wall
  const SX = -1.5, SZ = BACK + 0.36;
  k.box(M.walnut, 2.9, 0.62, 0.5, SX, 0.26, SZ);
  k.box(M.walnut, 2.98, 0.04, 0.56, SX, 0.88, SZ);
  for (const dx of [-1.3, 1.3]) for (const dz of [-0.17, 0.17]) k.cyl(M.brass, 0.018, 0.012, 0.26, SX + dx, 0, SZ + dz, 8);
  for (const dx of [-0.73, 0, 0.73]) k.cyl(M.brass, 0.022, 0.022, 0.02, SX + dx + 0.3, 0.57, SZ + 0.26, 10, Math.PI / 2, 0);
  // on it: vases, books, a lamp
  k.cyl(M.tealGlaze, 0.1, 0.17, 0.5, SX - 1.05, 0.92, SZ, 24);
  k.sph(M.tealGlaze, 0.2, SX - 1.05, 1.16, SZ, 1, 0.9, 1);
  k.cyl(M.cream, 0.06, 0.13, 0.3, SX - 0.62, 0.92, SZ + 0.06, 20);
  k.sph(M.mustard, 0.17, SX - 0.2, 1.08, SZ, 1, 1, 1);
  k.cyl(M.mustard, 0.06, 0.06, 0.1, SX - 0.2, 1.22, SZ, 16);
  for (const [i, m] of [M.plum, M.coralSoft, M.teal].entries()) k.box(m, 0.42 - i * 0.04, 0.055, 0.3, SX + 0.38, 0.92 + i * 0.057, SZ, 0.08 * i);
  k.cyl(M.brass, 0.1, 0.12, 0.03, SX + 1.05, 0.92, SZ, 20);
  k.cyl(M.brass, 0.014, 0.014, 0.5, SX + 1.05, 0.95, SZ, 8);
  k.cyl(M.shade, 0.15, 0.26, 0.3, SX + 1.05, 1.42, SZ, 24);
  // stems in the tall vase
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, lean = 0.16;
    k.beam(M.bark, new THREE.Vector3(SX - 1.05, 1.3, SZ), new THREE.Vector3(SX - 1.05 + Math.cos(a) * lean * 2.4, 2.02 + (i % 2) * 0.2, SZ + Math.sin(a) * lean), 0.012, 0.012);
    k.sph(i % 2 ? M.coralSoft : M.mustard, 0.075, SX - 1.05 + Math.cos(a) * lean * 2.4, 2.06 + (i % 2) * 0.2, SZ + Math.sin(a) * lean, 1, 0.8, 1, 1);
  }

  // armchair, turned a little towards the room
  k.push(1.55, 0, -2.5, -0.55);
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.36, 0.36]) k.cyl(M.oak, 0.03, 0.02, 0.3, dx, 0, dz, 8);
  k.box(M.oak, 0.92, 0.06, 0.9, 0, 0.28, 0);
  k.box(M.teal, 0.82, 0.2, 0.8, 0, 0.34, 0.02);
  k.box(M.teal, 0.82, 0.74, 0.2, 0, 0.5, -0.34, 0, -0.16);
  for (const s of [-1, 1]) {
    k.box(M.oak, 0.07, 0.34, 0.84, s * 0.44, 0.34, 0);
    k.box(M.oak, 0.1, 0.045, 0.9, s * 0.44, 0.68, 0);
  }
  k.sph(M.mustard, 0.25, 0.04, 0.72, -0.2, 1, 0.92, 0.5);
  k.pop();
  k.push(1.2, 0, -1.55, 0.3);
  for (const [i, m] of [M.coralSoft, M.cream, M.plum, M.mustard].entries()) k.box(m, 0.34, 0.05, 0.25, 0, i * 0.052, 0, i * 0.2);
  k.pop();

  // side table with a pot of tea
  const TX = 0.25, TZ = -2.05;
  k.cyl(M.oak, 0.2, 0.24, 0.02, TX, 0, TZ, 24);
  k.cyl(M.oak, 0.025, 0.025, 0.56, TX, 0.02, TZ, 10);
  k.cyl(M.oak, 0.36, 0.36, 0.035, TX, 0.58, TZ, 32);
  k.sph(M.coralSoft, 0.115, TX - 0.07, 0.715, TZ, 1, 0.85, 1);
  k.cyl(M.coralSoft, 0.03, 0.04, 0.03, TX - 0.07, 0.81, TZ, 12);
  k.cyl(M.coralSoft, 0.014, 0.022, 0.15, TX + 0.07, 0.74, TZ, 8, 0, -0.9);
  k.add(M.coralSoft, new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), TX - 0.18, 0.72, TZ, 0, 0, Math.PI / 2);
  k.cyl(M.cream, 0.055, 0.04, 0.07, TX + 0.16, 0.615, TZ + 0.16, 16);
  k.cyl(M.cream, 0.085, 0.085, 0.008, TX + 0.16, 0.615, TZ + 0.16, 20);

  // orange tree in a big pot
  const CX = -2.55, CZ = -1.9;
  k.cyl(M.terracotta, 0.42, 0.3, 0.6, CX, 0, CZ, 28);
  k.cyl(M.terracotta, 0.45, 0.45, 0.07, CX, 0.56, CZ, 28);
  k.cyl(M.soil, 0.39, 0.39, 0.02, CX, 0.6, CZ, 24);
  k.cyl(M.bark, 0.035, 0.05, 1.15, CX, 0.6, CZ, 8);
  const oranges: THREE.Vector3[] = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, el = (r() - 0.35) * 1.4, d = 0.3 + r() * 0.26;
    const p = new THREE.Vector3(CX + Math.cos(a) * Math.cos(el) * d, 2.02 + Math.sin(el) * d * 0.9, CZ + Math.sin(a) * Math.cos(el) * d);
    k.sph(i % 2 ? M.leafA : M.leafB, 0.19 + r() * 0.08, p.x, p.y, p.z, 1, 0.85, 1, 2);
    if (i < 9) oranges.push(new THREE.Vector3(CX + Math.cos(a + 0.7) * 0.5, 1.72 + r() * 0.6, CZ + Math.sin(a + 0.7) * 0.5));
  }

  // fiddle-leaf fig by the back wall
  const FX = 2.75, FZ = -4.2;
  k.cyl(M.cream, 0.34, 0.26, 0.5, FX, 0, FZ, 28);
  k.cyl(M.bark, 0.03, 0.045, 1.9, FX, 0.5, FZ, 8);
  for (let i = 0; i < 13; i++) {
    const a = i * 2.4, y = 1.25 + i * 0.105, d = 0.3 - i * 0.008;
    k.add(i % 3 ? M.leafA : M.leafB, new THREE.IcosahedronGeometry(0.24, 1), FX + Math.cos(a) * d, y, FZ + Math.sin(a) * d, 0.5, -a, 0.3, 0.9, 0.12, 1.35);
  }
  // trailing plant on the top shelf
  k.cyl(M.cream, 0.11, 0.09, 0.16, W - 0.17, 3.05, -1.25, 16);
  for (let i = 0; i < 9; i++) k.sph(M.leafB, 0.07, W - 0.2 - r() * 0.1, 3.05 - i * 0.11, -1.2 + Math.sin(i) * 0.08, 1, 1, 1, 1);

  root.add(k.build());

  // oranges (kept separate so they can bob when a quote is saved)
  const orangeGeo = new THREE.IcosahedronGeometry(0.075, 2);
  const orangeMeshes = oranges.map((p) => {
    const m = new THREE.Mesh(orangeGeo, M.orange);
    m.position.copy(p);
    m.castShadow = true;
    root.add(m);
    return { m, y: p.y };
  });

  // the rug: concentric bands, painted once
  const rc = document.createElement("canvas");
  rc.width = rc.height = 512;
  const g = rc.getContext("2d")!;
  const bands: [number, string][] = [[1, "#F2E6D0"], [0.94, "#2F8088"], [0.86, "#F2E6D0"], [0.82, "#E07A5F"], [0.6, "#F2E6D0"], [0.56, "#DDA63A"], [0.36, "#F2E6D0"], [0.32, "#5B3F6B"], [0.14, "#E07A5F"]];
  for (const [f, c] of bands) { g.fillStyle = c; g.beginPath(); g.arc(256, 256, 250 * f, 0, 6.3); g.fill(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 1); }
  const rugTex = new THREE.CanvasTexture(rc);
  rugTex.colorSpace = THREE.SRGBColorSpace;
  rugTex.anisotropy = 4;
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.35, 56), std({ map: rugTex, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.012, -1.9);
  rug.receiveShadow = true;
  root.add(rug);

  // pendant lamps, upper left
  const pendants = [[-4.3, 4.9, -2.6], [-3.7, 4.3, -3.5], [-4.7, 4.0, -1.6]].map(([x, y, z], i) => {
    const grp = new THREE.Group();
    grp.position.set(x, RIDGE - 1.2, z);
    const drop = RIDGE - 1.2 - y;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), M.brass);
    cord.position.y = -drop / 2;
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 14, 0, 6.3, 0, 1.75), [M.mustard, M.cream, M.coralSoft][i]);
    shade.position.y = -drop - 0.1;
    shade.castShadow = true;
    grp.add(cord, shade);
    root.add(grp);
    return grp;
  });

  // the mobile, upper right
  const mobile = new THREE.Group();
  mobile.position.set(3.25, RIDGE - 1.6, -2.3);
  const wire = (len: number) => new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 5), M.brass);
  const shape = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  const mk = (mat: THREE.Material) => (mat as THREE.MeshStandardMaterial).clone();
  const tiers: THREE.Group[] = [];
  const top = wire(2.1); top.position.y = -1.05; mobile.add(top);
  const specs: [number, number, THREE.BufferGeometry, THREE.Material, THREE.BufferGeometry, THREE.Material][] = [
    [-2.1, 1.3, new THREE.CircleGeometry(0.2, 32), M.coralSoft, new THREE.RingGeometry(0.1, 0.19, 32), M.cream],
    [-2.65, 0.95, new THREE.CircleGeometry(0.17, 32, 0, Math.PI), M.mustard, new THREE.IcosahedronGeometry(0.09, 2), M.teal],
    [-3.15, 0.62, new THREE.CircleGeometry(0.13, 3), M.plum, new THREE.CircleGeometry(0.11, 32), M.coralSoft],
  ];
  for (const [y, span, gA, mA, gB, mB] of specs) {
    const tier = new THREE.Group();
    tier.position.y = y;
    const bar = wire(span); bar.rotation.z = Math.PI / 2;
    const dA = 0.34, dB = 0.5;
    const wa = wire(dA), wb = wire(dB);
    wa.position.set(-span / 2, -dA / 2, 0); wb.position.set(span / 2, -dB / 2, 0);
    const a = shape(gA, mk(mA)), b = shape(gB, mk(mB));
    (a.material as THREE.MeshStandardMaterial).side = (b.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    a.position.set(-span / 2, -dA - 0.2, 0); b.position.set(span / 2, -dB - 0.16, 0);
    tier.add(bar, wa, wb, a, b);
    mobile.add(tier);
    tiers.push(tier);
  }
  root.add(mobile);

  // steam from the teapot
  const steam = [0, 1, 2].map((i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: "#FFFFFF", opacity: 0, transparent: true, depthWrite: false }));
    root.add(s);
    return { s, ph: i / 3 };
  });

  // sun on the wall, dust in the light
  const warm = glow(7, "#FFE1A8", 0.16);
  warm.position.set(-1.2, 3.6, BACK + 0.4);
  root.add(warm);
  const dust = makeMotes({ count: compact ? 70 : 150, box: [9, 6, 8], center: [-1, 3.2, -1.5], color: "#FFF1CC", size: 0.035, drift: [0.03, -0.015, 0.02], opacity: 0.9 });
  root.add(dust);

  const sun = sunLight("#FFE3B4", 3.5, [-9.5, 12.5, 6.5], 13);
  sun.target.position.set(0.6, 1.6, -2.4);
  root.add(sun, sun.target, new THREE.HemisphereLight("#FFF5E2", "#C98A62", 1.45));
  const fill = new THREE.PointLight("#FFD9A8", 6, 9, 1.6);
  fill.position.set(SX + 1.05, 1.5, SZ + 0.3);
  root.add(fill);

  const sky = makeSky({
    top: "#BFD9EA", mid: "#E3EDF0", horizon: cfg.sky[2], ground: "#B9C7A0",
    sunDir: new THREE.Vector3(-0.6, 0.72, 0.35), sunColor: "#FFF4DC", sunSharp: 500, halo: 0.3,
  });

  let spin = 0.22, bob = 0;
  return {
    root, sky, sun,
    fog: new THREE.Fog("#F1E3CB", 45, 140),
    exposure: 1.0,
    envIntensity: 0.7,
    liveShadows: true,
    camera: { pos: [0, 1.62, 6.6], target: [0, 3.45, -5], fov: 44, tallFov: 62, sway: 0.03 },
    tick(t, dt, pointer) {
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      spin = damp(spin, 0.22, 0.5, dt);
      bob = damp(bob, 0, 1.2, dt);
      mobile.rotation.y += dt * spin * 0.5;
      tiers.forEach((tr, i) => { tr.rotation.y += dt * spin * (i % 2 ? -1.6 : 1.2); });
      mobile.rotation.z = Math.sin(t * 0.6) * 0.012 + pointer.x * 0.01;
      pendants.forEach((p, i) => { p.rotation.z = Math.sin(t * 0.55 + i * 1.9) * 0.012; p.rotation.x = Math.cos(t * 0.45 + i) * 0.008; });
      orangeMeshes.forEach((o, i) => { o.m.position.y = o.y + Math.sin(t * 6 + i * 1.3) * 0.03 * bob; });
      for (const st of steam) {
        const u = (t * 0.16 + st.ph) % 1;
        st.s.position.set(TX + 0.2 + Math.sin(u * 5 + st.ph * 9) * 0.05, 0.78 + u * 0.7, TZ);
        st.s.scale.setScalar(0.12 + u * 0.34);
        st.s.material.opacity = Math.sin(u * Math.PI) * 0.2;
      }
      warm.material.opacity = 0.14 + Math.sin(t * 0.2) * 0.03;
    },
    pulse() {
      spin = 3.2;
      bob = 1;
    },
  };
}
