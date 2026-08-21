#!/usr/bin/env python3
"""Combine GOES GLM LCFA files into a compact flash GeoJSON feed."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import xarray as xr


def main():
    if len(sys.argv) < 3:
        raise SystemExit("usage: extract-glm-flashes.py OUTPUT.json INPUT.nc [...]")
    output = Path(sys.argv[1])
    features = []
    newest = ""
    for filename in sys.argv[2:]:
        with xr.open_dataset(filename, engine="h5netcdf", mask_and_scale=True) as ds:
            lat = np.asarray(ds["flash_lat"].values).reshape(-1)
            lon = np.asarray(ds["flash_lon"].values).reshape(-1)
            energy = np.asarray(ds.get("flash_energy", np.zeros_like(lat)).values).reshape(-1)
            area = np.asarray(ds.get("flash_area", np.zeros_like(lat)).values).reshape(-1)
            valid_time = str(ds.attrs.get("time_coverage_end", ds.attrs.get("time_coverage_start", "")))
            newest = max(newest, valid_time)
            for index in range(min(len(lat), len(lon))):
                if not np.isfinite(lat[index]) or not np.isfinite(lon[index]):
                    continue
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [float(lon[index]), float(lat[index])]},
                    "properties": {
                        "energy": float(energy[index]) if index < len(energy) and np.isfinite(energy[index]) else 0.0,
                        "area": float(area[index]) if index < len(area) and np.isfinite(area[index]) else 0.0,
                        "validTime": valid_time,
                    },
                })
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"type": "FeatureCollection", "features": features, "validTime": newest}, separators=(",", ":")))


if __name__ == "__main__":
    main()
