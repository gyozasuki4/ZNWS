#!/usr/bin/env python3
import json
import math
import shutil
import struct
import sys
import tempfile
from pathlib import Path


def fail_missing_dependency(error):
    print(
        "Missing Python radar rendering dependencies. Install on Ubuntu with: "
        "python3 -m venv .venv && .venv/bin/python -m pip install metpy matplotlib numpy",
        file=sys.stderr,
    )
    print(str(error), file=sys.stderr)
    sys.exit(2)


try:
    import numpy as np
except ImportError as error:
    fail_missing_dependency(error)

try:
    from metpy.io import Level2File
except ImportError as error:
    fail_missing_dependency(error)


def patch_metpy_level2_msg18():
    """Make Message 18 (RDA adaptation) failures non-fatal.

    Newer RDA builds embed VCP patterns in Message 18 that no longer match
    MetPy's fixed vcp_el_fmt size. MetPy then raises struct.error while
    unpacking elevation cuts, and the entire Level2File open aborts — even
    though reflectivity/velocity live in Message 31 radials, which we need.

    Unknown Message 32 is already skipped by MetPy as a warning only.
    """
    if getattr(Level2File, "_zncave_msg18_patched", False):
        return

    original = Level2File._decode_msg18

    def _decode_msg18_safe(self, msg_hdr):
        try:
            return original(self, msg_hdr)
        except (struct.error, ValueError, KeyError, IndexError, AttributeError) as error:
            print(
                f"Warning: skipping Message 18 RDA adaptation decode ({error}). "
                "Continuing with radial product data.",
                file=sys.stderr,
            )

    Level2File._decode_msg18 = _decode_msg18_safe
    Level2File._zncave_msg18_patched = True


patch_metpy_level2_msg18()


# GR-style BR (Base Reflectivity) palette, dBZ, step 5.
# Dual RGB entries ramp from the first color at this stop to the second
# color at the next stop (standard GRLevelX Color: value R G B R2 G2 B2).
REFLECTIVITY_COLOR_TABLE = [
    (-30.0, (116, 78, 173)),
    (-20.0, (150, 150, 82)),
    (-10.0, (204, 208, 175)),
    (0.0, (67, 94, 160)),
    (15.0, (106, 208, 228)),
    (20.0, (20, 230, 20)),
    (34.0, (10, 80, 0)),
    (40.0, (255, 225, 0), (255, 128, 0)),
    (50.0, (255, 0, 0), (0, 0, 0)),
    (60.0, (255, 255, 255), (255, 146, 255)),
    (65.0, (255, 117, 255), (225, 11, 227)),
    (70.0, (178, 0, 255), (99, 0, 214)),
    (75.0, (5, 236, 240), (1, 32, 32)),
    (80.0, (0, 0, 0)),
]

# NWS / RadarScope style: green = negative (inbound), red = positive (outbound).
VELOCITY_COLOR_TABLE = [
    (-140.0, (0, 255, 255)),
    (-130.0, (0, 255, 224)),
    (-120.0, (0, 255, 192)),
    (-110.0, (0, 255, 160)),
    (-100.0, (0, 255, 128)),
    (-90.0, (0, 255, 96)),
    (-80.0, (0, 255, 64)),
    (-70.0, (0, 255, 0)),
    (-60.0, (0, 224, 0)),
    (-50.0, (0, 192, 0)),
    (-40.0, (0, 160, 0)),
    (-30.0, (0, 128, 0)),
    (-20.0, (0, 96, 0)),
    (-10.0, (0, 64, 0)),
    (0.0, (210, 210, 210)),
    (10.0, (64, 0, 0)),
    (20.0, (96, 0, 0)),
    (30.0, (128, 0, 0)),
    (40.0, (160, 0, 0)),
    (50.0, (192, 0, 0)),
    (60.0, (224, 0, 0)),
    (70.0, (255, 0, 0)),
    (80.0, (255, 64, 0)),
    (90.0, (255, 96, 0)),
    (100.0, (255, 128, 0)),
    (110.0, (255, 160, 0)),
    (120.0, (255, 192, 0)),
    (130.0, (255, 224, 0)),
    (140.0, (255, 255, 0)),
]

MESH_COLOR_TABLE = [
    (0.0, (0, 0, 0)),
    (0.25, (4, 233, 231)), (0.50, (1, 159, 244)), (0.75, (3, 0, 244)),
    (1.00, (2, 253, 2)), (1.50, (253, 248, 2)), (2.00, (253, 139, 0)),
    (2.50, (212, 0, 0)), (3.00, (188, 0, 0)), (3.50, (248, 0, 253)),
    (4.00, (152, 84, 198)), (5.00, (255, 255, 255)),
]

PRODUCTS = {
    "reflectivity": {
        "label": "BR",
        "units": "dBZ",
        "moment_names": [b"REF"],
        "color_table": REFLECTIVITY_COLOR_TABLE,
        "min_display": 15.0,
        "value_scale": 1.0,
    },
    "velocity": {
        "label": "Velocity",
        "units": "KTS",
        "moment_names": [b"VEL", b"VE"],
        "color_table": VELOCITY_COLOR_TABLE,
        "min_display": None,
        "value_scale": 1.9426,
    },
    "meshlevel2": {
        "label": "MESH-L2",
        "units": "in",
        "moment_names": [b"REF"],
        "color_table": MESH_COLOR_TABLE,
        "min_display": 0.25,
        "value_scale": 1.0,
        "derived": "mesh",
    },
}

RENDERER_VERSION = "polar-bins-20260715-7"
# Max azimuth gap (degrees) before treating neighboring rays as disconnected (no fake wedge).
MAX_RAY_GAP_DEG = 2.5

# Elevation bin size for merging radials that MetPy split across sweeps.
ELEVATION_BIN_DEG = 0.05
# Prefer full-circle base cuts over SAILS/MRLE sector scans.
# A product is only complete when every azimuth can be joined using the same
# gap rule as the browser mesh.  Previously a cut with a gap as large as 25
# degrees was labelled complete even though the mesh (correctly) left that
# gap transparent.  That prevented the live compositor from retaining the
# preceding sweep beneath the new radials.
MIN_FULL_COVERAGE_DEG = 357.0
MAX_FULL_GAP_DEG = MAX_RAY_GAP_DEG
AZIMUTH_DEDUPE_TOL_DEG = 0.12


def is_whole_file_bzip2(input_file):
    try:
        return input_file.read_bytes()[:3] == b"BZh"
    except OSError:
        return False


def metpy_read_level2(input_file):
    if input_file.suffix.lower() != ".bz2" or is_whole_file_bzip2(input_file):
        return Level2File(str(input_file))

    with tempfile.NamedTemporaryFile(suffix=".nexrad", delete=False) as temp_file:
        temp_path = Path(temp_file.name)

    try:
        shutil.copyfile(input_file, temp_path)
        print("Input is a raw Level 2 archive with a .bz2 name; reading via extensionless copy.", file=sys.stderr)
        return Level2File(str(temp_path))
    finally:
        temp_path.unlink(missing_ok=True)


def ray_header(ray):
    return ray[0]


def ray_moments(ray):
    # Message 31 Radial is a 5-tuple; legacy message 1 is (header, moments).
    return ray[4] if len(ray) > 4 else ray[1]


def ray_volume_consts(ray):
    if len(ray) > 4:
        return ray[1]
    return None


def available_moments(level2_file):
    names = set()

    for sweep in level2_file.sweeps:
        for ray in sweep:
            names.update(moment.decode("ascii", errors="ignore") for moment in ray_moments(ray).keys())

    return sorted(names)


def get_radar_center(rays, level2_file=None):
    """Site lat/lon from the selected sweep's volume constants (not an arbitrary first ray)."""
    lons = []
    lats = []

    for ray in rays:
        volume = ray_volume_consts(ray)
        if volume is None:
            continue
        lon = getattr(volume, "lon", None)
        lat = getattr(volume, "lat", None)
        if lon is None or lat is None:
            continue
        lon = float(lon)
        lat = float(lat)
        if np.isfinite(lon) and np.isfinite(lat):
            lons.append(lon)
            lats.append(lat)

    if lons:
        return float(np.median(lons)), float(np.median(lats))

    if level2_file is not None and level2_file.sweeps and level2_file.sweeps[0]:
        volume = ray_volume_consts(level2_file.sweeps[0][0])
        if volume is not None:
            return float(volume.lon), float(volume.lat)

    raise RuntimeError("Unable to determine radar site latitude/longitude from Level 2 volume constants")


def sort_rays_by_azimuth(rays):
    azimuths = np.array([float(ray_header(ray).az_angle) for ray in rays], dtype=float)
    order = np.argsort(azimuths, kind="mergesort")
    return [rays[index] for index in order], azimuths[order]


def azimuth_coverage_stats(azimuths_deg):
    """Circular coverage metrics for a set of ray azimuths (degrees)."""
    az = np.sort(np.mod(np.asarray(azimuths_deg, dtype=float), 360.0))
    count = int(len(az))

    if count == 0:
        return {"count": 0, "span": 0.0, "max_gap": 360.0, "coverage": 0.0}

    if count == 1:
        return {"count": 1, "span": 0.0, "max_gap": 360.0, "coverage": 0.0}

    gaps = np.diff(az)
    wrap_gap = (az[0] + 360.0) - az[-1]
    all_gaps = np.append(gaps, wrap_gap)
    max_gap = float(np.max(all_gaps))
    coverage = float(max(0.0, 360.0 - max_gap))
    span = float(az[-1] - az[0])
    return {"count": count, "span": span, "max_gap": max_gap, "coverage": coverage}


def pad_gate_data(data, gate_count):
    padded = np.full(gate_count, np.nan, dtype=float)
    usable_count = min(gate_count, len(data))

    if usable_count:
        padded[:usable_count] = data[:usable_count]

    return padded


def ray_finite_gate_count(ray, moment_name):
    moment = ray_moments(ray).get(moment_name)
    if not moment:
        return 0
    values = np.asarray(moment[1], dtype=float)
    return int(np.isfinite(values).sum())


def dedupe_rays_by_azimuth(rays, moment_name, az_tol=AZIMUTH_DEDUPE_TOL_DEG):
    """Keep one ray per azimuth bin; prefer the radial with more finite gates."""
    if not rays:
        return []

    rays, azimuths = sort_rays_by_azimuth(rays)
    kept = []
    kept_az = []

    for ray, azimuth in zip(rays, azimuths):
        azimuth = float(np.mod(azimuth, 360.0))
        if kept and min(abs(azimuth - kept_az[-1]), 360.0 - abs(azimuth - kept_az[-1])) <= az_tol:
            previous = kept[-1]
            if ray_finite_gate_count(ray, moment_name) > ray_finite_gate_count(previous, moment_name):
                kept[-1] = ray
                kept_az[-1] = azimuth
            continue

        # Also compare against first ray for wrap-around near 0/360.
        if kept and min(abs(azimuth - kept_az[0]), 360.0 - abs(azimuth - kept_az[0])) <= az_tol:
            previous = kept[0]
            if ray_finite_gate_count(ray, moment_name) > ray_finite_gate_count(previous, moment_name):
                kept[0] = ray
                kept_az[0] = azimuth
            continue

        kept.append(ray)
        kept_az.append(azimuth)

    kept, _ = sort_rays_by_azimuth(kept)
    return kept


def elevation_bin(elevation):
    return round(float(elevation) / ELEVATION_BIN_DEG) * ELEVATION_BIN_DEG


def build_candidate(rays, moment_name, sweep_indexes, elevation):
    rays = dedupe_rays_by_azimuth(rays, moment_name)
    if not rays:
        return None

    header = ray_moments(rays[0])[moment_name][0]
    gate_count = int(header.num_gates)
    data = np.vstack([pad_gate_data(ray_moments(ray)[moment_name][1], gate_count) for ray in rays])

    if not np.isfinite(data).any():
        return None

    azimuths = np.array([float(ray_header(ray).az_angle) for ray in rays], dtype=float)
    coverage = azimuth_coverage_stats(azimuths)
    is_full_circle = coverage["coverage"] >= MIN_FULL_COVERAGE_DEG and coverage["max_gap"] <= MAX_FULL_GAP_DEG

    return {
        "sweep": int(sweep_indexes[0]) if sweep_indexes else 0,
        "sweepIndexes": sorted(set(int(index) for index in sweep_indexes)),
        "moment": moment_name,
        "rays": rays,
        "header": header,
        "data": data,
        "elevation": float(elevation),
        "rayCount": coverage["count"],
        "coverage": coverage["coverage"],
        "maxGap": coverage["max_gap"],
        "span": coverage["span"],
        "isFullCircle": is_full_circle,
        "gateCount": gate_count,
    }


def candidate_quality_key(candidate):
    """Higher tuple sorts better within one elevation/moment family."""
    return (
        candidate["coverage"],
        -candidate["maxGap"],
        candidate["rayCount"],
        candidate["gateCount"],
    )


def select_sweep(level2_file, product_config):
    """Pick the best full-circle base product cut.

    MetPy can split one elevation into multiple sweeps, and SAILS/MRLE sector scans can
    appear as low-elevation incomplete cuts. Prefer ~360° coverage over "lowest elev only".
    """
    # elev_bin -> moment_name -> {rays, sweep_indexes, elev_sum, elev_n}
    groups = {}

    for sweep_index, sweep in enumerate(level2_file.sweeps):
        for moment_name in product_config["moment_names"]:
            rays = [ray for ray in sweep if moment_name in ray_moments(ray)]
            if not rays:
                continue

            elevation = float(np.nanmean([float(ray_header(ray).el_angle) for ray in rays]))
            if not np.isfinite(elevation):
                continue

            bin_key = elevation_bin(elevation)
            moment_groups = groups.setdefault(bin_key, {})
            bucket = moment_groups.setdefault(
                moment_name,
                {"rays": [], "sweep_indexes": [], "elev_sum": 0.0, "elev_n": 0},
            )
            bucket["rays"].extend(rays)
            bucket["sweep_indexes"].append(sweep_index)
            bucket["elev_sum"] += elevation * len(rays)
            bucket["elev_n"] += len(rays)

    candidates = []

    for bin_key, moment_groups in groups.items():
        for moment_name, bucket in moment_groups.items():
            elevation = bucket["elev_sum"] / max(bucket["elev_n"], 1)
            candidate = build_candidate(
                bucket["rays"],
                moment_name,
                bucket["sweep_indexes"],
                elevation if np.isfinite(elevation) else bin_key,
            )
            if candidate is not None:
                candidates.append(candidate)

    if not candidates:
        label = product_config["label"].lower()
        raise RuntimeError(f"No {label} field found. Available fields: {', '.join(available_moments(level2_file))}")

    # Prefer configured moment order among equally good coverage (REF before aliases).
    moment_priority = {name: index for index, name in enumerate(product_config["moment_names"])}

    # Walk up the elevation ladder: if the lowest/base cut is a SAILS/MRLE sector
    # scan, try the next tilt before declaring the volume unusable.
    full_circle_candidates = [candidate for candidate in candidates if candidate["isFullCircle"]]
    full_circle_candidates.sort(
        key=lambda item: (
            item["elevation"],
            moment_priority.get(item["moment"], 99),
            -item["coverage"],
            item["maxGap"],
            -item["rayCount"],
            -item["gateCount"],
        )
    )

    best_partial = max(
        candidates,
        key=lambda item: (
            candidate_quality_key(item),
            -moment_priority.get(item["moment"], 99),
            -item["elevation"],
        ),
    )

    if full_circle_candidates:
        best = full_circle_candidates[0]
    else:
        best = best_partial

    if not best["isFullCircle"]:
        print(
            f"No full-circle {product_config['label'].lower()} sweep found after trying higher tilts; "
            f"rendering best sector cut coverage={best['coverage']:.1f}° "
            f"max_gap={best['maxGap']:.1f}° rays={best['rayCount']} sweeps={best['sweepIndexes']}.",
            file=sys.stderr,
        )

    lowest_elevation = min(candidate["elevation"] for candidate in candidates)
    if best["elevation"] > lowest_elevation + ELEVATION_BIN_DEG:
        print(
            f"Base cut incomplete; using higher tilt el={best['elevation']:.2f} "
            f"for full-circle {product_config['label'].lower()} "
            f"(lowest candidate el={lowest_elevation:.2f}).",
            file=sys.stderr,
        )

    print(
        f"Selected {best['moment'].decode(errors='ignore')} "
        f"el={best['elevation']:.2f} rays={best['rayCount']} "
        f"coverage={best['coverage']:.1f}° max_gap={best['maxGap']:.1f}° "
        f"full_circle={best['isFullCircle']} sweeps={best['sweepIndexes']}",
        file=sys.stderr,
    )
    return best


def prepare_polar_sweep(selected_sweep):
    """Return sorted azimuth centers (deg) and physical data array for polar rendering."""
    header = selected_sweep["header"]
    data = np.array(selected_sweep["data"], dtype=float, copy=True)
    azimuths = np.array([float(ray_header(ray).az_angle) for ray in selected_sweep["rays"]], dtype=float)
    order = np.argsort(azimuths, kind="mergesort")
    azimuths = np.mod(azimuths[order], 360.0)
    data = data[order]
    return azimuths, data, header


def derive_mesh_from_volume(level2_file, selected_sweep, zero_c_km=3.0, minus20_c_km=6.0):
    """Approximate GR2Analyst-style single-radar MESH from a Level II volume.

    Reflectivity is sampled vertically above every base-sweep polar bin. SHI is
    integrated between the environmental 0 C and -20 C levels, then converted
    to MESH using the Witt et al. relation. Heights are AGL defaults until live
    model thermodynamic levels are supplied by the server.
    """
    base_az, _, base_header = prepare_polar_sweep(selected_sweep)
    base_gates = int(base_header.num_gates)
    base_first = float(base_header.first_gate)
    base_width = float(base_header.gate_width)
    ground_ranges = base_first + np.arange(base_gates, dtype=float) * base_width
    layers = []

    for sweep_index, sweep in enumerate(level2_file.sweeps):
        rays = [ray for ray in sweep if b"REF" in ray_moments(ray)]
        if not rays:
            continue
        elevation = float(np.nanmean([float(ray_header(ray).el_angle) for ray in rays]))
        if not np.isfinite(elevation) or elevation < 0.0 or elevation > 25.0:
            continue
        candidate = build_candidate(rays, b"REF", [sweep_index], elevation)
        if candidate is None:
            continue
        az, values, header = prepare_polar_sweep(candidate)
        layers.append((elevation, az, values, header))

    layers.sort(key=lambda item: item[0])
    if len(layers) < 2:
        raise RuntimeError("MESH-L2 requires at least two reflectivity elevation cuts")

    effective_earth_km = 8494.0  # 4/3 Earth radius
    shi = np.zeros((len(base_az), base_gates), dtype=np.float32)
    previous_height = None
    previous_weighted = None
    for elevation, az, values, header in layers:
        insertion = np.searchsorted(az, base_az)
        right = np.mod(insertion, len(az))
        left = np.mod(insertion - 1, len(az))
        left_delta = np.abs((base_az - az[left] + 180.0) % 360.0 - 180.0)
        right_delta = np.abs((az[right] - base_az + 180.0) % 360.0 - 180.0)
        ray_indexes = np.where(left_delta <= right_delta, left, right)

        elev_rad = math.radians(elevation)
        cos_elev = max(math.cos(elev_rad), 0.1)
        slant_ranges = ground_ranges / cos_elev
        gate_indexes = np.rint(
            (slant_ranges - float(header.first_gate)) / max(float(header.gate_width), 1e-6)
        ).astype(int)
        valid_gate = (gate_indexes >= 0) & (gate_indexes < values.shape[1])
        sampled = np.full((len(base_az), base_gates), np.nan, dtype=np.float32)
        if valid_gate.any():
            sampled[:, valid_gate] = values[ray_indexes[:, None], gate_indexes[valid_gate][None, :]]
        height = (
            np.sqrt(
                slant_ranges * slant_ranges
                + effective_earth_km * effective_earth_km
                + 2.0 * slant_ranges * effective_earth_km * math.sin(elev_rad)
            )
            - effective_earth_km
        )
        temperature_weight = np.clip(
            (height - zero_c_km) / max(minus20_c_km - zero_c_km, 0.1), 0.0, 1.0
        )
        # Hail kinetic-energy flux used by the traditional SHI/MESH algorithm.
        energy = 5.0e-6 * np.power(10.0, 0.084 * np.clip(sampled, -30.0, 95.0))
        reflectivity_weight = np.clip((sampled - 40.0) / 10.0, 0.0, 1.0)
        weighted = np.where(
            np.isfinite(sampled), energy * reflectivity_weight * temperature_weight[None, :], 0.0
        ).astype(np.float32, copy=False)
        if previous_height is not None:
            delta_m = np.maximum(0.0, height - previous_height) * 1000.0
            shi += 0.1 * 0.5 * (previous_weighted + weighted) * delta_m[None, :]
        previous_height = height
        previous_weighted = weighted

    mesh_inches = (2.54 * np.sqrt(np.maximum(shi, 0.0))) / 25.4
    return base_az, mesh_inches, base_header, {
        "algorithm": "experimental-single-radar-mesh",
        "zeroCHeightKmAgl": zero_c_km,
        "minus20CHeightKmAgl": minus20_c_km,
        "elevationCuts": len(layers),
    }


def approximate_radar_bounds(radar_lon, radar_lat, max_range_km):
    """Rough geographic bounds for fitBounds (client draws polar bins exactly)."""
    # 1 deg lat ~ 111 km; lon shrinks by cos(lat)
    dlat = max_range_km / 111.0
    cos_lat = max(math.cos(math.radians(radar_lat)), 0.2)
    dlon = max_range_km / (111.0 * cos_lat)
    return [
        [radar_lon - dlon, radar_lat + dlat],
        [radar_lon + dlon, radar_lat + dlat],
        [radar_lon + dlon, radar_lat - dlat],
        [radar_lon - dlon, radar_lat - dlat],
    ]


def encode_gate_bytes(data, vmin, vmax):
    """Pack gate values as uint8: 0 = no data, 1–255 = scaled [vmin, vmax]."""
    encoded = np.zeros(data.shape, dtype=np.uint8)
    valid = np.isfinite(data)
    if not valid.any():
        return encoded

    span = max(float(vmax - vmin), 1e-6)
    scaled = (data[valid] - vmin) / span
    encoded[valid] = np.clip(np.rint(scaled * 254.0) + 1.0, 1, 255).astype(np.uint8)
    return encoded


def color_table_payload(color_table):
    stops = []
    for stop in color_table:
        entry = {"value": float(stop[0]), "color": [int(stop[1][0]), int(stop[1][1]), int(stop[1][2])]}
        if len(stop) > 2:
            entry["endColor"] = [int(stop[2][0]), int(stop[2][1]), int(stop[2][2])]
        stops.append(entry)
    return stops


def render_product(input_file, output_json, output_bin, product_id="reflectivity"):
    """Decode Level 2 into polar bin payload for client-side RadarScope-style rendering."""
    if product_id not in PRODUCTS:
        raise RuntimeError(f"Unsupported radar product: {product_id}")

    product_config = PRODUCTS[product_id]
    print(f"Reading Level 2 file: {input_file}", file=sys.stderr)
    level2_file = metpy_read_level2(input_file)
    print(f"Radar moments: {', '.join(available_moments(level2_file))}", file=sys.stderr)
    selected = select_sweep(level2_file, product_config)
    radar_lon, radar_lat = get_radar_center(selected["rays"], level2_file)
    print(
        f"Polar export {selected['moment'].decode()} from sweeps {selected.get('sweepIndexes', [selected['sweep']])} "
        f"@ el={selected['elevation']:.2f} site=({radar_lat:.5f}, {radar_lon:.5f}) "
        f"rays={selected.get('rayCount', len(selected['rays']))} "
        f"coverage={selected.get('coverage', float('nan')):.1f}°",
        file=sys.stderr,
    )

    derived_meta = None
    if product_config.get("derived") == "mesh":
        azimuths, data, header, derived_meta = derive_mesh_from_volume(level2_file, selected)
    else:
        azimuths, data, header = prepare_polar_sweep(selected)
        data = data * product_config["value_scale"]

    if not np.isfinite(data).any():
        raise RuntimeError(f"{product_config['label']} product had no displayable gates")

    gate_count = int(header.num_gates)
    gate_width = float(header.gate_width)
    first_gate = float(header.first_gate)
    max_range = max(0.0, first_gate + (gate_count - 0.5) * gate_width)

    finite_values = data[np.isfinite(data)]
    data_min = float(np.nanmin(finite_values))
    data_max = float(np.nanmax(finite_values))

    # Encoding range covers the product palette for stable colors across frames.
    palette_min = float(product_config["color_table"][0][0])
    palette_max = float(product_config["color_table"][-1][0])
    encode_min = palette_min
    encode_max = palette_max

    encoded = encode_gate_bytes(data, encode_min, encode_max)
    displayable = int(np.count_nonzero(encoded))
    if displayable == 0:
        raise RuntimeError(f"{product_config['label']} product had no displayable gates")

    output_json = Path(output_json)
    output_bin = Path(output_bin)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_bin.parent.mkdir(parents=True, exist_ok=True)
    output_bin.write_bytes(encoded.astype("<u1", copy=False).tobytes(order="C"))

    product = {
        "product": product_id,
        "productLabel": product_config["label"],
        "units": product_config["units"],
        "renderer": "polar-bins",
        "rendererVersion": RENDERER_VERSION,
        "field": selected["moment"].decode("ascii", errors="ignore"),
        "sweep": int(selected["sweep"]),
        "sweepIndexes": selected.get("sweepIndexes", [int(selected["sweep"])]),
        "elevation": float(selected["elevation"]),
        "rayCount": int(len(azimuths)),
        "gateCount": gate_count,
        "azimuthCoverage": float(selected.get("coverage", 0.0)),
        "azimuthMaxGap": float(selected.get("maxGap", 0.0)),
        "fullCircle": bool(selected.get("isFullCircle", False)),
        "radarLon": float(radar_lon),
        "radarLat": float(radar_lat),
        "azimuths": [round(float(value), 4) for value in azimuths.tolist()],
        "firstGateKm": first_gate,
        "gateWidthKm": gate_width,
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
            "min": float(math.floor(data_min)),
            "max": float(math.ceil(data_max)),
        },
        "displayableGates": displayable,
        "bounds": approximate_radar_bounds(radar_lon, radar_lat, max_range),
        "noSignal": bool(
            product_config.get("derived") == "mesh"
            and data_max < float(product_config.get("min_display") or 0.0)
        ),
    }
    if derived_meta:
        product["derived"] = derived_meta
    output_json.write_text(json.dumps(product, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote polar product rays={len(azimuths)} gates={gate_count} "
        f"displayable={displayable} bin={output_bin.name}",
        file=sys.stderr,
    )


def main():
    if len(sys.argv) not in (4, 5):
        print(
            "Usage: render-level2-product.py INPUT_LEVEL2 OUTPUT_JSON OUTPUT_BIN [reflectivity|velocity|meshlevel2]",
            file=sys.stderr,
        )
        sys.exit(1)

    product_id = sys.argv[4] if len(sys.argv) == 5 else "reflectivity"
    # Backward-compatible arg order if someone still passes png then json.
    out_a = Path(sys.argv[2])
    out_b = Path(sys.argv[3])
    if out_a.suffix.lower() == ".png" and out_b.suffix.lower() == ".json":
        output_json = out_b
        output_bin = out_b.with_suffix(".bin")
    else:
        output_json = out_a
        output_bin = out_b

    render_product(Path(sys.argv[1]), output_json, output_bin, product_id)


if __name__ == "__main__":
    main()
