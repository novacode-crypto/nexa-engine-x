import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Clock,
  HardDrive,
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import type { DashboardData, DiagnosticResult } from '../types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const result = await window.electronAPI.getDashboardData();
      return result as DashboardData;
    },
    refetchInterval: 5000
  });

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-4 h-4 text-[#22d3ee]" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />;
      case 'error': return <XCircle className="w-4 h-4 text-[#f87171]" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30';
      case 'warning': return 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30';
      case 'error': return 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  const readyBinaries = data?.binaries.filter(b => b.status === 'ready').length || 0;
  const totalBinaries = data?.binaries.length || 0;
  const activePlugins = data?.plugins.filter(p => p.enabled).length || 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <div>
        <h2 className="nexa-heading text-xl text-white">
          Dashboard
        </h2>
        <p className="nexa-mono text-[11px] text-[#64748b] mt-1">
          VISTA GENERAL DEL SISTEMA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div variants={itemVariants} className="card-glow glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="nexa-mono text-[9px] text-[#64748b] uppercase tracking-widest">
                Estado
              </p>
              <p className="nexa-heading text-lg text-white mt-1">
                {data?.serverStatus ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data?.serverStatus ? 'bg-[#22d3ee]/10' : 'bg-[#f87171]/10'}`}>
              <Activity className={`w-5 h-5 ${data?.serverStatus ? 'text-[#22d3ee]' : 'text-[#f87171]'}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${data?.serverStatus ? 'bg-[#22d3ee] animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'bg-[#f87171]'}`} />
            <span className="nexa-mono text-[9px] text-[#64748b]">
              API 127.0.0.1:38950
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-glow glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="nexa-mono text-[9px] text-[#64748b] uppercase tracking-widest">
                Uptime
              </p>
              <p className="nexa-heading text-lg text-white mt-1">
                {formatUptime(data?.uptime || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#a855f7]" />
            </div>
          </div>
          <p className="nexa-mono text-[9px] text-[#64748b] mt-3">
            TIEMPO DESDE INICIO
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="card-glow glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="nexa-mono text-[9px] text-[#64748b] uppercase tracking-widest">
                Binarios
              </p>
              <p className="nexa-heading text-lg text-white mt-1">
                {readyBinaries}/{totalBinaries}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-[#fbbf24]" />
            </div>
          </div>
          <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#06b6d4] rounded-full transition-all duration-500"
              style={{ width: `${totalBinaries > 0 ? (readyBinaries / totalBinaries) * 100 : 0}%` }}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-glow glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="nexa-mono text-[9px] text-[#64748b] uppercase tracking-widest">
                Plugins
              </p>
              <p className="nexa-heading text-lg text-white mt-1">
                {activePlugins}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
              <Puzzle className="w-5 h-5 text-[#f97316]" />
            </div>
          </div>
          <p className="nexa-mono text-[9px] text-[#64748b] mt-3">
            {data?.plugins.length || 0} INSTALADOS
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="glass-panel p-4">
          <h3 className="nexa-heading text-sm text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#a855f7]" />
            Estado del Sistema
          </h3>
          <div className="space-y-1.5">
            {data?.diagnostics.map((diag, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-transparent hover:border-[#a855f7]/20"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(diag.status)}
                  <div>
                    <p className="nexa-body text-xs text-white font-medium">
                      {diag.category}
                    </p>
                    <p className="text-[10px] text-[#64748b]">{diag.message}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getStatusBadge(diag.status)} nexa-mono`}>
                  {diag.status === 'ok' ? 'OK' : diag.status === 'warning' ? 'ADV' : 'ERR'}
                </span>
              </div>
            ))}
            {(!data?.diagnostics || data.diagnostics.length === 0) && (
              <div className="text-center py-8 text-[#64748b]/50">
                <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin datos de diagnóstico</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-4">
          <h3 className="nexa-heading text-sm text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#a855f7]" />
            Binarios
          </h3>
          <div className="space-y-1.5">
            {data?.binaries.map((binary) => (
              <div 
                key={binary.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-transparent hover:border-[#a855f7]/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    binary.status === 'ready' ? 'bg-[#22d3ee] shadow-[0_0_6px_rgba(34,211,238,0.5)]' :
                    binary.status === 'downloading' ? 'bg-[#a855f7] animate-pulse' :
                    binary.status === 'verifying' ? 'bg-[#fbbf24] animate-pulse' :
                    'bg-[#64748b]'
                  }`} />
                  <div>
                    <p className="nexa-body text-xs text-white font-medium">
                      {binary.name}
                    </p>
                    <p className="text-[10px] text-[#64748b]">{binary.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                    binary.status === 'ready' ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30' :
                    binary.status === 'downloading' ? 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/30' :
                    binary.status === 'verifying' ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30' :
                    'bg-[#64748b]/10 text-[#64748b] border-[#64748b]/30'
                  } nexa-mono`}>
                    {binary.status === 'ready' ? 'Listo' :
                     binary.status === 'downloading' ? 'Descargando' :
                     binary.status === 'verifying' ? 'Verificando' :
                     binary.status === 'missing' ? 'Faltante' :
                     binary.status === 'corrupt' ? 'Corrupto' : 'Error'}
                  </span>
                  {binary.version && (
                    <p className="text-[9px] text-[#64748b]/50 mt-1 nexa-mono">{binary.version}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}