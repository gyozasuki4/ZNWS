# ZASNet Hive Native Beta

This is the compiled native Windows/Linux Hive client. It does not use Electron, a WebView, or the existing HTML interface.

Current milestone:

- Native GPU-rendered operations window
- Independent radar, satellite, and model workspaces
- Native pan, zoom, layers, and timeline controls
- Direct API connection and authentication status
- Existing browser interface retained as backup

Operational warning issuance stays disabled until native OIDC, warning locking, draft recovery, review, and distribution receipts are implemented and verified.

## Build

```bash
./scripts/build-native-hive.sh
```
