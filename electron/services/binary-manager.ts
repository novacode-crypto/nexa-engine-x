import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { spawn } from 'child_process';
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
        if (stats.isFile()) {
          binary.path = binaryPath;
          binary.size = stats.size;
          binary.status = 'verifying';
          this.logger.info('Binarios', `Binario encontrado: ${id}`);
        }
      } catch {
        // Binario no existe
      }
    }
  }

  async verifyAllBinaries(): Promise<void> {
    for (const [id, binary] of this.binaries) {
      if (binary.path && binary.status !== 'missing') {
        await this.verifyBinary(id);
      }
    }
  }

  async verifyBinary(binaryId: string): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary || !binary.path) return false;

    try {
      binary.status = 'verifying';
      
      // Verificar que el archivo existe y es ejecutable
      await fs.access(binary.path, fs.constants.X_OK);
      
      // Ejecutar dry-run para verificar funcionamiento
      const isValid = await this.runDryRun(binaryId, binary.path);
      
      if (isValid) {
        binary.status = 'ready';
        binary.lastChecked = new Date().toISOString();
        this.logger.success('Binarios', `${binaryId} verificado correctamente`);
        return true;
      } else {
        binary.status = 'corrupt';
        binary.error = 'Verificación de ejecución fallida';
        this.logger.warning('Binarios', `${binaryId} parece estar corrupto`);
        return false;
      }
    } catch (error) {
      binary.status = 'error';
      binary.error = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Binarios', `Error verificando ${binaryId}: ${binary.error}`);
      return false;
    }
  }

  private async runDryRun(binaryId: string, binaryPath: string): Promise<boolean> {
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
          resolve(false);
          return;
      }

      const child = spawn(binaryPath, args, {
        windowsHide: true,
        shell: false,
        timeout: 30000
      });

      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { output += data.toString(); });

      child.on('close', (code) => {
        resolve(code === 0 && output.length > 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async downloadBinary(binaryId: string): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;

    try {
      binary.status = 'downloading';
      this.logger.info('Binarios', `Descargando ${binaryId}...`);

      // Simulación de descarga - en producción usar fetch/axios
      // const response = await fetch(binary.downloadUrl);
      // const buffer = await response.arrayBuffer();
      // await fs.writeFile(binary.path, Buffer.from(buffer));

      // Por ahora, crear archivo dummy para demo
      const binaryPath = path.join(this.binariesPath, `${binaryId}.exe`);
      await fs.writeFile(binaryPath, Buffer.from('dummy-binary-content'));
      
      binary.path = binaryPath;
      binary.status = 'verifying';
      
      // Verificar después de descargar
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
      return false;
    }
  }

  async repairBinary(binaryId: string): Promise<boolean> {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;

    this.logger.info('Binarios', `Reparando ${binaryId}...`);
    
    // Eliminar archivo corrupto si existe
    if (binary.path) {
      try {
        await fs.unlink(binary.path);
      } catch {
        // Archivo no existe
      }
    }

    // Re-descargar
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
}