#!/usr/bin/env python3
"""Copy Lambert (or any) georeferencing from a companion WRF field onto SMOKE_SFC.

Some ZNWS-WRF SMOKE_SFC GRIBs are written with a fake equirectangular geotransform
while the samples still sit on the same projected grid as REFC/TMP2M. That places
smoke plumes south/east of true fire locations by ~10 km on mesoscale domains.

Usage:
  fix-smoke-georef.py <smoke.tif|grib> <companion.tif|grib> <out.tif>
"""
from __future__ import annotations

import sys

from osgeo import gdal

gdal.UseExceptions()


def main() -> int:
  if len(sys.argv) != 4:
    print("usage: fix-smoke-georef.py smoke companion out.tif", file=sys.stderr)
    return 2
  smoke_path, companion_path, out_path = sys.argv[1:4]
  smoke = gdal.Open(smoke_path, gdal.GA_ReadOnly)
  companion = gdal.Open(companion_path, gdal.GA_ReadOnly)
  if smoke is None or companion is None:
    print("could not open smoke or companion dataset", file=sys.stderr)
    return 1
  if smoke.RasterXSize != companion.RasterXSize or smoke.RasterYSize != companion.RasterYSize:
    print(
      f"grid size mismatch smoke={smoke.RasterXSize}x{smoke.RasterYSize} "
      f"companion={companion.RasterXSize}x{companion.RasterYSize}",
      file=sys.stderr,
    )
    return 1

  smoke_gt = smoke.GetGeoTransform()
  companion_gt = companion.GetGeoTransform()
  smoke_proj = smoke.GetProjection() or ""
  companion_proj = companion.GetProjection() or ""

  # Already projected (meters / LC): leave alone
  smoke_is_geo = abs(smoke_gt[1]) < 1.0 and abs(smoke_gt[5]) < 1.0
  companion_is_proj = abs(companion_gt[1]) >= 1.0 or abs(companion_gt[5]) >= 1.0
  if not smoke_is_geo or not companion_is_proj or not companion_proj:
    # Nothing to fix — copy through as GeoTIFF
    driver = gdal.GetDriverByName("GTiff")
    driver.CreateCopy(out_path, smoke, strict=0)
    return 0

  driver = gdal.GetDriverByName("GTiff")
  out = driver.Create(
    out_path,
    smoke.RasterXSize,
    smoke.RasterYSize,
    smoke.RasterCount,
    smoke.GetRasterBand(1).DataType,
    options=["COMPRESS=DEFLATE", "TILED=YES"],
  )
  out.SetGeoTransform(companion_gt)
  out.SetProjection(companion_proj)
  for band_index in range(1, smoke.RasterCount + 1):
    src_band = smoke.GetRasterBand(band_index)
    dst_band = out.GetRasterBand(band_index)
    dst_band.WriteArray(src_band.ReadAsArray())
    nodata = src_band.GetNoDataValue()
    if nodata is not None:
      dst_band.SetNoDataValue(nodata)
    desc = src_band.GetDescription()
    if desc:
      dst_band.SetDescription(desc)
  out.FlushCache()
  out = None
  smoke = None
  companion = None
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
