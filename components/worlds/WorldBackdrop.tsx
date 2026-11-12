// components/worlds/WorldBackdrop.tsx
//
// The painted, 2D version of each world.
//
// This is what is on screen first (before any 3D has loaded), what shows
// between worlds while the camera travels, and what people see for the whole
// visit if they prefer the still mode, are saving data, or have no WebGL.
// It has to stand on its own — it is not a loading state.

import React, { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WORLDS, WORLD_ORDER, type WorldId } from "../../worlds/config";

const HORIZON = 512; // of an 800-tall canvas, matching where the 3D horizon sits

function svg(defs: string, body: string) {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMax slice'><defs>${defs}</defs>${body}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
}

const glowDef = (id: string, color: string, o = 1) =>
  `<radialGradient id='${id}'><stop offset='0' stop-color='${color}' stop-opacity='${o}'/><stop offset='1' stop-color='${color}' stop-opacity='0'/></radialGradient>`;

function ridgePath(base: number, height: number, seed: number, dip = 0.55) {
  let d = `M0 ${base}`;
  for (let x = 0; x <= 1200; x += 20) {
    const u = (x - 600) / 600;
    const env = 1 - dip + dip * Math.pow(Math.abs(u), 0.9);
    const y = height * env * (0.6 + 0.25 * Math.sin(u * 5.1 + seed) + 0.13 * Math.sin(u * 12.3 + seed * 2.1) + 0.05 * Math.sin(u * 31 + seed));
    d += ` L${x} ${(base - Math.max(2, y)).toFixed(1)}`;
  }
  return d + ` L1200 ${base} Z`;
}

function garden() {
  let arches = "";
  for (let i = -3; i <= 3; i++) {
    const cx = 600 + i * 62 * (1 - Math.abs(i) * 0.035), w = 60 - Math.abs(i) * 5, top = 442 + Math.abs(i) * 3;
    const ow = w * 0.6, spring = top + 28;
    arches +=
      `<path fill-rule='evenodd' fill='${i < 0 ? "#D9CFBD" : "#E9E0CE"}' d='M${cx - w / 2} ${HORIZON + 4} V${top} H${cx + w / 2} V${HORIZON + 4} Z ` +
      `M${cx - ow / 2} ${HORIZON + 4} V${spring} A${ow / 2} ${ow / 2} 0 0 1 ${cx + ow / 2} ${spring} V${HORIZON + 4} Z'/>` +
      `<rect x='${cx - w / 2 - 2}' y='${top - 4}' width='${w + 4}' height='5' fill='#F2EADA'/>`;
  }
  let trees = "";
  for (let i = 0; i < 12; i++) {
    const x = 60 + i * 100 + Math.sin(i * 7.3) * 26, r = 40 + Math.sin(i * 3.1) * 12;
    trees += `<circle cx='${x}' cy='${HORIZON - 44 - Math.sin(i * 2.2) * 10}' r='${r}' fill='${i % 2 ? "#8AA07B" : "#9BAE89"}'/>`;
  }
  const cyp = (x: number, h: number, w: number) => `<ellipse cx='${x}' cy='${HORIZON + 20 - h / 2}' rx='${w}' ry='${h / 2}' fill='#56705B'/>`;
  return svg(
    glowDef("s", "#FFF6DC", 0.9),
    `<ellipse cx='250' cy='170' rx='420' ry='330' fill='url(#s)'/>` +
      `<path d='${ridgePath(HORIZON, 70, 2, 0.2)}' fill='#C3CFB2'/>` + trees + arches +
      `<rect y='${HORIZON}' width='1200' height='300' fill='#8E9F7B'/>` +
      `<path d='M584 ${HORIZON} H616 L700 800 H500 Z' fill='#E6DCC8'/>` +
      `<path d='M560 ${HORIZON + 30} L440 800 H486 L574 ${HORIZON + 30} Z M640 ${HORIZON + 30} L760 800 H714 L626 ${HORIZON + 30} Z' fill='#6F8A66'/>` +
      cyp(452, 190, 15) + cyp(748, 190, 15) + cyp(330, 250, 21) + cyp(870, 250, 21) + cyp(150, 300, 26) + cyp(1050, 300, 26) +
      `<ellipse cx='600' cy='${HORIZON + 16}' rx='40' ry='6' fill='#BCD0D6'/>`
  );
}

function lake() {
  const layers = [
    [150, "#665780", 8], [104, "#4B4572", 5], [62, "#343560", 3], [14, "#23284A", 1.4],
  ] as [number, string, number][];
  let up = "", down = "";
  for (const [h, c, s] of layers) {
    const d = ridgePath(HORIZON, h, s);
    up += `<path d='${d}' fill='${c}'/>`;
    down += `<path d='${d}' fill='${c}' opacity='.55' transform='translate(0 ${HORIZON * 2}) scale(1 -1)'/>`;
  }
  return svg(
    glowDef("s", "#FFC7A0", 1) + glowDef("l", "#FFC98A", 1) +
      `<linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#E2A790'/><stop offset='.28' stop-color='#5A5180'/><stop offset='1' stop-color='#1B2140'/></linearGradient>` +
      `<linearGradient id='m' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#D2B6C2' stop-opacity='0'/><stop offset='.5' stop-color='#D2B6C2' stop-opacity='.4'/><stop offset='1' stop-color='#D2B6C2' stop-opacity='0'/></linearGradient>`,
    `<ellipse cx='650' cy='${HORIZON - 6}' rx='430' ry='190' fill='url(#s)'/>` + up +
      `<rect y='${HORIZON}' width='1200' height='300' fill='url(#w)'/>` + down +
      `<rect y='${HORIZON - 34}' width='1200' height='70' fill='url(#m)'/>` +
      `<path d='M584 ${HORIZON + 70} H616 L700 800 H500 Z' fill='#3A3340'/>` +
      `<rect x='579' y='${HORIZON - 4}' width='3' height='76' fill='#2A2630'/>` +
      `<circle cx='588' cy='${HORIZON + 6}' r='46' fill='url(#l)'/><circle cx='588' cy='${HORIZON + 6}' r='4' fill='#FFF1D6'/>`
  );
}

function summit() {
  let stars = "";
  for (let i = 0; i < 46; i++)
    stars += `<circle cx='${(i * 263.7) % 1200}' cy='${(i * 97.3) % 300}' r='${1 + (i % 3) * 0.5}' fill='#FFF3DA' opacity='${0.35 + (i % 5) * 0.12}'/>`;
  let clouds = "";
  for (let i = 0; i < 14; i++)
    clouds += `<ellipse cx='${i * 96 - 20 + Math.sin(i * 3) * 30}' cy='${HORIZON + 22 + (i % 3) * 16}' rx='${150 + (i % 4) * 30}' ry='${30 + (i % 3) * 8}' fill='${i % 2 ? "#F1C6A6" : "#B79CC0"}' opacity='.75'/>`;
  return svg(
    glowDef("s", "#FFD2A0", 1),
    stars + `<ellipse cx='720' cy='${HORIZON - 10}' rx='430' ry='200' fill='url(#s)'/>` +
      `<path d='${ridgePath(HORIZON + 30, 150, 4.2, 0.25)}' fill='#6A5C84'/><path d='${ridgePath(HORIZON + 30, 112, 1.7, 0.4)}' fill='#584C78'/><path d='${ridgePath(HORIZON + 30, 74, 6.1, 0.3)}' fill='#4A4068'/>` +
      `<rect y='${HORIZON + 20}' width='1200' height='300' fill='#8E76A0'/>` + clouds +
      `<ellipse cx='600' cy='845' rx='720' ry='190' fill='#6E6480'/><ellipse cx='600' cy='850' rx='700' ry='180' fill='#8C8196'/>` +
      `<path d='M90 700 Q600 560 1110 700' stroke='#C89B5E' stroke-width='4' fill='none'/>` +
      `<circle cx='600' cy='640' r='22' stroke='#C89B5E' stroke-width='3' fill='none'/><ellipse cx='600' cy='640' rx='22' ry='8' stroke='#C89B5E' stroke-width='2.5' fill='none'/><rect x='592' y='664' width='16' height='44' fill='#A79CAE'/>`
  );
}

function sunroom() {
  let light = "";
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 3; j++) {
      const x = 330 + i * 92 + j * 28, y = 110 + j * 112 - i * 11;
      light += `<path d='M${x} ${y} l74 -9 l23 96 l-74 9 Z' fill='#FFF3D2' opacity='.45'/>`;
    }
  // Everything that matters sits within the middle third, so a phone's
  // centre crop still shows a composed room.
  let leaves = "";
  for (let i = 0; i < 9; i++) {
    const cx = 742 + Math.cos(i * 2.4) * 22, cy = 470 - i * 15;
    leaves += `<ellipse cx='${cx}' cy='${cy}' rx='20' ry='8' transform='rotate(${i * 47} ${cx} ${cy})' fill='${i % 2 ? "#547C52" : "#76966A"}'/>`;
  }
  return svg(
    glowDef("s", "#FFE7B4", 0.8),
    `<ellipse cx='520' cy='300' rx='520' ry='330' fill='url(#s)'/>` + light +
      `<rect y='560' width='1200' height='240' fill='#C4805C'/><rect y='556' width='1200' height='7' fill='#F6F1E7'/>` +
      `<ellipse cx='610' cy='672' rx='190' ry='44' fill='#F2E6D0'/><ellipse cx='610' cy='672' rx='174' ry='40' fill='#2F8088'/><ellipse cx='610' cy='672' rx='152' ry='35' fill='#F2E6D0'/><ellipse cx='610' cy='672' rx='118' ry='27' fill='#E07A5F'/><ellipse cx='610' cy='672' rx='70' ry='16' fill='#DDA63A'/>` +
      `<rect x='496' y='500' width='170' height='46' rx='3' fill='#70503A'/><rect x='493' y='495' width='176' height='6' fill='#5E4230'/><rect x='504' y='546' width='4' height='14' fill='#C89B5E'/><rect x='654' y='546' width='4' height='14' fill='#C89B5E'/>` +
      `<circle cx='520' cy='476' r='11' fill='#2B7C86'/><rect x='514' y='480' width='12' height='15' fill='#2B7C86'/><circle cx='560' cy='484' r='10' fill='#DDA63A'/>` +
      `<path d='M624 495 h26 l-6 -22 h-14 Z' fill='#FFE9BE'/>` +
      `<rect x='740' y='476' width='4' height='74' fill='#6A5546'/>` + leaves + `<path d='M722 548 h40 l-5 28 h-30 Z' fill='#F4EBDA'/>` +
      `<circle cx='452' cy='500' r='38' fill='#6E9462'/><circle cx='436' cy='490' r='5' fill='#F29A2E'/><circle cx='464' cy='512' r='5' fill='#F29A2E'/><circle cx='456' cy='478' r='5' fill='#F29A2E'/><rect x='450' y='536' width='5' height='28' fill='#6A5546'/><path d='M432 562 h42 l-6 36 h-30 Z' fill='#B5714F'/>`
  );
}

const PAINTERS: Record<WorldId, () => string> = { garden, lake, summit, sunroom };

export default function WorldBackdrop({ world, settled = true }: { world: WorldId; settled?: boolean }) {
  // Painted lazily and once each; these are small strings, not images.
  const art = useMemo(() => {
    if (Platform.OS !== "web") return null;
    const out = {} as Record<WorldId, string>;
    for (const id of WORLD_ORDER) out[id] = PAINTERS[id]();
    return out;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      {WORLD_ORDER.map((id) => {
        const cfg = WORLDS[id];
        const on = settled && id === world;
        return (
          <View
            key={id}
            style={[
              StyleSheet.absoluteFill,
              { opacity: on ? 1 : 0 },
              Platform.OS === "web" ? ({ transitionProperty: "opacity", transitionDuration: "600ms" } as any) : null,
            ]}
          >
            <LinearGradient colors={[cfg.sky[0], cfg.sky[1], cfg.sky[2]]} locations={[0, 0.45, 0.66]} style={StyleSheet.absoluteFill} />
            {art ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundImage: art[id], backgroundSize: "cover", backgroundPosition: "center bottom", backgroundRepeat: "no-repeat" } as any,
                ]}
              />
            ) : (
              <View style={[styles.ground, { backgroundColor: cfg.ground }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, height: "34%" },
});
