// components/studio/Studio.web.tsx — the sharing studio
//
// A live preview of the quote as an image, with a style (the four worlds,
// Paper, Night), a typeface and a size. Everything is drawn in the browser;
// nothing is uploaded. The preview canvas IS the image that gets shared, so
// what you see is exactly what you send.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PageHeader from "../common/PageHeader";
import { Ionicons } from "../common/Ionicons";
import { C, F, S } from "../../styles/theme";
import { worldForCategory } from "../../worlds/config";
import {
  ART_FONTS, ART_FORMATS, ART_STYLES, creditLine, renderQuoteArt,
  type ArtFont, type ArtFormat, type ArtStyle,
} from "../../utils/quoteArt";
import { copyQuoteText, downloadRenderedImage, shareRenderedImage } from "../../utils/shareQuote";
import { useStudioQuote } from "./useStudioQuote";

const PREFS_KEY = "sparkStudioPrefs"; // remembers typeface and size, not style

export default function Studio() {
  const { quote, state } = useStudioQuote();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;

  const [style, setStyle] = useState<ArtStyle | null>(null);
  const [font, setFont] = useState<ArtFont>("serif");
  const [format, setFormat] = useState<ArtFormat>("square");
  const [rendering, setRendering] = useState(true);
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const token = useRef(0);

  // default style: the quote's own world
  useEffect(() => {
    if (quote && !style) setStyle(worldForCategory(quote.category));
  }, [quote, style]);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      const p = JSON.parse(raw);
      if (ART_FONTS.some((f) => f.id === p.font)) setFont(p.font);
      if (p.format in ART_FORMATS) setFormat(p.format);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ font, format })).catch(() => {});
  }, [font, format]);

  // redraw whenever anything changes; only the latest draw counts
  useEffect(() => {
    if (!quote || !style || !canvasRef.current) return;
    const mine = ++token.current;
    setRendering(true);
    renderQuoteArt(quote, { style, font, format }, canvasRef.current)
      .then(() => { if (mine === token.current) setRendering(false); })
      .catch(() => { if (mine === token.current) { setRendering(false); setStatus("Couldn't draw the image on this device."); } });
  }, [quote, style, font, format]);

  const onShare = useCallback(async () => {
    if (!quote || !canvasRef.current || rendering) return;
    const r = await shareRenderedImage(canvasRef.current, quote, format);
    setStatus(r === "shared" ? "Shared." : r === "downloaded" ? "This browser can't share images directly, so the image was saved to your downloads." : "");
  }, [quote, rendering, format]);

  const onDownload = useCallback(() => {
    if (!quote || !canvasRef.current || rendering) return;
    downloadRenderedImage(canvasRef.current, quote, format);
    setStatus("Image saved to your downloads.");
  }, [quote, rendering, format]);

  const onCopy = useCallback(async () => {
    if (!quote) return;
    setStatus((await copyQuoteText(quote)) ? "Quote and link copied." : "Couldn't copy on this device.");
  }, [quote]);

  const dims = ART_FORMATS[format];
  const previewMaxH = wide ? Math.min(height * 0.72, 680) : Math.min(height * 0.55, 560);
  const previewMaxW = wide ? Math.min(width * 0.46, 560) : width - 36;
  const scale = Math.min(previewMaxW / dims.w, previewMaxH / dims.h);

  const Chip = ({ on, label, onPress, children, a11y }: { on: boolean; label: string; onPress: () => void; children?: React.ReactNode; a11y?: string }) => (
    <Pressable onPress={onPress} role="radio" aria-checked={on} accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [S.chip, styles.chip, on && S.chipOn, { opacity: pressed ? 0.75 : 1 }]}>
      {children}
      <Text style={[S.chipText, on && S.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  if (state !== "ready" || !quote) {
    return (
      <SafeAreaView style={S.page}>
        <PageHeader title="Share" />
        <View style={S.column}>
          <Text style={S.body}>{state === "loading" ? "Getting your quote…" : "That quote couldn't be found. It may have been removed."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const controls = (
    <View style={styles.controls}>
      <Text style={[S.label, styles.groupLabel]}>Style</Text>
      <View style={styles.chips} role="radiogroup" aria-label="Style">
        {ART_STYLES.map((s) => (
          <Chip key={s.id} on={style === s.id} label={s.label} onPress={() => setStyle(s.id)}>
            <View style={[styles.swatch, { backgroundImage: `linear-gradient(135deg, ${s.swatch[0]} 0 50%, ${s.swatch[1]} 50% 100%)` } as any]} />
          </Chip>
        ))}
      </View>

      <Text style={[S.label, styles.groupLabel]}>Typeface</Text>
      <View style={styles.chips} role="radiogroup" aria-label="Typeface">
        {ART_FONTS.map((f) => <Chip key={f.id} on={font === f.id} label={f.label} onPress={() => setFont(f.id)} />)}
      </View>

      <Text style={[S.label, styles.groupLabel]}>Size</Text>
      <View style={styles.chips} role="radiogroup" aria-label="Size">
        {(Object.keys(ART_FORMATS) as ArtFormat[]).map((k) => (
          <Chip key={k} on={format === k} label={ART_FORMATS[k].label} a11y={`${ART_FORMATS[k].label}: ${ART_FORMATS[k].hint}`} onPress={() => setFormat(k)} />
        ))}
      </View>
      <Text style={[S.body, styles.hint]}>{ART_FORMATS[format].hint} · {dims.w} × {dims.h}</Text>

      <View style={styles.actions}>
        <Pressable onPress={onShare} disabled={rendering} accessibilityRole="button"
          style={({ pressed }) => [S.btn, S.btnPrimary, { opacity: rendering ? 0.6 : pressed ? 0.85 : 1 }]}>
          <Ionicons name="share-social-outline" size={18} color={C.onAccent} />
          <Text style={S.btnPrimaryText}>{rendering ? "Drawing…" : "Share image"}</Text>
        </Pressable>
        <Pressable onPress={onDownload} disabled={rendering} accessibilityRole="button"
          style={({ pressed }) => [S.btn, S.btnGhost, { opacity: rendering ? 0.6 : pressed ? 0.85 : 1 }]}>
          <Ionicons name="download-outline" size={18} color={C.ink} />
          <Text style={S.btnGhostText}>Download</Text>
        </Pressable>
        <Pressable onPress={onCopy} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnGhost, { opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="copy-outline" size={18} color={C.ink} />
          <Text style={S.btnGhostText}>Copy text</Text>
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" aria-live="polite" style={[S.body, styles.status]}>{status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <PageHeader title="Make it yours" subtitle="Choose a look, then share it or save it. Everything is made on your device." />
        <View style={[styles.layout, wide && styles.layoutWide]}>
          <View style={styles.previewCol}>
            <View style={[styles.previewFrame, { width: dims.w * scale, height: dims.h * scale }]}>
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Image of the quote: “${quote.text}”, ${creditLine(quote.author)}`}
                style={{ width: "100%", height: "100%", display: "block", borderRadius: 14, opacity: rendering ? 0.75 : 1, transition: "opacity 180ms ease" }}
              />
            </View>
          </View>
          {controls}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layout: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: 18, gap: 22 },
  layoutWide: { maxWidth: 1120, flexDirection: "row", alignItems: "flex-start", gap: 40 },
  previewCol: { alignItems: "center" },
  previewFrame: { borderRadius: 14, backgroundColor: C.sheetSunk, boxShadow: "0 18px 50px rgba(48,40,60,0.18)" } as any,
  controls: { flex: 1, minWidth: 280 },
  groupLabel: { marginTop: 6, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { flexDirection: "row", gap: 8, minHeight: 40 },
  swatch: { width: 16, height: 16, borderRadius: 999, borderWidth: 1, borderColor: "rgba(48,40,60,0.18)" },
  hint: { fontSize: 13, marginTop: -6, marginBottom: 18, fontFamily: F.sans },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  status: { marginTop: 12, minHeight: 20 },
});
