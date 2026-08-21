# Boundary Data Plan

ZNCave should use the National Weather Service AWIPS basemap shapefiles as the authoritative boundary source for warning and HazGen workflows.

Source page:

```text
https://www.weather.gov/gis/AWIPSShapefiles
```

## Priority Datasets

- U.S. Counties: county warning geometry and FIPS metadata
- Public Forecast Zones: zone geometry and state-zone identifiers
- Fire Weather Zones: fire-program geometry and state-zone identifiers for GFE fire products
- Marine Zones: coastal / Great Lakes / ocean marine zone geometry and UGC (AMZ/GMZ/LSZ/…) for Special Marine Warning
- Zone-county correlation file: mapping between public forecast zones, counties, CWA, FIPS, and zone names
- USGS 3D Hydrography Program: primary named river/stream reference for Flood Advisory polygons, queried through `/api/hydrography/named-rivers`; results use intersecting GNIS-named channel lines ranked by stream order and length
- NWS Rivers subset: static local fallback used when the USGS 3DHP service is unavailable (`data/generated/reference/nws-rivers-subset.geojson`); it is not live flood-stage data
- County Warning Area boundaries: WFO/CWA ownership context
- U.S. States and Territories: state outlines for base map context

## Why This Matters

Generic map boundaries are fine for a visual base map, but warning operations need NWS operational geometry and identifiers. The county and zone files include fields such as `STATE`, `CWA`, `FIPS`, `STATE_ZONE`, `ZONE`, `NAME`, `TIME_ZONE`, `FE_AREA`, `LAT`, and `LON`, which will matter when a warning polygon needs to resolve affected counties/zones and eventually produce HazGen-style product metadata.

## Implementation Direction

For the fast map display, convert the shapefiles into local vector tiles and serve them from the Ubuntu machine. The browser should not query full shapefiles on every pan.

Recommended pipeline:

1. Download official NWS AWIPS shapefile ZIPs.
2. Store original files under `data/source/nws-awips/`.
3. Convert to GeoJSON or GeoPackage for processing.
4. Generate local vector tiles such as MBTiles or PMTiles.
5. Load those tiles in MapLibre GL JS as vector sources.
6. Keep the full attributes available server-side for polygon intersection and HazGen workflows.

This gives us two separate paths:

- Fast visual map layers from local vector tiles
- Exact warning/HazGen lookup from local authoritative geometry and attributes
