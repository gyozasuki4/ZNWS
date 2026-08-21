# Radar Data Plan

## Level 3 products

The site radar workflow also supports NEXRAD Level 3 data from the Unidata
public archive. The product selector exposes Digital VIL, precipitation
accumulations, Digital Echo Tops, storm-relative velocity, correlation
coefficient, differential reflectivity, specific differential phase, and
hydrometeor classification. Level 3 messages are downloaded and decoded
server-side, then sent to the browser using the same display-ready polar-bin
format as Level 2 products.

Level 3 files are cached under:

```text
data/radar/level3/{SITE}/
```

Initial source:

```text
https://nomads.ncep.noaa.gov/pub/data/nccf/radar/nexrad_level2/
```

The NOMADS directory contains one folder per radar site. Site folders expose Level 2 volume files named like:

```text
KOHX_YYYYMMDD_HHMMSS.bz2
```

## First Implementation

The app currently proxies the NOMADS directory listing through the local Node server:

- `GET /api/radar/sites`
- `GET /api/radar/files?site=KOHX&limit=24`
- `POST /api/radar/cache`

The browser can list recent Level 2 files for a selected site. Clicking a scan asks the Ubuntu server to cache the raw `.bz2` file under:

```text
data/radar/level2/{SITE}/
```

Rendering is intentionally not implemented yet.

## Next Implementation Steps

1. Download the newest files on an interval.
2. Decode Level 2 files server-side.
3. Generate local radar display products, starting with base reflectivity.
4. Serve radar products to MapLibre as local raster or vector-style tiles.
5. Add time controls for looping recent scans.

For operational snappiness, the browser should not parse raw Level 2 files directly. The Ubuntu server should ingest/decode/cache files and the web UI should consume display-ready tiles or images.
