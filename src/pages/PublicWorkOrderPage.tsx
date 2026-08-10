import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  Info,
  MapPin,
  Wrench,
  FileText,
  Paperclip,
  Download,
  Map as MapIcon,
  Clock,
  AlertTriangle,
  Lock,
  Eye
} from "lucide-react";

export default function PublicWorkOrderPage() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [downloadingFiles, setDownloadingFiles] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!uuid || !token) {
      setError("Link de invitación inválido. Falta el token de acceso.");
      setLoading(false);
      return;
    }

    const fetchPublicOrder = async () => {
      try {
        const response = await fetch(`/backend/public/work-orders/${uuid}?token=${encodeURIComponent(token)}`);

        if (response.status === 403) {
          setError("Token de invitación inválido o expirado.");
          return;
        }

        if (response.status === 404) {
          setError("Orden de trabajo no encontrada.");
          return;
        }

        if (!response.ok) {
          throw new Error("Error al cargar la orden");
        }

        const data = await response.json();

        setJob({
          id: `#AG-${data.id}`,
          uuid: data.uuid,
          status: data.status,
          created: data.date ? new Date(data.date).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "N/A",
          client: data.client,
          location: data.location,
          assignedTo: data.operator || "Asignación Pendiente",
          service: data.service,
          secondaryService: data.secondaryService || null,
          serviceDescription: `Lote: ${data.lotName || "N/A"}, Campaña: ${data.campaign || "Campaña Actual"}, Superficie: ${data.hectares || 0} ha.`,
          servicePrice: Number(data.amountUsd) || 0,
          coordinates: data.lat !== null && data.lng !== null ? [Number(data.lat), Number(data.lng)] : null,
        });

        setAttachments(data.attachments || []);
      } catch (err: any) {
        setError(err.message || "Error al cargar la orden de trabajo");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicOrder();
  }, [uuid, token]);

  const handleViewFile = async (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const response = await fetch(file.fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing file:", error);
      alert("No se pudo abrir el archivo.");
    }
  };

  const handleDownloadFile = async (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDownloadingFiles((prev) => ({ ...prev, [file.id]: true }));
    try {
      const response = await fetch(`${file.fileUrl}&download=true`);
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("No se pudo descargar el archivo.");
    } finally {
      setDownloadingFiles((prev) => ({ ...prev, [file.id]: false }));
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Completado":
        return { color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: <CheckCircle className="h-3.5 w-3.5" /> };
      case "En Proceso":
        return { color: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: <Clock className="h-3.5 w-3.5" /> };
      case "Cancelado":
        return { color: "bg-red-50 text-red-700 ring-red-600/20", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
      default:
        return { color: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: <Clock className="h-3.5 w-3.5" /> };
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Cargando orden de trabajo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-center">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Acceso denegado</h1>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const statusConfig = getStatusConfig(job.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">TA</span>
            </div>
            <span className="font-bold text-slate-800 text-lg hidden sm:block">TradeAgro</span>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-amber-200">
            <Eye className="h-3.5 w-3.5" />
            Vista de invitación — solo lectura
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title & Status */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                Orden {job.id}
              </h1>
              <p className="text-slate-500 text-sm mt-1">{job.service}{job.secondaryService ? ` — ${job.secondaryService}` : ""}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset ${statusConfig.color}`}>
              {statusConfig.icon}
              {job.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Data */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                <Info className="h-4 w-4 text-slate-400" /> Datos Generales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-slate-700">{job.client}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Fecha</p>
                  <p className="text-sm font-semibold text-slate-700">{job.created}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Profesional</p>
                  <p className="text-sm font-semibold text-slate-700">{job.assignedTo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ubicación</p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    {job.location}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                <Wrench className="h-4 w-4 text-slate-400" /> Detalle del Servicio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Servicio</p>
                  <p className="text-sm font-semibold text-slate-700">{job.service}</p>
                  {job.secondaryService && (
                    <p className="text-xs text-slate-500 mt-1">{job.secondaryService}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Información</p>
                  <p className="text-sm text-slate-600">{job.serviceDescription}</p>
                </div>
                {job.servicePrice > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Monto</p>
                    <p className="text-lg font-bold text-emerald-600">USD {job.servicePrice.toLocaleString("es-AR")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                  <Paperclip className="h-4 w-4 text-slate-400" /> Archivos Adjuntos
                  <span className="ml-auto text-xs font-medium text-slate-400">{attachments.length}</span>
                </h2>
                <div className="space-y-3">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.fileName}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(file.fileSize)}</p>
                        {file.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{file.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDownloadFile(file, e)}
                          disabled={downloadingFiles[file.id]}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Descargar"
                        >
                          {downloadingFiles[file.id] ? (
                            <div className="h-4 w-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Map placeholder */}
            {job.coordinates && (
              <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <MapIcon className="h-4 w-4 text-slate-400" /> Ubicación
                </h2>
                <div className="h-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <a
                    href={`https://www.google.com/maps?q=${job.coordinates[0]},${job.coordinates[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:underline"
                  >
                    <MapPin className="h-4 w-4" />
                    Ver en Google Maps
                  </a>
                </div>
              </div>
            )}

            {/* Login CTA */}
            <div className="rounded-[2rem] border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm text-center">
              <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">¿Tenés cuenta en TradeAgro?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Iniciá sesión para ver observaciones, editar y más.
              </p>
              <a
                href={`/?redirect=/work-orders/${uuid}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors w-full justify-center"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-16 py-6 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 TradeAgro. Sistema de Gestión Agropecuaria.</p>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[8px]">TA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
