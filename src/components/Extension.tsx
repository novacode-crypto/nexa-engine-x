import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Chrome,
  Copy,
  RefreshCw,
  Download,
  CheckCircle2,
  Link,
  Shield
} from 'lucide-react';

export default function Extension() {
  const [copied, setCopied] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.getSettings()
  });

  const regenerateToken = useMutation({
    mutationFn: () => window.electronAPI.regenerateToken()
  });

  const token = settings?.apiToken as string || '***';
  const apiUrl = `http://127.0.0.1:${settings?.apiPort || 38950}`;

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          Extensión Chrome
        </h2>
        <p className="text-[11px] text-[#64748b] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          CONECTA TU EXTENSIÓN
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conexión API */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/20">
              <Chrome className="w-5 h-5 text-[#a855f7]" />
            </div>
            <div>
              <h3 className="text-sm text-white font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Conexión API</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                <span className="text-[9px] text-[#22d3ee]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Servidor activo</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-[#2d2d6b]/40">
              <label className="text-[9px] text-[#64748b] uppercase tracking-widest mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Endpoint API
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] text-[#a855f7] bg-black/30 px-3 py-2 rounded-lg border border-[#2d2d6b]/40" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {apiUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(apiUrl)}
                  className="icon-btn"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.03] border border-[#2d2d6b]/40">
              <label className="text-[9px] text-[#64748b] uppercase tracking-widest mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Token de Seguridad
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] text-[#fbbf24] bg-black/30 px-3 py-2 rounded-lg border border-[#2d2d6b]/40 truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {token}
                </code>
                <button
                  onClick={copyToken}
                  className="icon-btn relative"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22d3ee]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => regenerateToken.mutate()}
                  disabled={regenerateToken.isPending}
                  className="icon-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerateToken.isPending ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Instrucciones */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-5"
        >
          <h3 className="text-sm text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
            <Link className="w-4 h-4 text-[#a855f7]" />
            Configuración
          </h3>

          <div className="space-y-4">
          {[1, 2, 3].map((step) => (
              <div key={step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#a855f7]/15 flex items-center justify-center flex-shrink-0 border border-[#a855f7]/30">
                  <span className="text-[10px] font-bold text-[#a855f7]">{step}</span>
                </div>
                <div>
                  <p className="text-xs text-white font-medium">
                    {step === 1 ? 'Handshake inicial' : step === 2 ? 'Autenticación' : 'Sesión persistente'}
                  </p>
                  <p className="text-[10px] text-[#64748b] mt-0.5 leading-relaxed">
                    {step === 1 ? 'POST a /handshake con identificación de la extensión' :
                     step === 2 ? 'Incluye token en Authorization: Bearer <token>' :
                     'El engine responde con token de sesión activa'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-[#a855f7]/5 rounded-xl border border-[#a855f7]/15">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#a855f7] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#64748b] leading-relaxed">
                Solo conexiones desde 127.0.0.1. Solicitudes externas rechazadas automáticamente.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Descargar CRX */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/20">
              <Download className="w-5 h-5 text-[#a855f7]" />
            </div>
            <div>
              <h3 className="text-sm text-white font-semibold">Extensión Chrome</h3>
              <p className="text-[10px] text-[#64748b]">Descarga oficial para conectar con el engine</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
            <Download className="w-4 h-4" />
            Descargar .CRX
          </button>
        </div>
      </motion.div>
    </div>
  );
}