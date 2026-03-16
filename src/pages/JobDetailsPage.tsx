import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Edit,
  Info,
  MapPin,
  User,
  Wrench,
  FileText,
  Paperclip,
  Download,
  Plus,
  Map as MapIcon,
  Send
} from "lucide-react";
import Map from "../components/Map";
import { cn } from "../lib/utils";

export default function JobDetailsPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'cliente' | 'superadmin' }) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newObservation, setNewObservation] = useState("");
  const [observations, setObservations] = useState<{ text: string, author: string, date: string }[]>([
    {
      text: "Las condiciones climáticas fueron desfavorables el martes. Retraso de 4 horas debido a fuertes lluvias. Los niveles de humedad del suelo están actualmente por encima de lo óptimo; se recomienda esperar 48 horas antes de iniciar operaciones con maquinaria pesada.",
      author: "NOTA POR ADMIN",
      date: "Oct 25, 09:15 AM"
    }
  ]);

  const handleAddObservation = () => {
    if (!newObservation.trim()) return;

    const today = new Date();
    const formattedDate = `${today.toLocaleString('es-ES', { month: 'short' })} ${today.getDate()}, ${today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

    setObservations([...observations, {
      text: newObservation,
      author: userRole === 'cliente' ? 'CLIENTE' : 'PROFESIONAL',
      date: formattedDate
    }]);
    setNewObservation("");
  };

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState('');
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) throw new Error('Failed to load jobs');
        
        const data = await response.json();
        // Fallback to searching by ID or JobCode
        const foundJob = data.find((j: any) => String(j.id) === id || (j.jobCode || '').replace('#', '') === id);
        
        if (!foundJob) {
          throw new Error('Trabajo no encontrado');
        }

        // Map database job to UI job
        setJob({
          id: foundJob.jobCode || `#AG-${foundJob.id}`,
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
          files: [
             // Mock files for now since DB doesn't store them yet
             { name: "Reporte_Suelo.pdf", size: "2.4 MB", type: "pdf" }
          ],
          coordinates: [-31.4201, -64.1888] as [number, number],
        });

      } catch (err: any) {
        setJobError(err.message || 'Error al cargar detalles');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center animate-in fade-in">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2e7d32] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Cargando detalles...</p>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Trabajo no encontrado</h2>
        <p className="mb-6 text-slate-500">{jobError}</p>
        <button
          onClick={() => navigate('/jobs')}
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
          <Link to="/jobs" className="flex items-center gap-1 hover:text-[#2e7d32] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver a Trabajos
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Trabajo {job.id}</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Trabajo {job.id}
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
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
            {(userRole === 'profesional' || userRole === 'superadmin') && (
              <button
                onClick={() => setSearchParams({ editJob: String(job.internalId) })}
                className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Edit className="h-4 w-4" />
                Editar Trabajo
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

          {/* Observations Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#2e7d32]" />
              <h2 className="text-lg font-bold text-slate-900">Observaciones</h2>
            </div>

            <div className="space-y-4 mb-6">
              {observations.map((obs, idx) => (
                <div key={idx} className={cn(
                  "rounded-xl border-l-4 p-4",
                  obs.author === 'CLIENTE' ? "border-blue-400 bg-blue-50" : "border-orange-400 bg-orange-50"
                )}>
                  <p className="mb-3 text-sm italic text-slate-700 leading-relaxed">
                    "{obs.text}"
                  </p>
                  <div className={cn(
                    "flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                    obs.author === 'CLIENTE' ? "text-blue-600/70" : "text-orange-600/70"
                  )}>
                    <span>{obs.author}</span>
                    <span>•</span>
                    <span>{obs.date}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Observation Input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                placeholder="Añadir una observación o comentario..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddObservation();
                  }
                }}
              />
              <button
                onClick={handleAddObservation}
                disabled={!newObservation.trim()}
                className="flex items-center justify-center rounded-xl bg-[#2e7d32] p-2.5 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">

          {/* Attachments Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-[#2e7d32]" />
                <h2 className="text-lg font-bold text-slate-900">Adjuntos</h2>
              </div>
              <span className="text-xs font-bold text-slate-400">{job.files.length} Archivos</span>
            </div>

            <div className="space-y-3 mb-6">
              {job.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      file.type === 'pdf' && "bg-red-50 text-red-500",
                      file.type === 'image' && "bg-blue-50 text-blue-500",
                      file.type === 'doc' && "bg-blue-50 text-blue-600",
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-400">{file.size}</p>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-[#2e7d32] transition-colors">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-[#2e7d32] hover:text-[#2e7d32] hover:bg-slate-50">
              <Plus className="h-4 w-4" />
              Agregar Archivo
            </button>
          </div>

          {/* Field Map Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-[#2e7d32]" />
              <h2 className="text-lg font-bold text-slate-900">Mapa del Campo</h2>
            </div>

            <div className="h-64 w-full overflow-hidden rounded-xl bg-slate-100">
              <Map center={job.coordinates} popupContent={
                <div className="text-center">
                  <p className="font-bold">{job.client}</p>
                  <p className="text-xs">{job.location}</p>
                </div>
              } />
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Coordenadas</p>
                <p className="text-sm font-semibold text-slate-900">41.8781° N, 87.6298° W</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
