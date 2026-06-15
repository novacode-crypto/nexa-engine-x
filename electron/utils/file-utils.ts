import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Verifica si un archivo existe
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Asegura que un directorio exista (lo crea si no existe)
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Error al crear directorio ${dirPath}: ${error}`);
  }
}

/**
 * Elimina un archivo de forma segura
 */
export async function safeDelete(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copia un archivo
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

/**
 * Calcula el hash SHA256 de un archivo
 */
export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Calcula el hash SHA256 de un buffer
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Obtiene el tamaño de un archivo en bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Formatea bytes a unidades legibles
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Genera un nombre de archivo único
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  
  return `${base}_${timestamp}_${random}${ext}`;
}

/**
 * Lista archivos en un directorio con filtros opcionales
 */
export async function listFiles(
  dirPath: string, 
  options?: { 
    extensions?: string[];
    recursive?: boolean;
  }
): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentPath: string, relativePath: string = '') {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory() && options?.recursive) {
        await scan(fullPath, relPath);
      } else if (entry.isFile()) {
        if (!options?.extensions || options.extensions.some(ext => 
          entry.name.toLowerCase().endsWith(ext.toLowerCase())
        )) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await scan(dirPath);
  return files;
}

/**
 * Lee un archivo JSON de forma segura
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Escribe un archivo JSON con formato
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Verifica si una ruta es un directorio
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Verifica si una ruta es un archivo
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Obtiene el espacio libre en disco (Windows)
 */
export async function getDiskFreeSpace(dirPath: string): Promise<number> {
  // En Windows, usar wmic o powershell
  // Simplificación: retornar un valor estimado
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const drive = path.parse(dirPath).root;
    const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace /value`);
    const match = stdout.match(/FreeSpace=(\d+)/);
    
    return match ? parseInt(match[1]) : 0;
  } catch {
    return 0;
  }
}

/**
 * Sanitiza un nombre de archivo para evitar caracteres peligrosos
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Espera a que un archivo esté disponible (no bloqueado)
 */
export async function waitForFile(filePath: string, timeout = 30000): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      // Intentar abrir el archivo en modo exclusivo
      const fd = await fs.open(filePath, 'r+');
      await fd.close();
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return false;
}

/**
 * Extrae un archivo ZIP
 */
export async function extractZip(zipPath: string, destPath: string): Promise<void> {
  // Requiere adm-zip o similar en producción
  // Placeholder para la implementación
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  
  await ensureDir(destPath);
  
  try {
    // Intentar con PowerShell Expand-Archive
    await execFileAsync('powershell', [
      '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destPath}" -Force`
    ]);
  } catch {
    // Fallback: intentar con tar (si está disponible)
    try {
      await execFileAsync('tar', ['-xf', zipPath, '-C', destPath]);
    } catch (error) {
      throw new Error(`No se pudo extraer el archivo ZIP: ${error}`);
    }
  }
}

/**
 * Descarga un archivo desde URL a una ruta local
 */
export async function downloadFile(
  url: string, 
  destPath: string, 
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Error descargando: ${response.status} ${response.statusText}`);
  }
  
  const total = parseInt(response.headers.get('content-length') || '0');
  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  
  if (!response.body) {
    throw new Error('No hay cuerpo en la respuesta');
  }
  
  const reader = response.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    downloaded += value.length;
    
    if (onProgress && total > 0) {
      onProgress(downloaded, total);
    }
  }
  
  // Combinar chunks y guardar
  const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, buffer);
}