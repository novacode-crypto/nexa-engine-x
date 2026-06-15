import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  id: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 5000;
  private logFilePath: string;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  constructor() {
    this.logFilePath = path.join(app.getPath('userData'), 'logs', 'nexa-engine.log');
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch {
      // Directorio ya existe
    }
  }

  private createEntry(level: LogLevel, module: string, message: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    const line = `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}\n`;
    try {
      await fs.appendFile(this.logFilePath, line, 'utf-8');
    } catch (error) {
      console.error('Error al escribir log:', error);
    }
  }

  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => listener(entry));
  }

  log(level: LogLevel, module: string, message: string): void {
    const entry = this.createEntry(level, module, message);
    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.persistLog(entry);
    this.notifyListeners(entry);
    
    // También loggear en consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const colors: Record<LogLevel, string> = {
        INFO: '\x1b[36m',
        SUCCESS: '\x1b[32m',
        WARNING: '\x1b[33m',
        ERROR: '\x1b[31m',
        DEBUG: '\x1b[35m'
      };
      console.log(`${colors[level]}[${level}] [${module}]\x1b[0m ${message}`);
    }
  }

  info(module: string, message: string): void {
    this.log('INFO', module, message);
  }

  success(module: string, message: string): void {
    this.log('SUCCESS', module, message);
  }

  warning(module: string, message: string): void {
    this.log('WARNING', module, message);
  }

  error(module: string, message: string): void {
    this.log('ERROR', module, message);
  }

  debug(module: string, message: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', module, message);
    }
  }

  getRecentLogs(limit = 500): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  onLog(callback: (entry: LogEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clear(): void {
    this.logs = [];
  }
}