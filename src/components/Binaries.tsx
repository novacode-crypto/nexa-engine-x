import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  RefreshCw,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCode,
  FolderOpen
} from 'lucide-react';
import type { BinaryStatus } from '../types';

export default function Binaries() {
  const queryClient = useQueryClient();
  const [selectedBinary, setSelectedBinary] = useState<string | null>(null);

  const { data: binaries, isLoading } = useQuery<BinaryStatus[]>({
    queryKey: ['binaries'],
    queryFn: async () => {
      const dashboard = await window.electronAPI.getDashboardData() as any;
      return dashboard.binaries as BinaryStatus[];
    },
    refetchInterval: 3000
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.downloadBinary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['binaries'] })
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.verifyBinary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['binaries'] })
  });

  const repairMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.repairBinary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['binaries'] })
  });

  const getStatusConfig = (status: BinaryStatus['status']) => {
    switch (status) {
      case 'ready':
        return { color: 'text-[#22d3ee]', bg: 'bg-[#22d3ee]/10', border: 'border-[#22d3ee]/30', icon: CheckCircle2, label: 'Listo' };
      case 'downloading':
        return { color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', border: 'border-[#a855f7]/30', icon: Loader2, label: 'Descargando' };
      case 'verifying':
        return { color: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]/10', border: 'border-[#fbbf24]/30', icon: RefreshCw, label: 'Verificando' };
      case 'missing':
        return { color: 'text-[#64748b]', bg: 'bg-[#64748b]/10', border: 'border-[#64748b]/30', icon: Download, label: 'Faltante' };
      case 'corrupt':
        return { color: 'text-[#f87171]', bg: 'bg-[#f87171]/10', border: 'border-[#f87171]/30', icon: AlertCircle, label: 'Corrupto' };
      case 'error':
        return { color: 'text-[#f87171]', bg: 'bg-[#f87171]/10', border: 'border-[#f87171]/30', icon: AlertCircle, label: 'Error' };
      default:
        return { color: 'text-[#64748b]', bg: 'bg-[#64748b]/10', border: 'border-[#64748b]/30', icon: AlertCircle, label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          Gestor de Binarios
        </h2>
        <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          ADMINISTRA LOS BINARIOS DEL SISTEMA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {binaries?.map((binary) => {
          const config = getStatusConfig(binary.status);
          const StatusIcon = config.icon;
          const isProcessing = binary.status === 'downloading' || binary.status === 'verifying';
          const isSelected = selectedBinary === binary.id;

          return (
            <motion.div
              key={binary.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-panel p-4 cursor-pointer transition-all duration-200 ${
                isSelected ? 'border-[#a855f7]/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'border-[#2d2d6b]/40 hover:border-[#a855f7]/30'
              }`}
              onClick={() => setSelectedBinary(isSelected ? null : binary.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center border ${config.border}`}>
                    <FileCode className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm text-white font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {binary.name}
                    </h3>
                    <p className="text-[10px] text-[#64748b]">{binary.description}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} border ${config.border}`}>
                  <StatusIcon className={`w-3 h-3 ${config.color} ${isProcessing ? 'animate-spin' : ''}`} />
                  <span className={`text-[9px] font-medium ${config.color}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {config.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#64748b]/60" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Versión</span>
                  <span className="text-[#64748b] font-mono">{binary.version || '—'}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#64748b]/60" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Tamaño</span>
                  <span className="text-[#64748b] font-mono">
                    {binary.size > 0 ? `${(binary.size / 1024 / 1024).toFixed(1)} MB` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#64748b]/60" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Verificado</span>
                  <span className="text-[#64748b] font-mono">
                    {binary.lastChecked ? new Date(binary.lastChecked).toLocaleTimeString() : '—'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-[#2d2d6b]/40 space-y-2">
                      {binary.status === 'missing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMutation.mutate(binary.id);
                          }}
                          disabled={downloadMutation.isPending}
                          className="btn btn-primary"
                        >
                          <Download className="w-4 h-4" />
                          {downloadMutation.isPending ? 'Descargando...' : 'Descargar'}
                        </button>
                      )}

                      {binary.status === 'ready' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              verifyMutation.mutate(binary.id);
                            }}
                            disabled={verifyMutation.isPending}
                            className="btn btn-secondary"
                          >
                            <RefreshCw className={`w-4 h-4 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                            Verificar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.electronAPI.openDownloadsFolder();
                            }}
                            className="btn btn-secondary"
                          >
                            <FolderOpen className="w-4 h-4" />
                            Abrir carpeta
                          </button>
                        </>
                      )}

                      {(binary.status === 'corrupt' || binary.status === 'error') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            repairMutation.mutate(binary.id);
                          }}
                          disabled={repairMutation.isPending}
                          className="btn"
                          style={{ 
                            background: 'rgba(251, 146, 60, 0.12)', 
                            border: '1px solid rgba(251, 146, 60, 0.4)', 
                            color: '#fb923c' 
                          }}
                        >
                          <Wrench className={`w-4 h-4 ${repairMutation.isPending ? 'animate-spin' : ''}`} />
                          {repairMutation.isPending ? 'Reparando...' : 'Reparar'}
                        </button>
                      )}

                      {binary.error && (
                        <div className="alert alert-error text-[10px]">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {binary.error}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}