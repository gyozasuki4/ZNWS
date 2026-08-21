#!/usr/bin/env python3
"""
Download an MRMS GRIB2 product and render a transparent PNG + meta JSON
for MapLibre image overlay. Pure Python stdlib only (gzip, zlib, struct).

MRMS GRID is GRIB2 template 5.41 (PNG packing), 16-bit grayscale.

Usage:
  python3 scripts/render-mrms-mesh.py [output_dir] [product]
  product: one of PRODUCTS below (default mesh60)
"""
from __future__ import annotations

import gzip
import io
import json
import math
import struct
import sys
import time
import urllib.request
import re
import urllib.parse
import zlib
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError:
    np = None
    Image = None

RENDERER_VERSION = "mrms-grid-20260723-7"

def mrms_product(folder, label, units, title, palette, minimum=0.01, output_scale=1.0, file_folder=None, discrete=False):
    file_folder = file_folder or folder.replace("/", "_")
    return {
        "urls": [
            f"https://mrms.ncep.noaa.gov/2D/{folder}/MRMS_{file_folder}.latest.grib2.gz",
            f"https://mrms.ncep.noaa.gov/2D/{folder}/",
        ],
        "label": label, "units": units, "title": title, "palette": palette,
        "minimum": minimum, "output_scale": output_scale, "discrete": discrete,
    }

PRODUCTS = {
    "mesh": {
        "urls": [
            "https://mrms.ncep.noaa.gov/2D/MESH/MRMS_MESH.latest.grib2.gz",
            "https://mrms.ncep.noaa.gov/data/2D/MESH/MRMS_MESH.latest.grib2.gz",
        ],
        "label": "MESH",
        "units": "in",
        "title": "MRMS Maximum Estimated Size of Hail",
        "palette": "hail", "minimum": 0.5, "output_scale": 1 / 25.4,
    },
    "mesh60": {
        "urls": [
            "https://mrms.ncep.noaa.gov/2D/MESH_Max_60min/MRMS_MESH_Max_60min.latest.grib2.gz",
            "https://mrms.ncep.noaa.gov/data/2D/MESH_Max_60min/MRMS_MESH_Max_60min.latest.grib2.gz",
        ],
        "label": "MESH 60m",
        "units": "in",
        "title": "MRMS MESH Max 60-minute",
        "palette": "hail", "minimum": 0.5, "output_scale": 1 / 25.4,
    },
    "shi": mrms_product("SHI", "SHI", "index", "MRMS Severe Hail Index", "hail_index"),
    "posh": mrms_product("POSH", "POSH", "%", "MRMS Probability of Severe Hail", "percent"),
    "preciprate": mrms_product("PrecipRate", "Precip rate", "in/hr", "MRMS Surface Precipitation Rate", "precip", output_scale=1 / 25.4),
    "radarqpe15m": mrms_product("RadarOnly_QPE_15M", "Radar QPE 15m", "in", "MRMS Radar-only QPE 15 minute", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe1h": mrms_product("RadarOnly_QPE_01H", "Radar QPE 1h", "in", "MRMS Radar-only QPE 1 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe3h": mrms_product("RadarOnly_QPE_03H", "Radar QPE 3h", "in", "MRMS Radar-only QPE 3 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe6h": mrms_product("RadarOnly_QPE_06H", "Radar QPE 6h", "in", "MRMS Radar-only QPE 6 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe12h": mrms_product("RadarOnly_QPE_12H", "Radar QPE 12h", "in", "MRMS Radar-only QPE 12 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe24h": mrms_product("RadarOnly_QPE_24H", "Radar QPE 24h", "in", "MRMS Radar-only QPE 24 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe48h": mrms_product("RadarOnly_QPE_48H", "Radar QPE 48h", "in", "MRMS Radar-only QPE 48 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "radarqpe72h": mrms_product("RadarOnly_QPE_72H", "Radar QPE 72h", "in", "MRMS Radar-only QPE 72 hour", "qpe_official", minimum=0.254, output_scale=1 / 25.4, discrete=True),
    "multisensorqpe1h": mrms_product("MultiSensor_QPE_01H_Pass2", "Multi-sensor QPE 1h", "in", "MRMS Multi-sensor QPE 1 hour", "precip", output_scale=1 / 25.4),
    "multisensorqpe24h": mrms_product("MultiSensor_QPE_24H_Pass2", "Multi-sensor QPE 24h", "in", "MRMS Multi-sensor QPE 24 hour", "precip", output_scale=1 / 25.4),
    "flashari": mrms_product("FLASH/QPE_ARIMAX", "FLASH max ARI", "years", "FLASH Maximum QPE Average Recurrence Interval", "ari", file_folder="FLASH_QPE_ARIMAX"),
    "flashffg": mrms_product("FLASH/QPE_FFGMAX", "FLASH max/FFG", "ratio", "FLASH Maximum QPE to Flash Flood Guidance Ratio", "ratio", file_folder="FLASH_QPE_FFGMAX"),
    "soilsaturation": mrms_product("FLASH/CREST_MAXSOILSAT", "CREST soil saturation", "%", "FLASH CREST Maximum Soil Saturation", "percent", file_folder="FLASH_CREST_MAXSOILSAT"),
    "lightningdensity5": mrms_product("NLDN_CG_005min_AvgDensity", "CG density 5m", "flashes/km²/min", "NLDN Cloud-to-ground 5-minute Average Density", "lightning"),
    "lightningprob30": mrms_product("LightningProbabilityNext30min", "Lightning probability 30m", "%", "MRMS Lightning Probability Next 30 Minutes", "percent", file_folder="LightningProbabilityNext30minGrid"),
    "lightningprob60": mrms_product("LightningProbabilityNext60min", "Lightning probability 60m", "%", "MRMS Lightning Probability Next 60 Minutes", "percent", file_folder="LightningProbabilityNext60minGrid"),
    "lightningjump": mrms_product("LightningJumpGrid", "Lightning jump", "sigma", "MRMS Lightning Jump", "lightning"),
    "precipflag": mrms_product("PrecipFlag", "Precipitation type", "category", "MRMS Surface Precipitation Type", "category"),
    "wetbulb": mrms_product("Model_WetBulbTemp", "Wet-bulb temperature", "°C", "MRMS Model Wet-bulb Temperature", "temperature", minimum=-90),
}

# Hail size (mm) → RGB  (common severe-hail palette)
MESH_COLORS = [
    (0.0, (0, 0, 0)),
    (5.0, (4, 233, 231)),
    (12.7, (1, 159, 244)),  # ~0.5"
    (19.0, (3, 0, 244)),
    (25.4, (2, 253, 2)),  # 1.00"
    (31.8, (1, 197, 1)),
    (38.1, (253, 248, 2)),  # 1.50"
    (44.5, (229, 188, 0)),
    (50.8, (253, 139, 0)),  # 2.00"
    (63.5, (212, 0, 0)),  # 2.50"
    (76.2, (188, 0, 0)),  # 3.00"
    (88.9, (248, 0, 253)),  # 3.50"
    (101.6, (152, 84, 198)),  # 4.00"
    (127.0, (255, 255, 255)),
]


PALETTES = {
    "hail": MESH_COLORS,
    "hail_index": [(0, (4, 233, 231)), (20, (2, 253, 2)), (50, (253, 248, 2)), (80, (212, 0, 0)), (100, (248, 0, 253))],
    "percent": [(0, (4, 233, 231)), (20, (1, 159, 244)), (40, (2, 253, 2)), (60, (253, 248, 2)), (80, (253, 139, 0)), (100, (212, 0, 0))],
    "precip": [(0, (4, 233, 231)), (2.54, (1, 159, 244)), (6.35, (2, 253, 2)), (12.7, (253, 248, 2)), (25.4, (253, 139, 0)), (50.8, (212, 0, 0)), (101.6, (248, 0, 253))],
    "qpe_official": [
        (0.254, (0, 236, 236)), (1.27, (0, 200, 240)), (2.54, (0, 160, 255)), (6.35, (0, 60, 255)),
        (12.7, (0, 255, 0)), (19.05, (0, 220, 0)), (25.4, (0, 190, 0)), (38.1, (0, 141, 0)),
        (50.8, (255, 255, 0)), (63.5, (240, 210, 0)), (76.2, (231, 180, 0)), (101.6, (200, 120, 0)),
        (127, (255, 160, 160)), (152.4, (255, 60, 60)), (177.8, (230, 0, 0)), (203.2, (180, 0, 0)),
        (228.6, (250, 0, 255)), (254, (217, 0, 217)), (304.8, (164, 0, 164)), (355.6, (120, 0, 120)),
        (406.4, (255, 255, 255)), (457.2, (192, 192, 255)), (508, (192, 255, 255)), (609.6, (255, 255, 192))
    ],
    "ari": [(0, (4, 233, 231)), (1, (2, 253, 2)), (2, (253, 248, 2)), (5, (253, 139, 0)), (10, (212, 0, 0)), (50, (248, 0, 253))],
    "ratio": [(0, (4, 233, 231)), (.5, (2, 253, 2)), (1, (253, 248, 2)), (2, (253, 139, 0)), (3, (212, 0, 0)), (5, (248, 0, 253))],
    "lightning": [(0, (4, 233, 231)), (1, (1, 159, 244)), (2, (253, 248, 2)), (5, (253, 139, 0)), (10, (212, 0, 0)), (20, (248, 0, 253))],
    "temperature": [(-40, (76, 29, 149)), (-20, (1, 159, 244)), (0, (4, 233, 231)), (10, (2, 253, 2)), (20, (253, 248, 2)), (30, (212, 0, 0))],
    "category": [(0, (100, 116, 139)), (1, (2, 253, 2)), (2, (1, 159, 244)), (3, (248, 0, 253)), (4, (253, 139, 0)), (5, (212, 0, 0))],
}

def color_for(value: float, palette: str, minimum: float, discrete: bool = False) -> tuple[int, int, int, int]:
    if not math.isfinite(value) or value < minimum:
        return (0, 0, 0, 0)
    stops = PALETTES[palette]
    if discrete:
        color = stops[0][1]
        for threshold, candidate in stops:
            if value < threshold:
                break
            color = candidate
        return (*color, 225)
    if value <= stops[0][0]:
        r, g, b = stops[0][1]
        return (r, g, b, 180)
    if value >= stops[-1][0]:
        r, g, b = stops[-1][1]
        return (r, g, b, 230)
    for i in range(1, len(stops)):
        v0, c0 = stops[i - 1]
        v1, c1 = stops[i]
        if value <= v1:
            t = (value - v0) / max(v1 - v0, 1e-6)
            r = int(c0[0] + (c1[0] - c0[0]) * t)
            g = int(c0[1] + (c1[1] - c0[1]) * t)
            b = int(c0[2] + (c1[2] - c0[2]) * t)
            alpha = 120 + int(110 * min(1.0, max(0, t)))
            return (r, g, b, min(230, alpha))
    r, g, b = stops[-1][1]
    return (r, g, b, 230)


def download(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ZNCaveWeatherOps/1.0 (+https://zasnetwx.com)",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "")
    if url.endswith("/") or "text/html" in content_type:
        names = sorted(set(re.findall(r'href=["\']([^"\']+\.grib2\.gz)["\']', data.decode("utf-8", "ignore"))))
        if not names:
            raise ValueError(f"No GRIB2 files listed at {url}")
        return download(urllib.parse.urljoin(url, names[-1]))
    if not data or len(data) < 200:
        raise ValueError(f"Download too small ({len(data)} bytes) from {url}")
    return data


def download_first(urls: list[str]) -> tuple[bytes, str]:
    errors: list[str] = []
    for url in urls:
        try:
            return download(url), url
        except Exception as err:  # noqa: BLE001 — try next URL
            errors.append(f"{url}: {err}")
    raise RuntimeError("All MRMS downloads failed: " + " | ".join(errors[:4]))


def parse_grib2_sections(blob: bytes) -> dict[int, bytes]:
    if blob[:4] != b"GRIB":
        raise ValueError("Not a GRIB message")
    off = 16
    secs: dict[int, bytes] = {}
    while off < len(blob) - 4:
        if blob[off : off + 4] == b"7777":
            break
        seclen = struct.unpack(">I", blob[off : off + 4])[0]
        if seclen < 5 or off + seclen > len(blob):
            raise ValueError(f"Bad GRIB section at {off}")
        sect = blob[off + 4]
        secs[sect] = blob[off : off + seclen]
        off += seclen
    return secs


def parse_grid(s3: bytes) -> dict:
    # Section 3, grid template 0 (lat/lon)
    npts = struct.unpack(">I", s3[6:10])[0]
    template = struct.unpack(">H", s3[12:14])[0]
    if template != 0:
        raise ValueError(f"Unsupported grid template {template}")
    t = 14
    ni = struct.unpack(">I", s3[t + 16 : t + 20])[0]
    nj = struct.unpack(">I", s3[t + 20 : t + 24])[0]
    lat1 = struct.unpack(">i", s3[t + 32 : t + 36])[0] / 1e6
    lon1 = struct.unpack(">i", s3[t + 36 : t + 40])[0] / 1e6
    lat2 = struct.unpack(">i", s3[t + 41 : t + 45])[0] / 1e6
    lon2 = struct.unpack(">i", s3[t + 45 : t + 49])[0] / 1e6
    di = struct.unpack(">I", s3[t + 49 : t + 53])[0] / 1e6
    dj = struct.unpack(">I", s3[t + 53 : t + 57])[0] / 1e6
    scan = s3[t + 57]
    return {
        "npts": npts,
        "ni": ni,
        "nj": nj,
        "lat1": lat1,
        "lon1": lon1,
        "lat2": lat2,
        "lon2": lon2,
        "di": di,
        "dj": dj,
        "scan": scan,
    }


def parse_packing(s5: bytes) -> dict:
    npts = struct.unpack(">I", s5[5:9])[0]
    template = struct.unpack(">H", s5[9:11])[0]
    if template not in (0, 41):
        raise ValueError(f"Unsupported data template {template}")
    R = struct.unpack(">f", s5[11:15])[0]
    E = struct.unpack(">h", s5[15:17])[0]
    D = struct.unpack(">h", s5[17:19])[0]
    nbits = s5[19]
    return {"npts": npts, "template": template, "R": R, "E": E, "D": D, "nbits": nbits}


def parse_reference_time(s1: bytes) -> str | None:
    """Read the GRIB2 Section 1 reference timestamp."""
    try:
        year = struct.unpack(">H", s1[12:14])[0]
        month, day, hour, minute, second = s1[14:19]
        return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}Z"
    except (IndexError, struct.error, ValueError):
        return None


def decode_png_gray16(png: bytes) -> tuple[int, int, list[int]]:
    """Return (width, height, list of uint16 values row-major)."""
    if np is not None and Image is not None:
        with Image.open(io.BytesIO(png)) as image:
            values = np.asarray(image, dtype=np.uint16)
            if values.ndim != 2:
                raise ValueError(f"Expected grayscale PNG, got array shape {values.shape}")
            height, width = values.shape
            return width, height, values

    if png[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Section 7 is not PNG")
    p = 8
    w = h = bitd = color = None
    idat = bytearray()
    while p + 8 <= len(png):
        ln = struct.unpack(">I", png[p : p + 4])[0]
        p += 4
        typ = png[p : p + 4]
        p += 4
        chunk = png[p : p + ln]
        p += ln + 4  # data + crc
        if typ == b"IHDR":
            w, h, bitd, color = struct.unpack(">IIBB", chunk[:10])
        elif typ == b"IDAT":
            idat.extend(chunk)
        elif typ == b"IEND":
            break
    if w is None or bitd != 16 or color != 0:
        raise ValueError(f"Expected 16-bit gray PNG, got {w}x{h} bit={bitd} color={color}")

    raw = zlib.decompress(bytes(idat))
    bpp = 2
    stride = 1 + w * bpp
    if len(raw) != h * stride:
        raise ValueError("PNG raw size mismatch")

    # Unfilter into bytearray of length w*h*2
    out = bytearray(w * h * bpp)
    prev = bytearray(w * bpp)
    for y in range(h):
        row = raw[y * stride : (y + 1) * stride]
        filt = row[0]
        cur = bytearray(row[1:])
        if filt == 1:  # Sub
            for i in range(len(cur)):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + left) & 255
        elif filt == 2:  # Up
            for i in range(len(cur)):
                cur[i] = (cur[i] + prev[i]) & 255
        elif filt == 3:  # Average
            for i in range(len(cur)):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev[i]) // 2)) & 255
        elif filt == 4:  # Paeth

            def paeth(a: int, b: int, c: int) -> int:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    return a
                if pb <= pc:
                    return b
                return c

            for i in range(len(cur)):
                a = cur[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + paeth(a, b, c)) & 255
        elif filt != 0:
            raise ValueError(f"Unsupported PNG filter {filt}")
        out[y * w * bpp : (y + 1) * w * bpp] = cur
        prev = cur

    # Big-endian uint16
    values = [0] * (w * h)
    for i in range(w * h):
        o = i * 2
        values[i] = (out[o] << 8) | out[o + 1]
    return w, h, values


def lon_to_180(lon: float) -> float:
    while lon > 180:
        lon -= 360
    while lon < -180:
        lon += 360
    return lon


def mercator_y(lat: float) -> float:
    """Spherical Web-Mercator Y in an arbitrary linear coordinate."""
    limited = max(-85.05112878, min(85.05112878, lat))
    radians = math.radians(limited)
    return math.log(math.tan(math.pi / 4 + radians / 2))


def reproject_latlon_rows_to_mercator(rgba: bytes, width: int, height: int, south: float, north: float) -> bytes:
    """Resample regular-latitude rows for a MapLibre Web-Mercator image quad."""
    if height < 2 or north <= south:
        return rgba
    source = memoryview(rgba)
    output = bytearray(len(rgba))
    north_y = mercator_y(north)
    south_y = mercator_y(south)
    row_bytes = width * 4
    for target_row in range(height):
        fraction = target_row / (height - 1)
        target_y = north_y + (south_y - north_y) * fraction
        target_lat = math.degrees(2 * math.atan(math.exp(target_y)) - math.pi / 2)
        source_fraction = (north - target_lat) / (north - south)
        source_row = max(0, min(height - 1, round(source_fraction * (height - 1))))
        source_start = source_row * row_bytes
        target_start = target_row * row_bytes
        output[target_start : target_start + row_bytes] = source[source_start : source_start + row_bytes]
    return bytes(output)


def write_png_rgba(path: Path, width: int, height: int, rgba: bytes) -> None:
    """Minimal PNG encoder (RGBA8)."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    row_len = width * 4
    for y in range(height):
        raw.append(0)  # filter None
        start = y * row_len
        raw.extend(rgba[start : start + row_len])
    compressed = zlib.compress(bytes(raw), 6)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    path.write_bytes(png)


def render(product_key: str, out_dir: Path, max_dim: int = 2000) -> dict:
    prod = PRODUCTS[product_key]
    out_dir.mkdir(parents=True, exist_ok=True)
    urls = prod.get("urls") or ([prod["url"]] if prod.get("url") else [])
    gz, source_url = download_first(urls)
    try:
        blob = gzip.decompress(gz)
    except Exception as err:  # noqa: BLE001
        # Some endpoints may already return uncompressed GRIB2
        if gz[:4] == b"GRIB":
            blob = gz
        else:
            raise RuntimeError(f"gzip decompress failed from {source_url}: {err}") from err
    if blob[:4] != b"GRIB":
        raise RuntimeError(
            f"Not GRIB2 (starts {blob[:16]!r}) from {source_url}; "
            "server may be blocked from mrms.ncep.noaa.gov"
        )
    # Preserve the native, georeferenced 24-hour QPE grid for derived products.
    # The display PNG is intentionally downsampled and colorized, so it cannot
    # be used for numeric rainfall calculations.
    raw_grid_path = None
    if product_key == "radarqpe24h":
        raw_grid_path = out_dir / f"{product_key}.grib2"
        temporary_raw_grid_path = out_dir / f".{product_key}.grib2.tmp"
        temporary_raw_grid_path.write_bytes(blob)
        temporary_raw_grid_path.replace(raw_grid_path)
    secs = parse_grib2_sections(blob)
    if 3 not in secs or 5 not in secs or 7 not in secs:
        raise RuntimeError(f"GRIB missing sections {sorted(secs)} from {source_url}")
    grid = parse_grid(secs[3])
    pack = parse_packing(secs[5])
    png_payload = secs[7][5:]
    w, h, packed = decode_png_gray16(png_payload)

    if w != grid["ni"] or h != grid["nj"]:
        # still ok if dimensions match packing npts
        pass

    # Normalize GRIB scan order to the image convention MapLibre requires:
    # row 0 north, column 0 west. Bit 1 means -i; bit 2 means +j.
    flip_x = bool(grid["scan"] & 0x80)
    flip_y = bool(grid["scan"] & 0x40)
    if np is not None and isinstance(packed, np.ndarray):
        if flip_x:
            packed = np.fliplr(packed)
        if flip_y:
            packed = np.flipud(packed)
    elif flip_x or flip_y:
        normalized = [0] * (w * h)
        for y in range(h):
            source_y = h - 1 - y if flip_y else y
            for x in range(w):
                source_x = w - 1 - x if flip_x else x
                normalized[y * w + x] = packed[source_y * w + source_x]
        packed = normalized

    binary_scale = 2.0 ** pack["E"]
    decimal_scale = 10.0 ** pack["D"]
    R = pack["R"]

    # Downsample for map display
    step = max(1, math.ceil(max(w, h) / max_dim))
    out_w = (w + step - 1) // step
    out_h = (h + step - 1) // step
    rgba = bytearray(out_w * out_h * 4)
    min_v = 1e9
    max_v = -1e9
    nonzero = 0

    pooled = None
    if np is not None and isinstance(packed, np.ndarray):
        pad_h = out_h * step - h
        pad_w = out_w * step - w
        padded = np.pad(packed, ((0, pad_h), (0, pad_w)), mode="constant")
        pooled = padded.reshape(out_h, step, out_w, step).max(axis=(1, 3))

    for oy in range(out_h):
        for ox in range(out_w):
            if pooled is not None:
                p = int(pooled[oy, ox])
            else:
                sy0 = oy * step
                sy1 = min(h, sy0 + step)
                sx0 = ox * step
                sx1 = min(w, sx0 + step)
                # Stdlib fallback: preserve the maximum hail cell per block.
                p = 0
                for sy in range(sy0, sy1):
                    row = sy * w
                    for sx in range(sx0, sx1):
                        candidate = packed[row + sx]
                        if candidate > p:
                            p = candidate
            # GRIB2 simple/PNG packing: Y = (R + X * 2^E) / 10^D.
            # Applying the decimal divisor only to X makes ordinary QPE
            # values negative when the reference value is non-zero.
            value = (R + p * binary_scale) / decimal_scale
            minimum = prod.get("minimum", 0.01)
            if value < minimum:
                r, g, b, a = 0, 0, 0, 0
            else:
                r, g, b, a = color_for(value, prod["palette"], minimum, prod.get("discrete", False))
                nonzero += 1
                if value < min_v:
                    min_v = value
                if value > max_v:
                    max_v = value
            i = (oy * out_w + ox) * 4
            rgba[i : i + 4] = bytes((r, g, b, a))

    if nonzero == 0:
        min_v, max_v = 0.0, 0.0

    # GRIB La1/Lo1 and La2/Lo2 describe cell centers. MapLibre image
    # coordinates describe the outside edges, so expand by half a grid cell.
    west = lon_to_180(min(grid["lon1"], grid["lon2"]) - grid["di"] / 2)
    east = lon_to_180(max(grid["lon1"], grid["lon2"]) + grid["di"] / 2)
    # if grid crosses antimeridian oddly, MRMS CONUS is west→east in 0-360
    if east < west:
        west, east = east, west
    south = min(grid["lat1"], grid["lat2"]) - grid["dj"] / 2
    north = max(grid["lat1"], grid["lat2"]) + grid["dj"] / 2

    # Static public maps use a geographic/equirectangular projection.
    geographic_png_path = out_dir / f"{product_key}-geographic.png"
    write_png_rgba(geographic_png_path, out_w, out_h, bytes(rgba))

    # MapLibre image sources interpolate their corner coordinates in Web
    # Mercator. MRMS rows are equally spaced in latitude, so feeding the raw
    # image directly shifts mid-latitude data north. Resample rows first.
    rgba = reproject_latlon_rows_to_mercator(bytes(rgba), out_w, out_h, south, north)

    png_path = out_dir / f"{product_key}.png"
    json_path = out_dir / f"{product_key}.json"
    write_png_rgba(png_path, out_w, out_h, rgba)

    meta = {
        "renderer": "mrms-grid",
        "rendererVersion": RENDERER_VERSION,
        "product": product_key,
        "productLabel": prod["label"],
        "title": prod["title"],
        "units": prod["units"],
        "image": png_path.name,
        "geographicImage": geographic_png_path.name,
        "width": out_w,
        "height": out_h,
        "sourceWidth": w,
        "sourceHeight": h,
        "downsample": step,
        "gridScanMode": grid["scan"],
        "projection": "EPSG:3857",
        "bounds": [
            [west, north],
            [east, north],
            [east, south],
            [west, south],
        ],
        "bbox": [west, south, east, north],
        "valueRange": {"min": round(min_v * prod.get("output_scale", 1), 2), "max": round(max_v * prod.get("output_scale", 1), 2)},
        "nonzeroPixels": nonzero,
        "validTime": parse_reference_time(secs.get(1, b""))
        or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sourceUrl": source_url,
        "legend": [
            {"value": round(v * prod.get("output_scale", 1), 2), "color": f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"}
            for v, c in PALETTES[prod["palette"]]
        ],
    }
    if raw_grid_path is not None:
        meta["rawGrid"] = raw_grid_path.name
        meta["rawGridUnits"] = "mm"
    json_path.write_text(json.dumps(meta, indent=2))
    print(json.dumps({"ok": True, "png": str(png_path), "json": str(json_path), "meta": meta}))
    return meta


def main() -> int:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/radar/mrms")
    product = sys.argv[2] if len(sys.argv) > 2 else "mesh60"
    if product not in PRODUCTS:
        print(f"Unknown product {product}; choose: {', '.join(PRODUCTS)}", file=sys.stderr)
        return 2
    try:
        render(product, out_dir)
        return 0
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
