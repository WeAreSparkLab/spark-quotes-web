// worlds/engine/lake.ts — The Quiet Lake
//
// Dusk on still water. You stand on a jetty that leads the eye to a lantern
// and, past it, to ridges fading into mist. The water reflects the sky it
// sits under; nothing here moves quickly.
// Saving a quote sets a small lantern afloat.

import * as THREE from "three";
import { WORLDS } from "../config";
import { Kit, World, flat, glow, makeMotes, makeSky, planksTex, seeded, softTex, std, sunLight, damp } from "./kit";

function ridge(z: number, height: number, color: string, seed: number, rough: number, width = 420) {
  const r = seeded(seed);
  const ph = [r() * 9, r() * 9, r() * 9, r() * 9];
  const s = new THREE.Shape();
  s.moveTo(-width, -0.3);
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const x = -width + (i / steps) * width * 2, u = x / width;
    const env = 0.35 + 0.65 * Math.pow(Math.abs(u), 0.9); // lower in the middle, so the horizon opens
    const y =
      height * env * (0.55 + 0.25 * Math.sin(u * 5.1 + ph[0]) + 0.14 * Math.sin(u * 12.3 + ph[1]) + 0.06 * Math.sin(u * 31 + ph[2])) +
      rough * (Math.sin(x * 1.9 + ph[3]) * 0.5 + (r() - 0.5));
    s.lineTo(x, Math.max(0.2, y));
  }
  s.lineTo(width, -0.3);
  s.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  m.position.z = z;
  return m;
}

export function buildLake(compact: boolean): World {
  const cfg = WORLDS.lake;
  const r = seeded(23);
  const root = new THREE.Group();
  const sunDir = new THREE.Vector3(0.24, 0.028, -1).normalize();
  const FOG = "#A98392";

  const sky = makeSky({
    top: cfg.sky[0], mid: cfg.sky[1], horizon: cfg.sky[2], ground: "#2A2F52",
    sunDir, sunColor: "#FFC7A0", sunSharp: 2600, halo: 1.1, stars: 0.75,
  });

  // everything above the waterline that should also appear in it
  const above = new THREE.Group();
  above.add(ridge(-70, 3.2, "#23284A", 5, 0.9));   // far-shore tree line
  above.add(ridge(-105, 15, "#343560", 6, 0.2));
  above.add(ridge(-150, 24, "#4B4572", 7, 0.1));
  above.add(ridge(-210, 34, "#665780", 8, 0));

  // the jetty
  const k = new Kit();
  const M = {
    deck: std({ map: planksTex(1.6, [128, 108, 96], 7, 4), roughness: 0.8 }),
    post: flat("#4A3F44", 0.9),
    iron: flat("#2A2630", 0.5, 0.7),
    lamp: std({ color: "#FFF1D6", emissive: "#FFC98A", emissiveIntensity: 3.2, roughness: 0.6 }),
  };
  M.lamp.userData.noShadow = true;
  const END = 0.5;
  for (let z = 15.5; z > END; z -= 0.34) k.box(M.deck, 1.9, 0.07, 0.3, 0, 0.5, z, (r() - 0.5) * 0.02);
  for (const s of [-1, 1]) {
    k.box(M.post, 0.12, 0.16, 15.2, s * 0.82, 0.34, 8);
    for (let z = 11.6; z > END; z -= 2.8) k.cyl(M.post, 0.065, 0.075, 2.3 + (z < 4 ? 0.12 : 0), s * 0.98, -1.5, z, 12);
  }
  k.cyl(M.post, 0.075, 0.085, 3.1, -0.98, -1.5, END + 0.25, 12);
  // lantern on a slender iron crook
  k.cyl(M.iron, 0.03, 0.035, 1.75, -0.98, 1.6, END + 0.25, 8);
  k.beam(M.iron, new THREE.Vector3(-0.98, 3.33, END + 0.25), new THREE.Vector3(-0.56, 3.33, END + 0.25), 0.03, 0.03);
  k.box(M.iron, 0.2, 0.03, 0.2, -0.56, 3.12, END + 0.25);
  k.box(M.lamp, 0.15, 0.24, 0.15, -0.56, 2.86, END + 0.25);
  k.box(M.iron, 0.2, 0.03, 0.2, -0.56, 2.83, END + 0.25);
  above.add(k.build());
  root.add(above);

  // reflections: the same shapes, turned over, seen through the water
  const below = above.clone(true);
  below.scale.y = -1;
  below.traverse((o: any) => {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
  });
  root.add(below);

  const lampPos = new THREE.Vector3(-0.56, 2.95, END + 0.25);
  const lampGlow = glow(2.6, "#FFC98A", 0.85);
  lampGlow.position.copy(lampPos);
  const lampGlow2 = glow(1.8, "#FFC98A", 0.35);
  lampGlow2.position.set(lampPos.x, -lampPos.y + 0.6, lampPos.z);
  lampGlow2.scale.set(1.3, 4.2, 1);
  const lampLight = new THREE.PointLight("#FFC08A", 9, 12, 1.8);
  lampLight.position.copy(lampPos);
  root.add(lampGlow, lampGlow2, lampLight);

  // water
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTop: { value: new THREE.Color(cfg.sky[0]) },
      uMid: { value: new THREE.Color(cfg.sky[1]) },
      uHor: { value: new THREE.Color(cfg.sky[2]) },
      uDeep: { value: new THREE.Color("#141A33") },
      uFogCol: { value: new THREE.Color(FOG) },
      uSunDir: { value: sunDir },
      uSunCol: { value: new THREE.Color("#FFC7A0") },
      uTime: { value: 0 },
      uRipC: { value: new THREE.Vector2(0, -4) },
      uRipT: { value: 99 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHor, uDeep, uFogCol, uSunDir, uSunCol;
      uniform float uTime, uRipT; uniform vec2 uRipC;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      vec3 skyCol(vec3 d) {
        float h = max(d.y, 0.);
        vec3 c = mix(uHor, uMid, smoothstep(0., .26, h));
        c = mix(c, uTop, smoothstep(.16, .78, h));
        float s = max(dot(d, uSunDir), 0.);
        c = mix(c, uSunCol, clamp(pow(s, 7.) * .55, 0., .8));
        return c + uSunCol * pow(s, 120.) * .9;
      }
      void main() {
        vec3 toP = vW - cameraPosition;
        float dist = length(toP);
        vec3 V = toP / dist;
        vec2 p = vW.xz;
        float a = uTime * .32;
        vec2 g = vec2(sin(p.x * .9 + a) + sin(p.y * 1.7 - a * 1.3 + p.x * .4), cos(p.y * 1.1 + a * .8) + sin(p.x * 2.3 + a * 1.6)) * .010;
        g += (vec2(noise(p * 2.6 + a), noise(p * 2.6 - a + 7.)) - .5) * .05;
        float rd = length(p - uRipC), front = uRipT * 1.9;
        float ring = sin((rd - front) * 7.) * exp(-abs(rd - front) * 1.1) * exp(-uRipT * .55);
        g += normalize(p - uRipC + 1e-4) * ring * .16;
        g /= (1. + dist * .035);
        vec3 N = normalize(vec3(g.x, 1., g.y));
        vec3 R = reflect(V, N); R.y = abs(R.y);
        float fres = pow(1. - max(dot(-V, N), 0.), 3.);
        vec3 c = mix(uDeep, skyCol(R), .5 + .5 * fres);
        c = mix(c, uFogCol, smoothstep(60., 300., dist) * .85);
        gl_FragColor = vec4(c, mix(.62, .97, fres));
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.z = -200;
  water.renderOrder = 2;
  root.add(water);

  // reeds in the shallows
  const reedGeo = new THREE.ConeGeometry(0.022, 1, 4);
  reedGeo.translate(0, 0.5, 0);
  const reedMat = new THREE.MeshBasicMaterial({ color: "#1B1F3A", toneMapped: false });
  const clumps: THREE.InstancedMesh[] = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [cx, cz, n] of [[-4.2, 9, 70], [-6.5, 4.5, 60], [4.6, 7.5, 70], [7.2, 2.5, 50], [-3.4, 12.5, 40], [3.6, 12, 40]] as number[][]) {
    const im = new THREE.InstancedMesh(reedGeo, reedMat, compact ? n / 2 : n);
    for (let i = 0; i < im.count; i++) {
      const a = r() * 6.28, d = r() * 1.6;
      m4.compose(v.set(Math.cos(a) * d, -0.1, Math.sin(a) * d * 0.7), q.setFromEuler(e.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25)), sc.set(1, 0.9 + r() * 1.6, 1));
      im.setMatrixAt(i, m4);
    }
    im.position.set(cx, 0, cz);
    clumps.push(im);
    root.add(im);
  }

  // mist lying on the far water
  const mist: THREE.Sprite[] = [];
  for (let i = 0; i < (compact ? 5 : 8); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: "#D2B6C2", opacity: 0.2, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    s.position.set((r() - 0.5) * 240, 2 + r() * 3, -55 - r() * 110);
    s.scale.set(90 + r() * 70, 9 + r() * 6, 1);
    s.renderOrder = 3;
    mist.push(s);
    root.add(s);
  }

  // lanterns set afloat when a quote is saved
  const FLOAT = 24;
  const lanterns = Array.from({ length: FLOAT }, (_, i) => {
    const up = glow(0.95, "#FFD49A", 0), down = glow(0.8, "#FFC088", 0);
    const p = new THREE.Vector3((r() - 0.5) * 15, 0.16, -1.5 - r() * 15);
    if (Math.abs(p.x) < 1.6 && p.z > 0) p.x += 2.4;
    up.position.copy(p);
    down.position.set(p.x, -0.5, p.z);
    down.scale.set(0.7, 2.4, 1);
    up.renderOrder = down.renderOrder = 4;
    root.add(up, down);
    return { up, down, p, goal: 0, a: 0, ph: i * 1.7 };
  });
  let nextLantern = 0;

  const flies = makeMotes({ count: compact ? 24 : 46, box: [20, 3.2, 14], center: [0, 1.9, 7], color: "#FFE2A6", size: 0.07, drift: [0.03, 0.01, 0.01], opacity: 0.9 });
  root.add(flies);

  const sun = sunLight("#FFB78A", 1.5, [3, 3.5, -30], 12);
  sun.target.position.set(0, 0.5, 6);
  root.add(sun, sun.target, new THREE.HemisphereLight("#7C76AA", "#1E2238", 1.15));

  let ripT = 99;
  return {
    root, sky, sun,
    fog: new THREE.Fog(FOG, 50, 330),
    exposure: 1.0,
    envIntensity: 0.3,
    camera: { pos: [0, 1.68, 14.2], target: [0, 7.6, -30], fov: 40, tallFov: 58, sway: 0.035 },
    tick(t, dt, pointer) {
      waterMat.uniforms.uTime.value = t;
      ripT += dt;
      waterMat.uniforms.uRipT.value = ripT;
      (sky.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (flies.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      const flick = 0.9 + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 5.1) * 0.03;
      lampGlow.material.opacity = 0.85 * flick;
      lampLight.intensity = 9 * flick;
      clumps.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.5 + i) * 0.035 + pointer.x * 0.02; });
      mist.forEach((s, i) => {
        s.position.x += dt * (0.5 + (i % 3) * 0.25);
        if (s.position.x > 170) s.position.x = -170;
      });
      for (const l of lanterns) {
        l.a = damp(l.a, l.goal, 1.4, dt);
        if (l.a < 0.003) continue;
        const bob = Math.sin(t * 0.7 + l.ph) * 0.03;
        l.up.position.set(l.p.x + Math.sin(t * 0.07 + l.ph) * 0.6, l.p.y + bob, l.p.z);
        l.down.position.x = l.up.position.x;
        l.up.material.opacity = l.a * (0.86 + Math.sin(t * 1.9 + l.ph) * 0.08);
        l.down.material.opacity = l.a * 0.34;
      }
    },
    pulse() {
      const l = lanterns[nextLantern % FLOAT];
      nextLantern++;
      l.goal = 1;
      waterMat.uniforms.uRipC.value.set(l.p.x, l.p.z);
      ripT = 0;
    },
  };
}
