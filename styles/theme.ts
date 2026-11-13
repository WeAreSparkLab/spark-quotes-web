// styles/theme.ts
//
// The look of every screen except the worlds themselves.
//
// Borrowed from SparkLab Worlds: the worlds are where you look out, and the
// rest of the app is ivory paper laid over them — plum ink, lavender for
// anything active, a little gold for thanks. One palette here, so no screen
// can drift back to its own colours.

import { Platform } from "react-native";

export const C = {
  paper: "#F7F3ED",      // page background
  sheet: "#FCFAF6",      // cards sitting on the page
  sheetSunk: "#EFE8DD",  // inputs, unselected chips
  ink: "#30283C",        // headings and body text
  inkSoft: "#6A6274",    // secondary text (passes AA on paper)
  line: "rgba(48, 40, 60, 0.13)",
  lineStrong: "rgba(48, 40, 60, 0.24)",
  accent: "#694C91",     // primary buttons, selected states
  accentSoft: "#A078B4",
  accentWash: "rgba(160, 120, 180, 0.14)",
  onAccent: "#FBF6EE",
  gold: "#E7C58C",
  goldInk: "#7A5A22",
  danger: "#A8423A",
  dangerWash: "rgba(168, 66, 58, 0.08)",
  success: "#3F7A55",
  successWash: "rgba(63, 122, 85, 0.10)",
  plumDeep: "#221C2B",   // floating bars that sit over any world
};

export const F = {
  serif: Platform.OS === "web" ? '"Newsreader", "Iowan Old Style", Georgia, serif' : undefined,
  sans: Platform.OS === "web" ? '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif' : undefined,
};

/** Shared shapes, so buttons and cards are the same everywhere. */
export const S = {
  page: { flex: 1, backgroundColor: C.paper },
  column: { width: "100%" as const, maxWidth: 640, alignSelf: "center" as const, paddingHorizontal: 18 },
  card: {
    backgroundColor: C.sheet,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
    marginBottom: 12,
  },
  h1: { fontFamily: F.serif, fontSize: 30, lineHeight: 36, color: C.ink, fontWeight: "400" as const, letterSpacing: -0.4 },
  h2: { fontFamily: F.serif, fontSize: 21, lineHeight: 27, color: C.ink, fontWeight: "400" as const },
  label: { fontFamily: F.sans, fontSize: 15, color: C.ink, fontWeight: "600" as const },
  body: { fontFamily: F.sans, fontSize: 14.5, lineHeight: 21, color: C.inkSoft },
  eyebrow: { fontFamily: F.sans, fontSize: 11.5, letterSpacing: 1.8, textTransform: "uppercase" as const, color: C.inkSoft, fontWeight: "600" as const },
  input: {
    fontFamily: F.sans,
    backgroundColor: C.sheetSunk,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.ink,
  },
  btn: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 8,
  },
  btnPrimary: { backgroundColor: C.accent },
  btnPrimaryText: { fontFamily: F.sans, color: C.onAccent, fontSize: 15.5, fontWeight: "600" as const },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.lineStrong },
  btnGhostText: { fontFamily: F.sans, color: C.ink, fontSize: 15.5, fontWeight: "600" as const },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.sheet,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chipOn: { backgroundColor: "#E9DFEF", borderColor: "rgba(105, 76, 145, 0.55)" },
  chipText: { fontFamily: F.sans, fontSize: 14, fontWeight: "600" as const, color: C.ink },
  chipTextOn: { color: C.accent },
  link: { fontFamily: F.sans, color: C.accent, fontWeight: "600" as const, fontSize: 14.5 },
};
