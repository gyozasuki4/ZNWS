#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_root="$project_root/native-maplibre/build-hive-conda-full"
toolchain_root="$project_root/.native-toolchain/maplibre-build"
binary="$build_root/cpp/maplibre-slint-example"
package_name="ZASNet-Hive-Native-Beta-0.8.0-linux-x86_64"
output="$project_root/dist-native/$package_name.tar.gz"
stage_root="$(mktemp -d)"
stage="$stage_root/$package_name"
native_data="$project_root/data/generated/native"
base_data="$project_root/data/generated/base"

cleanup() {
    rm -rf -- "$stage_root"
}
trap cleanup EXIT

test -x "$binary"
install -d "$stage/bin" "$stage/lib" "$stage/share/data"
install -m 0755 "$binary" "$stage/bin/zasnet-hive-native"
install -m 0755 "$project_root/native-maplibre/packaging/launch-hive-native" "$stage/launch-hive-native"
install -m 0644 "$project_root/native-maplibre/packaging/README.txt" "$stage/README.txt"
install -m 0644 "$toolchain_root/ssl/cacert.pem" "$stage/share/cacert.pem"

# Bundle boundary / place data so the client does not pull them from ops.
if [[ -d "$native_data" ]]; then
    for f in states counties cwa public-zones fire-zones marine-zones; do
        src="$native_data/${f}.geojson"
        if [[ -f "$src" ]]; then
            install -m 0644 "$src" "$stage/share/data/"
        fi
    done
fi
if [[ -f "$base_data/map-cities.geojson" ]]; then
    install -m 0644 "$base_data/map-cities.geojson" "$stage/share/data/"
fi

declare -a queue=("$binary")
declare -A copied=()

while ((${#queue[@]})); do
    current="${queue[0]}"
    queue=("${queue[@]:1}")
    while read -r soname marker resolved rest; do
        [[ "$marker" == "=>" && -f "$resolved" ]] || continue
        case "$resolved" in
            "$project_root"/*|"$toolchain_root"/*)
                [[ -z "${copied[$soname]:-}" ]] || continue
                install -m 0755 "$resolved" "$stage/lib/$soname"
                copied["$soname"]=1
                queue+=("$resolved")
                ;;
        esac
    done < <(LD_LIBRARY_PATH="$toolchain_root/lib:$build_root/_deps/slint-build:$project_root/native-maplibre/vendor/maplibre-native/vendor/wgpu-native/target/x86_64-unknown-linux-gnu/release" ldd "$current")
done

mkdir -p "$project_root/dist-native"
tar -czf "$output" -C "$stage_root" "$package_name"
sha256sum "$output"
ls -lh "$output"
