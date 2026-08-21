#!/usr/bin/env python3
import json, math, os, sys, tempfile
import numpy as np
from datetime import datetime, timezone
from osgeo import gdal, ogr, osr

gdal.UseExceptions()

def zone_rows(paths):
    rows = []
    for zone_type, path in paths:
        with open(path, encoding="utf-8") as handle:
            collection = json.load(handle)
        for feature in collection.get("features", []):
            p = feature.get("properties", {})
            lat, lon = p.get("LAT"), p.get("LON")
            if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                # Retain geometry-less records so downstream coverage audits
                # see an explicit no-data zone and fail closed. Never replace
                # a missing polygon with centroid sampling.
                rows.append({"wfo": str(p.get("CWA") or p.get("WFO") or "").upper(), "code": str(p.get("STATE_ZONE") or p.get("ID") or "").upper(), "name": str(p.get("NAME", "")), "zoneType": zone_type, "lat": lat, "lon": lon, "_geometry": feature.get("geometry"), "values": {}})
    return rows

def grid_key(dataset):
    return (dataset.RasterXSize, dataset.RasterYSize, tuple(round(float(v), 10) for v in dataset.GetGeoTransform()), dataset.GetProjection())

def zone_memberships(rows, dataset, cache):
    """Return parallel pixel/zone arrays, retaining overlapping memberships.

    Each polygon is rasterized separately with ALL_TOUCHED. This is deliberate:
    a single zone-ID raster loses one side of shared boundaries because one ID
    overwrites the other. The sparse arrays below allow the same grid cell to
    belong to every zone it intersects.
    """
    key = grid_key(dataset)
    if key in cache: return cache[key]
    source = osr.SpatialReference(); source.ImportFromEPSG(4326); source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    target = osr.SpatialReference(); target.ImportFromWkt(dataset.GetProjection()); target.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    transform = osr.CoordinateTransformation(source, target)
    gt, inverse = dataset.GetGeoTransform(), gdal.InvGeoTransform(dataset.GetGeoTransform())
    width, height = dataset.RasterXSize, dataset.RasterYSize
    vector = ogr.GetDriverByName("Memory").CreateDataSource("")
    layer = vector.CreateLayer("zone", srs=target, geom_type=ogr.wkbUnknown)
    definition = layer.GetLayerDefn()
    pixel_parts, row_parts = [], []
    for row_index, row in enumerate(rows):
        geometry_json = row.get("_geometry")
        if not geometry_json: continue
        geometry = ogr.CreateGeometryFromJson(json.dumps(geometry_json))
        if not geometry: continue
        geometry.Transform(transform)
        min_x, max_x, min_y, max_y = geometry.GetEnvelope()
        corners = [gdal.ApplyGeoTransform(inverse, x, y) for x in (min_x, max_x) for y in (min_y, max_y)]
        xoff = max(0, math.floor(min(p[0] for p in corners)) - 1)
        yoff = max(0, math.floor(min(p[1] for p in corners)) - 1)
        xend = min(width, math.ceil(max(p[0] for p in corners)) + 1)
        yend = min(height, math.ceil(max(p[1] for p in corners)) + 1)
        if xoff >= xend or yoff >= yend: continue
        feature = ogr.Feature(definition); feature.SetGeometry(geometry)
        layer.CreateFeature(feature); fid = feature.GetFID(); feature = None
        raster = gdal.GetDriverByName("MEM").Create("", xend - xoff, yend - yoff, 1, gdal.GDT_Byte)
        origin_x, origin_y = gdal.ApplyGeoTransform(gt, xoff, yoff)
        raster.SetProjection(dataset.GetProjection())
        raster.SetGeoTransform((origin_x, gt[1], gt[2], origin_y, gt[4], gt[5]))
        raster.GetRasterBand(1).Fill(0)
        gdal.RasterizeLayer(raster, [1], layer, burn_values=[1], options=["ALL_TOUCHED=TRUE"])
        local_rows, local_cols = np.nonzero(raster.GetRasterBand(1).ReadAsArray())
        if len(local_rows):
            pixel_parts.append((local_rows.astype(np.int64) + yoff) * width + local_cols + xoff)
            row_parts.append(np.full(len(local_rows), row_index, dtype=np.int32))
        layer.DeleteFeature(fid); raster = None
    pixels = np.concatenate(pixel_parts) if pixel_parts else np.empty(0, dtype=np.int64)
    zone_indexes = np.concatenate(row_parts) if row_parts else np.empty(0, dtype=np.int32)
    cache[key] = (pixels, zone_indexes)
    return cache[key]

def convert(value, unit, field):
    if not math.isfinite(value): return None
    text = str(unit or "").lower()
    if text in ("k", "[k]") or "kelvin" in text: return value * 9 / 5 - 459.67
    if text in ("c", "[c]", "°c", "[°c]") or "celsius" in text: return value * 9 / 5 + 32
    if text in ("kg m-2", "[kg/(m^2)]", "[kg/m^2]", "mm", "[mm]"): return value / 25.4
    if text in ("m", "[m]"): return value * (3.28084 if field == "waveHeight" else 39.3701)
    if text in ("m/s", "[m/s]"): return value * 2.23694
    return value

def weather_tables(payload):
    tables, cursor = [], 0
    while True:
        start = payload.find(b"GRIB", cursor)
        if start < 0 or start + 16 > len(payload): break
        length = int.from_bytes(payload[start + 8:start + 16], "big")
        if length < 20 or start + length > len(payload): cursor = start + 4; continue
        message, offset, table = payload[start:start + length], 16, []
        while offset + 5 <= len(message) - 4:
            section_length = int.from_bytes(message[offset:offset + 4], "big")
            if section_length < 5 or offset + section_length > len(message): break
            if message[offset + 4] == 2:
                section = message[offset:offset + section_length]
                # NDFD Wx local-use packing: version (2), character count (4),
                # reference/scales (6), bits/character (1), packing flag (1),
                # followed by the bit-packed ASCII lookup table.
                if len(section) >= 21 and section[5] == 1:
                    count, bits, packed = int.from_bytes(section[8:12], "big"), section[18], section[20:]
                    values, accumulator, available = [], 0, 0
                    for byte in packed:
                        accumulator = (accumulator << 8) | byte; available += 8
                        while bits and available >= bits and len(values) < count:
                            available -= bits; values.append((accumulator >> available) & ((1 << bits) - 1))
                            accumulator &= (1 << available) - 1 if available else 0
                    table = bytes(values).decode("ascii", "replace").split("\0")
                    if table and table[-1] == "": table.pop()
            offset += section_length
        tables.append(table); cursor = start + length
    return tables

def sample_file(rows, field, path, mask_cache):
    open_path, extracted_path = path, None
    # NOAA's NDFD files may use WMO bulletin framing around concatenated GRIB2
    # messages. GDAL expects a raw GRIB stream, so strip only the framing bytes.
    with open(path, "rb") as handle: payload = handle.read()
    is_tiff = payload[:4] in (b"II*\x00", b"MM\x00*")
    if not payload.startswith(b"GRIB") and not is_tiff:
        messages, cursor = [], 0
        while True:
            start = payload.find(b"GRIB", cursor)
            if start < 0 or start + 16 > len(payload): break
            edition = payload[start + 7]
            length = int.from_bytes(payload[start + 8:start + 16], "big") if edition == 2 else 0
            if length < 20 or start + length > len(payload):
                cursor = start + 4; continue
            messages.append(payload[start:start + length]); cursor = start + length
        if not messages: raise RuntimeError(f"{path} contains no complete GRIB2 messages")
        temporary = tempfile.NamedTemporaryFile(prefix="ndfd-grib-", suffix=".grb2", delete=False)
        try:
            for message in messages: temporary.write(message)
        finally: temporary.close()
        open_path, extracted_path = temporary.name, temporary.name
    categorical_tables = weather_tables(payload) if field == "weather" else []
    dataset = gdal.Open(open_path)
    pixels, membership_rows = zone_memberships(rows, dataset, mask_cache)
    for row in rows: row["values"][field] = []
    for index in range(1, dataset.RasterCount + 1):
        band = dataset.GetRasterBand(index); metadata = band.GetMetadata(); valid = metadata.get("GRIB_VALID_TIME"); unit = metadata.get("GRIB_UNIT"); nodata = band.GetNoDataValue(); grid = band.ReadAsArray()
        reduced=np.full(len(rows),np.inf if field in ("relativeHumidity","minRh","minTemperature","temperature") else -np.inf,dtype=float)
        sampled=np.asarray(grid).reshape(-1)[pixels]
        valid_mask=np.isfinite(sampled)
        if nodata is not None: valid_mask &= sampled != nodata
        valid_values=np.asarray(sampled[valid_mask],dtype=float);valid_rows=membership_rows[valid_mask]
        categorical = []
        if field == "weather" and len(valid_values):
            weather_keys=np.rint(valid_values).astype(np.int64)&0xffffffff
            categorical.append(np.unique((valid_rows.astype(np.int64)<<32)|weather_keys))
        elif field in ("relativeHumidity","minRh","minTemperature","temperature"): np.minimum.at(reduced,valid_rows,valid_values)
        else: np.maximum.at(reduced,valid_rows,valid_values)
        if field == "weather":
            table = categorical_tables[index - 1] if index - 1 < len(categorical_tables) else []
            pairs=np.unique(np.concatenate(categorical)) if categorical else np.empty(0,dtype=np.int64)
            for packed in pairs:
                row_index=int(packed>>32);key_value=int(packed&0xffffffff)
                if 0 <= key_value < len(table): rows[int(row_index)]["values"][field].append({"valid": valid.strip() if valid else None, "value": table[key_value]})
        else:
            for row_index,raw in enumerate(reduced):
                if math.isfinite(raw): rows[row_index]["values"][field].append({"valid": valid.strip() if valid else None, "value": round(convert(float(raw), unit, field), 2)})
    dataset = None
    if extracted_path: os.unlink(extracted_path)

def main():
    if len(sys.argv) < 6 or (len(sys.argv) - 5) % 2: raise SystemExit("usage: sample-ndfd-bulk.py FIRE_GEOJSON PUBLIC_GEOJSON MARINE_GEOJSON OUTPUT FIELD FILE [FIELD FILE ...]")
    fire, public, marine, output = sys.argv[1:5]
    rows = zone_rows((("fire", fire), ("public", public), ("marine", marine))); mask_cache = {}
    for index in range(5, len(sys.argv), 2):
        print(f"sampling {sys.argv[index]}", file=sys.stderr, flush=True)
        sample_file(rows, sys.argv[index], sys.argv[index + 1], mask_cache)
    for row in rows: row.pop("_geometry", None)
    body = {"generatedAt": datetime.now(timezone.utc).isoformat(), "samplingVersion": 5, "samplingMethod":"every-grid-cell-intersecting-zone", "zoneCount": len(rows), "fields": sys.argv[5::2], "zones": rows}
    temporary = output + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle: json.dump(body, handle, separators=(",", ":"))
    os.replace(temporary, output)

if __name__ == "__main__": main()
