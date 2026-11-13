// utils/quoteArt.ts
//
// Draws a quote as a finished image, entirely in the browser (no image
// service, no upload). Used by the sharing studio.
//
// Everything drawn here is our own: the world paintings are procedural SVG
// from WorldBackdrop, and the typefaces (Newsreader, Instrument Sans) are
// SIL Open Font License, which allows embedding text in images. Georgia is a
// system font used as rendered text, which is likewise fine.

import { WORLDS, type WorldId } from "../worlds/config";
import { worldArtImageUrl } from "../components/worlds/WorldBackdrop";

export type ArtStyle = WorldId | "paper" | "night";
export type ArtFont = "serif" | "sans" | "classic";
export type ArtFormat = "square" | "portrait" | "story";

export const ART_FORMATS: Record<ArtFormat, { w: number; h: number; label: string; hint: string }> = {
  square: { w: 1080, h: 1080, label: "Square", hint: "Feeds and messages" },
  portrait: { w: 1080, h: 1350, label: "Portrait", hint: "Instagram posts" },
  story: { w: 1080, h: 1920, label: "Story / wallpaper", hint: "Stories and phone screens" },
};

export const ART_STYLES: { id: ArtStyle; label: string; swatch: [string, string] }[] = [
  { id: "garden", label: "Garden", swatch: ["#AECBDD", "#8E9F7B"] },
  { id: "lake", label: "Lake", swatch: ["#1B2140", "#E9AE92"] },
  { id: "summit", label: "Summit", swatch: ["#182045", "#F3B47E"] },
  { id: "sunroom", label: "Sunshine Room", swatch: ["#F3E7D2", "#C9825A"] },
  { id: "paper", label: "Paper", swatch: ["#F7F3ED", "#A078B4"] },
  { id: "night", label: "Night", swatch: ["#1B1D3C", "#E7A99A"] },
];

export const ART_FONTS: { id: ArtFont; label: string }[] = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans" },
  { id: "classic", label: "Classic" },
];

export interface ArtQuote {
  text: string;
  author: string;
}

const SERIF = '"Newsreader", "Iowan Old Style", Georgia, serif';
const SANS = '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

/** Shown under the quote. "Anonymous" in the data reads better as this. */
export function creditLine(author: string): string {
  return /^(anonymous|unknown)$/i.test(author.trim()) ? "Author unknown" : author.trim();
}

function quoteFont(font: ArtFont, size: number) {
  if (font === "sans") return `500 ${size}px ${SANS}`;
  if (font === "classic") return `italic 400 ${size}px Georgia, "Times New Roman", serif`;
  return `400 ${size}px ${SERIF}`;
}

async function fontsReady(font: ArtFont) {
  if (typeof document === "undefined" || !document.fonts) return;
  const want = font === "sans" ? ['500 60px "Instrument Sans"'] : font === "serif" ? ['400 60px "Newsreader"'] : [];
  want.push('600 30px "Instrument Sans"', '400 30px "Newsreader"');
  try {
    await Promise.race([Promise.all(want.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* fall back to system fonts */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const artCache = new Map<WorldId, Promise<HTMLImageElement>>();
const worldArt = (id: WorldId) => {
  if (!artCache.has(id)) artCache.set(id, loadImage(worldArtImageUrl(id)));
  return artCache.get(id)!;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (!line || ctx.measureText(next).width <= maxWidth) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  // avoid a lonely last word when there's room to rebalance
  if (lines.length > 1 && !lines[lines.length - 1].includes(" ")) {
    const prev = lines[lines.length - 2].split(" ");
    if (prev.length > 2) {
      const moved = prev.pop()!;
      const candidate = moved + " " + lines[lines.length - 1];
      if (ctx.measureText(candidate).width <= maxWidth) {
        lines[lines.length - 2] = prev.join(" ");
        lines[lines.length - 1] = candidate;
      }
    }
  }
  return lines;
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

interface Look {
  ink: string;
  soft: string;
  accent: string;
  dark: boolean;
}

async function paintBackground(ctx: CanvasRenderingContext2D, W: number, H: number, style: ArtStyle, seed: number): Promise<Look> {
  if (style === "paper") {
    ctx.fillStyle = "#F7F3ED";
    ctx.fillRect(0, 0, W, H);
    const r = seeded(seed);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "48,40,60"},${r() * 0.05})`;
      ctx.fillRect(r() * W, r() * H, 2, 2);
    }
    ctx.strokeStyle = "rgba(48,40,60,0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.045, W * 0.045, W - W * 0.09, H - W * 0.09);
    return { ink: "#30283C", soft: "#6A6274", accent: "#A078B4", dark: false };
  }

  if (style === "night") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1B1D3C");
    g.addColorStop(0.62, "#4F4682");
    g.addColorStop(1, "#E7A99A");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = seeded(seed);
    for (let i = 0; i < Math.round((W * H) / 5200); i++) {
      const y = r() * H * 0.75;
      ctx.fillStyle = `rgba(255,243,218,${(0.25 + r() * 0.6) * (1 - y / (H * 0.8))})`;
      ctx.beginPath();
      ctx.arc(r() * W, y, 0.6 + r() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return { ink: "#FBF6EE", soft: "#D8CEE0", accent: "#F4D58D", dark: true };
  }

  // a world: its sky, then its painting anchored to the bottom (cover-fit)
  const cfg = WORLDS[style];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, cfg.sky[0]);
  g.addColorStop(0.45, cfg.sky[1]);
  g.addColorStop(0.66, cfg.sky[2]);
  g.addColorStop(1, cfg.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  try {
    const img = await worldArt(style);
    const s = Math.max(W / 1200, H / 800);
    const dw = 1200 * s, dh = 800 * s;
    ctx.drawImage(img, (W - dw) / 2, H - dh, dw, dh);
  } catch {
    /* sky alone is still a good image */
  }
  return { ink: cfg.ink, soft: cfg.inkSoft, accent: cfg.accent, dark: cfg.dark };
}

/**
 * Renders the image and resolves with the finished canvas. Async because
 * fonts and the world painting may need to load; the studio renders ahead
 * of time so sharing itself stays inside the tap (Safari requires that).
 */
export async function renderQuoteArt(
  quote: ArtQuote,
  opts: { style: ArtStyle; font: ArtFont; format: ArtFormat },
  canvas: HTMLCanvasElement = document.createElement("canvas")
): Promise<HTMLCanvasElement> {
  const { w: W, h: H } = ART_FORMATS[opts.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  await fontsReady(opts.font);
  let seed = 2166136261;
  for (let i = 0; i < quote.text.length; i++) seed = Math.imul(seed ^ quote.text.charCodeAt(i), 16777619);
  const look = await paintBackground(ctx, W, H, opts.style, seed >>> 0);

  // Where the words go. On tall images keep them below a lock-screen clock
  // and above the dock.
  const story = opts.format === "story";
  const painted = opts.style !== "paper" && opts.style !== "night";
  const marginX = W * (painted ? 0.15 : 0.11); // room for the panel's padding
  const maxW = W - marginX * 2;
  const centreY = story ? H * 0.53 : H * 0.46;
  const maxTextH = story ? H * 0.38 : H * 0.48;

  // fit the quote: largest size whose wrapped lines fit the box
  const text = "“" + quote.text.trim() + "”";
  // short quotes can be bigger; very short ones are capped so they don't shout
  let size = text.length < 40 ? 116 : 96, lines: string[] = [], lh = 0;
  for (; size >= 30; size -= 2) {
    ctx.font = quoteFont(opts.font, size);
    lines = wrap(ctx, text, maxW);
    lh = size * (opts.font === "sans" ? 1.24 : 1.28);
    if (lines.length * lh <= maxTextH && lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }

  const creditSize = Math.round(W * 0.026);
  const blockH = lines.length * lh + creditSize * 3.2;
  let y = centreY - blockH / 2;

  // On painted worlds, the words sit on a soft panel in the world's own
  // colour: the painting frames it, and nothing busy ever runs behind text.
  if (opts.style !== "paper" && opts.style !== "night") {
    const veil = WORLDS[opts.style].veil;
    const padX = W * 0.065, padTop = W * 0.1, padBottom = W * 0.06;
    const px = marginX - padX, pw = maxW + padX * 2;
    const py = y - padTop, ph = blockH + padTop + padBottom;
    const rad = W * 0.04;
    ctx.save();
    ctx.shadowColor = look.dark ? "rgba(10,10,30,0.35)" : "rgba(60,40,30,0.16)";
    ctx.shadowBlur = W * 0.05;
    ctx.shadowOffsetY = W * 0.012;
    ctx.fillStyle = veil + (look.dark ? "E6" : "EB");
    ctx.beginPath();
    (ctx as any).roundRect ? (ctx as any).roundRect(px, py, pw, ph, rad) : ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = look.dark ? "rgba(247,243,237,0.16)" : "rgba(48,40,60,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    (ctx as any).roundRect ? (ctx as any).roundRect(px, py, pw, ph, rad) : ctx.rect(px, py, pw, ph);
    ctx.stroke();
  }

  // small spark mark above the words
  ctx.fillStyle = look.accent;
  ctx.font = `400 ${Math.round(W * 0.04)}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("✦", W / 2, y - W * 0.035);

  // the quote
  ctx.fillStyle = look.ink;
  ctx.font = quoteFont(opts.font, size);
  if (look.dark && !painted) { ctx.shadowColor = "rgba(15,16,40,0.55)"; ctx.shadowBlur = 24; }
  for (const line of lines) {
    y += lh;
    ctx.fillText(line, W / 2, y - lh * 0.24);
  }
  ctx.shadowBlur = 0;

  // the credit
  y += creditSize * 2.1;
  ctx.fillStyle = look.soft;
  ctx.font = `600 ${creditSize}px ${SANS}`;
  try { (ctx as any).letterSpacing = `${Math.round(creditSize * 0.16)}px`; } catch {}
  ctx.fillText(creditLine(quote.author).toUpperCase(), W / 2, y);
  try { (ctx as any).letterSpacing = "0px"; } catch {}

  // footer
  const footY = story ? H * 0.885 : H - W * 0.075;
  if (painted) {
    // a small soft pill, so the name reads over any part of the painting
    const pw = W * 0.4, ph = W * 0.1, px = (W - pw) / 2, py = footY - W * 0.052;
    ctx.fillStyle = WORLDS[opts.style as WorldId].veil + (look.dark ? "D9" : "E0");
    ctx.beginPath();
    (ctx as any).roundRect ? (ctx as any).roundRect(px, py, pw, ph, ph / 2) : ctx.rect(px, py, pw, ph);
    ctx.fill();
  }
  ctx.fillStyle = look.dark ? "rgba(251,246,238,0.85)" : "rgba(48,40,60,0.72)";
  ctx.font = `400 ${Math.round(W * 0.03)}px ${SERIF}`;
  ctx.fillText("Spark Quotes", W / 2, footY);
  ctx.font = `500 ${Math.round(W * 0.019)}px ${SANS}`;
  ctx.fillStyle = look.dark ? "rgba(251,246,238,0.6)" : "rgba(48,40,60,0.5)";
  ctx.fillText("quotes.wearesparklab.com", W / 2, footY + W * 0.034);

  return canvas;
}
