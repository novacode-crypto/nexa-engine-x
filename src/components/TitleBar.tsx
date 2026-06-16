import { motion } from 'framer-motion';
import { 
  Minus, 
  Square, 
  X, 
  Hexagon
} from 'lucide-react';

export default function TitleBar() {
  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div 
      className="h-9 bg-[#0f0f2e]/60 backdrop-blur-xl border-b border-[#2d2d6b]/60 flex items-center justify-between select-none app-drag"
    >
      {/* Logo + Título (izquierda) */}
      <div className="flex items-center gap-2.5 px-3 app-no-drag">
        <div className="w-5 h-5 rounded-[6px] bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.4)]">
          <Hexagon className="w-3 h-3 text-white" strokeWidth={2.5} />
        </div>
        <span
          className="text-[13px] tracking-tight"
          style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
        >
          <span className="text-[#a855f7]">Nexa</span>
          <span className="text-white"> Engine</span>
          <span className="text-[#a855f7]">X</span>
        </span>
      </div>

      {/* Centro vacío */}
      <div className="flex-1" />

      {/* Controles de ventana (derecha) */}
      <div className="flex items-center h-full app-no-drag">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={handleMinimize}
          className="h-full w-10 flex items-center justify-center text-[#64748b] hover:text-white/80 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={handleMaximize}
          className="h-full w-10 flex items-center justify-center text-[#64748b] hover:text-white/80 transition-colors"
        >
          <Square className="w-3 h-3" strokeWidth={1.5} />
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(248,113,113,0.2)', color: '#f87171' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
          className="h-full w-10 flex items-center justify-center text-[#64748b] transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </motion.button>
      </div>
    </div>
  );
}