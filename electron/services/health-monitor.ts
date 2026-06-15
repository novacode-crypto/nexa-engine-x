import { BinaryManager } from './binary-manager';
import { Logger } from './logger';

export class HealthMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval = 5 * 60 * 1000; // 5 minutos

  constructor(
    private binaryManager: BinaryManager,
    private logger: Logger
  ) {}

  startMonitoring(): void {
    this.logger.info('HealthMonitor', 'Iniciando monitoreo de salud...');
    
    // Verificación inicial
    this.runHealthCheck();
    
    // Verificación periódica
    this.intervalId = setInterval(() => {
      this.runHealthCheck();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restart(): void {
    this.stop();
    this.startMonitoring();
  }

  private async runHealthCheck(): Promise<void> {
    this.logger.debug('HealthMonitor', 'Ejecutando verificación de salud...');
    
    const binaries = this.binaryManager.getAllStatus();
    let issuesFound = false;

    for (const binary of binaries) {
      if (binary.status === 'corrupt' || binary.status === 'error') {
        issuesFound = true;
        this.logger.warning('HealthMonitor', `Binario ${binary.id} requiere reparación`);
        
        // Auto-repair para binarios corruptos
        if (binary.status === 'corrupt') {
          this.logger.info('HealthMonitor', `Auto-reparando ${binary.id}...`);
          await this.binaryManager.repairBinary(binary.id);
        }
      }
    }

    if (!issuesFound) {
      this.logger.debug('HealthMonitor', 'Todos los sistemas operativos');
    }
  }
}