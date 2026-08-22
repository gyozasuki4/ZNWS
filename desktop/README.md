# ZASNet Hive Beta Desktop

**100% Hive Beta UI.** This Electron shell loads the real `/hive-beta` web
application (`index.html`, `app.js`, `styles.css`, workers). It does not
re-implement the interface in Slint or any other toolkit — what you see is the
same code as the browser.

## Run (development)

Start the ops server (or point at production), then:

```bash
# Against production Hive Beta
npm run desktop:dev

# Against local server
HIVE_SERVER_URL=http://127.0.0.1:8080/hive-beta npm run desktop:dev
```

## Package

```bash
npm run desktop:linux    # AppImage + deb → dist-desktop/
npm run desktop:windows  # NSIS installer (build on Windows or CI)
npm run desktop:mac      # DMG (build on macOS or CI)
```

## Workstation authentication

The desktop can exchange the existing `hive_native_...` workstation token for
the normal signed `zncave_session` cookie through `POST /api/desktop/session`.
The bearer token is handled only by Electron main-process code and is encrypted
with Electron `safeStorage` at the platform user-data location. It is never
passed to `app.js` or stored in local/session storage.

For normal desktop enrollment, an operations administrator creates a native
workstation enrollment code at `https://ops.zasnetwx.com/admin`. On first
launch, enter that single-use code in the Electron setup window. The server
uses the same native-workstation record and returns the credential directly to
Electron's main process; it is encrypted with `safeStorage` and never exposed
to the Hive renderer.

Trusted-host provisioning remains available for administration and recovery
(the token is printed once):

```bash
npm run desktop:provision -- --name "Zane Desktop" --wfo KRIW
```

For first-run test setup, provide that token only to the Electron main process:

```bash
HIVE_WORKSTATION_TOKEN='hive_native_…' npm run desktop:dev
```

Electron encrypts it immediately and clears the environment value. If no
credential is present, normal Authentik SSO remains available. Revoke through
the existing administrator workstation page or with:

```bash
npm run desktop:revoke -- native-DEVICE-ID
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `HIVE_SERVER_URL` | `https://ops.zasnetwx.com/hive-beta` | Hive Beta entry URL |
| `HIVE_DESKTOP_DEVTOOLS` | unset | Set `1` to always show DevTools menu |

The packaged desktop app also provides **Hive Beta → Connection settings**, which
stores a per-installation server URL and reconnects the open windows. For the
office LAN, use `http://10.10.3.154:8080/hive-beta`. The app rebuilds its
workstation-auth session for the selected server before reloading Hive, so this
switch does not fall back to the SSO screen. A launch-time `HIVE_SERVER_URL`
override intentionally locks this setting.

## Full Service Backup (FSB)

Use **Hive Beta → Full Service Backup…** (or `Ctrl/Cmd+Shift+F`) to open an
independent issuance window for a WFO. Every FSB window keeps its selected WFO
separate from the main Hive window and other FSB windows; changing it does not
overwrite the account's normal primary WFO.

## Note on “native MapLibre” builds

`dist-native/` MapLibre/Slint packages are a separate experimental track. They
will **not** match Hive Beta pixel-for-pixel. For desktop that looks exactly
like the web, use this Electron build.
