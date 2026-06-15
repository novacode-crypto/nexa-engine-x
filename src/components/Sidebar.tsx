import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Puzzle,
  Chrome,
  Activity,
  Terminal,
  Settings
} from 'lucide-react';
import { useAppStore } from '../store/app-store';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'binaries', label: 'Binarios', icon: Package },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'extension', label: 'Extensión', icon: Chrome },
  { id: 'diagnostics', label: 'Diagnóstico', icon: Activity },
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'settings', label: 'Configuración', icon: Settings }
];

export default function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="w-56 bg-[#0f0f2e]/80 border-r border-[#2d2d6b]/40 flex flex-col backdrop-blur-sm">
      {/* Header del sidebar */}
      <div className="px-4 py-3 border-b border-[#2d2d6b]/40">
        <p 
          className="text-[9px] uppercase tracking-[0.15em] text-[#64748b] font-medium"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          Navegación
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 relative group ${
                isActive 
                  ? 'text-white bg-[#a855f7]/15 border border-[#a855f7]/30' 
                  : 'text-[#64748b] hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#a855f7] rounded-r-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-4 h-4 transition-colors ${isActive ? 'text-[#a855f7]' : 'text-[#64748b] group-hover:text-[#a855f7]'}`} 
                strokeWidth={1.5}
              />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: isActive ? 600 : 500 }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-3 border-t border-[#2d2d6b]/40">
        <div className="glass-panel p-2.5 rounded-lg">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#64748b]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Estado API
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              <span className="text-[#22d3ee]" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px' }}>
                Activo
              </span>
            </div>
          </div>
          <div className="mt-1.5 text-[9px] text-[#64748b]/60 font-mono tracking-wider">
            127.0.0.1:38950
          </div>
        </div>
      </div>
    </aside>
  );
}