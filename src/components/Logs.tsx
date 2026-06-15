import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Terminal,
  Download,
  Search
} from 'lucide-react';
import type { LogEntry } from '../types';

const levelConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  INFO: { bg: 'bg-[#a855f7]/5', text: 'text-[#a855f7]', border: 'border-[#a855f7]/20', icon: 'ℹ' },
  SUCCESS: { bg: 'bg-[#22d3ee]/5', text: 'text-[#22d3ee]', border: 'border-[#22d3ee]/20', icon: '✓' },
  WARNING: { bg: 'bg-[#fbbf24]/5', text: 'text-[#fbbf24]', border: 'border-[#fbbf24]/20', icon: '⚠' },
  ERROR: { bg: 'bg-[#f87171]/5', text: 'text-[#f87171]', border: 'border-[#f87171]/20', icon: '✕' },
  DEBUG: { bg: 'bg-[#64748b]/5', text: 'text-[#64748b]', border: 'border-[#64748b]/20', icon: '◆' }
};

export default function Logs() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ['logs'],
    queryFn: async () => {
      const result = await window.electronAPI.getLogs(500);
      return result as LogEntry[];
    },
    refetchInterval: 1000
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs?.filter(log => {
    const matchesFilter = filter === 'ALL' || log.level === filter;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filters = ['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'DEBUG'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            Logs
          </h2>
          <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            MONITOREO EN TIEMPO REAL
          </p>
        </div>
        <button className="icon-btn">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-[#2d2d6b] rounded-lg text-xs text-white placeholder-[#334155] focus:outline-none focus:border-[#a855f7]/60 focus:shadow-[0_0_0_2px_rgba(168,85,247,0.12)] transition-all"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          />
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-[#2d2d6b]/40">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                filter === f 
                  ? 'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30' 
                  : 'text-[#64748b] hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal */}
      <div className="glass-panel flex-1 overflow-hidden flex flex-col border border-[#2d2d6b]/40">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2d2d6b]/40 bg-white/[0.02]">
          <Terminal className="w-3.5 h-3.5 text-[#64748b]" />
          <span className="text-[10px] text-[#64748b]/50 font-mono">nexa-engine.log</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <span className="text-[9px] text-[#22d3ee]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5"
        >
          {filteredLogs?.length === 0 ? (
            <div className="text-center py-12 text-[#64748b]/30">
              <Terminal className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No hay logs</p>
            </div>
          ) : (
            filteredLogs?.map((log) => {
              const config = levelConfig[log.level] || levelConfig.INFO;
              const time = new Date(log.timestamp).toLocaleTimeString('es-ES', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-2 px-2 py-1 rounded ${config.bg} border ${config.border}`}
                >
                  <span className="text-[#64748b]/40 flex-shrink-0 w-[50px] text-[9px] pt-0.5">{time}</span>
                  <span className={`flex-shrink-0 w-14 font-bold text-[9px] pt-0.5 ${config.text}`}>
                    {log.level}
                  </span>
                  <span className="text-[#64748b]/50 flex-shrink-0 w-20 text-[9px] pt-0.5">[{log.module}]</span>
                  <span className="text-white/70 break-all text-[10px] leading-relaxed">{log.message}</span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}