import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { BinaryStatus } from "../types";
import { BinaryDangerZone } from "./BinaryDangerZone";
import { BinaryDropzone } from "./BinaryDropzone";

export default function Binaries() {
  const queryClient = useQueryClient();
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleFileDrop = async (file: File, binaryId: string) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await window.electronAPI.installBinary(binaryId, uint8Array);

      queryClient.invalidateQueries({ queryKey: ["binaries"] });
    } catch (err) {
      throw new Error("Error al copiar el binario: " + (err as Error).message);
    }
  };

  const { data: binaries, isLoading } = useQuery<BinaryStatus[]>({
    queryKey: ["binaries"],
    queryFn: async () => {
      const dashboard = (await window.electronAPI.getDashboardData()) as any;
      return dashboard.binaries as BinaryStatus[];
    },
    refetchInterval: 3000,
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.downloadBinary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["binaries"] }),
  });

  const handleVerify = async (id: string) => {
    setVerifyingIds((prev) => new Set(prev).add(id));
    try {
      await window.electronAPI.verifyBinary(id);
      queryClient.invalidateQueries({ queryKey: ["binaries"] });
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusConfig = (status: BinaryStatus["status"]) => {
    switch (status) {
      case "ready":
        return {
          color: "text-[#22d3ee]",
          bg: "bg-[#22d3ee]/10",
          border: "border-[#22d3ee]/30",
          icon: CheckCircle2,
          label: "Listo",
        };
      case "downloading":
        return {
          color: "text-[#a855f7]",
          bg: "bg-[#a855f7]/10",
          border: "border-[#a855f7]/30",
          icon: Loader2,
          label: "Descargando",
        };
      case "verifying":
        return {
          color: "text-[#fbbf24]",
          bg: "bg-[#fbbf24]/10",
          border: "border-[#fbbf24]/30",
          icon: RefreshCw,
          label: "Verificando",
        };
      case "missing":
        return {
          color: "text-[#64748b]",
          bg: "bg-[#64748b]/10",
          border: "border-[#64748b]/30",
          icon: Download,
          label: "Faltante",
        };
      case "corrupt":
        return {
          color: "text-[#f87171]",
          bg: "bg-[#f87171]/10",
          border: "border-[#f87171]/30",
          icon: AlertCircle,
          label: "Corrupto",
        };
      case "error":
        return {
          color: "text-[#f87171]",
          bg: "bg-[#f87171]/10",
          border: "border-[#f87171]/30",
          icon: AlertCircle,
          label: "Error",
        };
      default:
        return {
          color: "text-[#64748b]",
          bg: "bg-[#64748b]/10",
          border: "border-[#64748b]/30",
          icon: AlertCircle,
          label: status,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-5 flex-1 overflow-y-auto">
        <div>
          <h2
            className="text-xl text-white tracking-tight"
            style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}
          >
            Gestor de Binarios
          </h2>
          <p
            className="text-[11px] text-[#64748b] mt-1"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            ADMINISTRA LOS BINARIOS DEL SISTEMA
          </p>
        </div>

        {/* Dropzone global */}
        <div className="mb-4">
          <BinaryDropzone
            onFileDrop={handleFileDrop}
            expectedFiles={{
              "yt-dlp": ["yt-dlp.exe", "yt-dlp"],
              ffmpeg: ["ffmpeg.exe", "ffmpeg"],
              aria2c: ["aria2c.exe", "aria2c"],
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {binaries?.map((binary) => {
            const config = getStatusConfig(binary.status);
            const StatusIcon = config.icon;
            const isVerifying = verifyingIds.has(binary.id);
            const isProcessing =
              binary.status === "downloading" || binary.status === "verifying";

            return (
              <motion.div
                  key={binary.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                className={`glass-panel p-4 cursor-pointer transition-all duration-300 border overflow-hidden relative ${
                  hoveredId === binary.id
                    ? "border-[#a855f7]/40 shadow-[0_8px_32px_rgba(168,85,247,0.12)]"
                    : "border-[#2d2d6b]/40"
                }`}
                onMouseEnter={() => setHoveredId(binary.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full ${config.bg} flex items-center justify-center shrink-0`}
                    >
                      <FileCode className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div>
                      <h3
                        className="text-sm text-white font-semibold"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {binary.name}
                      </h3>
                      <p className="text-[10px] text-[#64748b]">
                        {binary.description}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} border ${config.border}`}
                  >
                    <StatusIcon
                      className={`w-3 h-3 ${config.color} ${
                        isProcessing ? "animate-spin" : ""
                      }`}
                    />
                    <span
                      className={`text-[9px] font-medium ${config.color}`}
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-[10px]">
                    <span
                      className="text-[#64748b]/60"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Version
                    </span>
                    <span className="text-[#64748b] font-mono">
                      {binary.version || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span
                      className="text-[#64748b]/60"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Tamano
                    </span>
                    <span className="text-[#64748b] font-mono">
                      {binary.size > 0
                        ? `${(binary.size / 1024 / 1024).toFixed(1)} MB`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span
                      className="text-[#64748b]/60"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Verificado
                    </span>
                    <span className="text-[#64748b] font-mono">
                      {binary.lastChecked
                        ? new Date(binary.lastChecked).toLocaleTimeString()
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Botones expandibles hacia abajo */}
                <div
                  className={`transition-all duration-300 ease-out overflow-hidden ${
                    hoveredId === binary.id
                      ? "max-h-[200px] opacity-100 mt-2"
                      : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  <div className="pt-3 border-t border-[#2d2d6b]/40 space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerify(binary.id);
                      }}
                      disabled={isVerifying}
                      className="btn btn-secondary w-full"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isVerifying ? "animate-spin" : ""
                        }`}
                      />
                      {isVerifying ? "Verificando..." : "Verificar"}
                    </button>

                    {binary.status === "missing" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMutation.mutate(binary.id);
                        }}
                        disabled={downloadMutation.isPending}
                        className="btn btn-primary w-full"
                      >
                        <Download className="w-4 h-4" />
                        {downloadMutation.isPending
                          ? "Descargando..."
                          : "Descargar"}
                      </button>
                    )}

                    {binary.status === "ready" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.electronAPI.openDownloadsFolder();
                        }}
                        className="btn btn-secondary w-full"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Abrir carpeta
                      </button>
                    )}

                    {binary.error && (
                      <div className="alert alert-error text-[10px]">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {binary.error}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone al fondo */}
      <div className="mt-6 shrink-0">
        <BinaryDangerZone
          onDeleteAll={async () => {
            await window.electronAPI.deleteAllBinaries();
            queryClient.invalidateQueries({ queryKey: ["binaries"] });
          }}
        />
      </div>
    </div>
  );
}