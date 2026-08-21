# AWIPS OUP ingest and publication

`POST /api/awips/products` is an adapter for AWIPS EDEX TextWS products. It always
parses and validates incoming products and can optionally publish accepted products
through the existing warning publication pipeline.

## Authentication

The route uses the normal server authentication gate. EDEX should use a dedicated
enrolled native-workstation token:

```http
Authorization: Bearer hive_native_<enrolled-token>
```

The token is validated by the existing native-workstation session code and can be
revoked from the workstation store. OIDC browser cookies remain supported for
operator preview use.

## Request

```http
POST /api/awips/products HTTP/1.1
Host: <warning-server>
Authorization: Bearer hive_native_<enrolled-token>
Content-Type: application/json
Accept: application/json
```

```json
{
  "rawText": "WFUS53 KRIW 171600\nTORRIW\n...",
  "receivedAt": "2026-08-17T16:00:00Z",
  "source": "edex",
  "site": "KRIW"
}
```

`rawText` is preserved byte-for-byte in `preview.rawText` (the parser uses a
normalized private copy only for recognition).

## Response

```json
{
  "accepted": true,
  "preview": {
    "id": "RIWTOR0042",
    "productId": "RIWTOR0042",
    "rawText": "...",
    "wmoHeader": "WFUS53",
    "issuingOffice": "KRIW",
    "wfo": "RIW",
    "pil": "TORRIW",
    "product": "TOR",
    "action": "NEW",
    "phenomenon": "TO",
    "significance": "W",
    "etn": 42,
    "ugcCodes": ["WYC013"],
    "issueTime": "2026-08-17T16:00:00.000Z",
    "expiresAt": "2026-08-17T16:45:00.000Z",
    "geometry": { "type": "Polygon", "coordinates": [] },
    "counties": [],
    "zones": [],
    "motion": null,
    "hailSizeInches": null,
    "windGustMph": null,
    "tags": { "emergency": false, "pds": false, "damageThreat": null },
    "segment": null
  },
  "published": false
}
```

If `AWIPS_PUBLISH_ENABLED=true` and publication succeeds, `published` becomes
`true` and the response may include additional publication metadata:

```json
{
  "accepted": true,
  "published": true,
  "distribution": {...},
  "updatedAt": "2026-08-17T16:00:00.000Z"
}
```

If publication is disabled (default), invalid, or unsupported for this endpoint,
the response still returns the parse preview and `published:false`.

## Parser support

The parser is implemented in `lib/awips-product-parser.js`. The adapter is in
`server.js`. Geographic expansion reads generated AWIPS GeoJSON files; it does not
alter those files.

Supported parser product types currently include TOR, SVR, FFW/FAW, SPS, SMW,
SQW, DSW, RFW, WSW, FLW/FLS, CFW, NPW, MWW/MWS, PNS, and AQA. VTEC actions
`NEW`, `CON`, `EXT`, `EXA`, `EXB`, `CAN`, and `EXP` are recognized. Non-VTEC
products such as SPS are accepted when a recognizable WMO/PIL and product type are
present.

### Publication gate

Publication from this endpoint is controlled by:

```sh
AWIPS_PUBLISH_ENABLED=false   # default; preview only
AWIPS_PUBLISH_ENABLED=true    # publish through warning pipeline
```

Currently publishable products are:

- TOR
- SVR
- FFW
- SPS

SPS handling:

- does not require VTEC
- identity is derived from issue time + PIL/site + affected UGCs/geometry
- expiration is derived from UGC expiry when available (otherwise default +1h)
- is published as Special Weather Statement on the shared warning path

## Publication path (when enabled)

When enabled, the route builds a warning event and calls
`attemptAwipsPublication` (`lib/awips-gfe-publish.js`), which invokes the existing
`publishGfeWarningEvent` workflow in `server.js`. This is the same store/lifecycle
path used by `/api/gfe/products`.

## Errors

- `400`: malformed JSON, missing/empty `rawText`, invalid `receivedAt`, or a non-`edex` source.
- `401`: authentication required or invalid.
- `422`: unsupported/malformed AWIPS content or body over 8 MB.

On publish failures, `published: false` is returned with an optional
`publicationError` field.

## Tests

```sh
npm run test:awips-product-parser
npm run test:awips-gfe-publication
```
