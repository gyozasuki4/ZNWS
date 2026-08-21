#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="$project_root/data/generated/awips"
output_root="$project_root/data/generated/native"
mkdir -p "$output_root"

build_layer() {
    local name="$1"
    local tolerance="$2"
    local temporary_dir
    local temporary
    temporary_dir="$(mktemp -d --tmpdir="$output_root" ".$name.XXXXXX")"
    temporary="$temporary_dir/$name.geojson"
    ogr2ogr -f GeoJSON "$temporary" "$source_root/$name.geojson" \
        -simplify "$tolerance" -lco COORDINATE_PRECISION=5
    chmod 0644 "$temporary"
    mv -f "$temporary" "$output_root/$name.geojson"
    rmdir "$temporary_dir"
}

build_layer states 0.02
build_layer counties 0.015
build_layer cwa 0.02
build_layer public-zones 0.015
build_layer fire-zones 0.015
build_layer marine-zones 0.01
