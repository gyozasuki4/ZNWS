#!/usr/bin/env bash
# Install ZNCave as a systemd service using ~/Cave + .env
# Run on the server as cave (with sudo for systemd).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/Cave}"
SERVICE_NAME="zncave-weather"
SERVICE_SRC="${APP_DIR}/deploy/zncave-weather.service"
SERVICE_DST="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${APP_DIR}/.env"
NODE_BIN="$(command -v node || true)"

if [[ ! -d "$APP_DIR" ]]; then
  echo "App dir not found: $APP_DIR"
  exit 1
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "node not found in PATH. Install Node 20+ or fix PATH."
  exit 1
fi

echo "Using node: $NODE_BIN"
echo "App dir:    $APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE from .env.example (edit secrets after!)"
  if [[ -f "${APP_DIR}/.env.example" ]]; then
    cp "${APP_DIR}/.env.example" "$ENV_FILE"
  else
    cat >"$ENV_FILE" <<'EOF'
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
EOF
  fi
  chmod 600 "$ENV_FILE"
  echo ">>> Edit $ENV_FILE and set AUTHENTIK_CLIENT_SECRET + SESSION_SECRET"
fi

# Build a unit with correct User + node path
UNIT_TMP="$(mktemp)"
cat >"$UNIT_TMP" <<EOF
[Unit]
Description=ZNCave Weather Operations (Zive / Authentik OIDC)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=-${ENV_FILE}
Environment=HOST=0.0.0.0
Environment=PORT=8080
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$(dirname "$NODE_BIN")
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=3
User=$(id -un)
Group=$(id -gn)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "Installing $SERVICE_DST"
sudo cp "$UNIT_TMP" "$SERVICE_DST"
rm -f "$UNIT_TMP"
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}.service"
sudo systemctl restart "${SERVICE_NAME}.service"
sleep 1
sudo systemctl status "${SERVICE_NAME}.service" --no-pager || true
echo ""
echo "Logs:  journalctl -u ${SERVICE_NAME} -f"
echo "Look for: [SSO] OIDC ENABLED | clientId=set"
