/**
 * Single source of truth for every photo and generated image the site uses.
 * To swap a photo: drop the new file in /assets/me-processed (or /assets/hero)
 * and change the import below. Nothing else in the codebase references image paths.
 *
 * Processed versions are produced by:  node scripts/cutout.mjs && python scripts/process_assets.py
 */
import meHero from '@assets/me-processed/me-hero.webp'
import meAbout from '@assets/me-processed/me-about.webp'
import meAlt from '@assets/me-processed/me-alt.webp'
import skyDark from '@assets/hero/hero-sky-dark.webp'
import skyLight from '@assets/hero/hero-sky-light.webp'
import ridgeFar from '@assets/hero/hero-ridge-far.webp'
import ridgeMid from '@assets/hero/hero-ridge-mid.webp'
import ridgeNear from '@assets/hero/hero-ridge-near.webp'
import foreground from '@assets/hero/hero-foreground.webp'

export const media = {
  me: {
    /** Cut-out portrait that stands between the landscape and the giant name. */
    hero: { src: meHero, width: 1866, height: 1245 },
    /** Portrait used in the About section. */
    about: { src: meAbout, width: 898, height: 1381 },
    /** Spare portrait (used in Contact). */
    alt: { src: meAlt, width: 502, height: 1093 },
    /**
     * Optional scroll-scrubbed aura sequence for the hero.
     * Set to { frames: string[] } (ordered image URLs) once a Higgsfield video has been
     * generated and exported as frames — the hero will scrub it instead of the shader relight.
     */
    heroSequence: null as null | { frames: string[] },
  },
  hero: {
    sky: { dark: skyDark, light: skyLight },
    ridgeFar,
    ridgeMid,
    ridgeNear,
    foreground,
  },
} as const
