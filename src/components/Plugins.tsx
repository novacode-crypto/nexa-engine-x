import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Puzzle,
  Plus,
  Power,
  PowerOff,
  Code2,
  User,
  Tag
} from 'lucide-react';
import type { PluginInfo } from '../types';

export default function Plugins() {
  const [showInstallModal, setShowInstallModal] = useState(false);

  const { data: plugins, isLoading } = useQuery<PluginInfo[]>({
    queryKey: ['plugins'],
    queryFn: async () => {
      const result = await window.electronAPI.getPlugins();
      return result as PluginInfo[];
    },
    refetchInterval: 5000
  });

  if (isLoading) {
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
            Plugins
          </h2>
          <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            EXTENSIONES DEL SISTEMA
          </p>
        </div>
        <button
          onClick={() => setShowInstallModal(true)}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
        >
          <Plus className="w-4 h-4" />
          Instalar
        </button>
      </div>

      {plugins && plugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plugins.map((plugin) => (
            <motion.div
              key={plugin.metadata.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 card-glow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/20">
                    <Puzzle className="w-4 h-4 text-[#a855f7]" />
                  </div>
                  <div>
                    <h3 className="text-sm text-white font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>{plugin.metadata.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Tag className="w-3 h-3 text-[#64748b]" />
                      <span className="text-[9px] text-[#64748b] font-mono">v{plugin.metadata.version}</span>
                    </div>
                  </div>
                </div>
                <button
                  className={`p-2 rounded-lg transition-all ${
                    plugin.enabled 
                      ? 'bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30 hover:bg-[#22d3ee]/20' 
                      : 'bg-white/5 text-[#64748b] border border-[#2d2d6b]/40 hover:bg-white/10'
                  }`}
                >
                  {plugin.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-xs text-[#64748b] mb-3 leading-relaxed">{plugin.metadata.description}</p>

              <div className="flex items-center gap-4 text-[10px] text-[#64748b]/60">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  {plugin.metadata.author}
                </div>
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3 h-3" />
                  {plugin.metadata.hooks.length} hooks
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center border border-[#2d2d6b]/40">
          <Puzzle className="w-10 h-10 text-[#64748b]/20 mx-auto mb-3" />
          <h3 className="text-sm text-white/60 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Sin plugins</h3>
          <p className="text-xs text-[#64748b] mb-4">Instala tu primer plugin</p>
          <button
            onClick={() => setShowInstallModal(true)}
            className="btn btn-primary inline-flex"
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            <Plus className="w-4 h-4" />
            Instalar Plugin
          </button>
        </div>
      )}

      {/* Modal */}
      {showInstallModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-[#07071a]/85 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowInstallModal(false)}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="overlay-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm text-white mb-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
              Instalar Plugin
            </h3>
            <p className="text-[10px] text-[#64748b] mb-4">
              Selecciona la carpeta con metadata.json
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowInstallModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '8px 12px' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '8px 12px' }}
              >
                Seleccionar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}