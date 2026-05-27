# Claude Code — Implement Editorial Light onboarding (1NRI Allies)

> Paste this entire file into Claude Code as your initial prompt.
> Run it from the **monorepo root** (the directory that contains `apps/allies/`).
> All paths below are relative to that root.

---

## Task

Replace the current 1NRI Allies onboarding screens with the **Editorial Light** direction (Direction A) from the design system. Same four steps, same data, same server actions — totally new look.

**Co-brand mandate.** Allies now sell pieces from two houses — **1NRi** and **Unlikely Alliances** (`ua.` shortened mark). Every screen carries a side-by-side co-brand lockup at the top, and the body copy reflects that allies represent both houses.

Steps (in order):

1. **Welcome** — full-bleed hero image, eyebrow, big Helvetica-Light greeting, "Begin" CTA. Copy mentions both 1NRi and Unlikely Alliances.
2. **Your post** — location card + commission rate as a black-on-bone featured number; commission caption names both houses.
3. **Your face** — profile photo upload, framed circle with corner ticks.
4. **Ready** — campaign hero with overlapping avatar, "Enter the dashboard" CTA.

Replace `apps/allies/app/onboarding/OnboardingFlow.tsx` (and `StepPhoto.tsx`) in place. Keep `page.tsx` and `actions.ts` unchanged — the server data flow, `markOnboarded()`, and `uploadAllyAvatar()` already work and must not be touched.

---

## Sources you will read first (in this order)

1. `design_handoff_onboarding_editorial_light/reference/onboarding-screens.jsx`
   The design source. Look at the `// DIRECTION A — EDITORIAL LIGHT` section
   (everything from the `AStyles` constant through `AReady`). The four
   components you are recreating are: `AWelcome`, `ATerritory`, `APhoto`,
   `AReady`. Plus the shared atoms above them: `Eyebrow`, `StepTicks`,
   `InkCTA`, `LogoMark`, `ATopBar`.
2. `design_handoff_onboarding_editorial_light/reference/_current/OnboardingFlow.tsx`
   The current implementation. Treat it as the **wiring template** — keep
   its props shape (`{ ally }: { ally: Ally }`), step-state pattern,
   `useRouter()`, `markOnboarded()` call, `framer-motion` page transition,
   and `<input>` / file-upload plumbing. Throw away its visual layer.
3. `design_handoff_onboarding_editorial_light/reference/_current/StepPhoto.tsx`
   The photo-upload component. Keep its `cropToJpeg()` helper,
   drag-to-reposition logic, `uploadAllyAvatar()` server-action call,
   and `toast.error()` failure paths. Re-skin the markup only.
4. `design_handoff_onboarding_editorial_light/reference/colors_and_type.css`
   1NRI design tokens. The brand is functionally monochromatic — ink on
   bone — with sharp corners, hairline rules, and 100% line-height on
   display type.

Open the standalone preview in a browser to see the target pixel result:
`design_handoff_onboarding_editorial_light/reference/onboarding-screens.jsx`
renders inside an iOS 390×844 frame. The preview file (`onboarding.html`)
sits one level up in the design-system project — if you have access, open
it; otherwise the JSX file is the source of truth.

---

## Assets to copy into the app

The four screens reference these images and the brand wordmark. Copy from
the handoff folder to wherever the Next.js app serves static assets
(typically `apps/allies/public/onboarding/` — create the folder if it
doesn't exist):

| Source | Destination | Used in |
|---|---|---|
| `design_handoff_onboarding_editorial_light/assets/lookbook-1.jpeg` | `apps/allies/public/onboarding/lookbook-1.jpeg` | A1 Welcome hero |
| `design_handoff_onboarding_editorial_light/assets/lookbook-2.jpeg` | `apps/allies/public/onboarding/lookbook-2.jpeg` | A2 Territory location card |
| `design_handoff_onboarding_editorial_light/assets/lookbook-3.png` | `apps/allies/public/onboarding/lookbook-3.png` | A4 Ready hero |
| `design_handoff_onboarding_editorial_light/assets/1nri-logo-black.png` | `apps/allies/public/onboarding/1nri-logo-black.png` | Top bar wordmark (left) |
| `design_handoff_onboarding_editorial_light/assets/ua-logo-black.png` | `apps/allies/public/onboarding/ua-logo-black.png` | Top bar wordmark (right) |
| `design_handoff_onboarding_editorial_light/assets/ua-logo-white.png` | `apps/allies/public/onboarding/ua-logo-white.png` | (Reserved for future dark variants) |
| `design_handoff_onboarding_editorial_light/assets/HelveticaWorld-Regular.ttf` | `apps/allies/public/fonts/HelveticaWorld-Regular.ttf` (only if not already self-hosted elsewhere) | All display type |

Reference them from React with the `/onboarding/<filename>` path
(`<img src="/onboarding/1nri-logo-black.png" />`, etc.).

---

## Font setup

Add `HelveticaWorld` as a self-hosted `@font-face` in `apps/allies/app/globals.css`:

```css
@font-face {
  font-family: 'HelveticaWorld';
  src: url('/fonts/HelveticaWorld-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

The design uses Helvetica Light (300) and Bold (700) — the brand has only
shipped Regular (400). Fall back to system Helvetica for the other
weights via the standard sans stack:

```
font-family: 'HelveticaWorld', 'Helvetica Neue', Helvetica, Arial, sans-serif;
```

Don't pull from a CDN. Don't substitute Inter for body type. Inter is fine
for the small tracked-out eyebrow (10px / 0.28em).

---

## Visual spec — Editorial Light

These values come straight from the JSX. Match them.

### Page chassis (all four screens)

- Background: `#F4F3F1` (bone).
- Default ink: `#000`. Body copy: `#3B414A` (slate). Meta: `#59626E` (steel).
- Page padding: `24px` horizontal.
- Top bar: `padding: 70px 24px 0`, holds the logo (left, 14px tall, no
  invert — it's already black) and the step ticks (right).
- **Step ticks (`StepTicks` atom):** four 2px-tall bars. The current step
  is 22px wide; the rest are 8px wide. Steps `<= current` are filled
  `#000`; later steps are `rgba(0,0,0,0.18)`. Width transitions
  `240ms cubic-bezier(0.2,0.7,0.2,1)`.
- No header rule. No card shadows anywhere. `border-radius: 0` on every
  surface (the brand is anti-rounded — circles for avatars are the only
  curve in the system).

### Shared atoms

**`Eyebrow`** — tracked-out caps. Inter / HelveticaWorld 10px / 500 /
letter-spacing `0.28em` / uppercase / `#000` (light) or
`rgba(255,255,255,0.6)` (dark).

**`InkCTA`** — primary button. Full width × 56px. Background `#000`. Text
`#F4F3F1`. Inter 12px / 700 / letter-spacing `0.22em` / uppercase. Label
on the left, `→` arrow on the right, `padding: 0 22px`, `space-between`.
No radius. Secondary variant: transparent fill with 1px ink border and
black text.

**`LogoMark`** — the **co-brand lockup**. Two wordmarks side-by-side
separated by a 1px vertical hairline rule. Render as a flex row with
`gap: 10px`, `align-items: center`:

1. `<img src="/onboarding/1nri-logo-black.png" alt="1NRI">` at `height: 14px`.
2. A `<div>` divider: `width: 1px; height: 14px; background: rgba(0,0,0,0.25);`.
3. `<img src="/onboarding/ua-logo-black.png" alt="Unlikely Alliances">` at `height: 13px` (the `ua.` mark optically reads heavier than the 1NRI wordmark, so size it 1px shorter to match optical weight).

Both wordmarks ship as black-on-transparent PNGs. Don't `filter: invert()`
them — they're already ink. Equal optical weight, no dominance — neither
house outranks the other in the lockup.

### A1 · Welcome

- Top bar (step 0).
- Below it (margin-top 30px): a 420px-tall full-bleed image. URL:
  `/onboarding/lookbook-1.jpeg`. `background-size: cover;
  background-position: center 18%`. The image extends edge-to-edge — no
  side gutters; ignore the page's 24px padding inside this strip.
- Overlay text in the image's lower-left corner: `left: 22px; bottom:
  22px`. Two stacked lines, gap 8px:
  - Eyebrow `FW'26 · CLASS 04` in `rgba(255,255,255,0.85)`.
  - Caps line `24 ALLiES · 12 LOCATIONS` — note the lowercase `i` in
    `ALLiES`; that's intentional brand styling, keep it.
    HelveticaWorld 11px / 700 / letter-spacing 0.06em / white.
  - Prepend the line with `TWO HOUSES · ` so it reads `TWO HOUSES ·
    24 ALLiES · 12 LOCATIONS` — cues the dual-brand mandate immediately
    on first impression.
- Body block underneath, `padding: 32px 24px 0`:
  - Eyebrow `Chapter 01 · Welcome` (margin-bottom 14px).
  - `<h1>` two-line greeting: `Welcome,\n{firstName(ally.full_name)}.`
    HelveticaWorld **300** / 38px / line-height 1 / letter-spacing
    `-0.01em`. Use `<br/>` not whitespace.
  - Body paragraph: "You've joined a small network of allies carrying
    both 1NRi and Unlikely Alliances forward in your city. Three minutes
    to set up. Then the work begins." HelveticaWorld 300 / 14px /
    line-height 1.5 / `#3B414A` / `max-width: 320px`. Margin-top 18px.
- Flex spacer pushes the CTA to the bottom. CTA: `InkCTA` labelled
  **"Begin"**. Bottom padding 28px.

### A2 · Your post

- Top bar (step 1).
- Block padding `44px 24px 0`.
- Eyebrow `Chapter 02 · Your post`.
- `<h1>` `Where you'll\ncarry both\nhouses.` Same display style as A1
  (three-line greeting; use explicit `<br/>` between each line).
- **Location card** — `margin-top: 32px`, `border: 1px solid #000`,
  `background: #fff`, no radius. Three rows stacked:
  1. Image: 160px tall, `/onboarding/lookbook-2.jpeg`, `background-position: center 30%`, `filter: grayscale(0.15) contrast(0.95)`.
  2. **Double hairline divider** — a 6px-tall band with a 1px top border and a 1px bottom border, both `#000`, paper between. This is a brand signature; preserve it exactly.
  3. Meta rows: `padding: 18px`. Two rows separated by a 1px `rgba(0,0,0,0.12)` rule at 14px above/below. Each row is `display: flex; justify-content: space-between; align-items: baseline`:
     - Left: 9px eyebrow (`Location` / `Type`).
     - Right: HelveticaWorld 300 / 13px / `#000` value. For the Type row, lowercase the value: `campus chapter` / `city chapter`.
- **Commission block** — directly below the location card, margin-top 18px.
  `padding: 20px 18px`, `background: #000`, color `#F4F3F1`.
  `display: flex; justify-content: space-between; align-items: center`.
  - Left column: 9px eyebrow `Your commission` (color
    `rgba(255,255,255,0.6)`, margin-bottom 6px) above the helper line
    "on every 1NRi & ua. sale, paid monthly" — HelveticaWorld 300 /
    11px / `rgba(255,255,255,0.7)`. The ampersand-separated brand list
    makes the dual-house commission explicit at the moment of money.
  - Right: the percentage rendered huge — HelveticaWorld 300 / 56px /
    line-height 1 / letter-spacing `-0.02em` / `#fff`, with the `%`
    glyph inline at 28px and 2px left margin.
  - Source the number from `(ally.commission_rate * 100).toFixed(0)`
    (the design rounds to integer percent, not the 1-decimal the
    current code shows).
- Flex spacer, then `InkCTA` labelled **"Continue"**. Bottom padding 28px,
  CTA wrapper padding-top 20px.

### A3 · Your face

- Top bar (step 2).
- Block padding `44px 24px 0`.
- Eyebrow `Chapter 03 · Your face`.
- `<h1>` `Show your\nface.` (Same display style.)
- Body paragraph: "So customers know who they're buying from. The Allies
  team will see it too." HelveticaWorld 300 / 14px / line-height 1.5 /
  `#3B414A` / `max-width: 300px`. Margin-top 16px.
- **Photo frame** — center-aligned, margin-top 36px. A 220×220 square
  with `border: 1px solid #000` and **four 12×12 corner ticks** — small
  `position: absolute` divs each pinned at -1px from a corner, drawing
  the two corner-adjacent borders only. (Look at the JSX for the exact
  border combinations.) Don't simplify this — the corner ticks are the
  editorial detail.
- Inside the square, a **168×168 circle**, `border-radius: 50%`,
  background `#E7E2D8`, holding the user's initials at HelveticaWorld
  300 / 64px / `#000`. Once the user picks a photo this circle becomes
  the live preview (re-use the `cropToJpeg` + drag-offset logic from
  the existing `StepPhoto.tsx`; only the chrome changes).
- **Camera pip** — a 36×36 black circle, bottom-right of the inner
  circle (`bottom: 8; right: 8`), with a 2px `#E7E2D8` ring. Inside, a
  16×16 Lucide-style camera SVG stroked at 1.5, color `#F4F3F1`.
- Caption row below the frame (margin-top 14, center-aligned):
  `JPG · PNG · UP TO 5MB` — 9px eyebrow in `#59626E`.
- Spacer, then the action stack (padding 20 top / 16 bottom, gap 10):
  - `InkCTA` labelled **"Choose Photo"** — this triggers the hidden
    `<input type="file">`. Once a file is loaded, the label flips to
    **"Choose a different photo"** and a second `InkCTA` labelled
    **"Upload & Continue"** appears beneath it (use the current
    component's two-button pattern).
  - **"Skip for now"** — text-only button, transparent, no border,
    HelveticaWorld 300 / 13px / `#3B414A` / underlined with 4px offset.
    Calls `onNext(undefined)`.

### A4 · Ready

- Top bar (step 3).
- Hero strip below the top bar (margin-top 30px): 360px tall, full
  width, `/onboarding/lookbook-3.png`, `background-position: center`.
- Over the hero: an absolutely-positioned overlay covering `inset: 0`
  with `background: linear-gradient(to bottom, transparent 50%,
  rgba(244,243,241,1) 100%)`. This blends the photo into the page
  bone-white below it.
- **Avatar overlap** — centered horizontally, `bottom: -38px` from the
  hero (so it pokes 38px into the body below). 76×76, `border-radius: 50%`,
  `background: #000`, `border: 4px solid #F4F3F1`. Inside: the user's
  initials at HelveticaWorld 300 / 26px / `#F4F3F1`. If `avatarUrl` is
  set, render the photo instead of the initials (`background-image: url(...)`).
- Body block: `padding: 60px 24px 0`, text-align center.
  - Eyebrow `Chapter 04 · Ready` (margin-bottom 14px).
  - `<h1>` `The post is\nyours, {firstName(ally.full_name)}.`
    HelveticaWorld 300 / 36px / line-height 1 / letter-spacing
    `-0.01em`.
  - Body: "Go make it count at **{location-first-token}**. The
    dashboard tracks every sale." 14px / 1.5 / `#3B414A` /
    `max-width: 280px`, centered (`margin: 16px auto 0`). The location
    token is highlighted by switching its color to `#000` — wrap it
    in a `<span>` with `color: #000`. Source the token from
    `ally.location.split(',')[0]` (or the campus name part — e.g.
    "Legon" from "University of Ghana, Legon"); fall back to the
    full string if no comma.
- Spacer, then `InkCTA` labelled **"Enter the dashboard"**, padding
  20 top / 28 bottom. On click → `markOnboarded(ally.id)` →
  `router.push('/')` — same as the current `finish()` handler.

---

## Behaviour to preserve from the current implementation

- Step state and `next()` / `direction` tracking — keep the framer-motion
  page-transition pattern. The new design works fine with the same
  enter-from-right / exit-to-left fade-slide; you can keep `variants` and
  `transition` as-is.
- The `<StepPhoto>` interactions: drag-to-reposition inside the circle,
  `cropToJpeg()` at 256×256 output, `uploadAllyAvatar()` server action,
  `toast.error()` on upload failure, and the "Skip for now" path that
  calls `onNext(undefined)`. Move all of that logic into the new
  visual layer unchanged — only the JSX and styling change.
- The `markOnboarded()` server action and `router.push('/')` redirect at
  the end of step 4.
- The "already onboarded → redirect" guard in `page.tsx`. Don't touch
  `page.tsx` or `actions.ts`.

---

## Behaviour to change

- Drop **all emoji** from the current implementation (`🎉`, `🎓`, `🏙️`,
  `📸`, `🚀`). The brand is anti-emoji.
- Drop the `framer-motion` slide-from-right transition's **direction**
  reversal logic if you don't end up exposing a back button — the
  current code tracks it but nothing decrements `step`. Either add a
  back affordance (small `←` glyph in the top bar that calls
  `setStep(s => s - 1); setDirection(-1)`) or simplify to forward-only.
  **Recommended: add the back affordance.** Place it left of the logo,
  18px Lucide chevron-left at `rgba(0,0,0,0.4)`. Hide on step 0.
- The current commission display (`(rate * 100).toFixed(1)`) shows
  "12.0%". The design shows an integer "12%". Use `.toFixed(0)`.
- The current location card pills (`Campus` / `City` color-coded badges)
  go away. The new design uses tracked-out caps eyebrow rows instead.
- The current "Add a profile photo" copy goes away. New copy is the
  declarative "Show your face." with the supporting line about
  customers and the Allies team.

---

## File layout after the change

```
apps/allies/
  app/
    onboarding/
      OnboardingFlow.tsx   ← rewritten; thin shell + 4 step components
      StepWelcome.tsx       ← new file, A1
      StepTerritory.tsx     ← new file, A2
      StepPhoto.tsx         ← rewritten visual layer; same upload logic
      StepReady.tsx         ← new file, A4
      atoms.tsx             ← new file: Eyebrow, StepTicks, InkCTA, LogoMark, TopBar
      page.tsx              ← UNCHANGED
      actions.ts            ← UNCHANGED
  public/
    onboarding/
      lookbook-1.jpeg
      lookbook-2.jpeg
      lookbook-3.png
      1nri-logo-black.png
    fonts/
      HelveticaWorld-Regular.ttf
```

Splitting each step into its own file keeps `OnboardingFlow.tsx` small
(state + animated step swap only) and makes the step components easy to
inline-edit later.

---

## Implementation order

1. Add the `@font-face` block and copy the font file into
   `apps/allies/public/fonts/`. Verify the font loads by opening the
   current onboarding screen and adding `font-family: 'HelveticaWorld'`
   in devtools.
2. Copy the four image assets into `apps/allies/public/onboarding/`.
3. Create `atoms.tsx` with `Eyebrow`, `StepTicks`, `InkCTA`, `LogoMark`,
   and `TopBar`. Lift the styles straight from the reference JSX.
4. Build `StepWelcome.tsx` first — it exercises the chassis, the eyebrow,
   the display headline, the body paragraph, and the primary CTA.
   Verify on screen before moving on.
5. Build `StepTerritory.tsx` — the double-hairline divider is the trickiest
   bit; make sure you can see both 1px rules on a 6px paper band.
6. Rewrite `StepPhoto.tsx` — keep the file-upload / drag / crop logic
   from `_current/StepPhoto.tsx` byte-for-byte; only the JSX changes.
7. Build `StepReady.tsx` — pay attention to the avatar's 38px negative
   overlap with the hero.
8. Rewrite `OnboardingFlow.tsx` to wire the four steps + the
   back-affordance into the framer-motion shell.
9. Smoke-test on a 390-wide viewport (Chrome devtools, iPhone 12 Pro).
   Watch for: font-weight 300 falling back unevenly on Windows
   (HelveticaWorld only ships Regular — Light comes from system
   Helvetica); the camera-pip ring matching the bone background; the
   double hairline reading as two distinct rules and not a 2px band.

---

## Acceptance checks

Before considering this done, verify:

- [ ] All four screens render at 390×844 without horizontal scroll or
      vertical overflow.
- [ ] The co-brand lockup (1NRi │ ua.) shows on **every** screen's top
      bar with the hairline divider visible between the two marks.
      Both marks the same optical height.
- [ ] No emoji anywhere in the onboarding tree.
- [ ] Step ticks animate width over 240ms when advancing.
- [ ] `Welcome,\n{firstName}.` and the other display headlines use
      explicit `<br/>` line breaks, not whitespace.
- [ ] Commission renders as `12%`, not `12.0%`.
- [ ] The double hairline on the A2 location card reads as two
      distinct ink rules with paper between them.
- [ ] On A3, uploading a photo replaces the initials inside the inner
      circle, drag still re-positions it, and `cropToJpeg` still
      produces a 256px JPEG on submit.
- [ ] On A4, the avatar overlaps the hero by 38px and shows the
      uploaded photo when `avatarUrl` is present.
- [ ] Clicking **Enter the dashboard** calls `markOnboarded()` and
      routes to `/`.
- [ ] Existing `(auth)` route, sales flow, and dashboard are
      untouched — `git diff` should only show changes under
      `app/onboarding/`, `app/globals.css`, and `public/`.

If anything in the design source contradicts this prompt, **the JSX in
`reference/onboarding-screens.jsx` wins** — it's the pixel source of
truth.
