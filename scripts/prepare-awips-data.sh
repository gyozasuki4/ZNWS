#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/data/source/nws-awips/shapefiles"
OUTPUT_DIR="$ROOT_DIR/data/generated/awips"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

if ! command -v ogr2ogr >/dev/null 2>&1; then
  echo "ogr2ogr is required. Install it with: sudo apt install -y gdal-bin" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

require_file "$SOURCE_DIR/states/s_16ap26.shp"
require_file "$SOURCE_DIR/counties/c_16ap26.shp"
require_file "$SOURCE_DIR/public-zones/z_16ap26.shp"
require_file "$SOURCE_DIR/fire-zones/fz16ap26.shp"
require_file "$SOURCE_DIR/cwa/w_16ap26.shp"
# Marine zones (Special Marine Warning UGC) — optional if the zip has not been fetched yet
MARINE_SHP="$SOURCE_DIR/marine-zones/mz16ap26.shp"

convert_layer() {
  local input_file="$1"
  local output_file="$2"

  ogr2ogr \
    -f GeoJSON \
    -t_srs EPSG:4326 \
    -lco RFC7946=YES \
    -lco COORDINATE_PRECISION=5 \
    -simplify 0.001 \
    "$output_file" \
    "$input_file"
}

convert_layer "$SOURCE_DIR/states/s_16ap26.shp" "$OUTPUT_DIR/states.geojson"
convert_layer "$SOURCE_DIR/counties/c_16ap26.shp" "$OUTPUT_DIR/counties.geojson"
convert_layer "$SOURCE_DIR/public-zones/z_16ap26.shp" "$OUTPUT_DIR/public-zones.geojson"
convert_layer "$SOURCE_DIR/fire-zones/fz16ap26.shp" "$OUTPUT_DIR/fire-zones.geojson"
convert_layer "$SOURCE_DIR/cwa/w_16ap26.shp" "$OUTPUT_DIR/cwa.geojson"
if [[ -f "$MARINE_SHP" ]]; then
  # Slightly more simplification — marine waters are large and dense
  ogr2ogr \
    -f GeoJSON \
    -t_srs EPSG:4326 \
    -lco RFC7946=YES \
    -lco COORDINATE_PRECISION=5 \
    -simplify 0.002 \
    "$OUTPUT_DIR/marine-zones.geojson" \
    "$MARINE_SHP"
else
  echo "Note: marine zones shapefile missing ($MARINE_SHP). SMW UGC will be unavailable until downloaded." >&2
fi

cp "$ROOT_DIR/data/source/nws-awips/correlation/bp16ap26.dbx" "$OUTPUT_DIR/zone-county-correlation.dbx"

echo "Generated AWIPS map files:"
find "$OUTPUT_DIR" -maxdepth 1 -type f -print
