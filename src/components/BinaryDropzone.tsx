import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, AlertTriangle } from 'lucide-react';

interface BinaryDropzoneProps {
  onFileDrop: (file: File, binaryId: string) => Promise<void>;
  expectedFiles: Record<string, string[]>;
}

export function BinaryDropzone({ onFileDrop, expectedFiles }: BinaryDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [dropSuccess, setDropSuccess] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const fileName = file.name.toLowerCase();
    for (const [binaryId, expectedNames] of Object.entries(expectedFiles)) {
      if (expectedNames.some(name => fileName === name.toLowerCase())) {
        return binaryId;
      }
    }
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDropError(null);
    setDropSuccess(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const binaryId = validateFile(file);

    if (!binaryId) {
      const expectedList = Object.values(expectedFiles).flat().join(', ');
      setDropError('Archivo no reconocido. Se esperaba: ' + expectedList);
      setTimeout(() => setDropError(null), 4000);
      return;
    }

    try {
      await onFileDrop(file, binaryId);
      setDropSuccess(file.name + ' instalado correctamente');
      setTimeout(() => setDropSuccess(null), 3000);
    } catch (err) {
      setDropError('Error al instalar: ' + (err as Error).message);
      setTimeout(() => setDropError(null), 4000);
    }
  }, [onFileDrop, expectedFiles]);

  return (
    <div className="w-full">
      <AnimatePresence>
        {dropError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-xs"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {dropError}
          </motion.div>
        )}
        {dropSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/20 text-[#22d3ee] text-xs"
          >
            <Check className="w-4 h-4 shrink-0" />
            {dropSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer
          ${isDragOver 
            ? 'border-[#a855f7] bg-[#a855f7]/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]' 
            : 'border-[#2d2d6b] bg-[#0f0f2e]/50 hover:border-[#a855f7]/50 hover:bg-[#a855f7]/5'
          }
        `}
      >
        <motion.div
          animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-[#a855f7]' : 'text-[#64748b]'}`} />
        </motion.div>
        <p className={`text-sm font-medium ${isDragOver ? 'text-[#a855f7]' : 'text-[#64748b]'}`}>
          {isDragOver ? 'Suelta el archivo aqui' : 'Arrastra un binario aqui'}
        </p>
        <p className="text-[10px] text-[#64748b]/60 mt-1">
          yt-dlp.exe, ffmpeg.exe, aria2c.exe, o modelos .gguf
        </p>
      </div>
    </div>
  );
}