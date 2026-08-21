#!/usr/bin/env bash
set -euo pipefail

remote="zasnetwx@10.10.3.83"
key="/home/cave/.ssh/zasnetwx_public_ed25519"
destination="/srv/zasnetwx-public/current/data"
ssh_command="ssh -i ${key} -o BatchMode=yes -o ConnectTimeout=10"
mode="${1:-full}"

${ssh_command} "${remote}" "mkdir -p '${destination}/map-snapshots' '${destination}/warnings-server' '${destination}/public-alerts-store/records' '${destination}/generated/base' '${destination}/generated/awips' '${destination}/generated/native' '${destination}/generated/reference' '${destination}/generated/public-outlooks'"

rsync -a --delete-delay -e "${ssh_command}" \
  data/public-alerts.json \
  data/temporary-map-regions.json \
  "${remote}:${destination}/"

# The sharded alert store is authoritative. Upload records before replacing the
# manifest so the public server can never observe a manifest that references a
# record that has not arrived yet. Keep unreferenced records as harmless orphans
# rather than deleting a file that an in-flight reader of the old manifest needs.
rsync -a -e "${ssh_command}" \
  data/public-alerts-store/records/ \
  "${remote}:${destination}/public-alerts-store/records/"
rsync -a -e "${ssh_command}" \
  data/public-alerts-store/manifest.json \
  "${remote}:${destination}/public-alerts-store/manifest.json"

for directory in map-snapshots warnings-server; do
  rsync -a --delete-delay -e "${ssh_command}" \
    "data/${directory}/" "${remote}:${destination}/${directory}/"
done

if [[ "${mode}" == "fast" ]]; then
  exit 0
fi

for directory in base awips native reference public-outlooks; do
  rsync -a --delete-delay -e "${ssh_command}" \
    "data/generated/${directory}/" "${remote}:${destination}/generated/${directory}/"
done
