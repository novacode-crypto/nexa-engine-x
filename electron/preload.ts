import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Dashboard
  getDashboardData: () => Promise<unknown>;
  
  // Binarios
  downloadBinary: (binaryId: string) => Promise<unknown>;
  verifyBinary: (binaryId: string) => Promise<unknown>;
  repairBinary: (binaryId: string) => Promise<unknown>;
  installBinary: (binaryId: string, data: Uint8Array) => Promise<boolean>;
  deleteAllBinaries: () => Promise<boolean>;
  
  // Plugins
  installPlugin: (pluginPath: string) => Promise<unknown>;
  getPlugins: () => Promise<unknown>;
  
  // Configuración
  getSettings: () => Promise<Record<string, unknown>>;
  setSetting: (key: string, value: unknown) => Promise<boolean>;
  
  // Logs
  getLogs: (limit?: number) => Promise<unknown[]>;
  
  // Diagnóstico
  runDiagnostics: () => Promise<unknown>;
  
  // Sistema
  restartService: () => Promise<boolean>;
  regenerateToken: () => Promise<string>;
  openDownloadsFolder: () => Promise<void>;
  showNotification: (title: string, body: string) => Promise<void>;

    // Controles de ventana
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
  
  // Navegación
  onNavigate: (callback: (route: string) => void) => () => void;
}

const api: ElectronAPI = {
  getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
  downloadBinary: (binaryId: string) => ipcRenderer.invoke('download-binary', binaryId),
  verifyBinary: (binaryId: string) => ipcRenderer.invoke('verify-binary', binaryId),
  repairBinary: (binaryId: string) => ipcRenderer.invoke('repair-binary', binaryId),
  installBinary: (binaryId: string, data: Uint8Array) => ipcRenderer.invoke('install-binary', binaryId, data),
  deleteAllBinaries: () => ipcRenderer.invoke('delete-all-binaries'),
  installPlugin: (pluginPath: string) => ipcRenderer.invoke('install-plugin', pluginPath),
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  getLogs: (limit?: number) => ipcRenderer.invoke('get-logs', limit),
  runDiagnostics: () => ipcRenderer.invoke('run-diagnostics'),
  restartService: () => ipcRenderer.invoke('restart-service'),
  regenerateToken: () => ipcRenderer.invoke('regenerate-token'),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  onNavigate: (callback: (route: string) => void) => {
    const handler = (_: unknown, route: string) => callback(route);
    ipcRenderer.on('navigate-to', handler);
    return () => ipcRenderer.removeListener('navigate-to', handler);
  },
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}