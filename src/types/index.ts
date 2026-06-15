export interface BinaryStatus {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'missing' | 'downloading' | 'verifying' | 'ready' | 'corrupt' | 'error';
  path: string;
  size: number;
  lastChecked: string;
  error?: string;
}

export interface PluginInfo {
  metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    hooks: string[];
  };
  enabled: boolean;
  loaded: boolean;
}

export interface DiagnosticResult {
  category: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  module: string;
  message: string;
}

export interface DashboardData {
  serverStatus: boolean;
  uptime: number;
  binaries: BinaryStatus[];
  plugins: PluginInfo[];
  diagnostics: DiagnosticResult[];
}