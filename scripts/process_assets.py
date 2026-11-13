"""
Builds every raster asset the site reads.

  1. assets/me/*            (originals, never modified)
     + scripts/.cache/cutout-N.png (alpha from scripts/cutout.mjs)
     -> assets/me-processed/me-hero.webp, me-about.webp, me-alt.webp
  2. Procedural hero landscape layers -> assets/hero/*.webp

Local stand-in for Higgsfield (remove_background / relight / upscale / generate_image):
the account had no credits when this was built. See NOTES.md.

Usage:  node scripts/cutout.mjs && python scripts/process_assets.py
"""
import glob
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ME = os.path.join(ROOT, "assets", "me")
CACHE = os.path.join(ROOT, "scripts", ".cache")
OUT_ME = os.path.join(ROOT, "assets", "me-processed")
OUT_HERO = os.path.join(ROOT, "assets", "hero")
os.makedirs(OUT_ME, exist_ok=True)
os.makedirs(OUT_HERO, exist_ok=True)
rng = np.random.default_rng(7)


# ───────────────────────── helpers ─────────────────────────
def largest_component(alpha: np.ndarray) -> np.ndarray:
    """Keep only the main subject; drops stray props the matting model kept."""
    core = cv2.morphologyEx((alpha > 40).astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(core, 8)
    if n < 2:
        return alpha
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    # opening removes thin stray lines; dilating back keeps fine hair near the body
    body = cv2.dilate((labels == keep).astype(np.uint8), np.ones((15, 15), np.uint8))
    return np.where(body > 0, alpha, 0).astype(np.uint8)


def neutralise_fringe(rgb: np.ndarray, alpha: np.ndarray, width=11) -> np.ndarray:
    """Desaturate and darken the outer rim so colour spill from the old background disappears."""
    inner = cv2.erode(alpha, np.ones((width, width), np.uint8))
    edge = cv2.GaussianBlur(((alpha.astype(np.float32) - inner) / 255.0).clip(0, 1), (0, 0), 2)[..., None]
    img = rgb.astype(np.float32)
    lum = (img * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    warm = lum * np.array([1.0, 0.86, 0.7], np.float32) * 0.8
    return (img * (1 - edge) + warm * edge).clip(0, 255).astype(np.uint8)


def s_curve(x: np.ndarray, strength: float) -> np.ndarray:
    return x + strength * (x - 0.5) * (1 - np.abs(2 * x - 1)) * 2 * x * (1 - x) * 4


def grade_studio(rgb: np.ndarray, alpha: np.ndarray, exposure=0.82, warmth=0.07, sat=0.86, contrast=0.35):
    """Low-key warm studio grade: pull exposure, warm the mids, soften saturation,
    then paint a soft key light from upper-left that falls off toward the frame bottom."""
    img = rgb.astype(np.float32) / 255.0
    lum = (img * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    img = lum + (img - lum) * sat
    img *= exposure
    img = np.clip(s_curve(np.clip(img, 0, 1), contrast), 0, 1)
    # split tone — warm highlights, neutral-cool shadows
    w = np.clip(lum * 1.4, 0, 1)
    img[..., 0] += warmth * w[..., 0]
    img[..., 1] += warmth * 0.35 * w[..., 0]
    img[..., 2] -= warmth * 0.9 * w[..., 0]
    # painted key light
    h, wd = alpha.shape
    yy, xx = np.mgrid[0:h, 0:wd].astype(np.float32)
    key = np.exp(-(((xx / wd - 0.3) / 0.75) ** 2 + ((yy / h - 0.28) / 0.6) ** 2))
    img *= (0.5 + 0.62 * key)[..., None]
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


def fade_bottom(alpha: np.ndarray, frac: float) -> np.ndarray:
    h = alpha.shape[0]
    n = int(h * frac)
    ramp = np.ones(h, np.float32)
    ramp[h - n:] = np.linspace(1, 0, n) ** 1.5
    return (alpha.astype(np.float32) * ramp[:, None]).astype(np.uint8)


def upscale(im: Image.Image, factor: float) -> Image.Image:
    im = im.resize((int(im.width * factor), int(im.height * factor)), Image.LANCZOS)
    rgb = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    rgb.putalpha(im.getchannel("A"))
    return rgb


def bbox_crop(im: Image.Image, pad=12) -> Image.Image:
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 8)
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, im.width), min(ys.max() + pad, im.height)))


def save(im: Image.Image, path: str, q=88):
    im.save(path, "WEBP", quality=q, method=6)
    print(f"  {os.path.relpath(path, ROOT)}  {im.size}  {os.path.getsize(path) // 1024} KB")


# ───────────────────────── 1. photos ─────────────────────────
def process_photos():
    print("photos")
    src = sorted(glob.glob(os.path.join(ME, "*.jp*g")))
    if len(src) < 3:
        print("  need 3 photos in assets/me — skipping")
        return
    rgb, alpha = [], []
    for i, f in enumerate(src[:3], 1):
        rgb.append(np.array(Image.open(f).convert("RGB")))
        a = np.array(Image.open(os.path.join(CACHE, f"cutout-{i}.png")).convert("RGBA").getchannel("A"))
        a = largest_component(a)
        a = cv2.GaussianBlur(cv2.erode(a, np.ones((2, 2), np.uint8)), (0, 0), 0.7)  # trim halo
        alpha.append(a)

    # hero — the seated studio portrait (photo 3). Already cinematic: keep the grade,
    # crop off the frame's lower edge, upscale, feather the bottom into the foreground layer.
    cut = 742
    im = Image.fromarray(np.dstack([rgb[2][:cut], fade_bottom(alpha[2][:cut], 0.16)]), "RGBA")
    save(upscale(bbox_crop(im), 1.8), os.path.join(OUT_ME, "me-hero.webp"), 90)

    # about / alt — the two casual selfies, regraded to match the hero's warm low-key light.
    for idx, name, crop_h in ((0, "me-about", 1500), (1, "me-alt", 1230)):
        g = grade_studio(neutralise_fringe(rgb[idx], alpha[idx]), alpha[idx])
        im = Image.fromarray(np.dstack([g[:crop_h], fade_bottom(alpha[idx][:crop_h], 0.22)]), "RGBA")
        save(upscale(bbox_crop(im), 1.25), os.path.join(OUT_ME, f"{name}.webp"), 88)


# ───────────────────────── 2. hero landscape ─────────────────────────
W = 2880


def fbm1d(n, octaves, base, persistence=0.5):
    out = np.zeros(n, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        pts = max(int(base * 2 ** o), 2)
        ctrl = rng.random(pts + 3).astype(np.float32)
        x = np.linspace(1, pts + 1, n)
        i = x.astype(int)
        t = x - i
        t = t * t * (3 - 2 * t)
        out += amp * (ctrl[i] * (1 - t) + ctrl[i + 1] * t)
        tot += amp
        amp *= persistence
    return out / tot


def fbm2d(h, w, octaves, base, persistence=0.55, stretch=1.0):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gy = max(int(base * 2 ** o), 2)
        gx = max(int(base * 2 ** o * w / h / stretch), 2)
        out += amp * cv2.resize(rng.random((gy, gx)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
        tot += amp
        amp *= persistence
    return np.clip(out / tot, 0, 1)


def ridge(name, h, peak, rough, base_freq, tone_top, tone_bottom, blur):
    """One mountain layer: silhouette alpha + luminance that lifts into mist toward the base.
    Stored near-white so the site can tint it per theme."""
    prof = fbm1d(W, rough, base_freq, 0.52)
    prof = (prof - prof.min()) / (prof.max() - prof.min())
    prof = prof ** 1.25
    top = (h * (1 - peak) + (1 - prof) * h * peak * 0.9).astype(np.float32)
    yy = np.arange(h, dtype=np.float32)[:, None]
    depth = np.clip((yy - top[None, :]) / (h * 0.75), 0, 1)
    alpha = np.clip((yy - top[None, :]) / 1.6, 0, 1)
    lum = tone_top + (tone_bottom - tone_top) * depth ** 0.7
    lum += (fbm2d(h, W, 5, 6, 0.6, 2.5) - 0.5) * 0.07 * (1 - depth)
    lum = np.clip(lum, 0, 1)
    rgba = np.dstack([lum * 255] * 3 + [alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    save(im, os.path.join(OUT_HERO, f"{name}.webp"), 90)


def sky(name, top, mid, horizon, glow, cloud_tint, cloud_amt):
    h = 1500
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    top, mid, horizon, glow, cloud_tint = (np.array(c, np.float32) / 255 for c in (top, mid, horizon, glow, cloud_tint))
    t1 = np.clip(yy / 0.55, 0, 1) ** 1.2
    t2 = np.clip((yy - 0.55) / 0.45, 0, 1) ** 0.8
    img = (top * (1 - t1) + mid * t1) * (1 - t2) + horizon * t2
    img = np.broadcast_to(img, (h, W, 3)).copy()
    ys, xs = np.mgrid[0:h, 0:W].astype(np.float32)
    g = np.exp(-(((xs / W - 0.62) / 0.34) ** 2 + ((ys / h - 0.74) / 0.26) ** 2))
    img += glow * (g[..., None] ** 1.4) * 0.85
    clouds = fbm2d(h, W, 6, 3, 0.55, 3.2)
    clouds = np.clip((clouds - 0.46) * 3.2, 0, 1) ** 1.6
    band = np.exp(-((ys / h - 0.42) / 0.3) ** 2)
    c = (clouds * band * cloud_amt)[..., None]
    img = img * (1 - c) + (cloud_tint + glow * g[..., None] * 0.5) * c
    img += (rng.random((h, W, 1)).astype(np.float32) - 0.5) * 0.012  # dither against banding
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB")
    save(im.filter(ImageFilter.GaussianBlur(1.2)), os.path.join(OUT_HERO, f"{name}.webp"), 86)


def foreground():
    """Out-of-focus grass ridge closest to camera."""
    h = 760
    ss = 2
    im = Image.new("L", (W * ss, h * ss), 0)
    d = ImageDraw.Draw(im)
    ground = (h * (0.62 + 0.2 * (1 - fbm1d(W, 4, 2.2)))).astype(np.float32)
    for x in range(W):
        d.line([(x * ss, ground[x] * ss), (x * ss, h * ss)], fill=255, width=ss)
    for _ in range(5200):
        x = rng.random() * W
        gy = ground[int(x)]
        length = 40 + rng.random() ** 2 * 210
        lean = (rng.random() - 0.5) * 90 + 28
        pts, steps = [], 7
        for s in range(steps + 1):
            t = s / steps
            pts.append(((x + lean * t * t) * ss, (gy + 14 - length * t) * ss))
        d.line(pts, fill=255, width=int((1.5 + rng.random() * 3.5) * ss), joint="curve")
    a = np.array(im.resize((W, h), Image.LANCZOS), np.float32) / 255
    a = cv2.GaussianBlur(a, (0, 0), 3.2)
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    lum = np.clip(0.62 - yy * 0.5 + (fbm2d(h, W, 4, 8) - 0.5) * 0.25, 0.05, 1)
    rgba = np.dstack([lum * 255] * 3 + [a * 255]).astype(np.uint8)
    save(Image.fromarray(rgba, "RGBA"), os.path.join(OUT_HERO, "hero-foreground.webp"), 88)


def landscape():
    print("hero landscape")
    sky("hero-sky-dark", (9, 8, 9), (26, 19, 15), (92, 58, 30), (228, 150, 70), (58, 40, 30), 0.55)
    sky("hero-sky-light", (176, 190, 198), (214, 215, 208), (240, 226, 204), (255, 236, 200), (250, 247, 240), 0.8)
    ridge("hero-ridge-far", 820, 0.78, 7, 2.2, 0.62, 0.98, 2.2)
    ridge("hero-ridge-mid", 760, 0.7, 7, 1.7, 0.4, 0.86, 1.0)
    ridge("hero-ridge-near", 620, 0.6, 6, 1.3, 0.2, 0.6, 0)
    foreground()


if __name__ == "__main__":
    process_photos()
    landscape()
