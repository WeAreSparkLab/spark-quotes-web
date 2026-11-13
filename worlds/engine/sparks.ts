// worlds/engine/sparks.ts — the Garden of Saved Sparks
//
// A meadow at dusk where every saved quote is a flower that glows softly.
// Flowers grow on a golden-angle spiral in the order they were saved, so the
// garden fills outward over time; each is tinted by the world its quote
// belongs to. Nothing here counts, scores or wilts.
//
// Like the worlds, this module (and three.js) is loaded lazily.

import * as THREE from "three";
import { WORLDS, worldForCategory } from "../config";
import { clamp, damp, glow, makeMotes, makeSky, seeded, std } from "./kit";

export interface Spark {
  id: string;
  category: string;
}

export interface SparkGardenOptions {
  reduceMotion: boolean;
  compact: boolean;
  onPick(id: string | null): void;
  onHover?(id: string | null): void;
}

export interface SparkGarden {
  setSparks(list: Spark[]): void;
  select(id: string | null): void;
  setActive(active: boolean): void;
  dispose(): void;
}

const PETAL_COLOURS: Record<string, string> = {
  garden: "#C9A9DA",
  lake: "#F2C79A",
  summit: "#F4D58D",
  sunroom: "#F2A08A",
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Flower {
  id: string;
  group: THREE.Group;
  bloom: THREE.Group;
  halo: THREE.Sprite;
  hit: THREE.Mesh;
  core: THREE.MeshStandardMaterial;
  base: THREE.Vector3;
  phase: number;
  grow: number; // 0 → 1 as it appears
  hl: number; // highlight 0 → 1
}

export function createSparkGarden(canvas: HTMLCanvasElement, opts: SparkGardenOptions): SparkGarden {
  const { reduceMotion, compact } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor("#4A4170");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#6E5A84", 10, 48);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);

  // sky, ground, distant hills
  const sky = makeSky({
    top: "#26285A", mid: "#5C4F8A", horizon: "#E7A99A", ground: "#4A4170",
    sunDir: new THREE.Vector3(-0.3, 0.06, -1).normalize(), sunColor: "#FFC9A6", sunSharp: 2400, halo: 1.1, stars: 0.8,
  });
  scene.add(sky);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), std({ color: "#6F7D62", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const r = seeded(5);
  const hillMat = std({ color: "#4D4A72", roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r();
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), hillMat);
    h.scale.set(9 + r() * 8, 2.5 + r() * 2.5, 6 + r() * 4);
    h.position.set(Math.cos(a) * (30 + r() * 8), -1, Math.sin(a) * (30 + r() * 8));
    scene.add(h);
  }
  // a scatter of grass tufts so the ground reads as a meadow
  const tuftGeo = new THREE.ConeGeometry(0.012, 0.24, 3);
  tuftGeo.translate(0, 0.12, 0);
  const tufts = new THREE.InstancedMesh(tuftGeo, std({ color: "#8A9C74", roughness: 1 }), compact ? 2200 : 4200);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < tufts.count; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 16;
    m4.compose(v.set(Math.cos(a) * d, 0, Math.sin(a) * d), q.setFromEuler(e.set((r() - 0.5) * 0.4, r() * 6, (r() - 0.5) * 0.4)), sc.set(1, 0.5 + r() * 1.1, 1));
    tufts.setMatrixAt(i, m4);
  }
  scene.add(tufts);

  scene.add(new THREE.HemisphereLight("#B3A8E0", "#4A5650", 2.2));
  // a soft pool of light under the flowers, as if they light the grass
  const pool = glow(1, "#FFD9B0", 0.22, false);
  pool.material.depthTest = false;
  const poolPlane = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: pool.material.map, color: "#FFD3A8", transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
  poolPlane.rotation.x = -Math.PI / 2;
  poolPlane.position.y = 0.01;
  scene.add(poolPlane);
  const moon = new THREE.DirectionalLight("#FFD9C2", 1.6);
  moon.position.set(-6, 8, -10);
  scene.add(moon);

  const fireflies = makeMotes({ count: compact ? 40 : 80, box: [18, 3, 18], center: [0, 1.2, 0], color: "#FFE2A6", size: 0.06, drift: [0.03, 0.01, 0.02], opacity: 0.85 });
  scene.add(fireflies);

  // ── flowers ──────────────────────────────────────────────────────────────
  const petalGeo = new THREE.SphereGeometry(0.15, 14, 10);
  petalGeo.scale(1, 0.32, 0.55);
  petalGeo.translate(0.14, 0, 0);
  const coreGeo = new THREE.IcosahedronGeometry(0.07, 2);
  const stemMat = std({ color: "#5E7A5C", roughness: 0.9 });
  const leafGeo = new THREE.SphereGeometry(0.09, 10, 6);
  leafGeo.scale(1, 0.18, 0.45);
  leafGeo.translate(0.08, 0, 0);
  const hitGeo = new THREE.SphereGeometry(compact ? 0.36 : 0.28, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const petalMats = new Map<string, THREE.MeshStandardMaterial>();
  const petalMat = (world: string) => {
    let m = petalMats.get(world);
    if (!m) {
      const c = PETAL_COLOURS[world] ?? PETAL_COLOURS.garden;
      m = std({ color: c, roughness: 0.55, emissive: c, emissiveIntensity: 0.35, side: THREE.DoubleSide });
      petalMats.set(world, m);
    }
    return m;
  };

  const flowers = new Map<string, Flower>();
  const root = new THREE.Group();
  scene.add(root);

  function makeFlower(s: Spark, index: number): Flower {
    const rr = seeded(hash(s.id));
    const world = worldForCategory(s.category);
    const radius = 0.78 * Math.sqrt(index + 0.6);
    const angle = index * GOLDEN;
    const base = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const height = 0.7 + rr() * 0.6;
    const lean = new THREE.Vector3((rr() - 0.5) * 0.16, 0, (rr() - 0.5) * 0.16);

    const group = new THREE.Group();
    group.position.copy(base);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean.x * 0.3, height * 0.55, lean.z * 0.3),
      new THREE.Vector3(lean.x, height, lean.z)
    );
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.016, 5, false), stemMat));
    const leaf = new THREE.Mesh(leafGeo, stemMat);
    leaf.position.copy(curve.getPoint(0.35));
    leaf.rotation.set(0, rr() * 6.28, 0.5);
    group.add(leaf);

    const bloom = new THREE.Group();
    bloom.position.set(lean.x, height, lean.z);
    bloom.rotation.set(-0.35 + (rr() - 0.5) * 0.3, rr() * 6.28, 0);
    const petals = 5 + ((rr() * 3) | 0);
    for (let i = 0; i < petals; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat(world));
      p.rotation.set(0, (i / petals) * Math.PI * 2, 0.32);
      bloom.add(p);
    }
    const core = std({ color: "#FFF4D6", emissive: "#FFD78E", emissiveIntensity: 1.6, roughness: 0.5 });
    bloom.add(new THREE.Mesh(coreGeo, core));
    group.add(bloom);

    const halo = glow(1.2, PETAL_COLOURS[world] ?? "#FFE2B0", 0.45);
    halo.position.set(lean.x, height, lean.z);
    group.add(halo);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(lean.x, height, lean.z);
    hit.userData.id = s.id;
    group.add(hit);

    root.add(group);
    return { id: s.id, group, bloom, halo, hit, core, base, phase: rr() * 6.28, grow: reduceMotion ? 1 : 0, hl: 0 };
  }

  // ── camera ───────────────────────────────────────────────────────────────
  let W = 1, H = 1, extent = 1.5, selected: string | null = null, hovered: string | null = null;
  let active = true, disposed = false, raf = 0, dirty = true;
  const look = new THREE.Vector3(), lookGoal = new THREE.Vector3();
  let yaw = 0.4, yawGoal = 0.4, dist = 6, distGoal = 6;
  const drag = { on: false, x: 0, yaw: 0, moved: false };

  function frameAll() {
    // low and close, so the dusk sky fills the top of the frame
    lookGoal.set(0, 0.9 + extent * 0.12, -extent * 0.15);
    distGoal = clamp(extent * 1.9 + 2.4, 3.4, 20) * (W / H < 0.8 ? 1.45 : 1);
  }

  function resize() {
    W = canvas.clientWidth || 1;
    H = canvas.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (!selected) frameAll();
    dirty = true;
  }

  // ── picking ──────────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX: number, clientY: number): string | null {
    const b = canvas.getBoundingClientRect();
    ndc.set(((clientX - b.left) / b.width) * 2 - 1, -((clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...flowers.values()].map((f) => f.hit), false);
    return hits.length ? (hits[0].object.userData.id as string) : null;
  }
  const onDown = (ev: PointerEvent) => { drag.on = true; drag.moved = false; drag.x = ev.clientX; drag.yaw = yawGoal; canvas.setPointerCapture?.(ev.pointerId); };
  const onMove = (ev: PointerEvent) => {
    if (drag.on) {
      const dx = ev.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      if (drag.moved) { yawGoal = drag.yaw - (dx / W) * 2.2; schedule(); }
      return;
    }
    if (ev.pointerType !== "mouse") return;
    const id = pick(ev.clientX, ev.clientY);
    if (id !== hovered) { hovered = id; canvas.style.cursor = id ? "pointer" : "grab"; opts.onHover?.(id); schedule(); }
  };
  const onUp = (ev: PointerEvent) => {
    const was = drag.on && !drag.moved;
    drag.on = false;
    if (was) opts.onPick(pick(ev.clientX, ev.clientY));
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", () => { drag.on = false; });
  canvas.style.cursor = "grab";
  canvas.style.touchAction = "pan-y"; // horizontal drag turns the garden; vertical still scrolls the page

  // ── loop ─────────────────────────────────────────────────────────────────
  let last = performance.now();
  const t0 = last;
  function loop(now: number) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    const k = reduceMotion ? 1e3 : 2.4;

    if (!reduceMotion && !drag.on && !selected) yawGoal += dt * 0.035; // the slowest of turns
    yaw = damp(yaw, yawGoal, k, dt);
    dist = damp(dist, distGoal, k, dt);
    look.lerp(lookGoal, 1 - Math.exp(-k * dt));
    const el = 0.2;
    camera.position.set(look.x + Math.sin(yaw) * Math.cos(el) * dist, look.y + Math.sin(el) * dist, look.z + Math.cos(yaw) * Math.cos(el) * dist);
    camera.lookAt(look);
    sky.position.copy(camera.position);

    let moving = Math.abs(yaw - yawGoal) > 1e-4 || Math.abs(dist - distGoal) > 1e-3 || look.distanceTo(lookGoal) > 1e-3;
    for (const f of flowers.values()) {
      if (f.grow < 1) { f.grow = Math.min(1, f.grow + dt * 0.9); moving = true; }
      const target = f.id === selected ? 1 : f.id === hovered ? 0.6 : 0;
      const nh = damp(f.hl, target, reduceMotion ? 1e3 : 6, dt);
      if (Math.abs(nh - f.hl) > 1e-3) moving = true;
      f.hl = nh;
      const g = f.grow * f.grow * (3 - 2 * f.grow);
      f.group.scale.setScalar(Math.max(0.001, g));
      const sway = reduceMotion ? 0 : Math.sin(t * 0.8 + f.phase) * 0.03;
      f.group.rotation.z = sway;
      f.bloom.scale.setScalar(1 + f.hl * 0.55);
      f.core.emissiveIntensity = 1.6 + f.hl * 2.2 + (reduceMotion ? 0 : Math.sin(t * 1.3 + f.phase) * 0.25);
      f.halo.material.opacity = 0.4 + f.hl * 0.6;
      f.halo.scale.setScalar(1.2 + f.hl * 1.6);
    }
    if (!reduceMotion) {
      (fireflies.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    }
    renderer.render(scene, camera);
    dirty = false;
    if (!reduceMotion || moving) schedule();
  }
  function schedule() {
    if (!raf && active && !disposed && !document.hidden) raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(() => { resize(); schedule(); });
  ro.observe(canvas);
  const onVis = () => { last = performance.now(); schedule(); };
  document.addEventListener("visibilitychange", onVis);
  resize();
  look.copy(lookGoal);
  dist = distGoal;
  schedule();

  return {
    setSparks(list) {
      const keep = new Set(list.map((s) => s.id));
      for (const [id, f] of flowers) {
        if (!keep.has(id)) { root.remove(f.group); flowers.delete(id); }
      }
      // Positions follow save order, so re-place everything on each update
      // (removing one shouldn't leave a gap in the spiral).
      list.forEach((s, i) => {
        const existing = flowers.get(s.id);
        if (existing) {
          root.remove(existing.group);
          flowers.delete(s.id);
          const f = makeFlower(s, i);
          f.grow = 1;
          f.hl = existing.hl;
          flowers.set(s.id, f);
        } else {
          flowers.set(s.id, makeFlower(s, i));
        }
      });
      extent = 0.78 * Math.sqrt(Math.max(1, list.length) + 0.6);
      poolPlane.scale.setScalar(extent + 1.6);
      if (!selected) frameAll();
      dirty = true;
      schedule();
    },
    select(id) {
      selected = id && flowers.has(id) ? id : null;
      const f = selected ? flowers.get(selected)! : null;
      if (f) {
        // Stay in the overview: turn the view a little towards the chosen
        // flower and come a touch closer. It brightens where it stands, so
        // the garden stays readable and nothing crowds in front of it.
        const p = new THREE.Vector3();
        f.bloom.getWorldPosition(p);
        const all = clamp(extent * 1.9 + 2.4, 3.4, 20) * (W / H < 0.8 ? 1.45 : 1);
        lookGoal.set(p.x * 0.6, 0.9 + extent * 0.08, p.z * 0.6 - extent * 0.1);
        distGoal = Math.max(3.2, all * 0.8);
      } else {
        frameAll();
      }
      schedule();
    },
    setActive(v) {
      active = v;
      last = performance.now();
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m: any) => m.dispose?.());
      });
      renderer.dispose();
    },
  };
}

// Used by the screen to describe a flower to screen readers.
export const flowerWorldName = (category: string) => WORLDS[worldForCategory(category)].name;
