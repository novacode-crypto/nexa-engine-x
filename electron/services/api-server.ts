import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { BinaryManager } from './binary-manager';
import { PluginSystem } from './plugin-system';
import { DiagnosticsService } from './diagnostics';
import { Logger } from './logger';
import { StoreManager } from './store-manager';
import { spawn } from 'child_process';
import path from 'path';

export class ApiServer {
  private app: express.Application;
  private server: ReturnType<express.Application['listen']> | null = null;
  private port: number;
  private token: string;
  private startTime: number = Date.now();
  private activeSessions: Map<string, { origin: string; connectedAt: number }> = new Map();

  constructor(
    private binaryManager: BinaryManager,
    private pluginSystem: PluginSystem,
    private diagnostics: DiagnosticsService,
    private logger: Logger,
    private store: StoreManager
  ) {
    this.app = express();
    this.port = this.store.get('apiPort', 38950);
    this.token = this.store.get('apiToken');
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minuto
      max: 100,
      message: { error: 'Demasiadas solicitudes. Intente más tarde.' }
    });

    this.app.use(limiter);
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS restringido a localhost
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://localhost')) {
          callback(null, true);
        } else {
          callback(new Error('Origen no permitido'));
        }
      },
      credentials: true
    }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: this.getUptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Status general
    this.app.get('/status', this.validateToken.bind(this), (req, res) => {
      res.json({
        engineVersion: '1.0.0',
        serverStatus: 'running',
        uptime: this.getUptime(),
        binaries: this.binaryManager.getAllStatus(),
        plugins: this.pluginSystem.getPluginList()
      });
    });

    // Diagnóstico
    this.app.get('/diagnostics', this.validateToken.bind(this), async (req, res) => {
      const results = await this.diagnostics.runFullDiagnostics();
      res.json(results);
    });

    // Lista de binarios
    this.app.get('/binaries', this.validateToken.bind(this), async (req, res) => {
      const binaries = await this.binaryManager.getAllStatus();
      res.json(binaries);
    });

    // Configuración
    this.app.get('/settings', this.validateToken.bind(this), (req, res) => {
      const settings = this.store.getAll();
      // No exponer token completo
      const safeSettings = { ...settings, apiToken: '***' };
      res.json(safeSettings);
    });

    // Handshake para extensiones
    this.app.post('/handshake', (req, res) => {
      const { client, version, capabilities } = req.body;
      
      if (!client || !version) {
        return res.status(400).json({ error: 'Parámetros de handshake inválidos' });
      }

      const sessionToken = this.generateSessionToken();
      this.activeSessions.set(sessionToken, {
        origin: req.ip || 'unknown',
        connectedAt: Date.now()
      });

      this.logger.success('API', `Extensión ${client} v${version} conectada`);
      
      res.json({
        status: 'ok',
        token: sessionToken,
        engineVersion: '1.0.0',
        capabilities: ['download', 'queue', 'status', 'ytdlp', 'aria2', 'ffmpeg']
      });
    });

    // Endpoint de descarga
    this.app.post('/download', this.validateToken.bind(this), async (req, res) => {
      const { url, format, quality, outputPath } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL requerida' });
      }

      try {
        const downloadId = `dl_${Date.now()}`;
        this.logger.info('Descarga', `Iniciando descarga: ${url}`);
        
        // Ejecutar yt-dlp
        const ytdlpPath = await this.binaryManager.getBinaryPath('yt-dlp');
        const args = [
          '--no-warnings',
          '--newline',
          '-o', path.join(outputPath || this.store.get('downloadsPath'), '%(title)s.%(ext)s'),
          url
        ];

        if (format === 'audio') {
          args.push('-x', '--audio-format', 'mp3');
        }

        const process = spawn(ytdlpPath, args, { detached: false });
        
        res.json({
          downloadId,
          status: 'started',
          message: 'Descarga iniciada'
        });

        process.on('close', (code) => {
          if (code === 0) {
            this.logger.success('Descarga', `Completada: ${url}`);
          } else {
            this.logger.error('Descarga', `Error en descarga: ${url} (código ${code})`);
          }
        });

      } catch (error) {
        this.logger.error('Descarga', `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        res.status(500).json({ error: 'Error al iniciar descarga' });
      }
    });

    // Cancelar descarga
    this.app.post('/cancel', this.validateToken.bind(this), (req, res) => {
      const { downloadId } = req.body;
      // Implementar lógica de cancelación
      res.json({ status: 'cancelled', downloadId });
    });

    // Ejecutar yt-dlp
    this.app.post('/ytdlp', this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const ytdlpPath = await this.binaryManager.getBinaryPath('yt-dlp');
      this.executeBinary(ytdlpPath, args, res);
    });

    // Ejecutar aria2c
    this.app.post('/aria2', this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const aria2Path = await this.binaryManager.getBinaryPath('aria2c');
      this.executeBinary(aria2Path, args, res);
    });

    // Ejecutar ffmpeg
    this.app.post('/ffmpeg', this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const ffmpegPath = await this.binaryManager.getBinaryPath('ffmpeg');
      this.executeBinary(ffmpegPath, args, res);
    });

    // Plugins
    this.app.get('/plugins/list', this.validateToken.bind(this), (req, res) => {
      res.json(this.pluginSystem.getPluginList());
    });

    this.app.post('/plugins/install', this.validateToken.bind(this), async (req, res) => {
      const { pluginPath } = req.body;
      const result = await this.pluginSystem.installPlugin(pluginPath);
      res.json(result);
    });

    // Reiniciar servicio
    this.app.post('/restart', this.validateToken.bind(this), async (req, res) => {
      res.json({ status: 'restarting' });
      await this.restart();
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('API', `Error: ${err.message}`);
      res.status(500).json({ error: 'Error interno del servidor' });
    });
  }

  private validateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.query.token as string;
    
    if (!token || (token !== this.token && !this.activeSessions.has(token))) {
      res.status(401).json({ error: 'Token no válido' });
      return;
    }
    
    next();
  }

  private generateSessionToken(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private executeBinary(binaryPath: string, args: string[], res: Response): void {
    const child = spawn(binaryPath, args || [], {
      windowsHide: true,
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      res.json({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        this.logger.success('API', `Servidor iniciado en http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('API', 'Servidor detenido');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    this.token = this.store.get('apiToken');
    await this.start();
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  regenerateToken(): string {
    this.token = this.store.regenerateToken();
    // Invalidar sesiones existentes
    this.activeSessions.clear();
    return this.token;
  }
}