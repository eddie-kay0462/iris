# Handoff: Road to HQ — Mobile Responsive Fixes

## Overview
The "Road to HQ" page is the campaign landing page for 1NRI's goal of selling 6,000 units to fund their first permanent HQ in Accra, Ghana. The **desktop version is complete and should not be changed**. This handoff covers making the page render properly on mobile viewports (≤ 639px), specifically within the iris Next.js codebase.

## About the Design Files
The bundled `Road to HQ.html` is a **design reference prototype** built in HTML with Tailwind CSS. It is NOT production code to copy directly. The task is to **port the mobile fixes into the iris Next.js/React codebase**, matching the design's intended behavior using the project's existing patterns and component library.

## Fidelity
**High-fidelity.** The desktop version is pixel-accurate to intent. The mobile version needs the fixes described below applied to the existing codebase's responsive styles. Match the design system tokens in `colors_and_type.css` (bundled) for colors, spacing, type sizes, and font stacks.

---

## Current Mobile Bugs (viewport ≤ 639px)

The screenshots in `/screenshots/` show the current broken state. Here's every issue:

---

### 1. Hero Title "ROAD TO HQ" — Overflows viewport

**Problem:** The `h1` is set to `text-[2.75rem]` (44px) at base, but the bold uppercase Helvetica Neue renders far too wide for a 375–390px screen. It bleeds off both edges.

**Fix:** Scale the title down on mobile. Recommended:
```css
/* At max-width: 639px */
.hero-title {
  font-size: 2.25rem;   /* 36px — fits on 375px screens */
  /* OR use clamp: clamp(2rem, 10vw, 2.75rem) */
}
```

The existing `@media (max-width: 374px)` rule drops it to `2.5rem` but that's still too large. The breakpoint should be `639px` not `374px`.

**Relevant HTML (line ~172):**
```html
<h1 class="hero-title display mt-4 text-[2.75rem] font-bold uppercase tracking-tight text-white sm:text-7xl lg:text-[7.5rem] leading-[0.9]">
  Road to HQ
</h1>
```

---

### 2. Hero Date "26.12.2026" — Overflows viewport

**Problem:** The date uses `font-script text-4xl sm:text-6xl` (Caveat, 36px base). At 375px with the script font, it clips on the right edge.

**Fix:** Reduce to `text-3xl` (30px) at base, or use `clamp(1.75rem, 8vw, 2.25rem)`.

**Relevant HTML (line ~163):**
```html
<div class="hero-date font-script text-4xl sm:text-6xl lg:text-7xl text-white leading-none" style="font-weight:500;">26.12.2026</div>
```

---

### 3. Hero Counter Grid (Sold / Progress / Target) — Right column clipped

**Problem:** The 3-column counter grid (`grid-cols-3`) gets too tight at 375px. The "TARGET" label and "6,000" number are partially cut off on the right edge.

**Fix:** Either:
- Reduce the font size of the counter numbers from `text-2xl` (24px) to `text-xl` (20px) on mobile
- OR reduce the grid gap and add `overflow: hidden` protection
- OR stack the counter vertically on very small screens (< 375px)

The progress bar width (`w-28`) is fine but the flanking text columns need breathing room.

**Relevant HTML (line ~179):**
```html
<div class="mt-8 sm:mt-10 grid w-full max-w-md grid-cols-3 items-end gap-3 sm:gap-6 text-white sm:max-w-none">
```

---

### 4. Hero CTAs — Side-by-side overflow on mobile

**Problem:** The CTA buttons use `sm:flex-row` to go horizontal at 640px+, but at base they're `flex-col` with `w-full`. However, the `max-w-xs` (320px) container with `px-5` padding on the parent leaves very little room — on some screens the buttons clip.

**Fix:** Ensure CTAs remain full-width stacked on mobile. The current HTML is mostly correct but confirm:
- Buttons should be `w-full` (not `sm:w-56`) at mobile
- Remove `px-10` padding on the buttons at mobile — it's too generous for 375px width

**Relevant HTML (line ~193):**
```html
<div class="mt-8 sm:mt-10 flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
  <a class="inline-block w-full sm:w-56 bg-white px-10 py-3.5 ...">Shop Now</a>
  <a class="inline-block w-full sm:w-56 border ...">Learn More</a>
</div>
```

---

### 5. Hero Background Image — Not displaying on mobile

**Problem:** There are two hero images: `.hero-bg-desktop` (iris/homepage-1.jpeg — studio camo shirt shot) and `.hero-bg-mobile` (hero-apoluo-mobile.png — model with grey jacket on brick wall). The CSS media queries at `max-width: 639px` hide the desktop image and show the mobile one. But the mobile image path needs to be correct in the Next.js build.

**CSS rules (already in the HTML, lines 69–76):**
```css
@media (max-width: 639px) {
  .hero-bg-desktop { display: none; }
  .hero-bg-mobile  { display: block; }
  .hero-video      { display: none; }
}
@media (min-width: 640px) {
  .hero-bg-mobile  { display: none; }
  .hero-bg-desktop { display: block; }
}
```

**Mobile image details:**
- File: `assets/hero-apoluo-mobile.png` (portrait aspect ratio, ~4:5)
- `object-position: 50% 25%` — focuses on the model's upper body
- The image should fill the hero viewport (`object-fit: cover`)

**Ensure** the mobile image path resolves in your Next.js `public/` or imported assets.

---

### 6. Header Nav — Desktop links visible instead of hamburger

**Problem:** The nav links ("ROAD TO HQ", "SHOP", "ABOUT") use `hidden md:flex` — they hide at < 768px. The hamburger button uses `md:hidden`. At 640px (sm breakpoint), the page is already in "mobile" territory for the hero content, but the nav doesn't collapse until 768px. This creates an awkward mid-range where the nav links are visible but hero content is mobile-sized.

**Recommendation:** Align the nav collapse breakpoint with the hero's mobile breakpoint. Either:
- Change nav links to `hidden sm:flex` and hamburger to `sm:hidden` (collapse at 640px)
- OR keep as-is if the iris codebase uses 768px as the nav breakpoint universally

**Relevant HTML (line ~106–112):**
```html
<nav class="hidden items-center gap-6 md:flex" id="nav-left">
  ...
</nav>
<button class="md:hidden text-white" aria-label="Menu" id="menu-btn">
  ...
</button>
```

---

### 7. Body Copy — Clipping on left edge

**Problem:** The hero description paragraph ("Six thousand units stand between us…") starts with "housand" visible — the "Six t" is clipped off the left edge. This is because the parent container has `px-5` (20px) but the text content is centered in a container that's fighting with the oversized title above it.

**Fix:** Once the title size is fixed (issue #1), this resolves automatically. The `px-5 sm:px-6` padding on the hero content div is correct.

---

### 8. Timeline Section — 4-column grid overflow

**Problem:** The timeline list items use `grid-cols-[60px_120px_1fr_140px]` at base. On a 375px screen, `60 + 120 + 1fr + 140 = 320px fixed + 1fr`. The 1fr column gets squeezed to near-zero, and text overflows.

**Existing fix (lines 83–91):** There's already a `@media (max-width: 639px)` rule that restacks the timeline:
```css
.tl-row {
  grid-template-columns: 48px 1fr !important;
  grid-template-rows: auto auto;
  ...
}
```

**Verify** this is implemented in the iris codebase. If the iris version doesn't have this media query, port it over.

---

### 9. Manifesto Section — Text sizing

**Problem:** The manifesto heading "We have to sell 6,000 units to afford a place to live." uses `text-2xl sm:text-5xl`. At base (`text-2xl` = 24px) it's readable but tight. The `text-5xl` kicks in at 640px which is fine.

**This is mostly OK** — just verify the `px-2 sm:px-0` padding on the body paragraph is ported.

---

### 10. The Road (SVG circle) Section — Hidden on mobile

**Problem:** The interactive SVG road circle is complex on mobile. The current design handles this by:
- Keeping the SVG visible on all screens (it scales via `w-full max-w-[760px]`)
- Showing a horizontal milestone strip below on `lg:hidden` (< 1024px)
- The milestone detail card stacks below the SVG on mobile

**This is already handled** — just verify the `lg:grid-cols-[1fr_360px]` → single column stacking works in the iris layout.

---

## Design Tokens Reference

All values from `colors_and_type.css` (bundled):

| Token | Value |
|-------|-------|
| `--ink` | `#000000` |
| `--paper` | `#FFFFFF` |
| `--bone` | `#F4F3F1` |
| `--font-sans` | `"HelveticaWorld", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-serif` | `"Hiragino Mincho Pro", "Times New Roman", "Songti SC", serif` |
| `--weight-light` | `300` |
| `--weight-bold` | `700` |
| `--space-4` | `16px` (mobile page padding) |
| `--space-6` | `32px` (desktop page padding) |
| `--radius-0` | `0` (all buttons/cards are sharp-cornered) |

The page also uses **Caveat** (Google Fonts) for the deadline date — `font-script` class in Tailwind config maps to `'"Caveat", cursive'`.

---

## Assets

| Asset | Path | Usage |
|-------|------|-------|
| Desktop hero | `assets/iris/homepage-1.jpeg` | Hero background ≥ 640px |
| Mobile hero | `assets/hero-apoluo-mobile.png` | Hero background < 640px |
| Homepage 2 | `assets/iris/homepage-2.jpeg` | CTA section + milestone cards |
| Homepage 3 | `assets/iris/homepage-3.png` | Milestone cards |
| Logo | `assets/iris/1nri-logo.png` | Header (inverted on hero, normal elsewhere) |

---

## Files in This Bundle

| File | Purpose |
|------|---------|
| `README.md` | This document |
| `reference/Road to HQ.html` | Full design reference (desktop + mobile CSS) |
| `reference/colors_and_type.css` | Design system tokens |
| `reference/styles.css` | DS entry point |
| `screenshots/desktop-hero.jpg` | Desktop hero (working) |
| `screenshots/mobile-hero-broken.jpg` | Mobile hero (current broken state) |
| `assets/hero-apoluo-mobile.png` | Mobile hero image to add to iris |

---

## Priority Order

1. **Hero title overflow** (most visible break)
2. **Hero date overflow**
3. **Counter grid clipping**
4. **Hero background image** (mobile swap)
5. **CTA button spacing**
6. **Timeline grid mobile restack**
7. **Nav breakpoint alignment** (optional)

---

## Quick Summary for Claude Code

> The Road to HQ page renders correctly on desktop but is broken on mobile (< 640px). The main issues are oversized hero text overflowing the viewport, the counter grid clipping on the right, and the mobile hero image not displaying. The page already has `@media (max-width: 639px)` rules for some sections — port those to the iris codebase and add the missing ones for the hero title/date/counter sizing. Do NOT change any desktop styles.
