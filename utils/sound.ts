// utils/sound.ts
//
// Small, warm interface sounds, synthesised in the browser with Web Audio —
// no audio files, nothing to license, nothing to download.
//
// Designed to delight, not to hook: soft pentatonic chimes (any notes sound
// good together), short and quiet, never looping, never rewarding repetition.
// One switch turns them all off; the choice is remembered.
//
// Browsers only allow audio after a tap, so the audio context is created on
// the first sound, which is always played from a tap.

import { Platform } from "react-native";

export type SoundName = "tap" | "save" | "unsave" | "travel" | "open" | "share" | "begin" | "breatheIn" | "breatheOut" | "done";

const KEY = "sparkSound"; // "on" | "off"
const listeners = new Set<(on: boolean) => void>();

let enabled = (() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
})();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;

function audio() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as AudioContext;
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    // a short, soft echo gives the chimes a little room around them
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.19;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    wet = ctx.createGain();
    wet.gain.value = 0.35;
    wet.connect(delay);
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    tone.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** A bell-ish note: a sine with a quiet octave partial and a soft decay. */
function bell(freq: number, at: number, dur: number, gain: number) {
  const a = ctx!, out = a.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(gain, at + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  out.connect(master!);
  out.connect(wet!);
  for (const [mult, g] of [[1, 1], [2, 0.18], [3.01, 0.05]] as const) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    og.gain.value = g;
    o.connect(og);
    og.connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
}

/** A breath of filtered noise — for movement between worlds. */
function air(at: number, dur: number, from: number, to: number, gain: number) {
  const a = ctx!;
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + dur * 0.4);
  g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master!);
  src.start(at);
  src.stop(at + dur);
}

/** A slow, low swell for the breathing guide. */
function swell(at: number, dur: number, from: number, to: number, gain: number) {
  const a = ctx!, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o.type = "triangle";
  o.frequency.setValueAtTime(from, at);
  o.frequency.linearRampToValueAtTime(to, at + dur);
  f.type = "lowpass";
  f.frequency.value = 700;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + dur * 0.45);
  g.gain.linearRampToValueAtTime(0, at + dur);
  o.connect(f);
  f.connect(g);
  g.connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

// C major pentatonic, around C5
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, G6: 1568.0, A4: 440, G4: 392, C4: 261.63 };

export function play(name: SoundName) {
  if (!enabled) return;
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.01;
  try {
    switch (name) {
      case "tap": bell(N.G5, t, 0.18, 0.05); break;
      case "open": bell(N.E5, t, 0.5, 0.08); bell(N.A5, t + 0.07, 0.6, 0.06); break;
      case "save":
        // a little rising sparkle
        [N.C6, N.E6, N.G6].forEach((f, i) => bell(f, t + i * 0.075, 0.9 - i * 0.1, 0.09 - i * 0.015));
        bell(N.C5, t, 1.1, 0.05);
        break;
      case "unsave": bell(N.E5, t, 0.35, 0.06); bell(N.C5, t + 0.09, 0.5, 0.05); break;
      case "travel": air(t, 0.9, 500, 2400, 0.06); bell(N.G4, t + 0.25, 1.4, 0.05); bell(N.D5, t + 0.32, 1.4, 0.035); break;
      case "share": bell(N.A5, t, 0.6, 0.07); bell(N.E6, t + 0.09, 0.8, 0.06); break;
      case "begin": bell(N.C5, t, 2.2, 0.07); bell(N.G5, t + 0.12, 2.2, 0.04); break;
      case "breatheIn": swell(t, 3.8, N.C4, N.G4 * 0.75, 0.05); break;
      case "breatheOut": swell(t, 5.6, N.G4 * 0.75, N.C4 * 0.9, 0.04); break;
      case "done": [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, t + i * 0.12, 2.4, 0.06)); break;
    }
  } catch {
    /* sound is a nicety; never let it break anything */
  }
}

export function soundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
  listeners.forEach((l) => l(on));
  if (on) play("tap"); // a tiny confirmation that sound is back
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Whether this device can make sounds at all (hide the switch if not). */
export const soundSupported = Platform.OS === "web" && typeof window !== "undefined" &&
  !!((window as any).AudioContext || (window as any).webkitAudioContext);
