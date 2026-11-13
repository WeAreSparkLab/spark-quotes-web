// worlds/engine/kit.ts
//
// Shared building blocks for the four worlds. Same approach as SparkLab
// Worlds: everything is procedural (no model or image files to download),
// static pieces are merged into one mesh per material, and textures are
// painted to small canvases at load.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

export const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ── painted textures ───────────────────────────────────────────────────────

type RGB = [number, number, number];
const rgb = (c: RGB, d = 0) =>
  `rgb(${c.map((v) => Math.max(0, Math.min(255, v + d)) | 0).join(",")})`;

export function tex(
  world: number,
  draw: (g: CanvasRenderingContext2D, s: number) => void,
  size = 256
) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / world, 1 / world);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function speckle(g: CanvasRenderingContext2D, s: number, n: number, r: () => number, a = 0.07) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a * r()})` : `rgba(0,0,0,${a * r()})`;
    const d = 1 + r() * 2.2;
    g.fillRect(r() * s, r() * s, d, d);
  }
}
function blotch(g: CanvasRenderingContext2D, s: number, n: number, r: () => number, a = 0.05) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = s * (0.08 + r() * 0.2), dark = r() < 0.5;
    for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
}

export function noiseTex(world: number, base: RGB, { n = 5000, a = 0.06, blot = 12, seed = 5 } = {}) {
  return tex(world, (g, s) => {
    const r = seeded(seed);
    g.fillStyle = rgb(base);
    g.fillRect(0, 0, s, s);
    blotch(g, s, blot, r, 0.04);
    speckle(g, s, n, r, a);
  });
}

/** Courses of blocks in a running bond: pavers, ashlar, tiles. */
export function coursedTex(
  world: number,
  o: { cols: number; rows: number; base: RGB; alt?: RGB; vary: number; joint: string; jointW: number; seed?: number; bond?: boolean }
) {
  return tex(world, (g, s) => {
    const r = seeded(o.seed ?? 3), bw = s / o.cols, bh = s / o.rows;
    g.fillStyle = o.joint;
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < o.rows; y++)
      for (let x = -1; x <= o.cols; x++) {
        const ox = o.bond === false ? 0 : ((y % 2) * bw) / 2;
        const d = (r() - 0.5) * o.vary * 2;
        const base = o.alt && (x + y) % 2 === 0 ? o.alt : o.base;
        g.fillStyle = rgb(base, d);
        g.fillRect(x * bw + ox + o.jointW, y * bh + o.jointW, bw - 2 * o.jointW, bh - 2 * o.jointW);
      }
    speckle(g, s, 2600, r, 0.08);
    blotch(g, s, 8, r, 0.035);
  });
}

export function planksTex(world: number, base: RGB, boards = 6, seed = 9) {
  return tex(world, (g, s) => {
    const r = seeded(seed), bw = s / boards;
    for (let b = 0; b < boards; b++) {
      g.fillStyle = rgb(base, (r() - 0.5) * 24);
      g.fillRect(b * bw, 0, bw, s);
      for (let i = 0; i < 18; i++) {
        const x = b * bw + r() * bw, wob = (r() - 0.5) * 4;
        g.strokeStyle = r() < 0.5 ? `rgba(50,30,18,${0.05 + r() * 0.12})` : `rgba(255,235,205,${0.04 + r() * 0.08})`;
        g.lineWidth = 0.5 + r() * 1.2;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + wob, s * 0.33, x - wob, s * 0.66, x, s);
        g.stroke();
      }
      g.fillStyle = "rgba(30,20,15,.5)";
      g.fillRect(b * bw, 0, 1.5, s);
    }
  });
}

/** Soft round falloff, used for glows, mist and lanterns. */
let _soft: THREE.CanvasTexture | null = null;
export function softTex() {
  if (_soft) return _soft;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,.55)");
  gr.addColorStop(0.7, "rgba(255,255,255,.12)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  _soft = new THREE.CanvasTexture(c);
  return _soft;
}

export function glow(size: number, color: string, opacity = 1, additive = true) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTex(),
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: false,
      fog: !additive,
    })
  );
  m.scale.setScalar(size);
  return m;
}

export const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
export const flat = (color: string, roughness = 0.85, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  std({ color, roughness, metalness, ...extra });

// ── geometry kit ───────────────────────────────────────────────────────────

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function triplanar(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
}

export class Kit {
  parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  extras: THREE.Object3D[] = [];
  stack = [new THREE.Matrix4()];
  get top() {
    return this.stack[this.stack.length - 1];
  }
  push(x = 0, y = 0, z = 0, ry = 0, s = 1) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
      new THREE.Vector3(s, s, s)
    );
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() {
    this.stack.pop();
    return this;
  }
  addM(mat: THREE.Material, geo: THREE.BufferGeometry, local: THREE.Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.top, local));
    for (const k of Object.keys(g.attributes))
      if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    if (!g.attributes.uv)
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    triplanar(g);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    return this;
  }
  add(mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.addM(mat, geo, m);
  }
  /** Box by footprint centre (x, z) and BOTTOM y. */
  box(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, rx, ry, rz);
  }
  /** Cylinder standing on y (its bottom). */
  cyl(mat: THREE.Material, rTop: number, rBot: number, h: number, x = 0, y = 0, z = 0, seg = 20, rx = 0, rz = 0) {
    return this.add(mat, new THREE.CylinderGeometry(rTop, rBot, h, seg), x, rx || rz ? y : y + h / 2, z, rx, 0, rz);
  }
  sph(mat: THREE.Material, r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 2) {
    return this.add(mat, new THREE.IcosahedronGeometry(r, detail), x, y, z, 0, 0, 0, sx, sy, sz);
  }
  /** A beam from a to b. */
  beam(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, w: number, h: number) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize()),
      new THREE.Vector3(1, 1, 1)
    );
    return this.addM(mat, new THREE.BoxGeometry(len, h, w), m);
  }
  extra<T extends THREE.Object3D>(obj: T): T {
    obj.applyMatrix4(this.top);
    this.extras.push(obj);
    return obj;
  }
  build() {
    const group = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = !mat.userData.noReceive;
      group.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this.extras.forEach((o) => group.add(o));
    return group;
  }
}

/** A wall panel with an arched opening, standing on y = 0, centred on x. */
export function archGeo(w: number, h: number, openW: number, openH: number, depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  const r = openW / 2, spring = openH - r;
  const hole = new THREE.Path();
  hole.moveTo(-r, 0);
  hole.lineTo(-r, spring);
  hole.absarc(0, spring, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.closePath();
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ── sky ────────────────────────────────────────────────────────────────────

export interface SkyOpts {
  top: string;
  mid: string;
  horizon: string;
  ground: string;
  sunDir: THREE.Vector3;
  sunColor: string;
  sunSharp?: number; // higher = smaller disc
  halo?: number;
  stars?: number;
}

export function makeSky(o: SkyOpts) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      uTop: { value: new THREE.Color(o.top) },
      uMid: { value: new THREE.Color(o.mid) },
      uHor: { value: new THREE.Color(o.horizon) },
      uGround: { value: new THREE.Color(o.ground) },
      uSunDir: { value: o.sunDir.clone().normalize() },
      uSunCol: { value: new THREE.Color(o.sunColor) },
      uSharp: { value: o.sunSharp ?? 900 },
      uHalo: { value: o.halo ?? 0.25 },
      uStars: { value: o.stars ?? 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHor, uGround, uSunDir, uSunCol;
      uniform float uSharp, uHalo, uStars, uTime;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0., .26, h));
        c = mix(c, uTop, smoothstep(.16, .78, h));
        c = mix(c, uGround, smoothstep(0., -.1, h));
        float s = max(dot(d, uSunDir), 0.);
        // the wide glow is a blend towards the sun's colour, not an addition:
        // adding warm light to a cool sky turns it green
        c = mix(c, uSunCol, clamp(pow(s, 7.) * uHalo * .5, 0., .8));
        c += uSunCol * (pow(s, uSharp) * 1.2 + pow(s, 60.) * uHalo * .3);
        if (uStars > 0.) {
          vec3 p = d * 170.;
          vec3 id = floor(p);
          float r = hash(id);
          float tw = .65 + .35 * sin(uTime * (1. + r * 2.) + r * 40.);
          float star = step(.9972, r) * smoothstep(.5, .05, length(fract(p) - .5)) * tw;
          c += vec3(1., .96, .88) * star * uStars * smoothstep(.12, .6, h);
        }
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 20), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

// ── drifting motes: pollen, dust in sunbeams, fireflies, high-altitude ice ──

export interface MoteOpts {
  count: number;
  box: [number, number, number];
  center: [number, number, number];
  color: string;
  size: number;
  drift?: [number, number, number];
  opacity?: number;
  additive?: boolean;
  seed?: number;
}

export function makeMotes(o: MoteOpts) {
  const r = seeded(o.seed ?? 7);
  const pos = new Float32Array(o.count * 3), sd = new Float32Array(o.count * 3);
  for (let i = 0; i < o.count; i++) {
    pos[i * 3] = (r() - 0.5) * o.box[0];
    pos[i * 3 + 1] = (r() - 0.5) * o.box[1];
    pos[i * 3 + 2] = (r() - 0.5) * o.box[2];
    sd[i * 3] = r(); sd[i * 3 + 1] = r(); sd[i * 3 + 2] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uBox: { value: new THREE.Vector3(...o.box) },
      uCenter: { value: new THREE.Vector3(...o.center) },
      uDrift: { value: new THREE.Vector3(...(o.drift ?? [0.05, 0.02, 0])) },
      uColor: { value: new THREE.Color(o.color) },
      uSize: { value: o.size },
      uPx: { value: 600 },
      uOpacity: { value: o.opacity ?? 0.8 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPx;
      uniform vec3 uBox, uCenter, uDrift;
      varying float vA;
      void main() {
        vec3 p = position + uDrift * uTime * (.4 + aSeed.x);
        p += vec3(sin(uTime * .31 + aSeed.y * 6.28), sin(uTime * .23 + aSeed.z * 6.28), cos(uTime * .27 + aSeed.x * 6.28)) * .35;
        p = mod(p + uBox * .5, uBox) - uBox * .5;
        vec3 e = abs(p) / (uBox * .5);
        vA = (1. - smoothstep(.75, 1., max(e.x, max(e.y, e.z)))) * (.45 + .55 * sin(uTime * (.6 + aSeed.y) + aSeed.z * 20.));
        vec4 mv = modelViewMatrix * vec4(p + uCenter, 1.);
        gl_PointSize = uSize * uPx * (.45 + aSeed.x) / max(.5, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .0, d);
        gl_FragColor = vec4(uColor, a * a * vA * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

// ── what every world hands back to the engine ──────────────────────────────

export interface World {
  root: THREE.Group;
  sky: THREE.Mesh;
  fog: THREE.Fog;
  sun: THREE.DirectionalLight;
  exposure: number;
  envIntensity: number;
  /** Camera home. `wide` is used on landscape screens, `tall` on phones. */
  camera: {
    pos: [number, number, number];
    target: [number, number, number];
    fov: number;
    tallFov: number;
    /** How far the pointer may swing the view (radians-ish, small). */
    sway?: number;
  };
  /** Things that animate; called every frame unless motion is reduced. */
  tick(t: number, dt: number, pointer: { x: number; y: number }): void;
  /** A quote was saved here: let the world answer. */
  pulse(): void;
  /** True if moving objects cast shadows worth refreshing. */
  liveShadows?: boolean;
}

export function sunLight(color: string, intensity: number, pos: [number, number, number], extent = 22) {
  const sun = new THREE.DirectionalLight(color, intensity);
  sun.position.set(...pos);
  sun.castShadow = true;
  const c = sun.shadow.camera;
  c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
  c.near = 1; c.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 5;
  return sun;
}
