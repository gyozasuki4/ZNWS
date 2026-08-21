#!/usr/bin/env python3
"""Render NEXRAD Level 3 products (e.g. Digital VIL) to polar-bin payload for the map client."""
import json
import math
import sys
from pathlib import Path


def fail_missing_dependency(error):
    print(
        "Missing Python radar rendering dependencies. Install with: "
        "python3 -m venv .venv && .venv/bin/python -m pip install metpy numpy",
        file=sys.stderr,
    )
    print(str(error), file=sys.stderr)
    sys.exit(2)


try:
    import numpy as np
except ImportError as error:
    fail_missing_dependency(error)

try:
    from PIL import Image
except ImportError as error:
    fail_missing_dependency(error)

try:
    from metpy.io import Level3File
except ImportError as error:
    fail_missing_dependency(error)


RENDERER_VERSION = "polar-bins-level3-20260715-8"
MAX_RAY_GAP_DEG = 2.5

# GR-style VIL palette (kg/m^2)
VIL_COLOR_TABLE = [
    (0.0, (0, 0, 0)),
    (5.0, (4, 233, 231)),
    (10.0, (1, 159, 244)),
    (15.0, (3, 0, 244)),
    (20.0, (2, 253, 2)),
    (25.0, (1, 197, 1)),
    (30.0, (0, 142, 0)),
    (35.0, (253, 248, 2)),
    (40.0, (229, 188, 0)),
    (45.0, (253, 139, 0)),
    (50.0, (212, 0, 0)),
    (55.0, (188, 0, 0)),
    (60.0, (248, 0, 253)),
    (65.0, (152, 84, 198)),
    (70.0, (253, 253, 253)),
]

# Precipitation accumulation (inches). Extra low-end separation keeps light
# totals readable while warm colors remain reserved for flood-relevant amounts.
PRECIP_COLOR_TABLE = [
    (0.0, (0, 0, 0)),
    (0.01, (210, 243, 255)),
    (0.05, (126, 211, 255)),
    (0.10, (48, 161, 245)),
    (0.25, (29, 91, 204)),
    (0.50, (45, 210, 91)),
    (0.75, (15, 151, 72)),
    (1.00, (245, 226, 58)),
    (1.50, (247, 181, 41)),
    (2.00, (244, 119, 34)),
    (3.00, (231, 54, 54)),
    (4.00, (174, 27, 45)),
    (5.00, (235, 65, 162)),
    (6.00, (174, 73, 225)),
    (8.00, (102, 49, 183)),
    (10.00, (238, 238, 244)),
    (12.00, (255, 255, 255)),
    (15.00, (174, 183, 194)),
]

VELOCITY_COLOR_TABLE = [
    (-100.0, (0, 255, 255)), (-70.0, (0, 255, 0)), (-35.0, (0, 128, 0)),
    (-5.0, (0, 64, 0)), (0.0, (210, 210, 210)), (5.0, (64, 0, 0)),
    (35.0, (160, 0, 0)), (70.0, (255, 0, 0)), (100.0, (255, 255, 0)),
]
REFLECTIVITY_COLOR_TABLE = [
    (-30.0, (116, 78, 173)), (-10.0, (204, 208, 175)), (0.0, (67, 94, 160)),
    (15.0, (106, 208, 228)), (20.0, (20, 230, 20)), (34.0, (10, 80, 0)),
    (40.0, (255, 225, 0)), (50.0, (255, 0, 0)), (60.0, (255, 255, 255)),
    (70.0, (178, 0, 255)), (80.0, (0, 0, 0)),
]
ECHO_TOPS_COLOR_TABLE = [
    (0.0, (0, 0, 0)), (10.0, (4, 233, 231)), (20.0, (1, 159, 244)),
    (30.0, (2, 253, 2)), (40.0, (253, 248, 2)), (50.0, (253, 139, 0)),
    (60.0, (212, 0, 0)), (70.0, (248, 0, 253)),
]
CC_COLOR_TABLE = [
    (0.0, (0, 0, 0)), (0.7, (30, 30, 120)), (0.8, (0, 120, 255)),
    (0.9, (0, 220, 180)), (0.95, (255, 230, 0)), (0.98, (255, 100, 0)),
    (1.0, (255, 255, 255)),
]
ZDR_COLOR_TABLE = [
    (-8.0, (40, 40, 160)), (-2.0, (0, 160, 255)), (0.0, (210, 210, 210)),
    (1.0, (0, 220, 0)), (3.0, (255, 230, 0)), (5.0, (255, 80, 0)),
    (8.0, (255, 0, 255)),
]
KDP_COLOR_TABLE = [
    (-2.0, (0, 100, 255)), (0.0, (20, 20, 20)), (0.5, (0, 220, 0)),
    (1.0, (255, 230, 0)), (2.0, (255, 100, 0)), (4.0, (220, 0, 0)),
    (8.0, (255, 0, 255)),
]
HHC_COLOR_TABLE = [
    (0.0, (0, 0, 0)), (1.0, (156, 156, 156)), (2.0, (118, 118, 118)),
    (3.0, (255, 176, 176)), (4.0, (0, 255, 255)), (5.0, (0, 144, 255)),
    (6.0, (0, 251, 144)), (7.0, (0, 187, 0)), (8.0, (208, 208, 96)),
    (9.0, (210, 132, 132)), (10.0, (255, 0, 0)), (14.0, (231, 0, 255)),
    (15.0, (119, 0, 125)),
]

PRODUCTS = {
    "reflectivitylevel3": {"label": "BR-L3", "units": "dBZ", "level3_codes": ["N0B", "N0Q", "N0R", "N0Z"], "color_table": REFLECTIVITY_COLOR_TABLE, "min_display": -30.0, "encode_min": -30.0, "encode_max": 80.0},
    "velocitylevel3": {"label": "VEL-L3", "units": "kt", "level3_codes": ["N0U", "N0G", "N0V"], "color_table": VELOCITY_COLOR_TABLE, "min_display": -100.0, "encode_min": -100.0, "encode_max": 100.0},
    "compositereflectivity": {"label": "CR", "units": "dBZ", "level3_codes": ["NCR"], "color_table": REFLECTIVITY_COLOR_TABLE, "min_display": -30.0, "encode_min": -30.0, "encode_max": 80.0},
    "vil": {
        "label": "VIL",
        "units": "kg/m²",
        "level3_codes": ["DVL", "NVL"],
        "color_table": VIL_COLOR_TABLE,
        "min_display": 1.0,
        "encode_min": 0.0,
        "encode_max": 80.0,
    },
    "precip1h": {
        "label": "1h Precip",
        "units": "in",
        # Prefer digital DAA once scaled; OHA is already inches (legacy)
        "level3_codes": ["DAA", "OHA", "N1P"],
        "color_table": PRECIP_COLOR_TABLE,
        "min_display": 0.01,
        "encode_min": 0.0,
        "encode_max": 8.0,
        "precip_inches": True,
    },
    "precip3h": {
        "label": "3h Precip",
        "units": "in",
        "level3_codes": ["DU3", "N3P"],
        "color_table": PRECIP_COLOR_TABLE,
        "min_display": 0.01,
        "encode_min": 0.0,
        "encode_max": 10.0,
        "precip_inches": True,
    },
    "stormtotal": {
        "label": "Storm Total (event)",
        "units": "in",
        "level3_codes": ["DTA", "NTP", "STA"],
        "color_table": PRECIP_COLOR_TABLE,
        "min_display": 0.01,
        "encode_min": 0.0,
        "encode_max": 15.0,
        "precip_inches": True,
    },
    "echotops": {"label": "Echo Tops", "units": "kft", "level3_codes": ["EET", "NET"], "color_table": ECHO_TOPS_COLOR_TABLE, "min_display": 1.0, "encode_min": 0.0, "encode_max": 80.0},
    "stormvelocity": {"label": "SRV", "units": "kt", "level3_codes": ["N0S", "N1S", "N2S", "N3S"], "color_table": VELOCITY_COLOR_TABLE, "min_display": -100.0, "encode_min": -100.0, "encode_max": 100.0},
    "correlation": {"label": "CC", "units": "ρhv", "level3_codes": ["N0C", "N1C", "N2C", "N3C"], "color_table": CC_COLOR_TABLE, "min_display": 0.0, "encode_min": 0.0, "encode_max": 1.0},
    "differentialreflectivity": {"label": "ZDR", "units": "dB", "level3_codes": ["N0X", "N1X", "N2X", "N3X"], "color_table": ZDR_COLOR_TABLE, "min_display": -8.0, "encode_min": -8.0, "encode_max": 8.0},
    "specificdifferentialphase": {"label": "KDP", "units": "deg/km", "level3_codes": ["N0K", "N1K", "N2K", "N3K"], "color_table": KDP_COLOR_TABLE, "min_display": -2.0, "encode_min": -2.0, "encode_max": 8.0},
    "hydrometeor": {"label": "HHC", "units": "type", "level3_codes": ["N0H", "N1H", "N2H", "N3H", "HHC"], "color_table": HHC_COLOR_TABLE, "min_display": 1.0, "encode_min": 0.0, "encode_max": 15.0},
    "hailindex": {"label": "Hail Index", "units": "cell", "level3_codes": ["NHI"]},
}


def render_hail_index(level3_file, output_json, output_bin):
    lat = float(getattr(level3_file, "lat", 0.0) or 0.0)
    lon = float(getattr(level3_file, "lon", 0.0) or 0.0)
    if abs(lat) > 90:
        lat /= 1000.0
    if abs(lon) > 180:
        lon /= 1000.0
    features = []
    for layer in getattr(level3_file, "sym_block", []) or []:
        for packet in layer or []:
            if not isinstance(packet, dict) or not all(key in packet for key in ("x", "y", "POH", "POSH", "Max Size")):
                continue
            count = min(len(packet["x"]), len(packet["y"]), len(packet["POH"]), len(packet["POSH"]), len(packet["Max Size"]))
            for index in range(count):
                x_km, y_km = float(packet["x"][index]), float(packet["y"][index])
                size_raw = float(packet["Max Size"][index])
                size_inches = size_raw / 100.0 if size_raw > 10 else size_raw
                point_lon = lon + x_km / (111.0 * max(math.cos(math.radians(lat)), 0.2))
                point_lat = lat + y_km / 111.0
                features.append({
                    "type": "Feature", "geometry": {"type": "Point", "coordinates": [point_lon, point_lat]},
                    "properties": {"poh": int(packet["POH"][index]), "posh": int(packet["POSH"][index]), "maxSize": round(size_inches, 2)}
                })
    output_json = Path(output_json)
    output_bin = Path(output_bin)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_bin.parent.mkdir(parents=True, exist_ok=True)
    output_bin.write_bytes(b"")
    payload = {"product": "hailindex", "productLabel": "Hail Index", "units": "cell", "renderer": "hail-index", "rendererVersion": RENDERER_VERSION, "sourceLevel": 3, "radarLat": lat, "radarLon": lon, "features": {"type": "FeatureCollection", "features": features}}
    output_json.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")


def color_table_payload(color_table):
    stops = []
    for stop in color_table:
        entry = {"value": float(stop[0]), "color": [int(stop[1][0]), int(stop[1][1]), int(stop[1][2])]}
        if len(stop) > 2:
            entry["endColor"] = [int(stop[2][0]), int(stop[2][1]), int(stop[2][2])]
        stops.append(entry)
    return stops


def encode_gate_bytes(data, vmin, vmax):
    encoded = np.zeros(data.shape, dtype=np.uint8)
    valid = np.isfinite(data)
    if not valid.any():
        return encoded
    span = max(float(vmax - vmin), 1e-6)
    scaled = (data[valid] - vmin) / span
    encoded[valid] = np.clip(np.rint(scaled * 254.0) + 1.0, 1, 255).astype(np.uint8)
    return encoded


def approximate_radar_bounds(radar_lon, radar_lat, max_range_km):
    dlat = max_range_km / 111.0
    cos_lat = max(math.cos(math.radians(radar_lat)), 0.2)
    dlon = max_range_km / (111.0 * cos_lat)
    return [
        [radar_lon - dlon, radar_lat + dlat],
        [radar_lon + dlon, radar_lat + dlat],
        [radar_lon + dlon, radar_lat - dlat],
        [radar_lon - dlon, radar_lat - dlat],
    ]


def write_native_raster(output_json, encoded, azimuths, first_gate, gate_width, product_config):
    """Write a transparent, north-up PNG for native MapLibre ImageSource clients."""
    size = 1024
    # Keep every native image on the same 460 km square so switching products
    # never stretches velocity or dual-pol data to a different map footprint.
    max_range = 460.0
    axis = np.linspace(-max_range, max_range, size, dtype=np.float32)
    east, north = np.meshgrid(axis, axis[::-1])
    ranges = np.hypot(east, north)
    bearings = np.mod(np.degrees(np.arctan2(east, north)), 360.0)

    sorted_az = np.asarray(azimuths, dtype=np.float32)
    insertion = np.searchsorted(sorted_az, bearings, side="left")
    right = np.mod(insertion, len(sorted_az))
    left = np.mod(insertion - 1, len(sorted_az))
    left_delta = np.abs((bearings - sorted_az[left] + 180.0) % 360.0 - 180.0)
    right_delta = np.abs((bearings - sorted_az[right] + 180.0) % 360.0 - 180.0)
    ray = np.where(left_delta <= right_delta, left, right)
    gate = np.floor((ranges - first_gate) / max(gate_width, 1e-6)).astype(np.int32)
    valid = (gate >= 0) & (gate < encoded.shape[1]) & (ranges <= max_range)
    samples = np.zeros((size, size), dtype=np.uint8)
    samples[valid] = encoded[ray[valid], gate[valid]]

    vmin = float(product_config["encode_min"])
    vmax = float(product_config["encode_max"])
    values = vmin + (np.arange(256, dtype=np.float32) - 1.0) / 254.0 * (vmax - vmin)
    lut = np.zeros((256, 4), dtype=np.uint8)
    stops = product_config["color_table"]
    for index, value in enumerate(values):
        chosen = stops[0][1]
        for stop in stops:
            if value >= float(stop[0]):
                chosen = stop[1]
            else:
                break
        lut[index, :3] = chosen
        lut[index, 3] = 220 if index > 0 and value >= float(product_config["min_display"]) else 0
    lut[0] = (0, 0, 0, 0)
    Image.fromarray(lut[samples], mode="RGBA").save(Path(output_json).with_suffix(".png"), optimize=True)


def extract_polar_from_level3(level3_file):
    """Return azimuth centers (deg), data [rays, gates], first_gate_km, gate_width_km, lat, lon."""
    if not getattr(level3_file, "sym_block", None):
        raise RuntimeError("Level 3 file has no symbology block")

    block = level3_file.sym_block[0][0]
    raw = block["data"]
    mapped = np.asarray(level3_file.map_data(raw), dtype=float)

    # Enhanced Echo Tops carries a primary height plane plus a one-bit
    # supplemental plane. The map consumes the meteorological value plane.
    if mapped.ndim == 3 and mapped.shape[0] == 2:
        mapped = mapped[0]

    # MetPy returns azimuth start list and range parameters.
    start_az = np.asarray(block.get("start_az", []), dtype=float)
    end_az = np.asarray(block.get("end_az", []), dtype=float)

    # Composite Reflectivity is delivered as a radar-centered Cartesian raster.
    # Resample it into the same polar-bin contract used by the map renderer.
    if not len(start_az) and "start_x" in block and mapped.ndim == 2:
        max_range = float(getattr(level3_file, "max_range", 230.0) or 230.0)
        gate_width = (max_range * 2.0) / max(mapped.shape)
        gate_count = max(1, int(max_range / gate_width))
        azimuths = np.arange(360.0, dtype=float)
        ranges = (np.arange(gate_count, dtype=float) + 0.5) * gate_width
        radians = np.deg2rad(azimuths)[:, None]
        center_row = (mapped.shape[0] - 1) / 2.0
        center_col = (mapped.shape[1] - 1) / 2.0
        cols = np.rint(center_col + np.sin(radians) * ranges / gate_width).astype(int)
        rows = np.rint(center_row - np.cos(radians) * ranges / gate_width).astype(int)
        rows = np.clip(rows, 0, mapped.shape[0] - 1)
        cols = np.clip(cols, 0, mapped.shape[1] - 1)
        mapped = mapped[rows, cols]
        start_az = azimuths
        end_az = azimuths + 1.0

    if mapped.ndim != 2:
        raise RuntimeError(f"Unexpected Level 3 data shape: {mapped.shape}")

    num_rays, num_gates = mapped.shape

    if len(start_az) == num_rays and len(end_az) == num_rays:
        azimuths = (start_az + end_az) / 2.0
    elif len(start_az) == num_rays:
        # Estimate half-width from median spacing.
        if num_rays > 1:
            diffs = np.diff(np.unwrap(np.deg2rad(start_az)))
            half = float(np.median(np.rad2deg(diffs))) / 2.0
        else:
            half = 0.5
        azimuths = start_az + half
    else:
        azimuths = np.linspace(0.0, 360.0, num_rays, endpoint=False)

    azimuths = np.mod(azimuths, 360.0)

    max_range = float(getattr(level3_file, "max_range", 460.0) or 460.0)
    # Level 3 products usually start near 0 with uniform gate spacing to max_range.
    gate_width = max_range / max(num_gates, 1)
    first_gate = gate_width / 2.0

    lat = float(getattr(level3_file, "lat", 0.0) or 0.0)
    lon = float(getattr(level3_file, "lon", 0.0) or 0.0)
    if not (abs(lat) > 0.1 and abs(lon) > 0.1):
        # Some readers stash site in metadata / prod_desc
        prod = getattr(level3_file, "prod_desc", None)
        if prod is not None:
            lat = float(getattr(prod, "lat", lat) or lat) / (1000.0 if abs(getattr(prod, "lat", 0) or 0) > 1000 else 1.0)
            lon = float(getattr(prod, "lon", lon) or lon) / (1000.0 if abs(getattr(prod, "lon", 0) or 0) > 1000 else 1.0)

    # MetPy often stores lat/lon in thousandths of a degree for Level 3.
    if abs(lat) > 90:
        lat = lat / 1000.0
    if abs(lon) > 180:
        lon = lon / 1000.0

    return azimuths, mapped, first_gate, gate_width, lat, lon, max_range


def normalize_velocity_to_knots(data, level3_file, product_id):
    """Normalize MetPy digital Level 3 velocity (m/s) to display knots."""
    if product_id not in {"velocitylevel3", "stormvelocity"}:
        return data, None
    source_units = str(getattr(getattr(level3_file, "map_data", None), "units", "") or "")
    if source_units.lower().replace(" ", "") in {"m/s", "mps", "meter/second", "meters/second"}:
        return data * 1.9438444924406, source_units
    return data, source_units or "kt"


def infer_level3_code(input_file, level3_file):
    name = Path(input_file).name.upper()
    match = None
    # NOAA Level 3 keys look like KOHX_DAA_2026_07_11_...
    parts = name.split("_")
    if len(parts) >= 2 and len(parts[1]) == 3:
        match = parts[1]
    if match:
        return match

    product_name = str(getattr(level3_file, "product_name", "") or "").upper()
    for code in ("N0B", "N0Q", "N0R", "N0Z", "N0G", "N0U", "N0V", "NCR", "DAA", "DTA", "DU3", "OHA", "N1P", "N3P", "NTP", "STA", "EET", "NET", "N0S", "N0C", "N0X", "N0K", "N0H", "HHC"):
        if code in product_name:
            return code
    return ""


def metadata_text(metadata):
    try:
        return json.dumps(metadata, default=str).lower()
    except Exception:
        return str(metadata).lower()


def finite_meta_max(metadata):
    value = metadata.get("max") if isinstance(metadata, dict) else None
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) and value > 0 else None


def normalize_precip_to_inches(data, level3_file, product_config, input_file=None):
    """
    Convert MetPy-mapped Level 3 precip fields to inches.

    Some Level 3 precip products arrive as inches, some as hundredths of an
    inch, and some as millimeters. Keep the client/UI in inches, but choose a
    conservative conversion instead of stretching the whole field to fit.
    """
    if not product_config.get("precip_inches"):
        return data

    out = np.array(data, dtype=float, copy=True)
    finite = out[np.isfinite(out)]
    if finite.size == 0:
        return out

    data_max = float(np.nanmax(finite))
    meta = getattr(level3_file, "metadata", None) or {}
    meta_max = finite_meta_max(meta)
    meta_blob = metadata_text(meta)
    product_code = infer_level3_code(input_file or "", level3_file)
    metric_hint = "mm" in meta_blob or "millimeter" in meta_blob or "millimetre" in meta_blob
    hundredth_hint = product_code in {"DAA", "DTA", "DU3"}

    candidates = [
        ("as-is", 1.0),
        ("/100 hundredths-in", 100.0),
        ("/25.4 mm-to-in", 25.4),
    ]

    if metric_hint:
        label, divisor = "/25.4 mm-to-in", 25.4
    elif meta_max is not None:
        # Treat metadata max as the decoded/display max when no metric unit is
        # advertised. Pick the standard conversion that best matches it.
        label, divisor = min(
            candidates,
            key=lambda item: abs((data_max / item[1]) - meta_max) / max(meta_max, 0.01),
        )
    elif hundredth_hint and data_max > 20.0:
        label, divisor = "/100 hundredths-in", 100.0
    else:
        label, divisor = "as-is", 1.0

    if divisor != 1.0:
        out = out / divisor
        print(
            f"Precip scale: {label} (code={product_code or 'unknown'} mapped_max={data_max:.2f}"
            + (f" meta_max={meta_max:.2f}" if meta_max is not None else "")
            + ")",
            file=sys.stderr,
        )
        return out

    # Heuristic without useful metadata: 1h/3h/storm totals rarely exceed these as true inches.
    encode_max = float(product_config.get("encode_max") or 8.0)
    if data_max > encode_max * 5.0:
        # Try /100 first for digital accumulations, then mm -> inches.
        if data_max / 100.0 <= encode_max * 2.5:
            out = out / 100.0
            print(f"Precip scale: /100 heuristic (mapped_max={data_max:.2f})", file=sys.stderr)
            return out
        # Try mm → inches
        if data_max / 25.4 <= encode_max * 2.5:
            out = out / 25.4
            print(f"Precip scale: /25.4 mm→in (mapped_max={data_max:.2f})", file=sys.stderr)
            return out

    # Clip absurd leftovers after conversion path not taken
    out = np.where(np.isfinite(out) & (out < 0), np.nan, out)
    return out


def render_product(input_file, output_json, output_bin, product_id="vil"):
    if product_id not in PRODUCTS:
        raise RuntimeError(f"Unsupported Level 3 product: {product_id}")

    product_config = PRODUCTS[product_id]
    print(f"Reading Level 3 file: {input_file}", file=sys.stderr)
    level3_file = Level3File(str(input_file))
    product_name = getattr(level3_file, "product_name", product_id)
    print(f"Level 3 product: {product_name}", file=sys.stderr)

    if product_id == "hailindex":
        render_hail_index(level3_file, output_json, output_bin)
        return

    azimuths, data, first_gate, gate_width, radar_lat, radar_lon, max_range = extract_polar_from_level3(level3_file)

    data, source_units = normalize_velocity_to_knots(data, level3_file, product_id)

    if not np.isfinite(data).any():
        raise RuntimeError(f"{product_config['label']} product had no displayable gates")

    # Sort by azimuth for consistent polar rendering.
    order = np.argsort(azimuths, kind="mergesort")
    azimuths = azimuths[order]
    data = data[order]

    data = normalize_precip_to_inches(data, level3_file, product_config, input_file)

    encode_min = float(product_config["encode_min"])
    encode_max = float(product_config["encode_max"])
    # Cap encode to real precip range so palette stays meaningful
    encoded = encode_gate_bytes(data, encode_min, encode_max)
    displayable = int(np.count_nonzero(encoded))
    if displayable == 0:
        raise RuntimeError(f"{product_config['label']} product had no displayable gates")

    finite = data[np.isfinite(data)]
    data_min = float(np.nanmin(finite))
    data_max = float(np.nanmax(finite))

    output_json = Path(output_json)
    output_bin = Path(output_bin)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_bin.parent.mkdir(parents=True, exist_ok=True)
    output_bin.write_bytes(encoded.astype("<u1", copy=False).tobytes(order="C"))
    write_native_raster(output_json, encoded, azimuths, first_gate, gate_width, product_config)

    product = {
        "product": product_id,
        "productLabel": product_config["label"],
        "units": product_config["units"],
        "renderer": "polar-bins",
        "rendererVersion": RENDERER_VERSION,
        "sourceLevel": 3,
        "field": str(product_name),
        "sourceUnits": source_units,
        "productCode": int(getattr(getattr(level3_file, "header", None), "code", 0) or 0),
        "sweep": 0,
        "elevation": float((getattr(level3_file, "metadata", None) or {}).get("el_angle", 0.0) or 0.0),
        "rayCount": int(len(azimuths)),
        "gateCount": int(data.shape[1]),
        "azimuthCoverage": 360.0,
        "azimuthMaxGap": 0.0,
        "fullCircle": True,
        "radarLon": float(radar_lon),
        "radarLat": float(radar_lat),
        "azimuths": [round(float(value), 4) for value in azimuths.tolist()],
        "firstGateKm": float(first_gate),
        "gateWidthKm": float(gate_width),
        "maxRayGapDeg": MAX_RAY_GAP_DEG,
        "encoding": {
            "type": "uint8",
            "nodata": 0,
            "vmin": encode_min,
            "vmax": encode_max,
            "layout": "ray-major",
        },
        "minDisplay": product_config["min_display"],
        "colorTable": color_table_payload(product_config["color_table"]),
        "valueRange": {
            # Keep precip ranges fractional (inches); VIL can stay whole numbers
            "min": float(round(data_min, 3) if product_config.get("precip_inches") else math.floor(data_min)),
            "max": float(round(data_max, 3) if product_config.get("precip_inches") else math.ceil(data_max)),
        },
        "displayableGates": displayable,
        "bounds": approximate_radar_bounds(radar_lon, radar_lat, 460.0),
    }
    output_json.write_text(json.dumps(product, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote Level 3 polar product rays={len(azimuths)} gates={data.shape[1]} "
        f"displayable={displayable} site=({radar_lat:.4f},{radar_lon:.4f})",
        file=sys.stderr,
    )


def main():
    if len(sys.argv) not in (4, 5):
        print(
            "Usage: render-level3-product.py INPUT_LEVEL3 OUTPUT_JSON OUTPUT_BIN PRODUCT",
            file=sys.stderr,
        )
        sys.exit(1)

    product_id = sys.argv[4] if len(sys.argv) == 5 else "vil"
    render_product(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), product_id)


if __name__ == "__main__":
    main()
