const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hiveDesktop", Object.freeze({
  platform: process.platform,
  reconnect: () => ipcRenderer.invoke("hive:reconnect"),
  useSso: () => ipcRenderer.invoke("hive:use-sso"),
  enrollWorkstation: (code, name) => ipcRenderer.invoke("hive:enroll-workstation", { code, name }),
  retryWorkstation: () => ipcRenderer.invoke("hive:retry-workstation"),
  openEnrollment: () => ipcRenderer.invoke("hive:open-enrollment"),
  getConnectivity: () => ipcRenderer.invoke("hive:connectivity"),
  getAuthState: () => ipcRenderer.invoke("hive:auth-state"),
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
