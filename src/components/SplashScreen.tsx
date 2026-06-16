import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  const progressStyle = { width: progress + '%' };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#07071a]/60 via-[#0f0f2e]/40 to-[#07071a]/60 backdrop-blur-lg"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.3)]"
      >
        <Hexagon className="w-8 h-8 text-white" strokeWidth={2.5} />
      </motion.div>
      
      <h1 className="mt-6 font-['Syne'] text-xl font-bold text-white">
        <span className="text-[#a855f7]">Nexa</span>
        <span className="text-white"> Engine</span>
        <span className="text-[#a855f7]">X</span>
      </h1>

      <div className="mt-6 w-48 h-1 bg-[#2d2d6b] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#a855f7] to-[#06b6d4] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: progress + '%' }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <p className="mt-3 text-xs text-[#64748b] font-mono">
        {progress < 30 && 'Iniciando motor...'}
        {progress >= 30 && progress < 60 && 'Cargando binarios...'}
        {progress >= 60 && progress < 90 && 'Conectando servicios...'}
        {progress >= 90 && 'Listo'}
      </p>
    </motion.div>
  );
}
