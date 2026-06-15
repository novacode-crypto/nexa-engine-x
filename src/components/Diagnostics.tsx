import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  HardDrive,
  Wifi,
  Shield
} from 'lucide-react';
import type { DiagnosticResult } from '../types';

const categoryIcons: Record<string, React.ElementType> = {
  'Entorno': Cpu,
  'Electron': Cpu,
  'Filesystem': HardDrive,
  'Memoria': Cpu,
  'Disco': HardDrive,
  'Red': Wifi,
  'Puerto API': Shield
};

export default function Diagnostics() {
  const { data: diagnostics, isLoading, refetch } = useQuery<DiagnosticResult[]>({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      const result = await window.electronAPI.runDiagnostics();
      return result as DiagnosticResult[];
    },
  });

  const runDiagnostics = useMutation({
    mutationFn: () => window.electronAPI.runDiagnostics(),
    onSuccess: () => refetch()
  });

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-4 h-4 text-[#22d3ee]" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />;
      case 'error': return <XCircle className="w-4 h-4 text-[#f87171]" />;
    }
  };

  const getStatusBorder = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return 'border-[#22d3ee]/20 bg-[#22d3ee]/5';
      case 'warning': return 'border-[#fbbf24]/20 bg-[#fbbf24]/5';
      case 'error': return 'border-[#f87171]/20 bg-[#f87171]/5';
    }
  };

  const overallStatus = diagnostics?.every(d => d.status === 'ok') 
    ? 'ok' 
    : diagnostics?.some(d => d.status === 'error') 
      ? 'error' 
      : 'warning';

  if (isLoading && !diagnostics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            Diagnóstico
          </h2>
          <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            VERIFICACIÓN COMPLETA DEL SISTEMA
          </p>
        </div>
        <button
          onClick={() => runDiagnostics.mutate()}
          disabled={runDiagnostics.isPending}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
        >
          <RefreshCw className={`w-4 h-4 ${runDiagnostics.isPending ? 'animate-spin' : ''}`} />
          {runDiagnostics.isPending ? 'Ejecutando...' : 'Ejecutar'}
        </button>
      </div>

      {/* Estado General */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-panel p-5 border-2 ${
          overallStatus === 'ok' ? 'border-[#22d3ee]/20' :
          overallStatus === 'warning' ? 'border-[#fbbf24]/20' :
          'border-[#f87171]/20'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            overallStatus === 'ok' ? 'bg-[#22d3ee]/10' :
            overallStatus === 'warning' ? 'bg-[#fbbf24]/10' :
            'bg-[#f87171]/10'
          }`}>
            <Activity className={`w-6 h-6 ${
              overallStatus === 'ok' ? 'text-[#22d3ee]' :
              overallStatus === 'warning' ? 'text-[#fbbf24]' :
              'text-[#f87171]'
            }`} />
          </div>
          <div>
            <h3 className="text-base text-white" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
              {overallStatus === 'ok' ? 'Sistema OK' :
               overallStatus === 'warning' ? 'Advertencias' :
               'Errores Críticos'}
            </h3>
            <p className="text-[10px] text-[#64748b]">
              {diagnostics?.filter(d => d.status === 'ok').length} / {diagnostics?.length} verificaciones OK
            </p>
          </div>
        </div>
      </motion.div>

      {/* Resultados Detallados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {diagnostics?.map((result, index) => {
          const Icon = categoryIcons[result.category] || Activity;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-panel p-4 border ${getStatusBorder(result.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#64748b]" />
                  </div>
                  <div>
                    <h4 className="text-sm text-white font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {result.category}
                    </h4>
                    <p className="text-[10px] text-[#64748b]">{result.message}</p>
                  </div>
                </div>
                {getStatusIcon(result.status)}
              </div>

              {result.details && Object.keys(result.details).length > 0 && (
                <div className="mt-2 p-2.5 bg-black/20 rounded-lg font-mono text-[10px] space-y-1">
                  {Object.entries(result.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-[#64748b]/50">{key}:</span>
                      <span className="text-[#64748b]">
                        {typeof value === 'number' 
                          ? value > 1024 * 1024 * 1024 
                            ? `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
                            : value > 1024 * 1024
                              ? `${(value / 1024 / 1024).toFixed(2)} MB`
                              : value.toString()
                          : String(value)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}