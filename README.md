# ZNCave Weather Operations

A first-pass web console for an AWIPS-style weather operations project. This version provides a MapLibre GL JS interactive map that future Level 2 radar ingestion, warning polygon drawing, and issuance workflows can build on.

## Features

- Fixed gray operations basemap for radar-friendly viewing
- MapLibre GL JS WebGL map rendering
- Pan, zoom, scroll, pinch, and browser geolocation support
- Left-side operations menu with fast tiled map overlays
- Label-free basemap with configurable Census TIGER highway/road overlays and local city labels
- State, county, public zone, and CWA boundary overlay toggles
- Per-user layer visibility and opacity preferences
- Level 2 radar file discovery and server-side scan caching
- Level 3 site products from the Unidata NEXRAD archive: VIL, precipitation
  accumulations, composite reflectivity, echo tops, storm-relative velocity,
  CC, ZDR, KDP, and HHC
- GOES GLM flash overlay and current Aviation Weather Center METAR observations
- Live cursor, map center, and zoom readouts
- Placeholder warning polygon control for the next development round
- Dependency-free Node server suitable for Ubuntu Server

## Mac Development

```bash
node server.js
```

Then open:

```text
http://localhost:8080
```

To use another port:

```bash
PORT=3000 node server.js
```

For local-only testing:

```bash
HOST=127.0.0.1 PORT=8080 node server.js
```

If Node is not installed on the Mac yet, you can still edit the files here and run the app on the Ubuntu Server.

## Ubuntu Server Deployment

1. Install Node.js 20 or newer.
2. Copy this project folder to the server.
3. From the project folder, run `node server.js`.
4. Visit `http://SERVER_IP:8080` from a browser on your network.

This first build uses public web tile services, so the server or client browser needs internet access. A later build can switch to local tiles for disconnected operations.

## Authentik SSO (ops only)

Public site: **https://zasnetwx.com**. Ops desk: **https://ops.zasnetwx.com** with Authentik OIDC (provider **`WXMan`**). The public host’s `/` route is a public landing page; the ops host’s `/` route remains SSO-protected. Both hostnames must route to this service, with `PUBLIC_BASE_URL=https://ops.zasnetwx.com` so OIDC callbacks stay on the ops domain.

The stable public alert map is available at **`/public.html`**. The separate,
unauthenticated **`/beta.html`** page is a public testing surface: it combines
the issued-product layer with a read-only proxy of official active NWS alerts
and an optional radar composite. It is intentionally not indexed and may
change without notice.

### Public alerts API

Active ZASNet alerts are available without authentication at
`/api/public/alerts/active`. The response follows the weather.gov GeoJSON alert
shape and supports `area`, `zone`, `point` (`lat,lon`), `event`, `code`,
`severity`, `urgency`, `certainty`, `limit`, and `cursor` query parameters.
Convenience routes `/api/public/alerts/active/area/{state}` and
`/api/public/alerts/active/zone/{ugc}` are also available. Fetch an individual
active alert at `/api/public/alerts/{id}` or its bulletin text at
`/api/public/alerts/{id}.txt`. Public alert responses permit cross-origin GETs.

The pre-existing `/api/public/alerts?format=json|geojson|catalog` endpoint is
retained for existing clients. This API intentionally resembles the NWS API,
but its identifiers and products are issued by ZASNet and it is not an
official National Weather Service feed.

The human-readable developer portal is served at `/api`, with its OpenAPI 3.1
contract at `/api/openapi.json`. When `api.zasnetwx.com` is routed to this
service, its root path serves the same portal; existing `/api/public/...` paths
remain unchanged on both hosts.

**`/severe-weather.html`** is a public SPC outlook viewer. It presents
ZASNet-generated, locally cached SVG graphics from official SPC vector data:
Day 1–3 categorical plus Day 1–2 tornado, wind, and hail outlooks in national
or regional views, with an explicit link to the official SPC outlooks.

See **`docs/authentik.md`**. Set `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET`, `SESSION_SECRET`, `AUTHENTIK_OIDC_ISSUER=https://sso.zasnetwork.com/application/o/wxman/`.

UI: rail **In** / **Out**; session cookie after login. Preferences still keyed by username in `data/user-preferences.json`.

Security and activity events are appended to `data/access-audit.jsonl`. Entries cover warning acceptance, login/logout, page and tool access, session heartbeats/duration, and denied audit-view attempts. Metadata includes UTC time, Authentik identity/UID/groups, direct and proxy IPs, proxy-provided approximate region/country, browser locale/platform/screen/time zone, user agent, and page. Cookies, authorization tokens, form contents, keystrokes, and credentials are not logged. Restrict access to this file and define an appropriate retention policy for your organization.

Public pages load `/public-tracking.js`, which records first-party page views, one-minute visible-page heartbeats, and page exits through `/api/access/activity`. It does not set a tracking cookie or send data to a third-party analytics provider. Public visitors are unauthenticated, but the server metadata above (including IP address and user agent) is still personal data; disclose this collection and set a retention policy appropriate to your jurisdiction.

Set `AUTHENTIK_AUDIT_USERS` to a comma-separated Authentik username allowlist (for example, `AUTHENTIK_AUDIT_USERS=admin,jdoe`). Allowed users can view `/audit.html`; both that page and its `/api/access/audit` data endpoint enforce the allowlist server-side.

Set `AUTHENTIK_ADMIN_USERS` to a comma-separated Authentik username allowlist for `https://ops.zasnetwx.com/admin`. These administrators can edit complete tokenized bulletin templates, default IMPACTS, and precautionary/preparedness wording used by zone-based Hazard Services products. If it is omitted, `AUTHENTIK_AUDIT_USERS` is used for backward-compatible admin access.

## NCEP forecast-request integration

The server contains a server-side client for the approval-queue API at
`http://10.10.3.131:8080/api/v1`. The current interface supports one-time and
hourly MESO1 forecasts with 1, 3, or 9 km grid spacing. It creates a persistent
UUID-based external ID for each logical submission, understands approval and
workflow statuses, and retrieves product inventories while a run is still
publishing. Temporary network and 5xx failures use bounded exponential
retries; permanent 4xx responses do not.

Configuration variables are:

```text
NCEP_FORECAST_API_BASE=http://10.10.3.131:8080/api/v1
ZASNET_API_KEY=...
NCEP_FORECAST_SUBMISSIONS_ENABLED=true
```

The administrator-only readiness endpoint is
`GET /api/ops/admin/ncep-forecast-integration`. Forecasts are submitted from
the Mesoscale & Models view in `/admin`, remain pending until approved by the
remote dashboard, and are then monitored through their request status and
product endpoints every 15 seconds. Published GRIB2 frames become available
on the Models page without waiting for the entire forecast to complete. The
API key remains server-side.

## Mattermost warning notifications

Set `MATTERMOST_WEBHOOK_URL` to a Mattermost incoming-webhook URL on the server. Optional settings are `MATTERMOST_NOTIFICATIONS=true`, `MATTERMOST_USERNAME=ZWS Weather Ops`, and `MATTERMOST_TIME_ZONE=America/Chicago`. The webhook stays server-side. Issued warning messages use the issuing WFO's local time by default.

## Boundary Data

The warning/HazGen path should use NWS AWIPS basemap shapefiles for counties, public forecast zones, CWA boundaries, and zone-county correlation data. See:

```text
docs/boundary-data.md
```

After downloading the AWIPS files, install GDAL and generate local display layers:

```bash
sudo apt install -y gdal-bin
chmod +x scripts/prepare-awips-data.sh
./scripts/prepare-awips-data.sh
```

## Place Labels

The local city/town label layer can be rebuilt from the U.S. Census Gazetteer national places file. This adds incorporated places and census-designated places, including smaller towns that matter for warning text and polygon context.

```bash
cd ~/Cave
python3 scripts/prepare-place-labels.py
```

The generated labels are written to:

```text
data/generated/base/cities.geojson
```

Large places show at wider zooms, while small towns appear as you zoom in.

## Radar Data

Level 2 radar discovery uses NOMADS as the first source. See:

```text
docs/radar-data.md
```

Clicked Level 2 scans are cached on the Ubuntu server under:

```text
data/radar/level2/{SITE}/
```

Rendered first-pass base reflectivity PNGs are stored under:

```text
data/radar/products/{SITE}/
```

Install the Python renderer dependencies in an isolated virtual environment before drawing cached scans:

```bash
sudo apt install -y python3-pip python3-venv
cd ~/Cave
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip setuptools wheel
.venv/bin/python -m pip install metpy matplotlib numpy
```

## Native GOES Satellite Layers

GOES-19 East and GOES-18 West native ABI layers use NOAA's public CMI buckets.
CONUS/PACUS, Full Disk, and moving Meso 1/2 sectors support bands 1–16 plus a
high-resolution GeoColor-style day/night composite.

```bash
cd ~/Cave
.venv/bin/python -m pip install h5py h5netcdf xarray pyproj pillow numpy
```

Rendered frames are cached under `data/satellite/`. The Node server automatically
uses `~/Cave/.venv/bin/python` when that virtual environment exists.

## Optional Systemd Service

The `deploy/zncave-weather.service` file is a starting point for running the app continuously on Ubuntu Server.

```bash
sudo mkdir -p /opt/zncave-weather
sudo cp -R . /opt/zncave-weather
sudo chown -R www-data:www-data /opt/zncave-weather
sudo cp deploy/zncave-weather.service /etc/systemd/system/zncave-weather.service
sudo systemctl daemon-reload
sudo systemctl enable --now zncave-weather
```

Then open:

```text
http://SERVER_IP:8080
```
