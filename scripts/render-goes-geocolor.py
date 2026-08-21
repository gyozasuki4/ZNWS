#!/usr/bin/env python3
"""Build a high-resolution native-sector GOES GeoColor-style composite."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import xarray as xr
from PIL import Image, ImageFilter
from pyproj import CRS, Transformer


RENDERER_VERSION = "goes-geocolor-3"


def load_cmi_helpers():
    helper_path = Path(__file__).with_name("render-goes-cmi.py")
    spec = importlib.util.spec_from_file_location("goes_cmi", helper_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_band(path: Path):
    with xr.open_dataset(path, engine="h5netcdf", mask_and_scale=True) as ds:
        values = np.asarray(ds["CMI"].values, dtype=np.float32)
        x = np.asarray(ds["x"].values, dtype=np.float64)
        y = np.asarray(ds["y"].values, dtype=np.float64)
        projection = dict(ds["goes_imager_projection"].attrs)
        attrs = dict(ds.attrs)
    height = float(projection["perspective_point_height"])
    geos = CRS.from_proj4(
        "+proj=geos +h={h} +lon_0={lon} +sweep={sweep} +a={a} +b={b} +units=m +no_defs".format(
            h=height,
            lon=float(projection["longitude_of_projection_origin"]),
            sweep=projection.get("sweep_angle_axis", "x"),
            a=float(projection["semi_major_axis"]),
            b=float(projection["semi_minor_axis"]),
        )
    )
    return values, x * height, y * height, geos, attrs


def stretch_visible(values):
    # Reflectance gamma/contrast tuned to preserve surface texture without
    # washing out bright cloud fields.
    return np.clip(np.clip(values, 0.0, 1.25) / 1.25, 0.0, 1.0) ** 0.45


def main():
    if len(sys.argv) not in (8, 9):
        raise SystemExit("usage: render-goes-geocolor.py C01 C02 C03 C07 C13 OUTPUT.png OUTPUT.json [full|cloud]")
    inputs = [Path(value) for value in sys.argv[1:6]]
    png_path, meta_path = Path(sys.argv[6]), Path(sys.argv[7])
    display = sys.argv[8] if len(sys.argv) > 8 and sys.argv[8] == "cloud" else "full"
    helper = load_cmi_helpers()
    source_bands = []
    metadata = None
    bounds = None
    for index, path in enumerate(inputs):
        values, x, y, geos, attrs = read_band(path)
        source_bands.append((values, x, y, geos))
        if index == 1:
            bounds = helper.projected_bounds(x, y, geos)
        metadata = metadata or attrs

    # Band 02 is the highest-resolution ABI visible channel. Build one shared
    # 4096-pixel Web Mercator target grid from it, then bilinearly sample every
    # band onto that exact grid. This avoids color fringes from independently
    # projected/cropped channels and preserves twice the previous map detail.
    red_values, _, _, _ = source_bands[1]
    min_x, min_y, max_x, max_y = bounds
    aspect = max((max_x - min_x) / max(max_y - min_y, 1.0), 0.05)
    if aspect >= 1.0:
        width = min(4096, max(2048, red_values.shape[1]))
        height = max(512, round(width / aspect))
    else:
        height = min(4096, max(2048, red_values.shape[0]))
        width = max(512, round(height * aspect))
    projected = [helper.reproject(values, x, y, geos, bounds=bounds, output_shape=(height, width))[0] for values, x, y, geos in source_bands]

    blue, red, veggie, shortwave, infrared = projected
    red_day = stretch_visible(red)
    blue_day = stretch_visible(blue)
    veggie_day = stretch_visible(veggie)
    green_day = np.clip(0.45 * red_day + 0.45 * blue_day + 0.10 * veggie_day, 0.0, 1.0)
    day_rgb = np.stack([red_day, green_day, blue_day], axis=-1)

    # Bands 7 and 13 retain low-cloud detail at night. Visible reflectance is
    # also a convenient per-pixel daylight mask, producing a soft terminator.
    cold = np.clip((315.0 - infrared) / 115.0, 0.0, 1.0)
    fog = np.clip((infrared - shortwave + 8.0) / 16.0, 0.0, 1.0)
    night_rgb = np.stack([cold, np.clip(cold * 0.92, 0, 1), np.clip(cold + fog * 0.35, 0, 1)], axis=-1)
    visible_stack = np.stack([red, blue, veggie])
    daylight = np.clip(np.max(np.where(np.isfinite(visible_stack), visible_stack, 0.0), axis=0) * 12.0, 0.0, 1.0)[..., None]
    rgb = np.where(np.isfinite(day_rgb), day_rgb, 0.0) * daylight + np.where(np.isfinite(night_rgb), night_rgb, 0.0) * (1.0 - daylight)
    valid = np.isfinite(infrared) | np.isfinite(red)
    rgba = np.zeros((*red.shape, 4), dtype=np.uint8)
    rgba[..., :3] = np.clip(np.nan_to_num(rgb) * 255.0, 0, 255).astype(np.uint8)
    if display == "cloud":
        cloud_alpha = np.clip((295.0 - infrared) / 60.0, 0.0, 1.0)
        rgba[..., 3] = np.where(valid, cloud_alpha * 245, 0).astype(np.uint8)
    else:
        rgba[..., 3] = np.where(valid, 245, 0).astype(np.uint8)
    rendered = Image.fromarray(rgba, "RGBA")
    rgb = rendered.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.15, percent=70, threshold=3))
    rgb.putalpha(rendered.getchannel("A"))
    rgb.save(png_path, optimize=True)

    min_x, min_y, max_x, max_y = bounds
    to_lonlat = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    coordinates = [list(to_lonlat.transform(min_x, max_y)), list(to_lonlat.transform(max_x, max_y)), list(to_lonlat.transform(max_x, min_y)), list(to_lonlat.transform(min_x, min_y))]
    meta_path.write_text(json.dumps({
        "rendererVersion": RENDERER_VERSION,
        "platform": str(metadata.get("platform_ID", metadata.get("platform", "GOES"))),
        "scene": str(metadata.get("scene_id", "")),
        "product": "geocolor",
        "display": display,
        "validTime": str(metadata.get("time_coverage_start", "")),
        "coordinates": coordinates,
        "width": int(rgba.shape[1]), "height": int(rgba.shape[0]),
        "image": png_path.name,
    }))


if __name__ == "__main__":
    main()
