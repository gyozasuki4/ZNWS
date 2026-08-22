/**
 * ZASNet Hive Beta Desktop
 *
 * Remote-client shell: the renderer is the existing /hive-beta application.
 * No warning, radar, or authentication logic is reimplemented here.
 */
const { app, BrowserWindow, Menu, ipcMain, shell, session, safeStorage, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { DesktopCacheManager } = require("./cache-manager");

const DEFAULT_SERVER_URL = "https://ops.zasnetwx.com/hive-beta";
const SESSION_PARTITION = "persist:hive-beta-desktop";
const APP_VERSION = app.getVersion() || "1.0.0";
const windows = new Set();
let enrollmentWindow = null;
let cacheManager = null;
let cacheCleanupTimer = null;
let cacheWindow = null;
const moduleWindows = new Map();
const MODULE_DEFINITIONS = Object.freeze({
  // SPC is a standalone operational page. Keep it explicit so a workstation
  // configured with a beta landing path cannot accidentally open /spc-beta.
  spc: { title: "Hive Beta · SPC Watch Operations", path: "/spc" },
  gfe: { title: "Hive Beta · GFE Model Workstation", path: "/gfe" }
});
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
async function refreshStoredWorkstationSession() {
  const token = loadCredential();
  if (!token) return false;
  try {
    await bootstrapWorkstationSession(token);
    return true;
  } catch (error) {
    log("Stored workstation session refresh failed", error.message || "unknown error");
    return false;
  }
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

function enrollmentError(error, fallback = "Workstation enrollment failed") {
  const status = Number(error?.status || 0);
  if (status === 403) return { state: "invalid-code", message: error.message || "Enrollment code is invalid, expired, or already used" };
  if (status === 429) return { state: "server-error", message: error.message || "Too many attempts; try again later" };
  if (status === 0) return { state: "server-unreachable", message: "The operational server could not be reached" };
  return { state: "server-error", message: error.message || fallback };
}

async function enrollWorkstation(code, name) {
  const normalizedCode = String(code || "").trim();
  const normalizedName = String(name || "").trim().slice(0, 80);
  if (normalizedCode.length < 10) return { ok: false, state: "invalid-code", message: "Enter the complete enrollment code" };
  setAuthState({ method: "workstation", state: "enrolling", detail: "Validating enrollment code" });
  try {
    const response = await fetch(new URL("/api/native/enroll", hiveOrigin()), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: normalizedCode, deviceName: normalizedName })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const token = String(payload.token || "");
    if (!/^hive_native_[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Server returned an invalid workstation credential");
    // The credential remains entirely in the main process and is encrypted before
    // any workstation UI is opened. It is never returned through IPC.
    saveCredential(token);
    await bootstrapWorkstationSession(token);
    setAuthState({ method: "workstation", state: "authenticated", detail: "Workstation enrolled and session established" });
    closeEnrollmentWindow();
    createWindow();
    return { ok: true, workstation: authState.workstation };
  } catch (error) {
    const result = enrollmentError(error);
    const authFailure = result.state === "invalid-code" ? "auth-failed" : result.state;
    setAuthState({ method: "workstation", state: authFailure, detail: result.message });
    return { ok: false, ...result };
  }
}

async function retryStoredWorkstation() {
  const token = loadCredential();
  if (!token) return { ok: false, state: "not-provisioned", message: "No workstation credential is stored" };
  setAuthState({ method: "workstation", state: "reconnecting", detail: "Retrying workstation session" });
  try {
    await bootstrapWorkstationSession(token);
    closeEnrollmentWindow();
    createWindow();
    return { ok: true, workstation: authState.workstation };
  } catch (error) {
    const result = enrollmentError(error, "Workstation session could not be established");
    setAuthState({ method: "workstation", state: result.state === "invalid-code" ? "revoked" : result.state, detail: result.message });
    return { ok: false, ...result };
  }
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

function windowStateFile(moduleId) { return path.join(app.getPath("userData"), "window-state", `${moduleId}.json`); }
function readModuleBounds(moduleId) {
  const saved = (() => { try { return JSON.parse(fs.readFileSync(windowStateFile(moduleId), "utf8")); } catch { return null; } })();
  const displays = screen.getAllDisplays();
  const display = displays.find((item) => item.id === saved?.displayId) || screen.getPrimaryDisplay();
  const area = display.workArea;
  const width = Math.max(900, Math.min(Number(saved?.width) || 1400, area.width));
  const height = Math.max(650, Math.min(Number(saved?.height) || 900, area.height));
  const x = Number.isFinite(Number(saved?.x)) ? Number(saved.x) : area.x + Math.round((area.width - width) / 2);
  const y = Number.isFinite(Number(saved?.y)) ? Number(saved.y) : area.y + Math.round((area.height - height) / 2);
  const visible = displays.some((item) => {
    const r = item.workArea;
    return x + width > r.x + 40 && x < r.x + r.width - 40 && y + height > r.y + 40 && y < r.y + r.height - 40;
  });
  return { x: visible ? x : area.x + 30, y: visible ? y : area.y + 30, width, height, maximized: Boolean(saved?.maximized), displayId: display.id };
}
function saveModuleBounds(moduleId, win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  fs.mkdirSync(path.dirname(windowStateFile(moduleId)), { recursive: true });
  fs.writeFileSync(windowStateFile(moduleId), JSON.stringify({ ...bounds, maximized: win.isMaximized(), displayId: screen.getDisplayMatching(bounds).id }), { mode: 0o600 });
}
function openModuleWindow(moduleId, rawUrl = null) {
  const definition = MODULE_DEFINITIONS[moduleId];
  if (!definition) return null;
  const existing = moduleWindows.get(moduleId);
  if (existing && !existing.isDestroyed()) { existing.show(); existing.focus(); return existing; }
  const target = new URL(moduleId === "spc" ? definition.path : (rawUrl || definition.path || serverUrl()), hiveOrigin());
  const saved = readModuleBounds(moduleId);
  const win = new BrowserWindow({
    ...saved, show: false, title: definition.title, backgroundColor: "#0f1114", icon: path.join(__dirname, "..", "znws-map-mark.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), partition: SESSION_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false, webgl: true, backgroundThrottling: false }
  });
  moduleWindows.set(moduleId, win); windows.add(win);
  if (saved.maximized) win.maximize();
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} ZASNetHiveBetaDesktop/${APP_VERSION}`);
  win.once("ready-to-show", () => win.show());
  win.on("move", () => saveModuleBounds(moduleId, win));
  win.on("resize", () => saveModuleBounds(moduleId, win));
  win.on("maximize", () => saveModuleBounds(moduleId, win));
  win.on("unmaximize", () => saveModuleBounds(moduleId, win));
  win.on("closed", () => { saveModuleBounds(moduleId, win); moduleWindows.delete(moduleId); windows.delete(win); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedNavigation(url)) {
      const parsed = new URL(url);
      if (parsed.pathname === "/spc" || parsed.searchParams.get("desk") === "spc") openModuleWindow("spc", url);
      else if (parsed.pathname === "/gfe" || parsed.searchParams.get("desk") === "gfe") openModuleWindow("gfe", url);
      else createWindow(url);
      return { action: "deny" };
    }
    try { if (/^https?:$/i.test(new URL(url).protocol)) shell.openExternal(url).catch(() => {}); } catch {}
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => { if (isTrustedNavigation(url)) return; event.preventDefault(); try { if (/^https?:$/i.test(new URL(url).protocol)) shell.openExternal(url).catch(() => {}); } catch {} });
  win.webContents.on("did-fail-load", (_event, errorCode, _description, validatedUrl, isMainFrame) => { if (!isMainFrame || errorCode === -3 || validatedUrl.startsWith("file:")) return; win.loadFile(path.join(__dirname, "offline.html"), { query: { target: serverUrl() } }); });
  win.loadURL(target.toString());
  return win;
}

function openCacheSettings() {
  if (cacheWindow && !cacheWindow.isDestroyed()) { cacheWindow.focus(); return cacheWindow; }
  cacheWindow = new BrowserWindow({ width: 560, height: 620, resizable: false, show: false, title: "Hive Beta · Local data", backgroundColor: "#08111c", webPreferences: { preload: path.join(__dirname, "preload.js"), partition: SESSION_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  windows.add(cacheWindow);
  cacheWindow.once("ready-to-show", () => cacheWindow.show());
  cacheWindow.on("closed", () => { windows.delete(cacheWindow); cacheWindow = null; });
  cacheWindow.loadFile(path.join(__dirname, "cache.html"));
  return cacheWindow;
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
    if (isTrustedNavigation(url)) {
      const parsed = new URL(url);
      if (parsed.pathname === "/spc" || parsed.searchParams.get("desk") === "spc") openModuleWindow("spc", url);
      else if (parsed.pathname === "/gfe" || parsed.searchParams.get("desk") === "gfe") openModuleWindow("gfe", url);
      else createWindow(url);
      return { action: "deny" };
    }
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

function closeEnrollmentWindow() {
  const setupWindow = enrollmentWindow;
  enrollmentWindow = null;
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
}

function createEnrollmentWindow(reason = "not-provisioned") {
  if (enrollmentWindow && !enrollmentWindow.isDestroyed()) {
    enrollmentWindow.focus();
    enrollmentWindow.webContents.send("hive:enrollment-reason", reason);
    return enrollmentWindow;
  }
  enrollmentWindow = new BrowserWindow({
    width: 520, height: 610, minWidth: 440, minHeight: 540, resizable: false,
    show: false, backgroundColor: "#08111c", title: "Hive Beta workstation setup",
    icon: path.join(__dirname, "..", "znws-map-mark.png"), autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), partition: SESSION_PARTITION,
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true
    }
  });
  windows.add(enrollmentWindow);
  enrollmentWindow.once("ready-to-show", () => enrollmentWindow.show());
  const setupWindow = enrollmentWindow;
  enrollmentWindow.on("closed", () => { windows.delete(setupWindow); if (enrollmentWindow === setupWindow) enrollmentWindow = null; });
  enrollmentWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  enrollmentWindow.loadFile(path.join(__dirname, "enroll.html"), { query: { reason } });
  return enrollmentWindow;
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Hive Beta", submenu: [
      { label: "Open Hive Beta", accelerator: "CmdOrCtrl+Shift+H", click: () => createWindow() },
      { label: "New Window", accelerator: "CmdOrCtrl+Shift+N", click: () => createWindow() },
      { type: "separator" }, { label: "Local data cache", click: () => openCacheSettings() }, { label: "Open in Browser", click: () => shell.openExternal(serverUrl()) },
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
ipcMain.handle("hive:cache-fetch", (_event, payload = {}) => cacheManager?.cacheFetch(payload.url, payload.init || {}) || null);
ipcMain.handle("hive:cache-stats", () => cacheManager?.statsSnapshot() || null);
ipcMain.handle("hive:clear-weather-cache", async () => { await cacheManager?.clearWeather(); return cacheManager?.statsSnapshot() || null; });
ipcMain.handle("hive:clear-map-tiles", async () => { await cacheManager?.clearTiles(); return cacheManager?.statsSnapshot() || null; });
ipcMain.handle("hive:connectivity", () => ({ ...connectivity }));
ipcMain.handle("hive:auth-state", () => ({ ...authState }));
ipcMain.handle("hive:use-sso", (event) => {
  setAuthState({ method: "sso", state: "sso-fallback", detail: "Explicit Authentik fallback selected" });
  const win = BrowserWindow.fromWebContents(event.sender);
  const setupWindow = win && win === enrollmentWindow;
  if (setupWindow) closeEnrollmentWindow();
  if (!setupWindow && win) win.loadURL(serverUrl());
  else createWindow();
});
ipcMain.handle("hive:open-enrollment", () => { createEnrollmentWindow("re-enroll"); return { opened: true }; });
ipcMain.handle("hive:open-module", async (_event, moduleId) => {
  await refreshStoredWorkstationSession();
  return Boolean(openModuleWindow(String(moduleId || "").toLowerCase()));
});
ipcMain.handle("hive:enroll-workstation", (_event, payload = {}) => enrollWorkstation(payload.code, payload.name));
ipcMain.handle("hive:retry-workstation", () => retryStoredWorkstation());
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
  app.on("before-quit", () => {
    log("Application shutdown");
    if (connectivityTimer) clearInterval(connectivityTimer);
    if (cacheCleanupTimer) clearInterval(cacheCleanupTimer);
    try { logStream?.end(); } catch {}
  });
  app.whenReady().then(async () => {
    try { fs.mkdirSync(app.getPath("logs"), { recursive: true }); logStream = fs.createWriteStream(path.join(app.getPath("logs"), "hive-desktop.log"), { flags: "a" }); } catch {}
    log("Application startup", `version=${APP_VERSION} electron=${process.versions.electron} chromium=${process.versions.chrome} os=${process.platform}/${process.arch}`);
    log("Server URL", serverUrl());
    log("Hardware acceleration", String(app.isHardwareAccelerationEnabled()));
    try { log("GPU feature status", JSON.stringify(app.getGPUFeatureStatus())); } catch {}
    try { log("GPU info", JSON.stringify(await app.getGPUInfo("complete"))); } catch (error) { log("GPU info unavailable", error.message); }
    app.setAppUserModelId("com.zasnet.hivebeta");
    session.fromPartition(SESSION_PARTITION).setPermissionRequestHandler((_wc, permission, callback) => callback(["geolocation", "notifications", "media", "clipboard-read", "clipboard-sanitized-write"].includes(permission)));
    const cacheSession = session.fromPartition(SESSION_PARTITION);
    cacheManager = new DesktopCacheManager(
      path.join(app.getPath("userData")),
      hiveOrigin(),
      (url, init) => typeof cacheSession.fetch === "function" ? cacheSession.fetch(url, init) : fetch(url, init)
    );
    void cacheManager.cleanup();
    cacheCleanupTimer = setInterval(() => { void cacheManager?.cleanup(); }, 10 * 60 * 1000);
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
        if (state === "revoked" || state === "auth-failed") createEnrollmentWindow(state);
      }
    } else {
      setAuthState({ method: "workstation", state: "not-provisioned", detail: "No workstation credential configured" });
      createEnrollmentWindow("not-provisioned");
    }
    log("Loading remote Hive UI", `origin=${hiveOrigin()}`);
    startConnectivityMonitor();
    if (credential && ["authenticated", "disconnected"].includes(authState.state)) createWindow();
  });
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
