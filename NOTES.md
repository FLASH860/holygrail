# NOTES — decisions and open questions

Written while building autonomously. Newest decisions are appended per build step.

## Blocker: Higgsfield had no credits

The Higgsfield account connected to this session is on the **free plan with 0 credits**.
Every paid call was refused:

- `remove_background` → "Out of credits in the selected workspace."
- `generate_image` → "Requires basic plan or higher."
- video / 3D generation need credits too, so they were not attempted.

The three photos **were uploaded** to the Higgsfield media library (they sit there unused, ready
for when credits exist). Everything Higgsfield was supposed to produce was replaced locally:

| Asked for (Higgsfield)                | What was done instead                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `remove_background` on the 3 photos   | Local matting model (`@imgly/background-removal-node`), `scripts/cutout.mjs`           |
| Relight + upscale                     | Scripted warm low-key grade, rim clean-up, Lanczos upscale: `scripts/process_assets.py` |
| Aura-pose video, scroll-scrubbed      | **Not generated.** Hero relights the cut-out with a scroll-driven shader instead      |
| Hero landscape layers, backgrounds    | Procedurally generated layers (`scripts/process_assets.py` → `/assets/hero`)           |
| Can label art                         | Drawn at runtime on canvas (`src/three/labels.ts`)                                     |
| Product shots → `generate_3d` → .glb  | Models built procedurally in Three.js (see MODELS.md)                                  |

## Step 1 — skeleton

- **Router**: tiny custom one (`src/lib/router.ts`), two routes: `/` and `/work/:slug`. The home page
  stays mounted under the case-study panel so its WebGL scenes do not have to rebuild on "back".
- **Page transition**: incoming page emerges from screen centre as a 3D panel and expands; the
  outgoing page recedes (scale) and darkens. Closing plays the same move in reverse.
- **Ink-bleed theme toggle**: a WebGL noise shader renders an expanding ink blot into a 64-frame
  sprite sheet centred on the toggle; the View Transitions API reveals the new theme through it as
  a CSS mask. Browsers without View Transitions (older Firefox) get an instant switch.
- **Fonts**: Bodoni Moda (serif) + Archivo (grotesk, variable width), self-hosted via Fontsource.
- **Sound**: synthesised with WebAudio (no samples), off by default.
- `/reference` (your folder is named `reference`, singular) and `/references` are both gitignored.
- The raw photos were moved from `/assets` into `/assets/me` (where CLAUDE.md says they live) and
  **gitignored**: the repo is public and the site only needs the processed versions. Files are
  byte-for-byte untouched.

## Step 2 — hero + about

- **Hero composition** (back → front): sky → far ridge → giant "KANISHQ" (3D serif text) → mid ridge →
  warm halo → you → near ridge → out-of-focus grass. All real planes at different depths, so the
  scroll push-in and the cursor both produce true parallax.
- **Hero photo**: photo 3 (the seated studio portrait) — it already has the cinematic grade. It is
  cropped above the lower edge of the frame (the original has duplicated hair shapes along the bottom).
- **Aura sequence substitute**: because no video could be generated, a shader relights the cut-out as
  you scroll: exposure builds, a rim light walks around the silhouette, a key light sweeps across the
  face, a soft halo grows behind, and the plane turns a few degrees. No particles.
  → When a Higgsfield sequence exists, export it as frames and set `media.me.heroSequence` in
  `src/config/media.ts`; the hero will scrub those frames instead. Suggested prompt is in MODELS.md.
- **About section** was not in CLAUDE.md but you mentioned one: added after the object sections' lead-in,
  using photo 1 regraded warm/low-key, as a stack of CSS 3D layers that tilt with the cursor.
- "Surendran" is set in italic serif over the foreground; the full name is an `<h1>` for screen readers.
- **Open**: About copy and the three facts (focus / based / status) are my wording — please edit.
  Location is shown as "India — IST" because CLAUDE.md only gives the timezone.

## Step 3 — watch

- Built procedurally (see MODELS.md). Nine parts explode along the watch axis as you scroll; the
  assembly turns to a 3/4 view while it comes apart so the layers read left-to-right.
- Order differs slightly from the brief's list (strap → case → bezel → dial → movement → gears):
  parts are laid out in their true physical stacking order, front to back, because that is what an
  exploded view is for.
- Hover isolates a part (others fade to 10%), drag rotates with inertia, clicking the gold crown
  winds it: hands sweep 12 turns and settle back on the real time, gears race, optional ticks.
- The intro copy slides away while the movement opens so the labels have room.
