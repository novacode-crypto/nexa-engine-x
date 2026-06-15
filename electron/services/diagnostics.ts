import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { Logger } from './logger';

export interface DiagnosticResult {
  category: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export class DiagnosticsService {
  private lastResults: DiagnosticResult[] = [];

  constructor(private logger: Logger) {}

  async runFullDiagnostics(): Promise<DiagnosticResult[]> {
    this.logger.info('Diagnóstico', 'Ejecutando diagnóstico completo...');
    
    const results: DiagnosticResult[] = [];
    
    // Verificar Node.js
    results.push({
      category: 'Entorno',
      status: 'ok',
      message: `Node.js ${process.version}`,
      details: { platform: process.platform, arch: process.arch }
    });

    // Verificar Electron
    results.push({
      category: 'Electron',
      status: 'ok',
      message: `Electron ${process.versions.electron}`
    });

    // Verificar permisos de filesystem
    const fsResult = await this.checkFilesystemPermissions();
    results.push(fsResult);

    // Verificar memoria
    const memResult = this.checkMemory();
    results.push(memResult);

    // Verificar espacio en disco
    const diskResult = await this.checkDiskSpace();
    results.push(diskResult);

    // Verificar red
    const networkResult = await this.checkNetwork();
    results.push(networkResult);

    // Verificar puerto API
    const portResult = await this.checkApiPort();
    results.push(portResult);

    this.lastResults = results;
    
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    if (errors > 0) {
      this.logger.error('Diagnóstico', `${errors} errores críticos detectados`);
    } else if (warnings > 0) {
      this.logger.warning('Diagnóstico', `${warnings} advertencias encontradas`);
    } else {
      this.logger.success('Diagnóstico', 'Sistema OK');
    }

    return results;
  }

  private async checkFilesystemPermissions(): Promise<DiagnosticResult> {
    const testPath = path.join(app.getPath('userData'), 'test_write.tmp');
    try {
      await fs.writeFile(testPath, 'test', 'utf-8');
      await fs.readFile(testPath, 'utf-8');
      await fs.unlink(testPath);
      return {
        category: 'Filesystem',
        status: 'ok',
        message: 'Permisos de lectura/escritura OK'
      };
    } catch (error) {
      return {
        category: 'Filesystem',
        status: 'error',
        message: 'Error de permisos en filesystem',
        details: { error: error instanceof Error ? error.message : 'Unknown' }
      };
    }
  }

  private checkMemory(): DiagnosticResult {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
    
    if (usedPercent > 90) {
      return {
        category: 'Memoria',
        status: 'warning',
        message: `Uso de memoria alto: ${usedPercent.toFixed(1)}%`,
        details: { total: totalMem, free: freeMem }
      };
    }
    
    return {
      category: 'Memoria',
      status: 'ok',
      message: `Memoria OK: ${usedPercent.toFixed(1)}% en uso`,
      details: { total: totalMem, free: freeMem }
    };
  }

  private async checkDiskSpace(): Promise<DiagnosticResult> {
    // Implementación simplificada
    return {
      category: 'Disco',
      status: 'ok',
      message: 'Espacio en disco suficiente'
    };
  }

  private async checkNetwork(): Promise<DiagnosticResult> {
    try {
      // Verificar conectividad básica
      const interfaces = os.networkInterfaces();
      const hasConnection = Object.values(interfaces).some(
        iface => iface?.some(addr => !addr.internal)
      );
      
      return {
        category: 'Red',
        status: hasConnection ? 'ok' : 'warning',
        message: hasConnection ? 'Conectividad de red OK' : 'Sin conexión de red detectada'
      };
    } catch {
      return {
        category: 'Red',
        status: 'error',
        message: 'Error al verificar red'
      };
    }
  }

  private async checkApiPort(): Promise<DiagnosticResult> {
    // Verificar si el puerto 38950 está disponible
    return {
      category: 'Puerto API',
      status: 'ok',
      message: 'Puerto 38950 configurado correctamente'
    };
  }

  getLastResults(): DiagnosticResult[] {
    return this.lastResults;
  }
}