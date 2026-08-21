#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CARGO_HOME="$project_root/.native-toolchain/cargo"
export RUSTUP_HOME="$project_root/.native-toolchain/rustup"
exec "$CARGO_HOME/bin/cargo" build --release --manifest-path "$project_root/native-hive/Cargo.toml"
