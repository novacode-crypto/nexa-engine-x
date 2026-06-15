import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { Logger } from './logger';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  hooks: string[];
  binaries?: string[];
}

export interface Plugin {
  metadata: PluginMetadata;
  path: string;
  enabled: boolean;
  loaded: boolean;
}

export class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;

  constructor(private logger: Logger) {
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
  }

  async loadPlugins(): Promise<void> {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(path.join(this.pluginsDir, entry.name));
        }
      }
      
      this.logger.info('Plugins', `${this.plugins.size} plugins cargados`);
    } catch (error) {
      this.logger.error('Plugins', `Error cargando plugins: ${error}`);
    }
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const metadataPath = path.join(pluginPath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata: PluginMetadata = JSON.parse(metadataContent);
      
      const plugin: Plugin = {
        metadata,
        path: pluginPath,
        enabled: true,
        loaded: true
      };
      
      this.plugins.set(metadata.id, plugin);
      this.logger.info('Plugins', `Plugin cargado: ${metadata.name} v${metadata.version}`);
    } catch (error) {
      this.logger.error('Plugins', `Error cargando plugin en ${pluginPath}: ${error}`);
    }
  }

  async installPlugin(pluginPath: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validar que existe metadata.json
      const metadataPath = path.join(pluginPath, 'metadata.json');
      await fs.access(metadataPath);
      
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata: PluginMetadata = JSON.parse(metadataContent);
      
      // Copiar a directorio de plugins
      const targetPath = path.join(this.pluginsDir, metadata.id);
      await fs.mkdir(targetPath, { recursive: true });
      
      // Copiar archivos (simplificado)
      const files = await fs.readdir(pluginPath);
      for (const file of files) {
        const src = path.join(pluginPath, file);
        const dest = path.join(targetPath, file);
        await fs.copyFile(src, dest);
      }
      
      await this.loadPlugin(targetPath);
      
      return { success: true, message: `Plugin ${metadata.name} instalado correctamente` };
    } catch (error) {
      return {
        success: false,
        message: `Error instalando plugin: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }

  getPluginList(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  enablePlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
      return true;
    }
    return false;
  }

  disablePlugin(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
      return true;
    }
    return false;
  }
}