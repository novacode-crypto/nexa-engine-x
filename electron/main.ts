import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { ApiServer } from "./services/api-server";
import { BinaryManager } from "./services/binary-manager";
import { DiagnosticsService } from "./services/diagnostics";
import { HealthMonitor } from "./services/health-monitor";
import { Logger } from "./services/logger";
import { PluginSystem } from "./services/plugin-system";
import { StoreManager } from "./services/store-manager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class NexaEngineX {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private apiServer: ApiServer;
  private binaryManager: BinaryManager;
  private healthMonitor: HealthMonitor;
  private pluginSystem: PluginSystem;
  private diagnostics: DiagnosticsService;
  private logger: Logger;
  private store: StoreManager;
  private isQuitting = false;

  constructor() {
    this.logger = new Logger();
    this.store = new StoreManager();
    this.diagnostics = new DiagnosticsService(this.logger);
    this.binaryManager = new BinaryManager(this.logger, this.store);
    this.healthMonitor = new HealthMonitor(this.binaryManager, this.logger);
    this.pluginSystem = new PluginSystem(this.logger);
    this.apiServer = new ApiServer(
      this.binaryManager,
      this.pluginSystem,
      this.diagnostics,
      this.logger,
      this.store
    );
  }

  async initialize(): Promise<void> {
    await app.whenReady();

    this.logger.info("Nexa Engine X", "Iniciando motor...");

    await this.setupIpcHandlers();
    await this.createWindow();
    await this.setupTray();
    await this.initializeServices();
    await this.setupAutoStart();

    this.logger.success("Nexa Engine X", "Motor iniciado correctamente");

    app.on("window-all-closed", this.handleWindowAllClosed.bind(this));
    app.on("before-quit", () => {
      this.isQuitting = true;
    });
    app.on("activate", this.handleActivate.bind(this));
  }

  private async createWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
              resizable: true,
      frame: false,
      titleBarStyle: "hidden",
      // transparent: true,
      backgroundColor: "#00000000",
      show: false,
      roundedCorners: true,
      thickFrame: true,
    // backgroundMaterial: 'acrylic',
      hasShadow: true,
      vibrancy: "under-window",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
      },
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;

    if (devServerUrl) {
      await this.mainWindow.loadURL(devServerUrl);
      // this.mainWindow.webContents.openDevTools();
    } else {
      // En desarrollo, intentar localhost:5173 primero
      try {
        await this.mainWindow.loadURL("http://localhost:5173/");
        // this.mainWindow.webContents.openDevTools();
      } catch {
        const indexPath = path.join(__dirname, "../renderer/index.html");
        await this.mainWindow.loadFile(indexPath);
      }
    }

    this.mainWindow.once("ready-to-show", () => {
      const startMinimized = this.store.get("startMinimized", false);
      if (!startMinimized && this.mainWindow) {
        this.mainWindow.show();

        // Animación sutil de fade-in
        this.mainWindow.setOpacity(0);
        let opacity = 0;
        const fadeIn = setInterval(() => {
          opacity += 0.1;
          this.mainWindow?.setOpacity(opacity);
          if (opacity >= 1) clearInterval(fadeIn);
        }, 16);

        this.mainWindow.focus();
      }
    });

    // Forzar show después de un timeout como fallback
    setTimeout(() => {
      if (
        this.mainWindow &&
        !this.mainWindow.isVisible() &&
        !this.mainWindow.isMinimized()
      ) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 2000);

    this.mainWindow.on("close", (event) => {
      if (!this.isQuitting && this.store.get("minimizeToTray", true)) {
        event.preventDefault();
        this.mainWindow?.hide();
        this.logger.info("Sistema", "Aplicación minimizada a bandeja");
      }
    });
  }

  private async setupTray(): Promise<void> {
    const iconPath = path.join(__dirname, "../../resources/tray-icon.png");
    const trayIcon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 });

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip("Nexa Engine X");

    const contextMenu = Menu.buildFromTemplate([
      { label: "Abrir Dashboard", click: () => this.showWindow() },
      { label: "Binarios", click: () => this.navigateTo("/binaries") },
      { label: "Configuración", click: () => this.navigateTo("/settings") },
      { type: "separator" },
      { label: "Reiniciar Servicio", click: () => this.restartService() },
      { type: "separator" },
      { label: "Salir", click: () => this.quit() },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on("double-click", () => this.showWindow());
  }

  private async initializeServices(): Promise<void> {
    // Iniciar servidor API
    await this.apiServer.start();

    // Inicializar gestor de binarios
    await this.binaryManager.initialize();

    // Iniciar monitoreo de salud
    this.healthMonitor.startMonitoring();

    // Cargar plugins
    await this.pluginSystem.loadPlugins();

    // Ejecutar diagnóstico inicial
    await this.diagnostics.runFullDiagnostics();
  }

  private async setupIpcHandlers(): Promise<void> {
    // Dashboard
    ipcMain.handle("get-dashboard-data", async () => {
      return {
        serverStatus: this.apiServer.isRunning(),
        uptime: this.apiServer.getUptime(),
        binaries: await this.binaryManager.getAllStatus(),
        plugins: this.pluginSystem.getPluginList(),
        diagnostics: await this.diagnostics.getLastResults(),
      };
    });

    // Handler de fallback para depuración
    ipcMain.handle("ping", () => {
      return { pong: true, timestamp: Date.now() };
    });

    // Binarios
    ipcMain.handle("download-binary", async (_, binaryId: string) => {
      return this.binaryManager.downloadBinary(binaryId);
    });

    ipcMain.handle("verify-binary", async (_, binaryId: string) => {
      return this.binaryManager.verifyBinary(binaryId);
    });

    ipcMain.handle("repair-binary", async (_, binaryId: string) => {
      return this.binaryManager.repairBinary(binaryId);
    });

    ipcMain.handle("install-binary", async (_, binaryId: string, data: Uint8Array) => {
      return this.binaryManager.installBinary(binaryId, data);
    });

    ipcMain.handle("delete-all-binaries", async () => {
      return this.binaryManager.deleteAllBinaries();
    });

    // Plugins
    ipcMain.handle("install-plugin", async (_, pluginPath: string) => {
      return this.pluginSystem.installPlugin(pluginPath);
    });

    ipcMain.handle("get-plugins", async () => {
      return this.pluginSystem.getPluginList();
    });

    // Configuración
    ipcMain.handle("get-settings", async () => {
      return this.store.getAll();
    });

    ipcMain.handle("set-setting", async (_, key: string, value: unknown) => {
      // Validar que la key exista en StoreSchema
      const validKeys = [
        "autoStart",
        "startMinimized",
        "minimizeToTray",
        "autoUpdate",
        "downloadsPath",
        "apiPort",
        "apiToken",
        "binariesPath",
        "lastDiagnostics",
        "pluginRegistry",
      ] as const;

      if (!validKeys.includes(key as any)) {
        this.logger.warning("Config", `Key inválida: ${key}`);
        return false;
      }

      this.store.set(key as any, value);
      return true;
    });

    // Logs
    ipcMain.handle("get-logs", async (_, limit = 500) => {
      return this.logger.getRecentLogs(limit);
    });

    // Diagnóstico
    ipcMain.handle("run-diagnostics", async () => {
      return this.diagnostics.runFullDiagnostics();
    });

    // Sistema
    ipcMain.handle("restart-service", async () => {
      return this.restartService();
    });

    ipcMain.handle("regenerate-token", async () => {
      return this.apiServer.regenerateToken();
    });

    ipcMain.handle("open-downloads-folder", async () => {
      const downloadsPath = this.store.get(
        "downloadsPath",
        path.join(app.getPath("downloads"), "YTDownloadX")
      );
      await shell.openPath(downloadsPath);
    });

    // Notificaciones nativas
    ipcMain.handle(
      "show-notification",
      async (_, title: string, body: string) => {
        // Implementación de notificación nativa de Windows
        const { Notification } = await import("electron");
        if (Notification.isSupported()) {
          new Notification({
            title,
            body,
            icon: path.join(__dirname, "../../resources/icon.png"),
          }).show();
        }
      }
    );

    // Controles de ventana
    ipcMain.handle("window-minimize", () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle("window-maximize", () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle("window-close", () => {
      this.mainWindow?.close();
    });
  }

  private showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private navigateTo(route: string): void {
    this.showWindow();
    this.mainWindow?.webContents.send("navigate-to", route);
  }

  private async restartService(): Promise<boolean> {
    this.logger.info("Sistema", "Reiniciando servicios...");
    await this.apiServer.restart();
    await this.binaryManager.initialize();
    this.healthMonitor.restart();
    this.logger.success("Sistema", "Servicios reiniciados");
    return true;
  }

  private async setupAutoStart(): Promise<void> {
    const autoStart = this.store.get("autoStart", false);
    app.setLoginItemSettings({
      openAtLogin: autoStart,
      openAsHidden: this.store.get("startMinimized", false),
    });
  }

  private handleWindowAllClosed(): void {
    if (process.platform !== "darwin") {
      // En Windows/Linux, mantener en tray si está configurado
      if (!this.store.get("minimizeToTray", true)) {
        this.quit();
      }
    }
  }

  private handleActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    } else {
      this.showWindow();
    }
  }

  private quit(): void {
    this.isQuitting = true;
    this.apiServer.stop();
    this.healthMonitor.stop();
    this.logger.info("Nexa Engine X", "Motor detenido");
    app.quit();
  }
}

// Inicializar aplicación
const engine = new NexaEngineX();
engine.initialize().catch((error) => {
  console.error("Error fatal al iniciar Nexa Engine X:", error);
  process.exit(1);
});
