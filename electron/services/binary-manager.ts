import path from 'path';
import fs from 'fs/promises';
import { spawn, execFile } from 'child_process';
import https from 'https';
import { createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import { Logger } from './logger';
import { StoreManager } from './store-manager';

export interface BinaryInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'missing' | 'downloading' | 'verifying' | 'ready' | 'corrupt' | 'error';
  path: string;
  size: number;
  checksum: string;
  downloadUrl: string;
  lastChecked: string;
  error?: string;
}

export class BinaryManager {
  private binaries: Map<string, BinaryInfo> = new Map();
  private binariesPath: string;
  private downloadingIds: Set<string> = new Set();

  constructor(
    private logger: Logger,
    private store: StoreManager
  ) {
    this.binariesPath = this.store.get('binariesPath');
    this.initializeBinaries();
  }

  private initializeBinaries(): void {
    const defaultBinaries: BinaryInfo[] = [
      {
        id: 'yt-dlp',
        name: 'yt-dlp',
        description: 'Descargador de videos de YouTube y más',
        version: '',
        status: 'missing',
        path: '',
        size: 0,
        checksum: '',
        downloadUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
        lastChecked: new Date().toISOString()
      },
      {
        id: 'aria2c',
        name: 'aria2c',
        description: 'Descargador multiprotocolo y multiconexión',
        version: '',
        status: 'missing',
        path: '',
        size: 0,
        checksum: '',
        downloadUrl: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip',
        lastChecked: new Date().toISOString()
      },
      {
        id: 'ffmpeg',
        name: 'FFmpeg',
        description: 'Framework multimedia para procesamiento de video/audio',
        version: '',
        status: 'missing',
        path: '',
        size: 0,
        checksum: '',
        downloadUrl: 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
        lastChecked: new Date().toISOString()
      }
    ];

    defaultBinaries.forEach(binary => {
      this.binaries.set(binary.id, binary);
    });
  }

  async initialize(): Promise<void> {
    await this.ensureBinariesDirectory();
    await this.scanExistingBinaries();
    await this.verifyAllBinaries();
  }

  private async ensureBinariesDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.binariesPath, { recursive: true });
    } catch (error) {
      this.logger.error('Binarios', `Error al crear directorio: ${error}`);
    }
  }

  private async scanExistingBinaries(): Promise<void> {
    for (const [id, binary] of this.binaries) {
      const binaryPath = path.join(this.binariesPath, `${id}.exe`);
      try {
        const stats = await fs.stat(binaryPath);
        if (stats.isFile() && stats.size > 1000) {
          binary.path = binaryPath;
          binary.size = stats.size;
          binary.status = 'verifying';
          this.logger.info('Binarios', `Binario encontrado: ${id} (${stats.size} bytes)`);
        } else if (stats.size <= 1000) {
          await fs.unlink(binaryPath);
          this.logger.warning('Binarios', `Archivo dummy eliminado: ${id}`);
        }
      } catch {
        // Binario no existe
      }
    }
  }

  async verifyAllBinaries(): Promise<void> {
    for (const [id, binary] of this.binaries) {
      if (binary.path && binary.status !== 'missing' && !this.downloadingIds.has(id)) {
        await this.verifyBinary(id);
      }
    }
  }

  async verifyBinary(binaryId: string): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;

    if (this.downloadingIds.has(binaryId)) {
      return false;
    }

    if (!binary.path) {
      const binaryNames: Record<string, string> = {
        'yt-dlp': 'yt-dlp.exe',
        'ffmpeg': 'ffmpeg.exe',
        'aria2c': 'aria2c.exe'
      };
      const fileName = binaryNames[binaryId] || binaryId;
      const expectedPath = path.join(this.binariesPath, fileName);

      try {
        await fs.access(expectedPath);
        binary.path = expectedPath;
        binary.status = 'verifying';
      } catch {
        binary.status = 'missing';
        binary.error = 'Binario no encontrado';
        binary.version = '';
        binary.size = 0;
        return false;
      }
    } else {
      binary.status = 'verifying';
      binary.error = undefined;
    }

    try {
      const stats = await fs.stat(binary.path);
      if (stats.size < 1000) {
        binary.status = 'corrupt';
        binary.error = 'Archivo demasiado pequeño (posiblemente corrupto)';
        return false;
      }

      const version = await this.getBinaryVersion(binaryId, binary.path);

      if (version) {
        binary.version = version;
        binary.status = 'ready';
        binary.size = stats.size;
        binary.lastChecked = new Date().toISOString();
        binary.error = undefined;
        this.logger.success('Binarios', `${binaryId} verificado correctamente (v${version})`);
        return true;
      } else {
        binary.status = 'corrupt';
        binary.error = 'No se pudo obtener la versión';
        this.logger.warning('Binarios', `${binaryId} parece estar corrupto`);
        return false;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        binary.status = 'missing';
        binary.error = 'Binario no encontrado (eliminado manualmente)';
        binary.path = '';
        binary.version = '';
        binary.size = 0;
        this.logger.warning('Binarios', `${binaryId} fue eliminado manualmente`);
      } else {
        binary.status = 'error';
        binary.error = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error('Binarios', `Error verificando ${binaryId}: ${binary.error}`);
      }
      return false;
    }
  }

  private async getBinaryVersion(binaryId: string, binaryPath: string): Promise<string> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const version = await this.tryGetBinaryVersion(binaryId, binaryPath);
      if (version) {
        return version;
      }
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return '';
  }

  private async tryGetBinaryVersion(binaryId: string, binaryPath: string): Promise<string> {
    return new Promise((resolve) => {
      let args: string[] = [];

      switch (binaryId) {
        case 'yt-dlp':
          args = ['--version'];
          break;
        case 'aria2c':
          args = ['--version'];
          break;
        case 'ffmpeg':
          args = ['-version'];
          break;
        default:
          resolve('');
          return;
      }

      let finished = false;

      const finish = (version: string) => {
        if (!finished) {
          finished = true;
          resolve(version);
        }
      };

      execFile(binaryPath, args, { 
        windowsHide: true,
        timeout: 8000 
      }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Binarios', `execFile error en ${binaryId}: ${error.message}`);
          finish('');
          return;
        }

        const output = stdout + stderr;
        const lines = output.trim().split('\n');
        let version = lines[0]?.trim() || '';

        if (binaryId === 'ffmpeg' && version.includes('version')) {
          const match = version.match(/version\s+([\d.]+)/);
          version = match ? match[1] : version;
        }

        if (binaryId === 'aria2c') {
          const match = version.match(/aria2\s+version\s+([\d.]+)/i) || output.match(/aria2\s+version\s+([\d.]+)/i);
          version = match ? match[1] : '';
        }

        finish(version || '');
      });

      setTimeout(() => finish(''), 10000);
    });
  }

  async downloadBinary(binaryId: string, onProgress?: (progress: { percent: number; speed: number; downloaded: number; total: number }) => void): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;

    if (this.downloadingIds.has(binaryId)) {
      this.logger.warning('Binarios', `Descarga de ${binaryId} ya en progreso`);
      return false;
    }

    this.downloadingIds.add(binaryId);

    try {
      binary.status = 'downloading';
      binary.error = undefined;
      this.logger.info('Binarios', `Descargando ${binaryId}...`);

      const binaryPath = path.join(this.binariesPath, `${binaryId}.exe`);

      if (binaryId === 'yt-dlp') {
        await this.downloadFile(binary.downloadUrl, binaryPath, onProgress);
      } else {
        const zipPath = path.join(this.binariesPath, `${binaryId}.zip`);
        await this.downloadFile(binary.downloadUrl, zipPath, onProgress);

        this.logger.info('Binarios', `Extrayendo ${binaryId}...`);
        await this.extractExeFromZip(zipPath, binaryPath, binaryId);

        await fs.unlink(zipPath).catch(() => {});
      }

      binary.path = binaryPath;
      binary.status = 'verifying';

      try {
        const { execSync } = require('child_process');
        execSync(`powershell.exe -Command "Unblock-File -Path '${binaryPath}'"`);
        this.logger.info('Binarios', `Atributo de bloqueo removido de ${binaryId}`);
      } catch {
        // Ignorar si falla
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.downloadingIds.delete(binaryId);
      const isValid = await this.verifyBinary(binaryId);

      if (isValid) {
        this.logger.success('Binarios', `${binaryId} descargado y verificado`);
        return true;
      } else {
        binary.status = 'corrupt';
        return false;
      }
    } catch (error) {
      binary.status = 'error';
      binary.error = error instanceof Error ? error.message : 'Error de descarga';
      this.logger.error('Binarios', `Error descargando ${binaryId}: ${binary.error}`);
      this.downloadingIds.delete(binaryId);
      return false;
    }
  }

  private downloadFile(
    url: string, 
    targetPath: string, 
    onProgress?: (progress: { percent: number; speed: number; downloaded: number; total: number }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(targetPath);
      let resolved = false;
      let downloadedBytes = 0;
      let totalBytes = 0;
      let lastReportTime = Date.now();
      let lastReportBytes = 0;

      const finish = (err?: Error) => {
        if (!resolved) {
          resolved = true;
          file.close();
          if (err) {
            fs.unlink(targetPath).catch(() => {});
            reject(err);
          } else {
            resolve();
          }
        }
      };

      const request = https.get(url, { timeout: 300000 }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            file.close();
            fs.unlink(targetPath).catch(() => {});
            this.downloadFile(response.headers.location, targetPath, onProgress)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          finish(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        totalBytes = parseInt(response.headers['content-length'] || '0', 10);

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;

          const now = Date.now();
          const timeDiff = now - lastReportTime;

          if (timeDiff > 500 && onProgress && totalBytes > 0) {
            const bytesDiff = downloadedBytes - lastReportBytes;
            const speed = (bytesDiff / timeDiff) * 1000;

            onProgress({
              percent: Math.round((downloadedBytes / totalBytes) * 100),
              speed,
              downloaded: downloadedBytes,
              total: totalBytes
            });

            lastReportTime = now;
            lastReportBytes = downloadedBytes;
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          if (onProgress && totalBytes > 0) {
            onProgress({
              percent: 100,
              speed: 0,
              downloaded: downloadedBytes,
              total: totalBytes
            });
          }
          finish();
        });

        file.on('error', (err) => finish(err));
      });

      request.on('error', (err) => finish(err));
      request.on('timeout', () => {
        request.destroy();
        finish(new Error('Timeout de descarga (5 minutos)'));
      });
    });
  }

  private async extractExeFromZip(zipPath: string, targetPath: string, binaryId: string): Promise<void> {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      const exeEntry = entries.find(entry => {
        const name = entry.entryName.toLowerCase();
        return name.endsWith(`${binaryId}.exe`) || name.endsWith(`${binaryId}.exe`.replace('-', ''));
      }) || entries.find(entry => entry.entryName.toLowerCase().endsWith('.exe'));

      if (!exeEntry) {
        throw new Error(`No se encontró .exe para ${binaryId} en el ZIP`);
      }

      zip.extractEntryTo(exeEntry, path.dirname(targetPath), false, true);

      const extractedPath = path.join(path.dirname(targetPath), exeEntry.entryName.split('/').pop() || '');
      if (extractedPath !== targetPath) {
        await fs.rename(extractedPath, targetPath).catch(() => {});
      }

      this.logger.success('Binarios', `${binaryId} extraído correctamente`);
    } catch (error) {
      this.logger.error('Binarios', `Error extrayendo ${binaryId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async repairBinary(binaryId: string): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;

    this.logger.info('Binarios', `Reparando ${binaryId}...`);

    if (binary.path) {
      try {
        await fs.unlink(binary.path);
      } catch {
        // Archivo no existe
      }
    }

    binary.path = '';
    binary.version = '';
    binary.size = 0;
    binary.status = 'missing';
    binary.error = undefined;

    return this.downloadBinary(binaryId);
  }

  async getBinaryPath(binaryId: string): Promise<string> {
    const binary = this.binaries.get(binaryId);
    if (!binary || binary.status !== 'ready') {
      throw new Error(`Binario ${binaryId} no está disponible`);
    }
    return binary.path;
  }

  getAllStatus(): BinaryInfo[] {
    return Array.from(this.binaries.values());
  }

  getBinaryStatus(binaryId: string): BinaryInfo | undefined {
    return this.binaries.get(binaryId);
  }

  isDownloading(binaryId: string): boolean {
    return this.downloadingIds.has(binaryId);
  }

  async installBinary(binaryId: string, data: Uint8Array): Promise<{ success: boolean; version: string }> {
    try {
      const binary = this.binaries.get(binaryId);
      if (!binary) {
        return { success: false, version: '' };
      }

      const binaryNames: Record<string, string> = {
        'yt-dlp': 'yt-dlp.exe',
        'ffmpeg': 'ffmpeg.exe',
        'aria2c': 'aria2c.exe'
      };

      const fileName = binaryNames[binaryId] || binaryId;
      const destPath = path.join(this.binariesPath, fileName);

      await fs.writeFile(destPath, Buffer.from(data));

      binary.path = destPath;
      binary.status = 'ready';
      binary.size = (await fs.stat(destPath)).size;
      binary.lastChecked = new Date().toISOString();
      binary.error = undefined;

      this.logger.success('Binarios', `${binaryId} instalado correctamente`);

      await this.verifyBinary(binaryId);

      return { success: true, version: binary.version };
    } catch (error) {
      this.logger.error('Binarios', `Error instalando ${binaryId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { success: false, version: '' };
    }
  }

  async deleteAllBinaries(): Promise<boolean> {
    try {
      this.downloadingIds.clear();

      for (const [id, binary] of this.binaries) {
        if (binary.path && binary.path.length > 0) {
          try {
            await fs.unlink(binary.path);
            this.logger.info('Binarios', `${id} eliminado`);
          } catch (err) {
            this.logger.warning('Binarios', `No se pudo eliminar ${id}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
          }
        }

        binary.path = '';
        binary.version = '';
        binary.size = 0;
        binary.status = 'missing';
        binary.error = undefined;
        binary.lastChecked = new Date().toISOString();
      }

      this.logger.success('Binarios', 'Todos los binarios eliminados');
      return true;
    } catch (error) {
      this.logger.error('Binarios', `Error eliminando binarios: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  }
}