#!/usr/bin/env python3
"""Stitch XYZ PNG tiles into one viewport PNG for MapLibre image sources.

Pre-colored RealEarth products (VAPR / GRAD / FIRE / RGB) are left alone so
their color tables stay stable across loop frames. Only raw mono ABI bands
get night-keying or a fixed stretch.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("Pillow required\n")
    sys.exit(2)

# Products that already ship a usable color table from RealEarth / NESDIS.
# Do NOT recolor these — per-frame recolor made the scale jump during animation.
PRECOLORED_PRODUCTS = {
    "abi07",  # BAND07-FIRE
    "abi08",  # BAND08-VAPR
    "abi09",  # BAND09-VAPR
    "abi10",  # BAND10-VAPR
    "abi13",  # BAND13-GRAD
    "truecolor",
    "geocolorre",
    "geocolor",
    "animated",
    "convection",
    "irsandwich",
    "nightmicro",
    "daymicro",
    "airmass",
    "dust",
    "firetemp",
    "snowfog",
    "cloudphase",
    "watervaporrgb",
    "so2",
    "ash",
}


def main() -> int:
    payload = json.load(sys.stdin)
    out_path = Path(payload["output"])
    width = int(payload["width"])
    height = int(payload["height"])
    west, south, east, north = [float(v) for v in payload["bbox3857"]]
    zoom = int(payload["zoom"])
    tiles = payload["tiles"]  # [{x,y,path}]
    product = str(payload.get("product") or "")

    if east <= west or north <= south or width < 8 or height < 8:
        sys.stderr.write("invalid dimensions\n")
        return 1

    earth = 20037508.342789244 * 2.0
    world_px = 256 * (2 ** zoom)
    meters_per_px = earth / world_px

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for tile in tiles:
        path = Path(tile["path"])
        if not path.is_file():
            continue
        try:
            img = Image.open(path).convert("RGBA")
        except Exception:
            continue
        img = enhance_satellite_rgba(img, product)
        tx = int(tile["x"])
        ty = int(tile["y"])
        tile_west = -20037508.342789244 + tx * 256 * meters_per_px
        tile_north = 20037508.342789244 - ty * 256 * meters_per_px
        left = int(round((tile_west - west) / (east - west) * width))
        right = int(round((tile_west + 256 * meters_per_px - west) / (east - west) * width))
        top = int(round((north - tile_north) / (north - south) * height))
        bottom = int(round((north - (tile_north - 256 * meters_per_px)) / (north - south) * height))
        if right <= 0 or bottom <= 0 or left >= width or top >= height:
            continue
        dest_w = max(1, right - left)
        dest_h = max(1, bottom - top)
        try:
            resized = img.resize((dest_w, dest_h), Image.Resampling.BILINEAR)
        except Exception:
            resized = img.resize((dest_w, dest_h), Image.BILINEAR)
        src_box = [0, 0, dest_w, dest_h]
        dst_x, dst_y = left, top
        if dst_x < 0:
            src_box[0] = -dst_x
            dst_x = 0
        if dst_y < 0:
            src_box[1] = -dst_y
            dst_y = 0
        if dst_x + (src_box[2] - src_box[0]) > width:
            src_box[2] = src_box[0] + (width - dst_x)
        if dst_y + (src_box[3] - src_box[1]) > height:
            src_box[3] = src_box[1] + (height - dst_y)
        if src_box[2] <= src_box[0] or src_box[3] <= src_box[1]:
            continue
        crop = resized.crop(tuple(src_box))
        canvas.paste(crop, (dst_x, dst_y), crop)

    canvas = enhance_satellite_rgba(canvas, product)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, format="PNG", optimize=True)
    return 0


def _is_precolored(product: str) -> bool:
    p = (product or "").lower().replace("_", "")
    if p in PRECOLORED_PRODUCTS:
        return True
    # RealEarth product id fragments
    if any(tag in p for tag in ("vapr", "grad", "fire", "convection", "airmass", "true-color", "truecolor", "geo-color", "geocolor")):
        return True
    return False


def _percentile(sorted_vals, p: float) -> int:
    if not sorted_vals:
        return 0
    idx = int(round((len(sorted_vals) - 1) * p))
    return sorted_vals[max(0, min(len(sorted_vals) - 1, idx))]


def _palette_visible(t: float) -> tuple[int, int, int]:
    v = int(max(0, min(255, t * 255)))
    return (v, int(v * 0.96), int(v * 0.90))


def _palette_ir(t: float) -> tuple[int, int, int]:
    """Stable IR ramp (fixed — not frame-dependent)."""
    t = max(0.0, min(1.0, t))
    if t < 0.35:
        u = t / 0.35
        return (int(30 + 50 * u), int(30 + 50 * u), int(40 + 40 * u))
    if t < 0.6:
        u = (t - 0.35) / 0.25
        return (int(80 + 120 * u), int(80 + 100 * u), int(80 - 40 * u))
    if t < 0.85:
        u = (t - 0.6) / 0.25
        return (int(200 + 40 * u), int(180 - 80 * u), int(40 - 20 * u))
    u = (t - 0.85) / 0.15
    return (int(240 + 15 * u), int(100 + 155 * u), int(20 + 235 * u))


def _palette_cirrus(t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        u = t * 2.0
        return (int(8 + 25 * u), int(16 + 130 * u), int(40 + 170 * u))
    u = (t - 0.5) * 2.0
    return (int(33 + 222 * u), int(146 + 109 * u), int(210 + 45 * u))


def _pick_palette(product: str):
    p = (product or "").lower()
    if p in {"abi04", "abi05", "abi06"}:
        return _palette_cirrus
    if p in {"abi01", "abi02", "abi03"}:
        return _palette_visible
    return _palette_ir


def enhance_satellite_rgba(img: Image.Image, product: str = "") -> Image.Image:
    """Leave pre-colored products alone; only fix raw mono slabs / night visible."""
    product_l = (product or "").lower()

    # Band 8/9/10 VAPR, Band 13 GRAD, RGBs, etc. — keep original color scale.
    if _is_precolored(product_l):
        return img

    pixels = list(img.getdata())
    palette = _pick_palette(product_l)
    is_visible = product_l in {"abi01", "abi02", "abi03"}

    # Visible raw: key out night black so we don't paint a solid slab.
    if is_visible:
        out = pixels[:]
        lit_idx = []
        for i, (r, g, b, a) in enumerate(pixels):
            if a <= 16:
                continue
            if r <= 28 and g <= 28 and b <= 28:
                out[i] = (0, 0, 0, 0)
            else:
                lit_idx.append(i)
        if len(lit_idx) < 80:
            img.putdata(out)
            return img
        # Fixed scale for daylight reflectance (stable across loop frames).
        for i in lit_idx:
            r, g, b, a = out[i]
            t = max(0.0, min(1.0, r / 255.0))
            out[i] = (*_palette_visible(t), a)
        dominant = Counter(out[i][:3] for i in lit_idx).most_common(1)[0][1]
        if dominant / len(lit_idx) > 0.70:
            for i in lit_idx:
                r, g, b, a = out[i]
                out[i] = (r, g, b, min(a, 18))
        img.putdata(out)
        return img

    opaque_idx = [i for i, p in enumerate(pixels) if p[3] > 16]
    if len(opaque_idx) < 80:
        return img

    # Already colorful (unexpected for raw mono) — leave alone.
    chroma = 0.0
    n = 0
    for i in opaque_idx[:: max(1, len(opaque_idx) // 600)]:
        r, g, b, a = pixels[i]
        chroma += abs(r - g) + abs(g - b)
        n += 1
    if n and (chroma / n) >= 22:
        return img

    vals = [pixels[i][0] for i in opaque_idx]
    lo, hi = min(vals), max(vals)
    span = hi - lo
    unique = len(set(vals))

    # No structure — fade instead of solid box.
    if span < 14 or unique < 14:
        out = pixels[:]
        for i in opaque_idx:
            r, g, b, a = pixels[i]
            out[i] = (r, g, b, min(a, 18))
        img.putdata(out)
        return img

    # Fixed full-byte scale (NOT per-frame percentiles) so animation colors stay put.
    out = pixels[:]
    for i in opaque_idx:
        r, g, b, a = pixels[i]
        t = max(0.0, min(1.0, r / 255.0))
        if palette is _palette_ir:
            # Raw IR often bright=warm; invert so cold tops go light.
            t = 1.0 - t
        out[i] = (*palette(t), a)

    dominant = Counter(out[i][:3] for i in opaque_idx).most_common(1)[0][1]
    if dominant / len(opaque_idx) > 0.70:
        for i in opaque_idx:
            r, g, b, a = out[i]
            out[i] = (r, g, b, min(a, 18))

    img.putdata(out)
    return img


enhance_flat_satellite = enhance_satellite_rgba


if __name__ == "__main__":
    raise SystemExit(main())
