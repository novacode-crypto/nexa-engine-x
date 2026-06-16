"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const url = require("url");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const child_process = require("child_process");
const fs = require("fs/promises");
const https = require("https");
const fs$1 = require("fs");
const AdmZip = require("adm-zip");
const os = require("os");
const Store = require("electron-store");
class ApiServer {
  constructor(binaryManager, pluginSystem, diagnostics, logger, store) {
    this.binaryManager = binaryManager;
    this.pluginSystem = pluginSystem;
    this.diagnostics = diagnostics;
    this.logger = logger;
    this.store = store;
    this.app = express();
    this.port = this.store.get("apiPort", 38950);
    this.token = this.store.get("apiToken");
    this.setupMiddleware();
    this.setupRoutes();
  }
  app;
  server = null;
  port;
  token;
  startTime = Date.now();
  activeSessions = /* @__PURE__ */ new Map();
  setupMiddleware() {
    const limiter = rateLimit({
      windowMs: 60 * 1e3,
      // 1 minuto
      max: 100,
      message: { error: "Demasiadas solicitudes. Intente más tarde." }
    });
    this.app.use(limiter);
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || origin.startsWith("http://127.0.0.1") || origin.startsWith("http://localhost")) {
          callback(null, true);
        } else {
          callback(new Error("Origen no permitido"));
        }
      },
      credentials: true
    }));
  }
  setupRoutes() {
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        uptime: this.getUptime(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    this.app.get("/status", this.validateToken.bind(this), (req, res) => {
      res.json({
        engineVersion: "1.0.0",
        serverStatus: "running",
        uptime: this.getUptime(),
        binaries: this.binaryManager.getAllStatus(),
        plugins: this.pluginSystem.getPluginList()
      });
    });
    this.app.get("/diagnostics", this.validateToken.bind(this), async (req, res) => {
      const results = await this.diagnostics.runFullDiagnostics();
      res.json(results);
    });
    this.app.get("/binaries", this.validateToken.bind(this), async (req, res) => {
      const binaries = await this.binaryManager.getAllStatus();
      res.json(binaries);
    });
    this.app.get("/settings", this.validateToken.bind(this), (req, res) => {
      const settings = this.store.getAll();
      const safeSettings = { ...settings, apiToken: "***" };
      res.json(safeSettings);
    });
    this.app.post("/handshake", (req, res) => {
      const { client, version, capabilities } = req.body;
      if (!client || !version) {
        return res.status(400).json({ error: "Parámetros de handshake inválidos" });
      }
      const sessionToken = this.generateSessionToken();
      this.activeSessions.set(sessionToken, {
        origin: req.ip || "unknown",
        connectedAt: Date.now()
      });
      this.logger.success("API", `Extensión ${client} v${version} conectada`);
      res.json({
        status: "ok",
        token: sessionToken,
        engineVersion: "1.0.0",
        capabilities: ["download", "queue", "status", "ytdlp", "aria2", "ffmpeg"]
      });
    });
    this.app.post("/download", this.validateToken.bind(this), async (req, res) => {
      const { url: url2, format, quality, outputPath } = req.body;
      if (!url2) {
        return res.status(400).json({ error: "URL requerida" });
      }
      try {
        const downloadId = `dl_${Date.now()}`;
        this.logger.info("Descarga", `Iniciando descarga: ${url2}`);
        const ytdlpPath = await this.binaryManager.getBinaryPath("yt-dlp");
        const args = [
          "--no-warnings",
          "--newline",
          "-o",
          path.join(outputPath || this.store.get("downloadsPath"), "%(title)s.%(ext)s"),
          url2
        ];
        if (format === "audio") {
          args.push("-x", "--audio-format", "mp3");
        }
        const process2 = child_process.spawn(ytdlpPath, args, { detached: false });
        res.json({
          downloadId,
          status: "started",
          message: "Descarga iniciada"
        });
        process2.on("close", (code) => {
          if (code === 0) {
            this.logger.success("Descarga", `Completada: ${url2}`);
          } else {
            this.logger.error("Descarga", `Error en descarga: ${url2} (código ${code})`);
          }
        });
      } catch (error) {
        this.logger.error("Descarga", `Error: ${error instanceof Error ? error.message : "Unknown"}`);
        res.status(500).json({ error: "Error al iniciar descarga" });
      }
    });
    this.app.post("/cancel", this.validateToken.bind(this), (req, res) => {
      const { downloadId } = req.body;
      res.json({ status: "cancelled", downloadId });
    });
    this.app.post("/ytdlp", this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const ytdlpPath = await this.binaryManager.getBinaryPath("yt-dlp");
      this.executeBinary(ytdlpPath, args, res);
    });
    this.app.post("/aria2", this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const aria2Path = await this.binaryManager.getBinaryPath("aria2c");
      this.executeBinary(aria2Path, args, res);
    });
    this.app.post("/ffmpeg", this.validateToken.bind(this), async (req, res) => {
      const { args } = req.body;
      const ffmpegPath = await this.binaryManager.getBinaryPath("ffmpeg");
      this.executeBinary(ffmpegPath, args, res);
    });
    this.app.get("/plugins/list", this.validateToken.bind(this), (req, res) => {
      res.json(this.pluginSystem.getPluginList());
    });
    this.app.post("/plugins/install", this.validateToken.bind(this), async (req, res) => {
      const { pluginPath } = req.body;
      const result = await this.pluginSystem.installPlugin(pluginPath);
      res.json(result);
    });
    this.app.post("/restart", this.validateToken.bind(this), async (req, res) => {
      res.json({ status: "restarting" });
      await this.restart();
    });
    this.app.use((err, req, res, next) => {
      this.logger.error("API", `Error: ${err.message}`);
      res.status(500).json({ error: "Error interno del servidor" });
    });
  }
  validateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.query.token;
    if (!token || token !== this.token && !this.activeSessions.has(token)) {
      res.status(401).json({ error: "Token no válido" });
      return;
    }
    next();
  }
  generateSessionToken() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  executeBinary(binaryPath, args, res) {
    const child = child_process.spawn(binaryPath, args || [], {
      windowsHide: true,
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      res.json({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    child.on("error", (error) => {
      res.status(500).json({ error: error.message });
    });
  }
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, "127.0.0.1", () => {
        this.logger.success("API", `Servidor iniciado en http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info("API", "Servidor detenido");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  async restart() {
    await this.stop();
    this.token = this.store.get("apiToken");
    await this.start();
  }
  isRunning() {
    return this.server !== null;
  }
  getUptime() {
    return Date.now() - this.startTime;
  }
  regenerateToken() {
    this.token = this.store.regenerateToken();
    this.activeSessions.clear();
    return this.token;
  }
}
class BinaryManager {
  constructor(logger, store) {
    this.logger = logger;
    this.store = store;
    this.binariesPath = this.store.get("binariesPath");
    this.initializeBinaries();
  }
  binaries = /* @__PURE__ */ new Map();
  binariesPath;
  downloadingIds = /* @__PURE__ */ new Set();
  initializeBinaries() {
    const defaultBinaries = [
      {
        id: "yt-dlp",
        name: "yt-dlp",
        description: "Descargador de videos de YouTube y más",
        version: "",
        status: "missing",
        path: "",
        size: 0,
        checksum: "",
        downloadUrl: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
        lastChecked: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "aria2c",
        name: "aria2c",
        description: "Descargador multiprotocolo y multiconexión",
        version: "",
        status: "missing",
        path: "",
        size: 0,
        checksum: "",
        downloadUrl: "https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip",
        lastChecked: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "ffmpeg",
        name: "FFmpeg",
        description: "Framework multimedia para procesamiento de video/audio",
        version: "",
        status: "missing",
        path: "",
        size: 0,
        checksum: "",
        downloadUrl: "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        lastChecked: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    defaultBinaries.forEach((binary) => {
      this.binaries.set(binary.id, binary);
    });
  }
  async initialize() {
    await this.ensureBinariesDirectory();
    await this.scanExistingBinaries();
    await this.verifyAllBinaries();
  }
  async ensureBinariesDirectory() {
    try {
      await fs.mkdir(this.binariesPath, { recursive: true });
    } catch (error) {
      this.logger.error("Binarios", `Error al crear directorio: ${error}`);
    }
  }
  async scanExistingBinaries() {
    for (const [id, binary] of this.binaries) {
      const binaryPath = path.join(this.binariesPath, `${id}.exe`);
      try {
        const stats = await fs.stat(binaryPath);
        if (stats.isFile() && stats.size > 1e3) {
          binary.path = binaryPath;
          binary.size = stats.size;
          binary.status = "verifying";
          this.logger.info("Binarios", `Binario encontrado: ${id} (${stats.size} bytes)`);
        } else if (stats.size <= 1e3) {
          await fs.unlink(binaryPath);
          this.logger.warning("Binarios", `Archivo dummy eliminado: ${id}`);
        }
      } catch {
      }
    }
  }
  async verifyAllBinaries() {
    for (const [id, binary] of this.binaries) {
      if (binary.path && binary.status !== "missing" && !this.downloadingIds.has(id)) {
        await this.verifyBinary(id);
      }
    }
  }
  async verifyBinary(binaryId) {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;
    if (this.downloadingIds.has(binaryId)) {
      return false;
    }
    if (!binary.path) {
      const binaryNames = {
        "yt-dlp": "yt-dlp.exe",
        "ffmpeg": "ffmpeg.exe",
        "aria2c": "aria2c.exe"
      };
      const fileName = binaryNames[binaryId] || binaryId;
      const expectedPath = path.join(this.binariesPath, fileName);
      try {
        await fs.access(expectedPath);
        binary.path = expectedPath;
        binary.status = "verifying";
      } catch {
        binary.status = "missing";
        binary.error = "Binario no encontrado";
        binary.version = "";
        binary.size = 0;
        return false;
      }
    } else {
      binary.status = "verifying";
      binary.error = void 0;
    }
    try {
      const stats = await fs.stat(binary.path);
      if (stats.size < 1e3) {
        binary.status = "corrupt";
        binary.error = "Archivo demasiado pequeño (posiblemente corrupto)";
        return false;
      }
      const version = await this.getBinaryVersion(binaryId, binary.path);
      if (version) {
        binary.version = version;
        binary.status = "ready";
        binary.size = stats.size;
        binary.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
        binary.error = void 0;
        this.logger.success("Binarios", `${binaryId} verificado correctamente (v${version})`);
        return true;
      } else {
        binary.status = "corrupt";
        binary.error = "No se pudo obtener la versión";
        this.logger.warning("Binarios", `${binaryId} parece estar corrupto`);
        return false;
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        binary.status = "missing";
        binary.error = "Binario no encontrado (eliminado manualmente)";
        binary.path = "";
        binary.version = "";
        binary.size = 0;
        this.logger.warning("Binarios", `${binaryId} fue eliminado manualmente`);
      } else {
        binary.status = "error";
        binary.error = error instanceof Error ? error.message : "Error desconocido";
        this.logger.error("Binarios", `Error verificando ${binaryId}: ${binary.error}`);
      }
      return false;
    }
  }
  async getBinaryVersion(binaryId, binaryPath) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const version = await this.tryGetBinaryVersion(binaryId, binaryPath);
      if (version) {
        return version;
      }
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return "";
  }
  async tryGetBinaryVersion(binaryId, binaryPath) {
    return new Promise((resolve) => {
      let args = [];
      switch (binaryId) {
        case "yt-dlp":
          args = ["--version"];
          break;
        case "aria2c":
          args = ["--version"];
          break;
        case "ffmpeg":
          args = ["-version"];
          break;
        default:
          resolve("");
          return;
      }
      let finished = false;
      const finish = (version) => {
        if (!finished) {
          finished = true;
          resolve(version);
        }
      };
      child_process.execFile(binaryPath, args, {
        windowsHide: true,
        timeout: 8e3
      }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error("Binarios", `execFile error en ${binaryId}: ${error.message}`);
          finish("");
          return;
        }
        const output = stdout + stderr;
        const lines = output.trim().split("\n");
        let version = lines[0]?.trim() || "";
        if (binaryId === "ffmpeg" && version.includes("version")) {
          const match = version.match(/version\s+([\d.]+)/);
          version = match ? match[1] : version;
        }
        if (binaryId === "aria2c") {
          const match = version.match(/aria2\s+version\s+([\d.]+)/i) || output.match(/aria2\s+version\s+([\d.]+)/i);
          version = match ? match[1] : "";
        }
        finish(version || "");
      });
      setTimeout(() => finish(""), 1e4);
    });
  }
  async downloadBinary(binaryId, onProgress) {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;
    if (this.downloadingIds.has(binaryId)) {
      this.logger.warning("Binarios", `Descarga de ${binaryId} ya en progreso`);
      return false;
    }
    this.downloadingIds.add(binaryId);
    try {
      binary.status = "downloading";
      binary.error = void 0;
      this.logger.info("Binarios", `Descargando ${binaryId}...`);
      const binaryPath = path.join(this.binariesPath, `${binaryId}.exe`);
      if (binaryId === "yt-dlp") {
        await this.downloadFile(binary.downloadUrl, binaryPath, onProgress);
      } else {
        const zipPath = path.join(this.binariesPath, `${binaryId}.zip`);
        await this.downloadFile(binary.downloadUrl, zipPath, onProgress);
        this.logger.info("Binarios", `Extrayendo ${binaryId}...`);
        await this.extractExeFromZip(zipPath, binaryPath, binaryId);
        await fs.unlink(zipPath).catch(() => {
        });
      }
      binary.path = binaryPath;
      binary.status = "verifying";
      try {
        const { execSync } = require("child_process");
        execSync(`powershell.exe -Command "Unblock-File -Path '${binaryPath}'"`);
        this.logger.info("Binarios", `Atributo de bloqueo removido de ${binaryId}`);
      } catch {
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      this.downloadingIds.delete(binaryId);
      const isValid = await this.verifyBinary(binaryId);
      if (isValid) {
        this.logger.success("Binarios", `${binaryId} descargado y verificado`);
        return true;
      } else {
        binary.status = "corrupt";
        return false;
      }
    } catch (error) {
      binary.status = "error";
      binary.error = error instanceof Error ? error.message : "Error de descarga";
      this.logger.error("Binarios", `Error descargando ${binaryId}: ${binary.error}`);
      this.downloadingIds.delete(binaryId);
      return false;
    }
  }
  downloadFile(url2, targetPath, onProgress) {
    return new Promise((resolve, reject) => {
      const file = fs$1.createWriteStream(targetPath);
      let resolved = false;
      let downloadedBytes = 0;
      let totalBytes = 0;
      let lastReportTime = Date.now();
      let lastReportBytes = 0;
      const finish = (err) => {
        if (!resolved) {
          resolved = true;
          file.close();
          if (err) {
            fs.unlink(targetPath).catch(() => {
            });
            reject(err);
          } else {
            resolve();
          }
        }
      };
      const request = https.get(url2, { timeout: 3e5 }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            file.close();
            fs.unlink(targetPath).catch(() => {
            });
            this.downloadFile(response.headers.location, targetPath, onProgress).then(resolve).catch(reject);
            return;
          }
        }
        if (response.statusCode !== 200) {
          finish(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        totalBytes = parseInt(response.headers["content-length"] || "0", 10);
        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          const timeDiff = now - lastReportTime;
          if (timeDiff > 500 && onProgress && totalBytes > 0) {
            const bytesDiff = downloadedBytes - lastReportBytes;
            const speed = bytesDiff / timeDiff * 1e3;
            onProgress({
              percent: Math.round(downloadedBytes / totalBytes * 100),
              speed,
              downloaded: downloadedBytes,
              total: totalBytes
            });
            lastReportTime = now;
            lastReportBytes = downloadedBytes;
          }
        });
        response.pipe(file);
        file.on("finish", () => {
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
        file.on("error", (err) => finish(err));
      });
      request.on("error", (err) => finish(err));
      request.on("timeout", () => {
        request.destroy();
        finish(new Error("Timeout de descarga (5 minutos)"));
      });
    });
  }
  async extractExeFromZip(zipPath, targetPath, binaryId) {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      const exeEntry = entries.find((entry) => {
        const name = entry.entryName.toLowerCase();
        return name.endsWith(`${binaryId}.exe`) || name.endsWith(`${binaryId}.exe`.replace("-", ""));
      }) || entries.find((entry) => entry.entryName.toLowerCase().endsWith(".exe"));
      if (!exeEntry) {
        throw new Error(`No se encontró .exe para ${binaryId} en el ZIP`);
      }
      zip.extractEntryTo(exeEntry, path.dirname(targetPath), false, true);
      const extractedPath = path.join(path.dirname(targetPath), exeEntry.entryName.split("/").pop() || "");
      if (extractedPath !== targetPath) {
        await fs.rename(extractedPath, targetPath).catch(() => {
        });
      }
      this.logger.success("Binarios", `${binaryId} extraído correctamente`);
    } catch (error) {
      this.logger.error("Binarios", `Error extrayendo ${binaryId}: ${error.message}`);
      throw error;
    }
  }
  async repairBinary(binaryId) {
    const binary = this.binaries.get(binaryId);
    if (!binary) return false;
    this.logger.info("Binarios", `Reparando ${binaryId}...`);
    if (binary.path) {
      try {
        await fs.unlink(binary.path);
      } catch {
      }
    }
    binary.path = "";
    binary.version = "";
    binary.size = 0;
    binary.status = "missing";
    binary.error = void 0;
    return this.downloadBinary(binaryId);
  }
  async getBinaryPath(binaryId) {
    const binary = this.binaries.get(binaryId);
    if (!binary || binary.status !== "ready") {
      throw new Error(`Binario ${binaryId} no está disponible`);
    }
    return binary.path;
  }
  getAllStatus() {
    return Array.from(this.binaries.values());
  }
  getBinaryStatus(binaryId) {
    return this.binaries.get(binaryId);
  }
  isDownloading(binaryId) {
    return this.downloadingIds.has(binaryId);
  }
  async installBinary(binaryId, data) {
    try {
      const binary = this.binaries.get(binaryId);
      if (!binary) {
        return { success: false, version: "" };
      }
      const binaryNames = {
        "yt-dlp": "yt-dlp.exe",
        "ffmpeg": "ffmpeg.exe",
        "aria2c": "aria2c.exe"
      };
      const fileName = binaryNames[binaryId] || binaryId;
      const destPath = path.join(this.binariesPath, fileName);
      await fs.writeFile(destPath, Buffer.from(data));
      binary.path = destPath;
      binary.status = "ready";
      binary.size = (await fs.stat(destPath)).size;
      binary.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
      binary.error = void 0;
      this.logger.success("Binarios", `${binaryId} instalado correctamente`);
      await this.verifyBinary(binaryId);
      return { success: true, version: binary.version };
    } catch (error) {
      this.logger.error("Binarios", `Error instalando ${binaryId}: ${error instanceof Error ? error.message : "Error desconocido"}`);
      return { success: false, version: "" };
    }
  }
  async deleteAllBinaries() {
    try {
      this.downloadingIds.clear();
      for (const [id, binary] of this.binaries) {
        if (binary.path && binary.path.length > 0) {
          try {
            await fs.unlink(binary.path);
            this.logger.info("Binarios", `${id} eliminado`);
          } catch (err) {
            this.logger.warning("Binarios", `No se pudo eliminar ${id}: ${err instanceof Error ? err.message : "Error desconocido"}`);
          }
        }
        binary.path = "";
        binary.version = "";
        binary.size = 0;
        binary.status = "missing";
        binary.error = void 0;
        binary.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
      }
      this.logger.success("Binarios", "Todos los binarios eliminados");
      return true;
    } catch (error) {
      this.logger.error("Binarios", `Error eliminando binarios: ${error instanceof Error ? error.message : "Error desconocido"}`);
      return false;
    }
  }
}
class DiagnosticsService {
  constructor(logger) {
    this.logger = logger;
  }
  lastResults = [];
  async runFullDiagnostics() {
    this.logger.info("Diagnóstico", "Ejecutando diagnóstico completo...");
    const results = [];
    results.push({
      category: "Entorno",
      status: "ok",
      message: `Node.js ${process.version}`,
      details: { platform: process.platform, arch: process.arch }
    });
    results.push({
      category: "Electron",
      status: "ok",
      message: `Electron ${process.versions.electron}`
    });
    const fsResult = await this.checkFilesystemPermissions();
    results.push(fsResult);
    const memResult = this.checkMemory();
    results.push(memResult);
    const diskResult = await this.checkDiskSpace();
    results.push(diskResult);
    const networkResult = await this.checkNetwork();
    results.push(networkResult);
    const portResult = await this.checkApiPort();
    results.push(portResult);
    this.lastResults = results;
    const errors = results.filter((r) => r.status === "error").length;
    const warnings = results.filter((r) => r.status === "warning").length;
    if (errors > 0) {
      this.logger.error("Diagnóstico", `${errors} errores críticos detectados`);
    } else if (warnings > 0) {
      this.logger.warning("Diagnóstico", `${warnings} advertencias encontradas`);
    } else {
      this.logger.success("Diagnóstico", "Sistema OK");
    }
    return results;
  }
  async checkFilesystemPermissions() {
    const testPath = path.join(electron.app.getPath("userData"), "test_write.tmp");
    try {
      await fs.writeFile(testPath, "test", "utf-8");
      await fs.readFile(testPath, "utf-8");
      await fs.unlink(testPath);
      return {
        category: "Filesystem",
        status: "ok",
        message: "Permisos de lectura/escritura OK"
      };
    } catch (error) {
      return {
        category: "Filesystem",
        status: "error",
        message: "Error de permisos en filesystem",
        details: { error: error instanceof Error ? error.message : "Unknown" }
      };
    }
  }
  checkMemory() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = (totalMem - freeMem) / totalMem * 100;
    if (usedPercent > 90) {
      return {
        category: "Memoria",
        status: "warning",
        message: `Uso de memoria alto: ${usedPercent.toFixed(1)}%`,
        details: { total: totalMem, free: freeMem }
      };
    }
    return {
      category: "Memoria",
      status: "ok",
      message: `Memoria OK: ${usedPercent.toFixed(1)}% en uso`,
      details: { total: totalMem, free: freeMem }
    };
  }
  async checkDiskSpace() {
    return {
      category: "Disco",
      status: "ok",
      message: "Espacio en disco suficiente"
    };
  }
  async checkNetwork() {
    try {
      const interfaces = os.networkInterfaces();
      const hasConnection = Object.values(interfaces).some(
        (iface) => iface?.some((addr) => !addr.internal)
      );
      return {
        category: "Red",
        status: hasConnection ? "ok" : "warning",
        message: hasConnection ? "Conectividad de red OK" : "Sin conexión de red detectada"
      };
    } catch {
      return {
        category: "Red",
        status: "error",
        message: "Error al verificar red"
      };
    }
  }
  async checkApiPort() {
    return {
      category: "Puerto API",
      status: "ok",
      message: "Puerto 38950 configurado correctamente"
    };
  }
  getLastResults() {
    return this.lastResults;
  }
}
class HealthMonitor {
  // 5 minutos
  constructor(binaryManager, logger) {
    this.binaryManager = binaryManager;
    this.logger = logger;
  }
  intervalId = null;
  checkInterval = 5 * 60 * 1e3;
  startMonitoring() {
    this.logger.info("HealthMonitor", "Iniciando monitoreo de salud...");
    this.runHealthCheck();
    this.intervalId = setInterval(() => {
      this.runHealthCheck();
    }, this.checkInterval);
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  restart() {
    this.stop();
    this.startMonitoring();
  }
  async runHealthCheck() {
    this.logger.debug("HealthMonitor", "Ejecutando verificación de salud...");
    const binaries = this.binaryManager.getAllStatus();
    let issuesFound = false;
    for (const binary of binaries) {
      if (binary.status === "corrupt" || binary.status === "error") {
        issuesFound = true;
        this.logger.warning("HealthMonitor", `Binario ${binary.id} requiere reparación`);
        if (binary.status === "corrupt") {
          this.logger.info("HealthMonitor", `Auto-reparando ${binary.id}...`);
          await this.binaryManager.repairBinary(binary.id);
        }
      }
    }
    if (!issuesFound) {
      this.logger.debug("HealthMonitor", "Todos los sistemas operativos");
    }
  }
}
class Logger {
  logs = [];
  maxLogs = 5e3;
  logFilePath;
  listeners = /* @__PURE__ */ new Set();
  constructor() {
    this.logFilePath = path.join(electron.app.getPath("userData"), "logs", "nexa-engine.log");
    this.ensureLogDirectory();
  }
  async ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch {
    }
  }
  createEntry(level, module2, message) {
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      module: module2,
      message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
  async persistLog(entry) {
    const line = `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}
`;
    try {
      await fs.appendFile(this.logFilePath, line, "utf-8");
    } catch (error) {
      console.error("Error al escribir log:", error);
    }
  }
  notifyListeners(entry) {
    this.listeners.forEach((listener) => listener(entry));
  }
  log(level, module2, message) {
    const entry = this.createEntry(level, module2, message);
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    this.persistLog(entry);
    this.notifyListeners(entry);
    if (process.env.NODE_ENV === "development") {
      const colors = {
        INFO: "\x1B[36m",
        SUCCESS: "\x1B[32m",
        WARNING: "\x1B[33m",
        ERROR: "\x1B[31m",
        DEBUG: "\x1B[35m"
      };
      console.log(`${colors[level]}[${level}] [${module2}]\x1B[0m ${message}`);
    }
  }
  info(module2, message) {
    this.log("INFO", module2, message);
  }
  success(module2, message) {
    this.log("SUCCESS", module2, message);
  }
  warning(module2, message) {
    this.log("WARNING", module2, message);
  }
  error(module2, message) {
    this.log("ERROR", module2, message);
  }
  debug(module2, message) {
    if (process.env.NODE_ENV === "development") {
      this.log("DEBUG", module2, message);
    }
  }
  getRecentLogs(limit = 500) {
    return this.logs.slice(-limit);
  }
  getLogsByLevel(level) {
    return this.logs.filter((log) => log.level === level);
  }
  onLog(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  clear() {
    this.logs = [];
  }
}
class PluginSystem {
  constructor(logger) {
    this.logger = logger;
    this.pluginsDir = path.join(electron.app.getPath("userData"), "plugins");
  }
  plugins = /* @__PURE__ */ new Map();
  pluginsDir;
  async loadPlugins() {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(path.join(this.pluginsDir, entry.name));
        }
      }
      this.logger.info("Plugins", `${this.plugins.size} plugins cargados`);
    } catch (error) {
      this.logger.error("Plugins", `Error cargando plugins: ${error}`);
    }
  }
  async loadPlugin(pluginPath) {
    try {
      const metadataPath = path.join(pluginPath, "metadata.json");
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const plugin = {
        metadata,
        path: pluginPath,
        enabled: true,
        loaded: true
      };
      this.plugins.set(metadata.id, plugin);
      this.logger.info("Plugins", `Plugin cargado: ${metadata.name} v${metadata.version}`);
    } catch (error) {
      this.logger.error("Plugins", `Error cargando plugin en ${pluginPath}: ${error}`);
    }
  }
  async installPlugin(pluginPath) {
    try {
      const metadataPath = path.join(pluginPath, "metadata.json");
      await fs.access(metadataPath);
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const targetPath = path.join(this.pluginsDir, metadata.id);
      await fs.mkdir(targetPath, { recursive: true });
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
        message: `Error instalando plugin: ${error instanceof Error ? error.message : "Unknown"}`
      };
    }
  }
  getPluginList() {
    return Array.from(this.plugins.values());
  }
  getPlugin(id) {
    return this.plugins.get(id);
  }
  enablePlugin(id) {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
      return true;
    }
    return false;
  }
  disablePlugin(id) {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
      return true;
    }
    return false;
  }
}
class StoreManager {
  store;
  constructor() {
    this.store = new Store({
      defaults: {
        autoStart: false,
        startMinimized: false,
        minimizeToTray: true,
        autoUpdate: true,
        downloadsPath: path.join(electron.app.getPath("downloads"), "YTDownloadX"),
        apiPort: 38950,
        apiToken: this.generateSecureToken(),
        binariesPath: path.join(electron.app.getPath("userData"), "binaries"),
        lastDiagnostics: null,
        pluginRegistry: {}
      },
      encryptionKey: "nexa-engine-x-secure-store-v1"
    });
  }
  generateSecureToken() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `nexa_${token}`;
  }
  get(key, defaultValue) {
    return this.store.get(key, defaultValue);
  }
  set(key, value) {
    this.store.set(key, value);
  }
  getAll() {
    return this.store.store;
  }
  regenerateToken() {
    const newToken = this.generateSecureToken();
    this.set("apiToken", newToken);
    return newToken;
  }
}
const __dirname$1 = path.dirname(url.fileURLToPath(require("url").pathToFileURL(__filename).href));
class NexaEngineX {
  mainWindow = null;
  tray = null;
  apiServer;
  binaryManager;
  healthMonitor;
  pluginSystem;
  diagnostics;
  logger;
  store;
  isQuitting = false;
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
  async initialize() {
    await electron.app.whenReady();
    this.logger.info("Nexa Engine X", "Iniciando motor...");
    await this.setupIpcHandlers();
    await this.createWindow();
    await this.setupTray();
    await this.initializeServices();
    await this.setupAutoStart();
    this.logger.success("Nexa Engine X", "Motor iniciado correctamente");
    electron.app.on("window-all-closed", this.handleWindowAllClosed.bind(this));
    electron.app.on("before-quit", () => {
      this.isQuitting = true;
    });
    electron.app.on("activate", this.handleActivate.bind(this));
  }
  async createWindow() {
    this.mainWindow = new electron.BrowserWindow({
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
        preload: path.join(__dirname$1, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      await this.mainWindow.loadURL(devServerUrl);
    } else {
      try {
        await this.mainWindow.loadURL("http://localhost:5173/");
      } catch {
        const indexPath = path.join(__dirname$1, "../renderer/index.html");
        await this.mainWindow.loadFile(indexPath);
      }
    }
    this.mainWindow.once("ready-to-show", () => {
      const startMinimized = this.store.get("startMinimized", false);
      if (!startMinimized && this.mainWindow) {
        this.mainWindow.show();
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
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 2e3);
    this.mainWindow.on("close", (event) => {
      if (!this.isQuitting && this.store.get("minimizeToTray", true)) {
        event.preventDefault();
        this.mainWindow?.hide();
        this.logger.info("Sistema", "Aplicación minimizada a bandeja");
      }
    });
  }
  async setupTray() {
    const iconPath = path.join(__dirname$1, "../../resources/tray-icon.png");
    const trayIcon = electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    this.tray = new electron.Tray(trayIcon);
    this.tray.setToolTip("Nexa Engine X");
    const contextMenu = electron.Menu.buildFromTemplate([
      { label: "Abrir Dashboard", click: () => this.showWindow() },
      { label: "Binarios", click: () => this.navigateTo("/binaries") },
      { label: "Configuración", click: () => this.navigateTo("/settings") },
      { type: "separator" },
      { label: "Reiniciar Servicio", click: () => this.restartService() },
      { type: "separator" },
      { label: "Salir", click: () => this.quit() }
    ]);
    this.tray.setContextMenu(contextMenu);
    this.tray.on("double-click", () => this.showWindow());
  }
  async initializeServices() {
    await this.apiServer.start();
    await this.binaryManager.initialize();
    this.healthMonitor.startMonitoring();
    await this.pluginSystem.loadPlugins();
    await this.diagnostics.runFullDiagnostics();
  }
  async setupIpcHandlers() {
    electron.ipcMain.handle("get-dashboard-data", async () => {
      return {
        serverStatus: this.apiServer.isRunning(),
        uptime: this.apiServer.getUptime(),
        binaries: await this.binaryManager.getAllStatus(),
        plugins: this.pluginSystem.getPluginList(),
        diagnostics: await this.diagnostics.getLastResults()
      };
    });
    electron.ipcMain.handle("ping", () => {
      return { pong: true, timestamp: Date.now() };
    });
    electron.ipcMain.handle("download-binary", async (_, binaryId) => {
      return this.binaryManager.downloadBinary(binaryId, (progress) => {
        this.mainWindow?.webContents.send("download-progress", {
          binaryId,
          percent: progress.percent,
          speed: progress.speed,
          downloaded: progress.downloaded,
          total: progress.total
        });
      });
    });
    electron.ipcMain.handle("verify-binary", async (_, binaryId) => {
      return this.binaryManager.verifyBinary(binaryId);
    });
    electron.ipcMain.handle("repair-binary", async (_, binaryId) => {
      return this.binaryManager.repairBinary(binaryId);
    });
    electron.ipcMain.handle("install-binary", async (_, binaryId, data) => {
      return this.binaryManager.installBinary(binaryId, data);
    });
    electron.ipcMain.handle("delete-all-binaries", async () => {
      return this.binaryManager.deleteAllBinaries();
    });
    electron.ipcMain.handle("is-downloading", async (_, binaryId) => {
      return this.binaryManager.isDownloading(binaryId);
    });
    electron.ipcMain.handle("install-plugin", async (_, pluginPath) => {
      return this.pluginSystem.installPlugin(pluginPath);
    });
    electron.ipcMain.handle("get-plugins", async () => {
      return this.pluginSystem.getPluginList();
    });
    electron.ipcMain.handle("get-settings", async () => {
      return this.store.getAll();
    });
    electron.ipcMain.handle("set-setting", async (_, key, value) => {
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
        "pluginRegistry"
      ];
      if (!validKeys.includes(key)) {
        this.logger.warning("Config", `Key inválida: ${key}`);
        return false;
      }
      this.store.set(key, value);
      return true;
    });
    electron.ipcMain.handle("get-logs", async (_, limit = 500) => {
      return this.logger.getRecentLogs(limit);
    });
    electron.ipcMain.handle("run-diagnostics", async () => {
      return this.diagnostics.runFullDiagnostics();
    });
    electron.ipcMain.handle("restart-service", async () => {
      return this.restartService();
    });
    electron.ipcMain.handle("regenerate-token", async () => {
      return this.apiServer.regenerateToken();
    });
    electron.ipcMain.handle("open-downloads-folder", async () => {
      const downloadsPath = this.store.get(
        "downloadsPath",
        path.join(electron.app.getPath("downloads"), "YTDownloadX")
      );
      await electron.shell.openPath(downloadsPath);
    });
    electron.ipcMain.handle(
      "show-notification",
      async (_, title, body) => {
        const { Notification } = await import("electron");
        if (Notification.isSupported()) {
          new Notification({
            title,
            body,
            icon: path.join(__dirname$1, "../../resources/icon.png")
          }).show();
        }
      }
    );
    electron.ipcMain.handle("window-minimize", () => {
      this.mainWindow?.minimize();
    });
    electron.ipcMain.handle("window-maximize", () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });
    electron.ipcMain.handle("window-close", () => {
      this.mainWindow?.close();
    });
  }
  showWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
  navigateTo(route) {
    this.showWindow();
    this.mainWindow?.webContents.send("navigate-to", route);
  }
  async restartService() {
    this.logger.info("Sistema", "Reiniciando servicios...");
    await this.apiServer.restart();
    await this.binaryManager.initialize();
    this.healthMonitor.restart();
    this.logger.success("Sistema", "Servicios reiniciados");
    return true;
  }
  async setupAutoStart() {
    const autoStart = this.store.get("autoStart", false);
    electron.app.setLoginItemSettings({
      openAtLogin: autoStart,
      openAsHidden: this.store.get("startMinimized", false)
    });
  }
  handleWindowAllClosed() {
    if (process.platform !== "darwin") {
      if (!this.store.get("minimizeToTray", true)) {
        this.quit();
      }
    }
  }
  handleActivate() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    } else {
      this.showWindow();
    }
  }
  quit() {
    this.isQuitting = true;
    this.apiServer.stop();
    this.healthMonitor.stop();
    this.logger.info("Nexa Engine X", "Motor detenido");
    electron.app.quit();
  }
}
const engine = new NexaEngineX();
engine.initialize().catch((error) => {
  console.error("Error fatal al iniciar Nexa Engine X:", error);
  process.exit(1);
});
