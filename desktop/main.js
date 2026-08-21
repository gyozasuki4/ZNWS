/**
 * ZASNet Hive Beta Desktop
 *
 * Remote-client shell: the renderer is the existing /hive-beta application.
 * No warning, radar, or authentication logic is reimplemented here.
 */
const { app, BrowserWindow, Menu, ipcMain, shell, session, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SERVER_URL = "https://ops.zasnetwx.com/hive-beta";
const SESSION_PARTITION = "persist:hive-beta-desktop";
const APP_VERSION = app.getVersion() || "1.0.0";
const windows = new Set();
const connectivity = { state: "reconnecting", reachable: false, issuanceReady: false, checkedAt: null, detail: "Starting" };
let connectivityTimer = null;
let connectivityGeneration = 0;
let logStream = null;
const authState = { method: "none", state: "not-provisioned", workstation: null, detail: "No workstation credential configured" };

function log(message, details) {
  const line = `[${new Date().toISOString()}] ${message}${details ? ` ${details}` : ""}\n`;
  try { logStream?.write(line); } catch { /* logging must never stop the app */ }
  console.log(line.trim());
}

function serverUrl() {
  const configured = String(process.env.HIVE_SERVER_URL || DEFAULT_SERVER_URL).trim();
  try {
    const parsed = new URL(configured);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
    if (!parsed.pathname || parsed.pathname === "/") parsed.pathname = "/hive-beta";
    return parsed.toString();
  } catch {
    log("Invalid HIVE_SERVER_URL; using default");
    return DEFAULT_SERVER_URL;
  }
}

function hiveOrigin() { return new URL(serverUrl()).origin; }

function credentialPath() { return path.join(app.getPath("userData"), "workstation-credential.bin"); }
function loadCredential() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(credentialPath()));
  } catch { return null; }
}
function saveCredential(token) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Electron secure storage is unavailable");
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  const target = credentialPath();
  const temp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temp, safeStorage.encryptString(token), { mode: 0o600 });
  fs.renameSync(temp, target);
  try { fs.chmodSync(target, 0o600); } catch {}
}
function broadcastAuth() {
  for (const win of windows) if (!win.isDestroyed()) win.webContents.send("hive:auth-state", { ...authState });
}
function setAuthState(next) {
  Object.assign(authState, next);
  log(`Workstation auth ${authState.state}`, authState.detail || "");
  broadcastAuth();
}
function cookieValue(setCookie) {
  const match = String(setCookie || "").match(/^zncave_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
async function bootstrapWorkstationSession(token) {
  const response = await fetch(new URL("/api/desktop/session", hiveOrigin()), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  const value = cookieValue(cookies.find((item) => String(item).startsWith("zncave_session=")));
  if (!value) throw new Error("Desktop session cookie was not returned");
  await session.fromPartition(SESSION_PARTITION).cookies.set({ url: hiveOrigin(), name: "zncave_session", value, path: "/", secure: new URL(serverUrl()).protocol === "https:", httpOnly: true, sameSite: "lax" });
  setAuthState({ method: "workstation", state: "authenticated", workstation: payload.workstation || null, detail: "Workstation session established" });
}

function isTrustedNavigation(rawUrl) {
  try {
    const candidate = new URL(rawUrl);
    const hive = new URL(serverUrl());
    if (candidate.origin === hive.origin) return true;
    // Authentik redirects may traverse issuer, authorization, and callback paths.
    if (candidate.origin === "https://sso.zasnetwork.com") return true;
    return false;
  } catch { return false; }
}

function broadcastConnectivity() {
  for (const win of windows) {
    if (!win.isDestroyed()) win.webContents.send("hive:connectivity", { ...connectivity });
  }
}

function setConnectivity(next) {
  const changed = connectivity.state !== next.state || connectivity.reachable !== next.reachable || connectivity.issuanceReady !== next.issuanceReady;
  Object.assign(connectivity, next, { checkedAt: new Date().toISOString() });
  if (changed) log(`Connectivity ${connectivity.state}`, `reachable=${connectivity.reachable} issuanceReady=${connectivity.issuanceReady}`);
  if (changed) broadcastConnectivity();
}

async function checkServer() {
  const generation = ++connectivityGeneration;
  if (connectivity.state !== "connected") setConnectivity({ state: "reconnecting", reachable: false, issuanceReady: false, detail: "Checking operational server" });
  try {
    const target = new URL("/api/system/health", hiveOrigin());
    const response = await fetch(target, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (generation !== connectivityGeneration) return;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json().catch(() => ({}));
    setConnectivity({ state: "connected", reachable: true, detail: health?.status || "Server reachable" });
  } catch (error) {
    if (generation !== connectivityGeneration) return;
    setConnectivity({ state: "disconnected", reachable: false, issuanceReady: false, detail: error?.message || "Server unavailable" });
  }
}

function startConnectivityMonitor() {
  void checkServer();
  connectivityTimer = setInterval(() => void checkServer(), 15000);
}

function createWindow(initialUrl = null) {
  const win = new BrowserWindow({
    width: 1680, height: 1050, minWidth: 1100, minHeight: 680, show: false,
    backgroundColor: "#0f1114", title: "Hive Beta · ZASNet",
    icon: path.join(__dirname, "..", "znws-map-mark.png"), autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), partition: SESSION_PARTITION,
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      spellcheck: false, webgl: true, backgroundThrottling: false
    }
  });
  windows.add(win);
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} ZASNetHiveBetaDesktop/${APP_VERSION}`);
  win.webContents.on("page-title-updated", (event, title) => {
    if (title && !title.includes("Hive")) { event.preventDefault(); win.setTitle(`Hive Beta · ${title}`); }
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.on("did-finish-load", () => { broadcastConnectivity(); });
  win.webContents.on("did-finish-load", () => { broadcastAuth(); });
  win.webContents.on("did-navigate", (_event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === "/auth/login" || parsed.pathname === "/auth/callback" || parsed.pathname === "/auth/logout") {
        log("Authentication navigation", `${parsed.pathname}${parsed.search ? " (query present)" : ""}`);
      }
    } catch { /* ignore malformed navigation */ }
  });
  win.on("closed", () => windows.delete(win));
  win.webContents.on("render-process-gone", (_event, details) => log("Renderer process gone", `reason=${details.reason || "unknown"}`));
  win.webContents.on("unresponsive", () => log("Renderer unresponsive"));
  win.webContents.on("responsive", () => log("Renderer responsive"));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedNavigation(url)) { createWindow(url); return { action: "deny" }; }
    try { if (/^https?:$/i.test(new URL(url).protocol)) shell.openExternal(url).catch(() => {}); } catch { /* deny */ }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isTrustedNavigation(url)) return;
    event.preventDefault();
    try { if (/^https?:$/.test(new URL(url).protocol)) shell.openExternal(url).catch(() => {}); } catch { /* deny */ }
  });
  win.webContents.on("did-fail-load", (_event, errorCode, _description, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || validatedUrl.startsWith("file:")) return;
    log("Main window load failed", `code=${errorCode}`);
    win.loadFile(path.join(__dirname, "offline.html"), { query: { target: serverUrl() } });
  });
  if (initialUrl) win.loadURL(initialUrl);
  else if (["revoked", "auth-failed"].includes(authState.state)) win.loadFile(path.join(__dirname, "offline.html"), { query: { target: serverUrl(), reason: authState.state } });
  else win.loadURL(serverUrl());
  return win;
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Hive Beta", submenu: [
      { label: "Open Hive Beta", accelerator: "CmdOrCtrl+Shift+H", click: () => createWindow() },
      { label: "New Window", accelerator: "CmdOrCtrl+Shift+N", click: () => createWindow() },
      { type: "separator" }, { label: "Open in Browser", click: () => shell.openExternal(serverUrl()) },
      { type: "separator" }, { role: "quit" }
    ] },
    { label: "View", submenu: [
      { label: "Reload Hive Beta", accelerator: "CmdOrCtrl+R", click: (_item, win) => win?.loadURL(serverUrl()) },
      { role: "forceReload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
      { type: "separator" }, { role: "togglefullscreen" },
      ...(process.env.HIVE_DESKTOP_DEVTOOLS === "1" || !app.isPackaged ? [{ type: "separator" }, { role: "toggleDevTools" }] : [])
    ] },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] }
  ]));
}

ipcMain.handle("hive:reconnect", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) { log("Manual reconnect requested"); win.loadURL(serverUrl()); }
});
ipcMain.handle("hive:server-url", () => serverUrl());
ipcMain.handle("hive:connectivity", () => ({ ...connectivity }));
ipcMain.handle("hive:auth-state", () => ({ ...authState }));
ipcMain.handle("hive:use-sso", (event) => {
  setAuthState({ method: "sso", state: "sso-fallback", detail: "Explicit Authentik fallback selected" });
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.loadURL(serverUrl());
});
ipcMain.handle("hive:store-workstation-token", (_event, token) => {
  const value = String(token || "").trim();
  if (!/^hive_native_[A-Za-z0-9_-]{32,}$/.test(value)) throw new Error("Invalid workstation credential");
  saveCredential(value);
  setAuthState({ method: "workstation", state: "provisioned", detail: "Credential stored securely" });
  return { stored: true };
});
ipcMain.handle("hive:readiness", (_event, readiness = {}) => {
  const authenticated = readiness.authenticated === true;
  const warningStream = readiness.warningStream === true;
  const healthy = connectivity.state === "connected" && connectivity.reachable;
  connectivity.issuanceReady = Boolean(healthy && authenticated && warningStream);
  connectivity.detail = connectivity.issuanceReady ? "Authenticated warning stream is healthy" : "Issuance readiness requirements not met";
  broadcastConnectivity();
  return { ...connectivity };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", () => { const win = [...windows][0]; if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.focus(); });
  app.on("child-process-gone", (_event, details) => { if (details.type === "GPU") log("GPU process gone", `reason=${details.reason || "unknown"}`); });
  app.on("before-quit", () => { log("Application shutdown"); if (connectivityTimer) clearInterval(connectivityTimer); try { logStream?.end(); } catch {} });
  app.whenReady().then(async () => {
    try { fs.mkdirSync(app.getPath("logs"), { recursive: true }); logStream = fs.createWriteStream(path.join(app.getPath("logs"), "hive-desktop.log"), { flags: "a" }); } catch {}
    log("Application startup", `version=${APP_VERSION} electron=${process.versions.electron} chromium=${process.versions.chrome} os=${process.platform}/${process.arch}`);
    log("Server URL", serverUrl());
    log("Hardware acceleration", String(app.isHardwareAccelerationEnabled()));
    try { log("GPU feature status", JSON.stringify(app.getGPUFeatureStatus())); } catch {}
    try { log("GPU info", JSON.stringify(await app.getGPUInfo("complete"))); } catch (error) { log("GPU info unavailable", error.message); }
    app.setAppUserModelId("com.zasnet.hivebeta");
    session.fromPartition(SESSION_PARTITION).setPermissionRequestHandler((_wc, permission, callback) => callback(["geolocation", "notifications", "media", "clipboard-read", "clipboard-sanitized-write"].includes(permission)));
    installMenu();
    const environmentToken = String(process.env.HIVE_WORKSTATION_TOKEN || "").trim();
    if (environmentToken) {
      try { saveCredential(environmentToken); process.env.HIVE_WORKSTATION_TOKEN = ""; log("Stored workstation credential from one-time setup environment"); } catch (error) { log("Could not store workstation credential", error.message); }
    }
    const credential = loadCredential();
    if (credential) {
      setAuthState({ method: "workstation", state: "reconnecting", detail: "Validating workstation credential" });
      try { await bootstrapWorkstationSession(credential); }
      catch (error) {
        const state = error.status === 401 || error.status === 403 ? (error.status === 403 ? "revoked" : "auth-failed") : "disconnected";
        setAuthState({ method: "workstation", state, detail: error.message });
      }
    } else {
      setAuthState({ method: "sso", state: "not-provisioned", detail: "No workstation credential configured; Authentik remains available" });
    }
    log("Loading remote Hive UI", `origin=${hiveOrigin()}`);
    startConnectivityMonitor();
    createWindow();
  });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
