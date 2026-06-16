"use strict";
const electron = require("electron");
const api = {
  getDashboardData: () => electron.ipcRenderer.invoke("get-dashboard-data"),
  downloadBinary: (binaryId) => electron.ipcRenderer.invoke("download-binary", binaryId),
  verifyBinary: (binaryId) => electron.ipcRenderer.invoke("verify-binary", binaryId),
  repairBinary: (binaryId) => electron.ipcRenderer.invoke("repair-binary", binaryId),
  installBinary: (binaryId, data) => electron.ipcRenderer.invoke("install-binary", binaryId, data),
  deleteAllBinaries: () => electron.ipcRenderer.invoke("delete-all-binaries"),
  installPlugin: (pluginPath) => electron.ipcRenderer.invoke("install-plugin", pluginPath),
  getPlugins: () => electron.ipcRenderer.invoke("get-plugins"),
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  setSetting: (key, value) => electron.ipcRenderer.invoke("set-setting", key, value),
  getLogs: (limit) => electron.ipcRenderer.invoke("get-logs", limit),
  runDiagnostics: () => electron.ipcRenderer.invoke("run-diagnostics"),
  restartService: () => electron.ipcRenderer.invoke("restart-service"),
  regenerateToken: () => electron.ipcRenderer.invoke("regenerate-token"),
  openDownloadsFolder: () => electron.ipcRenderer.invoke("open-downloads-folder"),
  showNotification: (title, body) => electron.ipcRenderer.invoke("show-notification", title, body),
  onNavigate: (callback) => {
    const handler = (_, route) => callback(route);
    electron.ipcRenderer.on("navigate-to", handler);
    return () => electron.ipcRenderer.removeListener("navigate-to", handler);
  },
  windowMinimize: () => electron.ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => electron.ipcRenderer.invoke("window-maximize"),
  windowClose: () => electron.ipcRenderer.invoke("window-close")
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
