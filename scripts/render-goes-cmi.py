#!/usr/bin/env python3
"""Reproject a native GOES ABI L2 CMI fixed grid into a MapLibre image."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import xarray as xr
from PIL import Image, ImageFilter
from pyproj import CRS, Transformer


RENDERER_VERSION = "goes-cmi-10"
WEB_MERCATOR_LIMIT = 20037508.342789244


def colorize(values: np.ndarray, band: int, display: str = "full") -> np.ndarray:
    valid = np.isfinite(values)
    rgba = np.zeros((*values.shape, 4), dtype=np.uint8)
    if not valid.any():
        return rgba

    if band <= 6:
        scaled = np.clip(values, 0.0, 1.0)
        if band == 2:
            # High-resolution visible: lift shadow detail without washing out
            # bright convective clouds.
            scaled = np.clip(np.sqrt(scaled) * 1.04, 0.0, 1.0)
            rgb = np.stack((scaled * 250, scaled * 253, scaled * 255), axis=2)
        else:
            rgb = np.repeat((scaled[..., None] * 255.0), 3, axis=2)
    else:
        # ABI emissive-band CMI is brightness temperature in Kelvin. Use a
        # conventional cold-is-bright IR image, then enhance only the coldest
        # cloud tops on the longwave-window bands.
        gray = np.clip((315.0 - values) / 115.0, 0.0, 1.0) * 255.0
        rgb = np.repeat(gray[..., None], 3, axis=2)
        if band in (8, 9, 10):
            # NOAA/NESDIS water-vapor convention: warm/dry air progresses from
            # red to yellow, moist air through blue/white, and the coldest
            # cloud features into green.
            stops_t = np.array([190, 203, 213, 223, 233, 243, 253, 263, 273], dtype=np.float32)
            stops_rgb = np.array([
                [0, 75, 25], [25, 195, 70], [250, 250, 250], [35, 70, 200],
                [45, 175, 240], [245, 250, 250], [250, 235, 45], [245, 135, 25],
                [185, 20, 25],
            ], dtype=np.float32)
            for channel in range(3):
                rgb[..., channel] = np.interp(values, stops_t, stops_rgb[:, channel])
        elif band == 7:
            # Shortwave IR: cold clouds remain neutral while increasingly warm
            # surfaces and hot spots progress through red, orange, and yellow.
            stops_t = np.array([190, 220, 250, 275, 295, 310, 325, 345], dtype=np.float32)
            stops_rgb = np.array([
                [250, 250, 255], [190, 205, 220], [105, 125, 145], [48, 55, 62],
                [95, 45, 55], [190, 42, 35], [245, 125, 30], [255, 245, 125],
            ], dtype=np.float32)
            for channel in range(3):
                rgb[..., channel] = np.interp(values, stops_t, stops_rgb[:, channel])
        elif band in (13, 14, 15) and display == "cloud":
            # Restrained blue-white IR cloud overlay, avoiding alarm-like red
            # flashes while retaining cold-top structure.
            shade = np.clip((300.0 - values) / 100.0, 0.0, 1.0)
            rgb = np.stack((155 + shade * 100, 175 + shade * 80, 195 + shade * 60), axis=2)
        if band in (13, 14, 15) and display != "cloud":
            stops_t = np.array([185, 195, 205, 215, 225, 235], dtype=np.float32)
            stops_rgb = np.array([
                [95, 0, 0], [235, 35, 0], [255, 205, 0],
                [35, 190, 35], [0, 105, 220], [0, 205, 220],
            ], dtype=np.float32)
            cold = valid & (values <= stops_t[-1])
            for channel in range(3):
                rgb[..., channel] = np.where(
                    cold,
                    np.interp(values, stops_t, stops_rgb[:, channel]),
                    rgb[..., channel],
                )

    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    if display == "cloud":
        if band <= 6:
            cloud_alpha = np.clip((values - 0.10) / 0.55, 0.0, 1.0)
        else:
            cloud_alpha = np.clip((295.0 - values) / 60.0, 0.0, 1.0)
        # Keep real cloud features solid enough for operations while clear sky
        # remains transparent so roads and warning polygons stay readable.
        cloud_alpha = np.where(cloud_alpha > 0.08, 0.32 + cloud_alpha * 0.68, 0.0)
        rgba[..., 3] = np.where(valid, cloud_alpha * 255, 0).astype(np.uint8)
    else:
        rgba[..., 3] = np.where(valid, 235, 0).astype(np.uint8)
    return rgba


def projected_bounds(x_m: np.ndarray, y_m: np.ndarray, geos: CRS) -> tuple[float, float, float, float]:
    """Find the finite Earth footprint in EPSG:3857, not the invalid limb corners."""
    sample_x = np.linspace(x_m[0], x_m[-1], 128)
    sample_y = np.linspace(y_m[0], y_m[-1], 128)
    sx, sy = np.meshgrid(sample_x, sample_y)
    to_mercator = Transformer.from_crs(geos, "EPSG:3857", always_xy=True)
    mx, my = to_mercator.transform(sx, sy)
    finite = np.isfinite(mx) & np.isfinite(my)
    if not finite.any():
        raise RuntimeError("GOES scene has no finite Earth footprint")
    min_x = max(float(np.nanmin(mx[finite])), -WEB_MERCATOR_LIMIT)
    max_x = min(float(np.nanmax(mx[finite])), WEB_MERCATOR_LIMIT)
    min_y = max(float(np.nanmin(my[finite])), -WEB_MERCATOR_LIMIT)
    max_y = min(float(np.nanmax(my[finite])), WEB_MERCATOR_LIMIT)
    return min_x, min_y, max_x, max_y


def reproject(
    values: np.ndarray,
    x_m: np.ndarray,
    y_m: np.ndarray,
    geos: CRS,
    bounds=None,
    output_shape=None,
):
    bounds = bounds or projected_bounds(x_m, y_m, geos)
    min_x, min_y, max_x, max_y = bounds
    aspect = max((max_x - min_x) / max(max_y - min_y, 1.0), 0.05)
    if output_shape:
        height, width = output_shape
    elif aspect >= 1.0:
        # Never upscale a native mesoscale source to 2048px just to downsample
        # it again in MapLibre. Preserve source detail while cutting initial
        # meso render time and memory substantially.
        width = min(4096, max(1024, values.shape[1]))
        height = max(512, round(width / aspect))
    else:
        height = min(4096, max(1024, values.shape[0]))
        width = max(512, round(height * aspect))

    target = np.full((height, width), np.nan, dtype=np.float32)
    target_x = np.linspace(min_x, max_x, width, dtype=np.float64)
    target_y = np.linspace(max_y, min_y, height, dtype=np.float64)
    inverse = Transformer.from_crs("EPSG:3857", geos, always_xy=True)
    source_height, source_width = values.shape

    for row_start in range(0, height, 192):
        row_end = min(row_start + 192, height)
        mx, my = np.meshgrid(target_x, target_y[row_start:row_end])
        gx, gy = inverse.transform(mx, my)
        col = (gx - x_m[0]) / (x_m[-1] - x_m[0]) * (source_width - 1)
        row = (gy - y_m[0]) / (y_m[-1] - y_m[0]) * (source_height - 1)
        valid = (
            np.isfinite(col) & np.isfinite(row) &
            (col >= 0) & (col < source_width - 1) &
            (row >= 0) & (row < source_height - 1)
        )
        block = target[row_start:row_end]
        if valid.any():
            c0 = np.floor(col[valid]).astype(np.int64)
            r0 = np.floor(row[valid]).astype(np.int64)
            dc = col[valid] - c0
            dr = row[valid] - r0
            v00 = values[r0, c0]
            v01 = values[r0, c0 + 1]
            v10 = values[r0 + 1, c0]
            v11 = values[r0 + 1, c0 + 1]
            samples_valid = np.isfinite(v00) & np.isfinite(v01) & np.isfinite(v10) & np.isfinite(v11)
            interpolated = (
                v00 * (1.0 - dc) * (1.0 - dr) +
                v01 * dc * (1.0 - dr) +
                v10 * (1.0 - dc) * dr +
                v11 * dc * dr
            )
            destination = np.flatnonzero(valid)
            block.flat[destination[samples_valid]] = interpolated[samples_valid]

    return target, bounds


def main() -> None:
    if len(sys.argv) not in (5, 6):
        raise SystemExit("usage: render-goes-cmi.py INPUT.nc OUTPUT.png OUTPUT.json BAND [full|cloud]")
    input_path, png_path, meta_path = map(Path, sys.argv[1:4])
    band = int(sys.argv[4])
    display = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] == "cloud" else "full"
    with xr.open_dataset(input_path, engine="h5netcdf", mask_and_scale=True) as ds:
        values = np.asarray(ds["CMI"].values, dtype=np.float32)
        x = np.asarray(ds["x"].values, dtype=np.float64)
        y = np.asarray(ds["y"].values, dtype=np.float64)
        projection = ds["goes_imager_projection"].attrs
        time_value = str(ds.attrs.get("time_coverage_start", ""))
        platform = str(ds.attrs.get("platform_ID", ds.attrs.get("platform", "GOES")))
        scene = str(ds.attrs.get("scene_id", ""))

    satellite_height = float(projection["perspective_point_height"])
    geos = CRS.from_proj4(
        "+proj=geos +h={h} +lon_0={lon} +sweep={sweep} +a={a} +b={b} +units=m +no_defs".format(
            h=satellite_height,
            lon=float(projection["longitude_of_projection_origin"]),
            sweep=projection.get("sweep_angle_axis", "x"),
            a=float(projection["semi_major_axis"]),
            b=float(projection["semi_minor_axis"]),
        )
    )
    reprojected, bounds = reproject(values, x * satellite_height, y * satellite_height, geos)
    rgba = colorize(reprojected, band, display)
    rendered = Image.fromarray(rgba, "RGBA")
    rgb = rendered.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.1, percent=65, threshold=3))
    rgb.putalpha(rendered.getchannel("A"))
    rgb.save(png_path, optimize=True)

    min_x, min_y, max_x, max_y = bounds
    to_lonlat = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    coordinates = [
        list(to_lonlat.transform(min_x, max_y)),
        list(to_lonlat.transform(max_x, max_y)),
        list(to_lonlat.transform(max_x, min_y)),
        list(to_lonlat.transform(min_x, min_y)),
    ]
    meta_path.write_text(json.dumps({
        "rendererVersion": RENDERER_VERSION,
        "platform": platform,
        "scene": scene,
        "band": band,
        "display": display,
        "validTime": time_value,
        "coordinates": coordinates,
        "width": int(rgba.shape[1]),
        "height": int(rgba.shape[0]),
        "image": png_path.name,
    }))


if __name__ == "__main__":
    main()
