import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  FolderOpen,
  Power,
  Minimize2,
  CheckCircle2,
  Globe,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.getSettings()
  });

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => 
      window.electronAPI.setSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  const toggleSetting = (key: string, currentValue: boolean) => {
    updateSetting.mutate({ key, value: !currentValue });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          Configuración
        </h2>
        <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          PERSONALIZA EL COMPORTAMIENTO
        </p>
      </div>

      {/* General */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <Settings className="w-4 h-4 text-[#a855f7]" />
          General
        </h3>

        <div className="space-y-3">
          <ToggleItem
            icon={<Power className="w-4 h-4" />}
            title="Iniciar con Windows"
            description="Ejecutar automáticamente al iniciar sesión"
            active={settings?.autoStart as boolean}
            onToggle={() => toggleSetting('autoStart', settings?.autoStart as boolean)}
          />
          <ToggleItem
            icon={<Minimize2 className="w-4 h-4" />}
            title="Iniciar minimizado"
            description="Abrir directamente en la bandeja"
            active={settings?.startMinimized as boolean}
            onToggle={() => toggleSetting('startMinimized', settings?.startMinimized as boolean)}
          />
          <ToggleItem
            icon={<Minimize2 className="w-4 h-4" />}
            title="Minimizar a bandeja"
            description="Al cerrar, minimizar en lugar de salir"
            active={settings?.minimizeToTray !== false}
            onToggle={() => toggleSetting('minimizeToTray', settings?.minimizeToTray as boolean)}
          />
        </div>
      </motion.div>

      {/* Descargas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <FolderOpen className="w-4 h-4 text-[#a855f7]" />
          Descargas
        </h3>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-[#2d2d6b]/40">
          <label className="text-[9px] text-[#64748b] uppercase tracking-widest mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Ruta de descargas
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings?.downloadsPath as string || ''}
              readOnly
              className="flex-1 input text-[10px]"
            />
            <button
              onClick={() => window.electronAPI.openDownloadsFolder()}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '11px' }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Abrir
            </button>
          </div>
        </div>
      </motion.div>

      {/* API */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <Globe className="w-4 h-4 text-[#a855f7]" />
          API Local
        </h3>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-[#2d2d6b]/40">
            <label className="text-[9px] text-[#64748b] uppercase tracking-widest mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Puerto
            </label>
            <input
              type="number"
              value={settings?.apiPort as number || 38950}
              readOnly
              className="w-32 input text-[10px] font-mono"
            />
          </div>

          <div className="p-4 bg-[#a855f7]/5 rounded-xl border border-[#a855f7]/15">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#a855f7] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[#a855f7] font-medium">Seguridad</p>
                <p className="text-[10px] text-[#64748b] mt-1 leading-relaxed">
                  Solo conexiones desde localhost. El token se regenera desde Extensión.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toast guardado */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 right-6 glass-panel px-4 py-3 flex items-center gap-2 border-[#22d3ee]/30 bg-[#22d3ee]/5"
        >
          <CheckCircle2 className="w-4 h-4 text-[#22d3ee]" />
          <span className="text-xs text-white">Configuración guardada</span>
        </motion.div>
      )}
    </div>
  );
}

// Subcomponente Toggle
function ToggleItem({ icon, title, description, active, onToggle }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-[#2d2d6b]/30 hover:border-[#a855f7]/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-[#64748b]">{icon}</div>
        <div>
          <p className="text-xs text-white font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</p>
          <p className="text-[10px] text-[#64748b]">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          active ? 'bg-[#a855f7]' : 'bg-[#2d2d6b]/60'
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
          active ? 'translate-x-6 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}