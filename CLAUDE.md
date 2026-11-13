# Portfolio — Project Brief

A premium, fully 3D personal portfolio. Every screen has depth, every section is interactive.
The goal: every scroll makes the visitor stop and go "damn, that's good."

Owner: Kanishq Surendran (name/branding on site: TBD — "Kanishq Surendran", "Flash", or both)

---

## Style rules (non-negotiable)

- **Premium and classy**, like a luxury product launch site (Apple, Porsche, high-end watch brands).
- **NO particles, NO matrix/code rain, NO glitch effects, NO techy gimmicks, NO chromatic aberration.**
- Realism over effects: real materials (brushed metal, glass, leather, rubber), studio lighting, soft shadows, reflections.
- Motion is slow, weighted and eased (think expo/quart easing, never bouncy or snappy).
- Lots of negative space. Big editorial typography (a refined serif + a clean grotesk).
- Restraint: one hero idea per screen. If an effect doesn't feel expensive, cut it.
- Optional: very faint film grain. Nothing else on top.
- No flat 2D screens anywhere — every section has layered depth or real 3D.

---

## Stack

- React + Vite (TypeScript)
- React Three Fiber + drei (3D)
- @react-three/postprocessing (subtle only: soft bloom on highlights, depth of field)
- GSAP + ScrollTrigger (scroll-driven timelines)
- Lenis (smooth scroll)
- Deploy: Cloudflare Pages
- 3D models as compressed .glb (Draco/Meshopt), textures as KTX2/WebP

---

## Global systems

1. **Preloader** — minimal 0→100 counter in fine serif, then a slow curtain reveal.
2. **Page transitions (Porsche-style)** — the new page emerges from the centre of the screen as a 3D panel and expands to fill it, while the old page recedes in depth and darkens.
3. **Theme toggle** — neumorphic sliding switch (sun/moon). On toggle, the new theme spreads outward *from the button* with an organic ink-bleed edge (WebGL noise mask shader), like ink soaking into paper. Available on every page.
4. **Smooth scroll** with Lenis, synced to GSAP ScrollTrigger.
5. **Cursor** — small, elegant dot that grows into a label ("Drag", "Open", "Spin") over interactive 3D objects. No warping.
6. **Optional UI sound** — subtle mechanical clicks/ticks, off by default, toggle in nav.

---

## Sections

### 1. Hero — You
Reference: liiv (giant text layered INTO the landscape).
- Huge name in serif spanning the screen. Kanishq stands *between* layers: background scenery → giant letters → him in front → foreground layer.
- Scroll: layers separate in depth (parallax), camera slowly pushes in.
- Higgsfield-generated aura-pose video sequence scrubbed by scroll (he turns, light builds around him). Cinematic lighting, no particles.
- Interactive: mouse moves the layers subtly (depth parallax).

### 2. The Watch — exploded view
Reference: Aurus.
- Luxury mechanical watch, dark warm studio lighting.
- Scroll disassembles it along its axis: strap → case → bezel → dial → movement → gears. Gears keep ticking.
- Labels fade in beside each part in small caps.
- Interactive: drag to rotate the whole assembly; hover a part to isolate it (others dim); click the crown to wind it and the hands spin.

### 3. Cans — floating carousel
Reference: CIAO Energy.
- Arc of floating cans with reflections on a glossy floor, a lit pedestal at centre.
- Interactive: arrows/drag to cycle; click a can → camera flies in, background shifts to the flavour colour, info panel slides in; drag to rotate the can freely.
- Made-up brand (TBD) with 4–6 flavours.

### 4. Sneaker — product through the type
Reference: Vibram "COMFORT".
- Giant bold word; the shoe rotates *through* the letters (passing in front of and behind them).
- Interactive: drag to spin; click colourway swatches → material swaps live; size buttons react.

### 5. Headphones — scroll-driven build
- Headphones assemble/disassemble on scroll (cups, drivers, cushions, band).
- Interactive: click a cup to open it and reveal the driver; toggle an "ANC" switch that changes the scene's lighting/mood.

### 6. Handheld console — projects showcase
Reference: Buttermax.
- Transparent handheld console floating over bold type, tilting with the cursor.
- Its screen plays Kanishq's projects (Property Wallet, CRM Cockpit, etc.).
- Interactive: press the D-pad / A-B buttons on the 3D model to switch projects; clicking the screen opens the project page via the centre-expand transition.

### 7. Work gallery — floating cards in space
Reference: Active Theory (cards only — NO particles).
- Glass/metal-edged project cards floating at different depths in a dark space.
- Interactive: drag/scroll to fly through; hover tilts a card; click → card expands into the full case-study page.

### 8. Contact
- Big editorial type with depth layers.
- A 3D object (e.g. the watch from section 2) showing Kanishq's live local time (IST).
- Links: GitHub (FLASH860), LinkedIn, email.

---

## Assets

- **Higgsfield (MCP):** aura-pose videos of Kanishq from his photos (/assets/me), landscape backgrounds, product renders, label/packaging art, ambient hero clips.
- **3D models (.glb):** watch, can, sneaker, headphones, console. Source from Sketchfab (check licence — CC-BY or CC0 only, credit in footer) or model in Blender. Higgsfield is for images/video, not 3D models.
- **Photos of Kanishq:** /assets/me — full body, plain background, good light, several angles.

---

## Performance

- Lazy-load each section's 3D scene when it nears the viewport; dispose when far away.
- Target 60fps on a mid-range laptop.
- Mobile: lighter versions (fewer parts, baked lighting, prerendered video where needed). Never broken, just simpler.
- Respect prefers-reduced-motion.

---

## Build order

1. Skeleton + Lenis/GSAP + theme toggle (ink-bleed) + page transitions + preloader
2. Hero (needs photos + Higgsfield)
3. Watch exploded view
4. Cans carousel
5. Sneaker
6. Headphones
7. Console projects showcase
8. Work gallery + case-study pages
9. Contact
10. Mobile pass, performance pass, deploy to Cloudflare Pages

Work section by section. Run the dev server and let Kanishq feel each section before moving on.
