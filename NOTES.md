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
