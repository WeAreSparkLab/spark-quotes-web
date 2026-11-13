// worlds/config.ts
//
// Pure data for the Living Worlds experience: which world a quote lives in,
// what each "a little more of…" choice maps to, and the palette every layer
// (3D scene, 2D backdrop, typography) draws from.
//
// No three.js in here — this file is imported by the first paint, and the 3D
// engine is loaded lazily afterwards.

export type WorldId = "garden" | "lake" | "summit" | "sunroom";

export interface WorldConfig {
  id: WorldId;
  name: string;
  /** One quiet line shown under the world name. */
  mood: string;
  /** Text colour that stays readable over this world's sky / wall. */
  ink: string;
  inkSoft: string;
  /** Small highlights: active states, the save glow. */
  accent: string;
  /** Sky gradient, zenith to horizon. Shared by the 3D sky and the 2D backdrop. */
  sky: [string, string, string];
  /** Colour of the soft wash that sits behind the words. */
  veil: string;
  /** Ground / foreground tone used by the 2D backdrop. */
  ground: string;
  /** True when ink is light-on-dark; flips control styling. */
  dark: boolean;
  /** Categories that belong here. MUST match approved_quotes.category. */
  categories: string[];
  /** What saving a quote does in this world — used for the screen-reader note. */
  saveNote: string;
}

export const WORLDS: Record<WorldId, WorldConfig> = {
  garden: {
    id: "garden",
    name: "The Garden of Growth",
    mood: "Morning light, new beginnings",
    ink: "#2C2536",
    inkSoft: "#5B5266",
    accent: "#8C5E9E",
    sky: ["#AECBDD", "#E0E4DA", "#F6EBD6"],
    veil: "#F3EDE0",
    ground: "#8E9F7B",
    dark: false,
    categories: ["Motivation", "Growth", "Creativity", "Dreams", "Habits", "Productivity", "Study"],
    saveNote: "A new flower opened in the garden.",
  },
  lake: {
    id: "lake",
    name: "The Quiet Lake",
    mood: "Still water, a soft horizon",
    ink: "#F7F3ED",
    inkSoft: "#CFC8DC",
    accent: "#F0C39A",
    sky: ["#1B2140", "#4B4672", "#E9AE92"],
    veil: "#232847",
    ground: "#2A2F52",
    dark: true,
    categories: ["Mindfulness", "Health", "Wisdom", "Love", "Family", "Calm", "Gratitude", "Relationships"],
    saveNote: "A lantern was set afloat on the lake.",
  },
  summit: {
    id: "summit",
    name: "The Summit",
    mood: "Above the clouds, golden hour",
    ink: "#FBF6EE",
    inkSoft: "#D8CEE0",
    accent: "#F2C58A",
    sky: ["#182045", "#5E4F86", "#F3B47E"],
    veil: "#20264D",
    ground: "#3A335A",
    dark: true,
    categories: ["Resilience", "Success", "Advice", "Courage", "Confidence", "Discipline", "Focus", "Leadership"],
    saveNote: "A new star came out above the summit.",
  },
  sunroom: {
    id: "sunroom",
    name: "The Sunshine Room",
    mood: "Warm light, small delights",
    ink: "#33263A",
    inkSoft: "#6B5870",
    accent: "#C4573A",
    sky: ["#F3E7D2", "#F4E3C8", "#EFD3A8"],
    veil: "#F4E8D4",
    ground: "#C9825A",
    dark: false,
    categories: ["Funny", "Good Vibes", "Happiness", "Friendship"],
    saveNote: "The mobile gave a happy little spin.",
  },
};

export const WORLD_ORDER: WorldId[] = ["garden", "lake", "summit", "sunroom"];

export function worldForCategory(category?: string | null): WorldId {
  if (category) {
    for (const id of WORLD_ORDER) {
      if (WORLDS[id].categories.includes(category)) return id;
    }
  }
  return "garden";
}

// ── "What would you like a little more of today?" ──────────────────────────
//
// Every choice resolves to categories that actually have quotes in
// approved_quotes once the Nov 2026 quote review migration is applied
// (supabase/migrations/20261112_quote_review.sql). Until then, a choice whose
// topics are still empty falls back to the bundled quotes in data.ts.

export type MoodId =
  | "courage"
  | "calm"
  | "motivation"
  | "hope"
  | "focus"
  | "laughter"
  | "surprise";

export interface MoodConfig {
  id: MoodId;
  label: string;
  world: WorldId | null; // null = let the quote choose
  categories: string[] | null; // null = everything
}

export const MOODS: MoodConfig[] = [
  { id: "courage", label: "Courage", world: "summit", categories: ["Courage", "Confidence", "Resilience"] },
  { id: "calm", label: "Calm", world: "lake", categories: ["Calm", "Mindfulness"] },
  { id: "motivation", label: "Motivation", world: "garden", categories: ["Motivation", "Growth", "Habits"] },
  { id: "hope", label: "Hope", world: "lake", categories: ["Good Vibes", "Dreams", "Gratitude"] },
  { id: "focus", label: "Focus", world: "summit", categories: ["Focus", "Discipline", "Productivity", "Wisdom"] },
  { id: "laughter", label: "Laughter", world: "sunroom", categories: ["Funny"] },
  { id: "surprise", label: "Surprise me", world: null, categories: null },
];

/** Same slug rule as scripts/seo-pages.cjs, so links land on the real pages. */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
