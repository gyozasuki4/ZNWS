#!/usr/bin/env bash
# Build ZASNet Hive Native 0.5.0 (MapLibre + Slint) with the project toolchain.
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
toolchain_root="$project_root/.native-toolchain/maplibre-build"
build_root="$project_root/native-maplibre/build-hive-conda-full"
jobs="${HIVE_BUILD_JOBS:-$(nproc 2>/dev/null || echo 4)}"

if [[ ! -d "$toolchain_root" ]]; then
    echo "error: missing toolchain at $toolchain_root" >&2
    exit 1
fi
if [[ ! -d "$build_root" ]]; then
    echo "error: missing cmake build dir $build_root (configure once first)" >&2
    exit 1
fi

# Ensure fontconfig's private dependency resolves during Slint cargo rebuilds.
if [[ ! -f "$toolchain_root/lib/pkgconfig/expat.pc" ]]; then
    cat >"$toolchain_root/lib/pkgconfig/expat.pc" <<EOF
prefix=$toolchain_root
exec_prefix=\${prefix}
libdir=\${prefix}/lib
includedir=\${prefix}/include

Name: expat
Description: expat XML parser
Version: 2.6.0
Libs: -L\${libdir} -lexpat
Cflags: -I\${includedir}
EOF
fi
if [[ ! -e "$toolchain_root/lib/libexpat.so" && -e "$toolchain_root/lib/libexpat.so.1" ]]; then
    ln -sf libexpat.so.1 "$toolchain_root/lib/libexpat.so"
fi

export PATH="$toolchain_root/bin:$PATH"
export LD_LIBRARY_PATH="$toolchain_root/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PKG_CONFIG_PATH="$toolchain_root/lib/pkgconfig:/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
# Prefer toolchain .pc files but allow system fallbacks (expat headers, etc.)
unset PKG_CONFIG_LIBDIR || true

export CARGO_HOME="${CARGO_HOME:-$project_root/.native-toolchain/cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-$project_root/.native-toolchain/rustup}"

echo "[build-maplibre-hive] toolchain=$toolchain_root"
echo "[build-maplibre-hive] build_root=$build_root"
echo "[build-maplibre-hive] jobs=$jobs"
pkg-config --exists fontconfig && echo "[build-maplibre-hive] fontconfig: $(pkg-config --modversion fontconfig)"

cd "$build_root"
cmake --build . --target maplibre-slint-example -j"$jobs"

binary="$build_root/cpp/maplibre-slint-example"
test -x "$binary"
echo "[build-maplibre-hive] ok: $binary"
ls -lh "$binary"
