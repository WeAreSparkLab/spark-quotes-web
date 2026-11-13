// worlds/engine/index.ts
//
// One canvas, four worlds. This whole module (and three.js with it) is loaded
// lazily, after the quote is already on screen — nothing here is on the
// critical path.
//
// Looks after: building a world the first time it is visited, the camera
// (a slow arrival, a little drift, a little parallax), a light performance
// governor, and stopping work whenever nobody is looking.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { WorldId } from "../config";
import { World, clamp, damp } from "./kit";
import { buildGarden } from "./garden";
import { buildLake } from "./lake";
import { buildSummit } from "./summit";
import { buildSunroom } from "./sunroom";

const BUILDERS: Record<WorldId, (compact: boolean) => World> = {
  garden: buildGarden,
  lake: buildLake,
  summit: buildSummit,
  sunroom: buildSunroom,
};

export interface EngineOptions {
  reduceMotion: boolean;
  compact: boolean;
}

export interface Engine {
  setWorld(id: WorldId): void;
  /** A quote was saved: let the current world answer. */
  pulse(): void;
  /** Pointer position, -1…1 on each axis. */
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}

export function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions): Engine {
  const { reduceMotion, compact } = opts;

  // Throws if WebGL is unavailable; the caller falls back to the 2D backdrop.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  // Neutral keeps painted colours true (so fog meets sky cleanly) while still
  // rolling off the brightest highlights.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 1400);
  const built = new Map<WorldId, World>();
  let world: World | null = null;

  let W = 1, H = 1;
  let active = true, disposed = false, dirty = true, raf = 0;
  let intro = 0;
  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  const target = new THREE.Vector3();

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    dirty = true;
  }

  function frameCamera(t: number, dt: number) {
    if (!world) return;
    const c = world.camera;
    const a = W / H;
    // blend from the phone framing to the desktop framing as the screen widens
    const k = clamp((a - 0.62) / 0.7, 0, 1);
    camera.fov = c.tallFov + (c.fov - c.tallFov) * k;

    intro = Math.max(0, intro - dt / 3.2);
    const e = intro * intro * (3 - 2 * intro); // arrive from a little higher and further back
    eased.x = damp(eased.x, pointer.x, 2.2, dt);
    eased.y = damp(eased.y, pointer.y, 2.2, dt);
    const sway = c.sway ?? 0.04;
    const driftX = reduceMotion ? 0 : Math.sin(t * 0.11) * 0.22;
    const driftY = reduceMotion ? 0 : Math.sin(t * 0.083 + 1.3) * 0.06;

    camera.position.set(
      c.pos[0] + driftX + eased.x * sway * 9,
      c.pos[1] + driftY - eased.y * sway * 3 + e * 1.1,
      c.pos[2] + e * 4.5
    );
    target.set(c.target[0] + eased.x * sway * 4, c.target[1] - eased.y * sway * 2 - e * 0.8, c.target[2]);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    world.sky.position.copy(camera.position);
  }

  // ── render loop with a light governor ────────────────────────────────────
  let last = performance.now();
  const t0 = last;
  let frames = 0, slow = 0, shadowTick = 0;

  function loop(now: number) {
    raf = 0;
    if (disposed || !world) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;

    if (!reduceMotion) world.tick(t, dt, eased);
    frameCamera(t, dt);

    if (dirty || (world.liveShadows && !reduceMotion && ++shadowTick % (compact ? 6 : 3) === 0)) {
      renderer.shadowMap.needsUpdate = true;
    }
    renderer.render(scene, camera);
    dirty = false;

    // if the first couple of seconds are slow, drop the resolution once
    if (frames < 150 && ++frames > 40) {
      if (dt > 0.034) slow++;
      if (frames === 150 && slow > 45 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(1);
        renderer.setSize(W, H, false);
      }
    }
    if (!reduceMotion || intro > 0) schedule();
  }

  function schedule() {
    if (!raf && active && !disposed && !document.hidden) raf = requestAnimationFrame(loop);
  }

  /** With motion reduced we draw single frames, only when something changed. */
  function still() {
    if (!world) return;
    world.tick(0, 5, eased); // settle every eased value at its goal
    dirty = true;
    schedule();
  }

  const ro = new ResizeObserver(() => { resize(); schedule(); });
  ro.observe(canvas);
  const onVis = () => { last = performance.now(); schedule(); };
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    setWorld(id) {
      let next = built.get(id);
      if (!next) {
        next = BUILDERS[id](compact);
        next.sun.shadow.mapSize.setScalar(compact ? 1024 : 2048);
        built.set(id, next);
      }
      if (world === next) return;
      if (world) scene.remove(world.root, world.sky);
      world = next;
      scene.add(world.root, world.sky);
      scene.fog = world.fog;
      scene.environmentIntensity = world.envIntensity;
      renderer.toneMappingExposure = world.exposure;
      renderer.setClearColor(world.fog.color);
      intro = reduceMotion ? 0 : 1;
      frames = 0; slow = 0;
      last = performance.now();
      if (reduceMotion) still();
      dirty = true;
      schedule();
    },
    pulse() {
      world?.pulse();
      if (reduceMotion) still();
    },
    setPointer(x, y) {
      if (reduceMotion) return;
      pointer.x = clamp(x, -1, 1);
      pointer.y = clamp(y, -1, 1);
    },
    setActive(v) {
      if (v === active) return;
      active = v;
      last = performance.now();
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      for (const w of built.values()) {
        w.root.traverse((o: any) => {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); });
        });
        (w.sky.material as THREE.Material).dispose();
        w.sky.geometry.dispose();
      }
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}

// The saved-sparks garden shares three.js with the worlds, so it is loaded through
// this same lazy module: two separate lazy modules sharing three.js would make the
// bundler hoist three.js into the main bundle.
export { createSparkGarden } from "./sparks";
export type { SparkGarden, Spark } from "./sparks";
