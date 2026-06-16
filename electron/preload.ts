import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Dashboard
  getDashboardData: () => Promise<any>;

  // Binarios
  downloadBinary: (binaryId: string) => Promise<boolean>;
  verifyBinary: (binaryId: string) => Promise<boolean>;
  repairBinary: (binaryId: string) => Promise<boolean>;
  installBinary: (binaryId: string, data: Uint8Array) => Promise<{ success: boolean; version: string }>;
  deleteAllBinaries: () => Promise<boolean>;
  isDownloading: (binaryId: string) => Promise<boolean>;
  onDownloadProgress: (callback: (data: { binaryId: string; percent: number; speed: number; downloaded: number; total: number }) => void) => () => void;

  // Plugins
  installPlugin: (pluginPath: string) => Promise<any>;
  getPlugins: () => Promise<any[]>;

  // Configuración
  getSettings: () => Promise<Record<string, any>>;
  setSetting: (key: string, value: unknown) => Promise<void>;

  // Logs
  getLogs: (limit?: number) => Promise<any[]>;

  // Diagnóstico
  runDiagnostics: () => Promise<any>;

  // Sistema
  restartService: () => Promise<void>;
  regenerateToken: () => Promise<string>;
  openDownloadsFolder: () => Promise<void>;
  openBinaryFolder: (binaryId: string) => Promise<void>;
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
  isDownloading: (binaryId: string) => ipcRenderer.invoke('is-downloading', binaryId),
  onDownloadProgress: (callback: (data: { binaryId: string; percent: number; speed: number; downloaded: number; total: number }) => void) => {
    const handler = (_: unknown, data: any) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  installPlugin: (pluginPath: string) => ipcRenderer.invoke('install-plugin', pluginPath),
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  getLogs: (limit?: number) => ipcRenderer.invoke('get-logs', limit),
  runDiagnostics: () => ipcRenderer.invoke('run-diagnostics'),
  restartService: () => ipcRenderer.invoke('restart-service'),
  regenerateToken: () => ipcRenderer.invoke('regenerate-token'),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  openBinaryFolder: (binaryId: string) => ipcRenderer.invoke('open-binary-folder', binaryId),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onNavigate: (callback: (route: string) => void) => {
    const handler = (_: unknown, route: string) => callback(route);
    ipcRenderer.on('navigate-to', handler);
    return () => ipcRenderer.removeListener('navigate-to', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
