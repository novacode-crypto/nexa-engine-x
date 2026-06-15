import crypto from 'crypto';

export function sanitizeCommandArgs(args: string[]): string[] {
  return args.map(arg => {
    // Eliminar caracteres peligrosos
    return arg.replace(/[;&|`$(){}[\]\\]/g, '');
  });
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}