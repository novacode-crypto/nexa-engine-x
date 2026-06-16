import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface BinaryDangerZoneProps {
  onDeleteAll: () => Promise<void>;
  disabled?: boolean;
}

export function BinaryDangerZone({ onDeleteAll, disabled = false }: BinaryDangerZoneProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteAll();
      setShowConfirm(false);
    } catch (err) {
      console.error('Error eliminando binarios:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6">
      <div className={`border border-[#f87171]/30 rounded-xl p-4 bg-[#f87171]/5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#f87171]" />
          <h3 className="text-sm font-semibold text-[#f87171]" style={{ fontFamily: 'Syne, sans-serif' }}>
            Zona de Peligro
          </h3>
        </div>
        <p className="text-xs text-[#64748b] mb-3">
          Elimina todos los binarios instalados y restaura el estado inicial de la aplicación.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f87171]/10 text-[#f87171] text-xs font-medium hover:bg-[#f87171]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar todos los binarios
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <p className="text-xs text-[#f87171] font-medium">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f87171] text-white text-xs font-medium hover:bg-[#ef4444] transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2d2d6b] text-[#64748b] text-xs font-medium hover:text-white transition-colors disabled:opacity-30"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}