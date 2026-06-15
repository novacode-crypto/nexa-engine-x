import Store from 'electron-store';
import { app } from 'electron';
import path from 'path';

interface StoreSchema {
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  autoUpdate: boolean;
  downloadsPath: string;
  apiPort: number;
  apiToken: string;
  binariesPath: string;
  lastDiagnostics: unknown;
  pluginRegistry: Record<string, unknown>;
}

export class StoreManager {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        autoStart: false,
        startMinimized: false,
        minimizeToTray: true,
        autoUpdate: true,
        downloadsPath: path.join(app.getPath('downloads'), 'YTDownloadX'),
        apiPort: 38950,
        apiToken: this.generateSecureToken(),
        binariesPath: path.join(app.getPath('userData'), 'binaries'),
        lastDiagnostics: null,
        pluginRegistry: {}
      },
      encryptionKey: 'nexa-engine-x-secure-store-v1'
    });
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `nexa_${token}`;
  }

  get<K extends keyof StoreSchema>(key: K, defaultValue?: StoreSchema[K]): StoreSchema[K] {
    return this.store.get(key, defaultValue as StoreSchema[K]);
  }

  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    this.store.set(key, value);
  }

  getAll(): Record<string, unknown> {
    return this.store.store as Record<string, unknown>;
  }

  regenerateToken(): string {
    const newToken = this.generateSecureToken();
    this.set('apiToken', newToken);
    return newToken;
  }
}