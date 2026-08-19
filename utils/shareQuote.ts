// utils/shareQuote.ts
//
// Renders a quote onto a branded 1080x1080 image and hands it to the
// native share sheet. This is the app's organic growth loop: people share
// the quote itself, not just a link.
//
// Web    -> canvas render + Web Share API (level 2, files). Falls back to
//           downloading the PNG and copying the text.
// Native -> text share (no view-shot dependency in this project).

import { Platform, Alert, Share as RNShare } from "react-native";
import * as Clipboard from "expo-clipboard";
import { trackEvent } from "./analytics";

const APP_URL = "https://quotes.wearesparklab.com/";

export interface ShareableQuote {
  id?: string;
  text: string;
  author: string;
  category?: string;
}

// ── card geometry ─────────────────────────────────────────────────────────
const SIZE = 1080;
const PAD = 96;
const CONTENT_W = SIZE - PAD * 2;

const BG = "#0C0A1A";
const BRAND = "#6672E7";
const BADGE = "#e63946";
const MUTED = "#C9CCE3";

const FONT_STACK = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const SERIF_STACK = 'Georgia, "Times New Roman", serif';

/** Deterministic PRNG so the same quote always gets the same starfield. */
function makeRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Greedy word wrap against a measured canvas context. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Shrink the font until the wrapped quote fits the available box.
 * Returns the chosen size and the wrapped lines.
 */
function fitQuote(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number
) {
  for (let size = 68; size >= 28; size -= 2) {
    ctx.font = "italic 600 " + size + "px " + FONT_STACK;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = size * 1.34;
    if (lines.length * lineHeight <= maxHeight) {
      return { size, lines, lineHeight };
    }
  }
  const size = 28;
  ctx.font = "italic 600 " + size + "px " + FONT_STACK;
  return { size, lines: wrapText(ctx, text, maxWidth), lineHeight: size * 1.34 };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the shareable card. Web only — needs a DOM canvas. */
export function renderQuoteCard(quote: ShareableQuote): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // purple glow, upper centre
  const glow = ctx.createRadialGradient(SIZE / 2, 300, 0, SIZE / 2, 300, 620);
  glow.addColorStop(0, "rgba(102,114,231,0.42)");
  glow.addColorStop(1, "rgba(102,114,231,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // warm glow, lower right
  const glow2 = ctx.createRadialGradient(880, 900, 0, 880, 900, 460);
  glow2.addColorStop(0, "rgba(230,57,70,0.20)");
  glow2.addColorStop(1, "rgba(230,57,70,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // starfield — seeded by quote id so a given quote always looks the same
  const rand = makeRandom(seedFrom(quote.id || quote.text));
  for (let i = 0; i < 150; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = rand() * 1.6 + 0.4;
    ctx.fillStyle = "rgba(255,255,255," + (rand() * 0.55 + 0.12).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = rand() * (SIZE - 100) + 50;
    const y = rand() * (SIZE - 100) + 50;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  // card outline, echoing the in-app quote card
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, 44, 44, SIZE - 88, SIZE - 88, 40);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // category badge
  if (quote.category) {
    const label = quote.category.toUpperCase();
    ctx.font = "700 26px " + FONT_STACK;
    const tw = ctx.measureText(label).width;
    const bw = tw + 56;
    const bh = 56;
    const bx = (SIZE - bw) / 2;
    const by = 132;
    ctx.fillStyle = BADGE;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, SIZE / 2, by + 37);
  }

  // decorative opening quote mark
  ctx.font = "700 200px " + SERIF_STACK;
  ctx.fillStyle = "rgba(102,114,231,0.30)";
  ctx.fillText("“", SIZE / 2, 350);

  // quote text, auto-fitted
  const maxTextHeight = 400;
  const { lines, lineHeight } = fitQuote(ctx, quote.text, CONTENT_W, maxTextHeight);

  const blockHeight = lines.length * lineHeight;
  let y = 560 - blockHeight / 2 + lineHeight * 0.78;

  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(102,114,231,0.45)";
  ctx.shadowBlur = 18;
  for (const line of lines) {
    ctx.fillText(line, SIZE / 2, y);
    y += lineHeight;
  }
  ctx.shadowBlur = 0;

  // author
  const authorY = Math.min(y + 34, 830);
  ctx.font = "600 36px " + FONT_STACK;
  ctx.fillStyle = MUTED;
  ctx.fillText("— " + quote.author, SIZE / 2, authorY);

  // divider
  const divY = 916;
  const divGrad = ctx.createLinearGradient(SIZE / 2 - 150, 0, SIZE / 2 + 150, 0);
  divGrad.addColorStop(0, "rgba(102,114,231,0)");
  divGrad.addColorStop(0.5, "rgba(102,114,231,0.9)");
  divGrad.addColorStop(1, "rgba(102,114,231,0)");
  ctx.fillStyle = divGrad;
  ctx.fillRect(SIZE / 2 - 150, divY, 300, 3);

  // footer wordmark
  ctx.font = "800 34px " + FONT_STACK;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Spark Quotes", SIZE / 2, divY + 58);

  ctx.font = "500 26px " + FONT_STACK;
  ctx.fillStyle = BRAND;
  ctx.fillText("quotes.wearesparklab.com", SIZE / 2, divY + 98);

  return canvas;
}

/**
 * Synchronous canvas -> File.
 *
 * Deliberately avoids canvas.toBlob(): that is async, and awaiting anything
 * before navigator.share() drops the transient user activation on Safari,
 * which then rejects the share with NotAllowedError. toDataURL is synchronous,
 * so the whole render stays inside the click's task.
 */
function canvasToFile(canvas: HTMLCanvasElement, filename: string): File {
  const dataUrl = canvas.toDataURL("image/png");
  const comma = dataUrl.indexOf(",");
  const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime || "image/png" });
}

function quoteCaption(quote: ShareableQuote) {
  return '"' + quote.text + '" — ' + quote.author + "\n\n" + APP_URL;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function safeFilename(quote: ShareableQuote) {
  const stub = quote.text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return "spark-quote-" + (stub || "card") + ".png";
}

/**
 * Share a quote as an image. Must be called directly from a user gesture —
 * the Web Share API rejects otherwise.
 */
export async function shareQuote(quote: ShareableQuote): Promise<void> {
  if (!quote?.text) return;

  trackEvent("Share Quote", { category: quote.category || "unknown" });

  // Native: no DOM canvas here, so share the text.
  if (Platform.OS !== "web") {
    try {
      await RNShare.share({
        message: quoteCaption(quote),
        title: "Spark Quotes",
      });
    } catch {
      /* user dismissed */
    }
    return;
  }

  const caption = quoteCaption(quote);
  const nav = navigator as any;

  // Render synchronously so the user activation survives to the share call.
  let file: File | null = null;
  try {
    file = canvasToFile(renderQuoteCard(quote), safeFilename(quote));
  } catch (e) {
    console.log("Quote card render failed, falling back to text share", e);
  }

  // 1) Best case: native share sheet with the image attached.
  if (file) {
    try {
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], text: caption });
        return;
      }
    } catch (e: any) {
      // AbortError means the user closed the sheet — nothing more to do.
      if (e?.name === "AbortError") return;
      console.log("File share unavailable, falling back", e);
    }
  }

  // 2) Text-only share sheet (desktop Safari, some Android browsers).
  try {
    if (nav.share) {
      await nav.share({ title: "Spark Quotes", text: caption });
      return;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return;
  }

  // 3) No share sheet at all: save the card and copy the caption.
  if (file) {
    downloadBlob(file, safeFilename(quote));
  }
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(caption);
    } else {
      await Clipboard.setStringAsync(caption);
    }
    Alert.alert(
      file ? "Card saved" : "Quote copied",
      file
        ? "The quote card was downloaded and the text copied to your clipboard."
        : "Quote copied to your clipboard."
    );
  } catch {
    if (!file) Alert.alert("Share failed", "Couldn’t share this quote.");
  }
}
