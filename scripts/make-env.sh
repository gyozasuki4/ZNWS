#!/usr/bin/env bash
# Create .env for `node server.js` OIDC login (WXMan / ops.zasnetwx.com)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${ROOT}/.env"

if [[ -f "$TARGET" ]]; then
  echo ".env already exists: $TARGET"
  echo "Edit it and set AUTHENTIK_CLIENT_SECRET, then: node server.js"
  exit 0
fi

if [[ -f "${ROOT}/.env.example" ]]; then
  cp "${ROOT}/.env.example" "$TARGET"
else
  cat >"$TARGET" <<'EOF'
HOST=0.0.0.0
PORT=8080
AUTHENTIK_URL=https://sso.zasnetwork.com
AUTHENTIK_APP_SLUG=WXMan
AUTHENTIK_OIDC_SLUG=wxman
AUTHENTIK_OIDC_ISSUER=https://sso.zasnetwork.com/application/o/wxman/
AUTHENTIK_CLIENT_ID=A8VWZ0XxgazJoAqepXT0Yu0fb36SEaWjD6nFN3uj
AUTHENTIK_CLIENT_SECRET=paste-full-secret-from-authentik-here
SESSION_SECRET=change-me-to-a-long-random-string
AUTHENTIK_REQUIRE_AUTH=true
MATTERMOST_WEBHOOK_URL=paste-mattermost-incoming-webhook-url-here
MATTERMOST_NOTIFICATIONS=true
MATTERMOST_USERNAME=ZWS Weather Ops
EOF
fi

chmod 600 "$TARGET"
echo "Created $TARGET"
echo "1) Edit AUTHENTIK_CLIENT_SECRET (and SESSION_SECRET)"
echo "2) node server.js"
echo "3) Look for: [SSO] OIDC ENABLED | clientId=set"
