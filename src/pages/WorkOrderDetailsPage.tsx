import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Edit,
  Info,
  MapPin,
  Wrench,
  FileText,
  Paperclip,
  Download,
  Plus,
  Map as MapIcon,
  Send,
  X
} from "lucide-react";
import { ChangeEvent } from "react";
import Map from "../components/Map";
import { cn } from "../lib/utils";

export default function WorkOrderDetailsPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const profile = localStorage.getItem("userProfile");
    if (profile) setCurrentUser(JSON.parse(profile));
  }, []);
  const [newObservation, setNewObservation] = useState("");
  const [observations, setObservations] = useState<any[]>([]);
  const [loadingObservations, setLoadingObservations] = useState(true);
  const observationsEndRef = useRef<HTMLDivElement>(null);

  const fetchObservations = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`/api/work-orders/${id}/observations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setObservations(data);
      }
    } catch (err) {
      console.error('Error fetching observations:', err);
    } finally {
      setLoadingObservations(false);
    }
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`/api/work-orders/${id}/observations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newObservation })
      });
      if (response.ok) {
        const data = await response.json();
        setObservations(prev => [...prev, data.observation]);
        setNewObservation("");
        setTimeout(() => observationsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Error creating observation:', err);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [id]);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState('');
  const [job, setJob] = useState<any>(null);

  const fetchAttachments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/work-orders/${id}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      const filesArray = Array.from(e.target.files) as File[];
      filesArray.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/work-orders/${id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: formData
      });

      if (response.ok) {
        await fetchAttachments();
      } else {
        alert('Error al subir archivos');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) return;

    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      } else {
        alert('Error al eliminar archivo');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          navigate('/');
          return;
        }

        const response = await fetch('/api/work-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          navigate('/');
          return;
        }

        if (!response.ok) throw new Error('Failed to load jobs');

        const data = await response.json();
        // Fallback to searching by ID
        const foundJob = data.find((j: any) => String(j.id) === id);

        if (!foundJob) {
          throw new Error('Trabajo no encontrado');
        }

        // Map database job to UI job
        setJob({
          id: `#AG-${foundJob.id}`,
          internalId: foundJob.id,
          status: foundJob.status,
          created: foundJob.date ? new Date(foundJob.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
          updated: "Hace un momento",
          client: foundJob.client,
          location: `${foundJob.fieldName || ''} ${foundJob.lotName ? `- ${foundJob.lotName}` : ''}`,
          priority: "Estándar",
          assignedTo: foundJob.operator || "Asignación Pendiente",
          services: [
            {
              name: foundJob.service,
              description: foundJob.description || `Trabajo en campo: ${foundJob.campaign || 'Campaña Actual'}, Superficie: ${foundJob.hectares || 0} ha.`,
              price: Number(foundJob.amountUsd) || 0,
            }
          ],
          observation: foundJob.description || "No hay observaciones iniciales registradas.",
          observationAuthor: "SISTEMA",
          observationDate: foundJob.createdAt ? new Date(foundJob.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : "N/A",
          coordinates: (foundJob.lat !== null && foundJob.lng !== null) ? [Number(foundJob.lat), Number(foundJob.lng)] : null,
        });

      } catch (err: any) {
        setJobError(err.message || 'Error al cargar detalles');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
    fetchAttachments();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 pb-10">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="mb-4 h-4 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="h-9 w-56 rounded-lg bg-slate-100 animate-pulse mb-2" />
              <div className="h-4 w-72 rounded bg-slate-50 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-28 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-10 w-36 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* General Data Skeleton */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-5 w-40 rounded bg-slate-100 mb-6" />
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <div className="h-3 w-16 rounded bg-slate-100 mb-2" />
                    <div className="h-5 w-32 rounded bg-slate-50" />
                  </div>
                ))}
              </div>
            </div>
            {/* Service Skeleton */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-5 w-44 rounded bg-slate-100 mb-6" />
              <div className="flex justify-between mb-2">
                <div className="h-5 w-28 rounded bg-slate-100" />
                <div className="h-5 w-16 rounded bg-slate-50" />
              </div>
              <div className="h-4 w-3/4 rounded bg-slate-50" />
            </div>
            {/* Observations Skeleton */}
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-5 w-36 rounded bg-slate-100 mb-6" />
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-12 w-48 rounded-xl bg-slate-50" />
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-slate-100 ml-auto" />
                    <div className="h-12 w-56 rounded-xl bg-slate-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-5 w-24 rounded bg-slate-100 mb-6" />
              <div className="h-16 w-full rounded-xl bg-slate-50" />
            </div>
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-5 w-36 rounded bg-slate-100 mb-6" />
              <div className="h-48 w-full rounded-xl bg-slate-50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Trabajo no encontrado</h2>
        <p className="mb-6 text-slate-500">{jobError}</p>
        <button
          onClick={() => navigate('/work-orders')}
          className="rounded-xl bg-[#2e7d32] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/work-orders" className="flex items-center gap-1 hover:text-[#2e7d32] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver a Órdenes
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Orden {job.id}</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Orden {job.id}
              </h1>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-100">
                {job.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Creado el {job.created} • Última actualización {job.updated}
            </p>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer">
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
            {(userRole === 'profesional' || userRole === 'admin') && (
              <button
                onClick={() => setSearchParams({ editJob: String(job.internalId) })}
                className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Editar Orden
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* General Data Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Info className="h-5 w-5 text-[#2e7d32]" />
              <h2 className="text-lg font-bold text-slate-900">Datos Generales</h2>
            </div>

            <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Cliente</p>
                <p className="font-semibold text-slate-900">{job.client}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Ubicación</p>
                <div className="flex items-center gap-1 font-semibold text-slate-900">
                  {job.location}
                  <MapPin className="h-3 w-3 text-[#2e7d32]" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Prioridad</p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <p className="font-semibold text-slate-900">{job.priority}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Asignado a</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    CM
                  </div>
                  <p className="font-semibold text-slate-900">{job.assignedTo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Details Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#2e7d32]" />
              <h2 className="text-lg font-bold text-slate-900">Detalles del Servicio</h2>
            </div>

            <div className="space-y-6">
              {job.services.map((service, index) => (
                <div key={index} className={cn("pb-6", index !== job.services.length - 1 && "border-b border-slate-100")}>
                  <div className="mb-2 flex justify-between items-start">
                    <h3 className="font-bold text-slate-900">{service.name}</h3>
                    <span className="font-bold text-[#2e7d32]">${service.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Observations Chat Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#2e7d32]" />
                <h2 className="text-lg font-bold text-slate-900">Observaciones</h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {observations.length} {observations.length === 1 ? 'mensaje' : 'mensajes'}
              </span>
            </div>

            {/* Chat Messages */}
            <div className="relative">
              <div className="max-h-[400px] overflow-y-auto space-y-4 py-4 pr-1 scrollbar-hide">
                {loadingObservations ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-24 bg-slate-100 rounded" />
                          <div className="h-16 w-3/4 bg-slate-50 rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : observations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-8 w-8 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Sin observaciones aún</p>
                    <p className="text-xs text-slate-300 mt-1">Escribe la primera observación para esta orden</p>
                  </div>
                ) : (
                  observations.map((obs) => {
                    const isMine = currentUser && obs.userId === currentUser.id;
                    const initials = obs.displayName
                      ? obs.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '??';
                    const roleLabel = obs.role === 'client' ? 'Cliente' : obs.role === 'admin' ? 'Admin' : 'Profesional';
                    const roleBg = obs.role === 'client' ? 'bg-blue-50 text-blue-600' : obs.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600';
                    const timeAgo = obs.createdAt
                      ? new Date(obs.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={obs.id}
                        className={cn("flex gap-3", isMine && "flex-row-reverse")}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isMine ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {initials}
                        </div>

                        {/* Bubble */}
                        <div className={cn("max-w-[75%] min-w-0 space-y-1", isMine && "flex flex-col items-end")}>
                          <div className={cn("flex items-center gap-2", isMine && "flex-row-reverse")}>
                            <span className="text-xs font-bold text-slate-700">{obs.displayName}</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", roleBg)}>
                              {roleLabel}
                            </span>
                          </div>
                          <div className={cn(
                            "w-fit max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed break-all",
                            isMine
                              ? "bg-emerald-50 text-slate-800 rounded-tr-md"
                              : "bg-slate-50 text-slate-700 rounded-tl-md"
                          )}>
                            {obs.text}
                          </div>
                          <p className={cn("text-[10px] text-slate-400 px-1", isMine && "text-right")}>
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={observationsEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 pt-3 border-t border-slate-100">
              <textarea
                rows={1}
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 72) + 'px';
                }}
                placeholder="Escribe una observación..."
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-h-[4.5rem] overflow-y-auto"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddObservation();
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                  }
                }}
              />
              <button
                onClick={handleAddObservation}
                disabled={!newObservation.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-white transition-colors hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-[#2e7d32]" />
                <h2 className="text-lg font-bold text-slate-900">Adjuntos</h2>
              </div>
              <span className="text-xs font-bold text-slate-400">{attachments.length} Archivos</span>
            </div>

            <div className="space-y-3 mb-6">
              {loading ? (
                <p className="text-center text-xs text-slate-400 py-4">Cargando...</p>
              ) : attachments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4 italic">No hay archivos adjuntos.</p>
              ) : (
                attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 group cursor-pointer"
                    onClick={() => window.open(`${file.fileUrl}`, '_blank')}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        (file.fileType.includes('pdf')) && "bg-red-50 text-red-500",
                        (file.fileType.includes('image')) && "bg-blue-50 text-blue-500",
                        (!file.fileType.includes('pdf') && !file.fileType.includes('image')) && "bg-slate-50 text-slate-500",
                      )}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate text-sm font-semibold text-slate-900" title={file.fileName}>{file.fileName}</p>
                        <p className="text-[10px] text-slate-400">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.uploaderName || 'Sistema'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`${file.fileUrl}?token=${localStorage.getItem('authToken')}&download=true&t=${Date.now()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-[#2e7d32] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {(userRole === 'admin' || (currentUser && currentUser.id === file.uploadedBy)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAttachment(file.id);
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-[#2e7d32] hover:text-[#2e7d32] hover:bg-slate-50">
              <Plus className="h-4 w-4" />
              {isUploading ? 'Subiendo...' : 'Agregar Archivo'}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Field Map Card */}
          {job.coordinates && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-[#2e7d32]" />
                  <h2 className="text-lg font-bold text-slate-900">Mapa del Campo</h2>
                </div>
              </div>

              <div className="h-64 w-full overflow-hidden rounded-xl bg-slate-100">
                <Map center={job.coordinates} popupContent={
                  <div className="text-center">
                    <p className="font-bold">{job.client}</p>
                    <p className="text-xs">{job.location}</p>
                  </div>
                } />
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${job.coordinates[0]},${job.coordinates[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#1b5e20] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-emerald-100" />
                Abrir en Google Maps
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
