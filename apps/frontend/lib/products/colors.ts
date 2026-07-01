import type { ProductImage } from "@/lib/api/products";

/* ── Colour hex lookup ───────────────────────────────── */

export const COLOR_HEX: Record<string, string> = {
  // ── Neutrals ──────────────────────────────────────────
  black:          "#111111",
  "off-black":    "#1c1c1c",
  "off black":    "#1c1c1c",
  obsidian:           "#111111",
  "black and pink":   "#111111",
  "black-and-pink":   "#111111",
  onyx:               "#353839",
  charcoal:       "#3c3c3c",
  "dark grey":    "#555555",
  "dark gray":    "#555555",
  grey:           "#909090",
  gray:           "#909090",
  "mid grey":     "#7a7a7a",
  "mid gray":     "#7a7a7a",
  "light grey":   "#c8c8c8",
  "light gray":   "#c8c8c8",
  "heather grey":  "#b0b0b0",
  "heather gray":  "#b0b0b0",
  "heather-grey":  "#b0b0b0",
  "heather-gray":  "#b0b0b0",
  silver:         "#c0c0c0",
  white:          "#f5f5f5",
  "off-white":    "#f0ede8",
  "off white":    "#f0ede8",
  ivory:          "#fffff0",
  ecru:           "#e8e0d0",
  cream:          "#f0ebe0",
  oatmeal:        "#e8ddd0",
  linen:          "#e8dcc8",

  // ── Warm neutrals ─────────────────────────────────────
  beige:          "#d4c5a9",
  sand:           "#c8b89a",
  tan:            "#c9a882",
  camel:          "#c19a6b",
  khaki:          "#c3b091",
  stone:          "#b5a898",
  taupe:          "#b5a99a",
  "warm grey":    "#a09590",
  "warm gray":    "#a09590",
  parchment:      "#f2e8d8",
  wheat:          "#dcc090",

  // ── Browns ────────────────────────────────────────────
  brown:          "#6b4226",
  "dark brown":   "#3e2010",
  chocolate:      "#4a2c17",
  espresso:       "#3a1f10",
  mocha:          "#5c3317",
  walnut:         "#5a3820",
  clay:           "#9b6b4a",
  "coffee brown": "#4a2f1a",
  "coffee-brown": "#4a2f1a",
  coffee:         "#4a2f1a",
  cognac:         "#9b4e20",
  rust:           "#b45309",
  terracotta:     "#c1440e",
  sienna:         "#a0522d",
  "burnt orange": "#cc5500",

  // ── Blues ─────────────────────────────────────────────
  navy:           "#1b2a4a",
  "dark navy":    "#0d1a30",
  "navy blue":    "#1b2a4a",
  blue:           "#1565c0",
  "cobalt blue":  "#0047ab",
  cobalt:         "#0047ab",
  "royal blue":   "#2444b0",
  "french blue":  "#0072bb",
  "powder blue":  "#b0c4de",
  "sky blue":     "#87ceeb",
  "baby blue":    "#89cff0",
  "pale blue":    "#aec6cf",
  "dusty blue":   "#6e9bb5",
  "slate blue":   "#6a7fa8",
  slate:          "#708090",
  denim:          "#1560bd",
  "washed blue":  "#4a7fa5",
  teal:           "#008080",
  "dark teal":    "#005f5f",
  turquoise:      "#40e0d0",
  "pale teal":    "#7eb8b8",

  // ── Greens ────────────────────────────────────────────
  green:          "#2e7d32",
  "dark green":   "#1a4a1a",
  "forest green": "#228b22",
  forest:         "#228b22",
  "hunter green": "#355e3b",
  hunter:         "#355e3b",
  olive:          "#6b7145",
  "olive green":  "#6b7145",
  "olive grove":  "#6b7145",
  "dark olive":   "#4a4f28",
  sage:           "#8fa880",
  "sage green":   "#8fa880",
  mint:           "#98d4c0",
  "mint green":   "#98d4c0",
  seafoam:        "#71c5a0",
  "army green":   "#4b5320",
  army:           "#4b5320",
  moss:           "#7b8b3c",
  khaki_green:    "#8a8c5a",
  pistachio:      "#93c572",
  lime:           "#a8cc52",

  // ── Reds & Pinks ──────────────────────────────────────
  red:            "#c0392b",
  "dark red":     "#8b0000",
  crimson:        "#dc143c",
  "bright red":   "#e61c1c",
  burgundy:       "#6e1423",
  wine:           "#722f37",
  bordeaux:       "#5c1a2a",
  maroon:         "#800000",
  "deep red":     "#9b1c1c",
  coral:          "#ff7f6e",
  salmon:         "#fa8072",
  "dusty rose":   "#c49a9a",
  blush:          "#de98a8",
  pink:           "#e8a0b0",
  "baby pink":    "#f4c2c2",
  "hot pink":     "#e0306a",
  fuchsia:        "#c8185f",
  mauve:          "#b07890",
  rose:           "#e8809a",

  // ── Purples ───────────────────────────────────────────
  purple:         "#6a0dad",
  "dark purple":  "#4b0082",
  violet:         "#7f00ff",
  lavender:       "#c89fd4",
  lilac:          "#c8a0d0",
  plum:           "#7a3b5a",
  mulberry:       "#7a3060",
  grape:          "#6f2da8",
  eggplant:       "#614051",

  // ── Yellows & Oranges ─────────────────────────────────
  mustard:        "#d4a017",
  "mustard yellow": "#d4a017",
  yellow:         "#f5c518",
  "pale yellow":  "#f5e6a3",
  gold:           "#cfb53b",
  amber:          "#ffbf00",
  tangerine:      "#f28500",
  orange:         "#e07820",
  "dark orange":  "#c05808",
  "burnt sienna": "#e97451",
  apricot:        "#fbceb1",
  peach:          "#ffcba4",

  // ── Patterns ──────────────────────────────────────────
  "real tree":    "#4a5235",
  realtree:       "#4a5235",
  camo:           "#4a5235",
  camouflage:     "#4a5235",

  // ── Misc fashion ──────────────────────────────────────
  "dark indigo":  "#1a1a4a",
  indigo:         "#3f3f9f",
  "washed black": "#2c2c2c",
  "faded black":  "#2c2c2c",
  "vintage black":"#2a2626",
  "washed grey":  "#9a9490",
  "washed gray":  "#9a9490",
  caramel:        "#c68642",
  latte:          "#c8a478",
  "natural":      "#e8ddd0",
  "undyed":       "#e8ddd0",
  "raw":          "#dfd5c5",
  stripe:         "#808080",
  multi:          "#808080",
};

export function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 25%, 60%)`;
}

export function colorToHex(name: string): string {
  const lc = name.toLowerCase();
  return COLOR_HEX[lc] ?? hashColor(lc);
}

/* ── Image / colour helpers ──────────────────────────── */

/** Unique colors derived from image color_tags, in order of first appearance. */
export function extractColorsFromTags(images: ProductImage[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const img of images) {
    for (const tag of img.color_tags ?? []) {
      const key = tag.toLowerCase();
      if (tag && !seen.has(key)) {
        seen.add(key);
        colors.push(tag);
      }
    }
  }
  return colors;
}

/** Index of the first image whose color_tags include colorName. */
export function findImageIndexByTag(images: ProductImage[], colorName: string): number {
  if (!colorName) return 0;
  const lc = colorName.toLowerCase();
  const idx = images.findIndex((img) =>
    img.color_tags?.some((t) => t.toLowerCase() === lc),
  );
  return idx === -1 ? 0 : idx;
}
