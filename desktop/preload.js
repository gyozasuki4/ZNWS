const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hiveDesktop", Object.freeze({
  platform: process.platform,
  reconnect: () => ipcRenderer.invoke("hive:reconnect"),
  useSso: () => ipcRenderer.invoke("hive:use-sso"),
  enrollWorkstation: (code, name) => ipcRenderer.invoke("hive:enroll-workstation", { code, name }),
  retryWorkstation: () => ipcRenderer.invoke("hive:retry-workstation"),
  openEnrollment: () => ipcRenderer.invoke("hive:open-enrollment"),
  openFsb: (wfo) => ipcRenderer.invoke("hive:open-fsb", wfo),
  getConnectivity: () => ipcRenderer.invoke("hive:connectivity"),
  getAuthState: () => ipcRenderer.invoke("hive:auth-state"),
  getServerSettings: () => ipcRenderer.invoke("hive:server-settings"),
  setServerUrl: (url) => ipcRenderer.invoke("hive:set-server-url", url),
  cacheFetch: (url, init) => ipcRenderer.invoke("hive:cache-fetch", { url, init }),
  getCacheStats: () => ipcRenderer.invoke("hive:cache-stats"),
  clearWeatherCache: () => ipcRenderer.invoke("hive:clear-weather-cache"),
  clearMapTiles: () => ipcRenderer.invoke("hive:clear-map-tiles"),
  openModule: (moduleId) => ipcRenderer.invoke("hive:open-module", moduleId),
  reportReadiness: (readiness) => ipcRenderer.invoke("hive:readiness", readiness),
  onConnectivityChange: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, state) => callback(Object.freeze({ ...state }));
    ipcRenderer.on("hive:connectivity", listener);
    return () => ipcRenderer.removeListener("hive:connectivity", listener);
  },
  onAuthStateChange: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, state) => callback(Object.freeze({ ...state }));
    ipcRenderer.on("hive:auth-state", listener);
    return () => ipcRenderer.removeListener("hive:auth-state", listener);
  }
}));
