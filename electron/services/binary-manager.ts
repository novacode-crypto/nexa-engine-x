import path from 'path';
import fs from 'fs/promises';
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
    if (!binary) return false;

    // Si no hay path, verificar si existe en la carpeta de binarios
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
        return false;
      }
    } else {
      binary.status = 'verifying';
    }

    try {
      // Verificar que el archivo existe
      await fs.access(binary.path);

      // Obtener versión
      const version = await this.getBinaryVersion(binaryId, binary.path);

      if (version) {
        binary.version = version;
        binary.status = 'ready';
        binary.size = (await fs.stat(binary.path)).size;
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
    } catch (error) {
      binary.status = 'error';
      binary.error = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Binarios', `Error verificando ${binaryId}: ${binary.error}`);
      return false;
    }
  }

  private async getBinaryVersion(binaryId: string, binaryPath: string): Promise<string> {
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

      const child = spawn(binaryPath, args, {
        windowsHide: true,
        shell: false,
        timeout: 10000
      });

      let output = '';
      child.stdout.on('data', (data: Buffer) => { output += data.toString(); });
      child.stderr.on('data', (data: Buffer) => { output += data.toString(); });

      child.on('close', () => {
        const lines = output.trim().split('\n');
        let version = lines[0]?.trim() || '';
        if (binaryId === 'ffmpeg' && version.includes('version')) {
          const match = version.match(/version\s+([\d.]+)/);
          version = match ? match[1] : version;
        }
        resolve(version);
      });

      child.on('error', () => resolve(''));
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

      return { success: true, version: '' };
    } catch (error) {
      this.logger.error('Binarios', `Error instalando ${binaryId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { success: false, version: '' };
    }
  }

  async deleteAllBinaries(): Promise<boolean> {
    try {
      for (const [id, binary] of this.binaries) {
        if (binary.path && binary.path.length > 0) {
          try {
            await fs.unlink(binary.path);
            this.logger.info('Binarios', `${id} eliminado`);
          } catch (err) {
            this.logger.warning('Binarios', `No se pudo eliminar ${id}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
          }
        }
        
        // Resetear estado
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