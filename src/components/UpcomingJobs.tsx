import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, ArrowRight, Plus } from "lucide-react";

const initialJobs = [
  {
    id: "#AG-8842",
    client: "AgroExport S.A.",
    location: "Lote 24, Sector Norte",
    service: "Siembra Maíz",
    status: "En Proceso",
    date: "Hoy, 08:00 AM",
    color: "emerald",
  },
  {
    id: "#AG-8841",
    client: "Finca La Estela",
    location: "Parcela 12",
    service: "Fumigación",
    status: "Pendiente",
    date: "Mañana, 07:30 AM",
    color: "blue",
  },
  {
    id: "#AG-8839",
    client: "Cooperativa Sur",
    location: "Distrito Industrial",
    service: "Fertilización",
    status: "En Proceso",
    date: "Mañana, 10:00 AM",
    color: "indigo",
  },
  {
    id: "#AG-8837",
    client: "Campo Verde",
    location: "Lote 10",
    service: "Siembra Soja",
    status: "Pendiente",
    date: "Jue 12, 09:00 AM",
    color: "emerald",
  },
];

export default function UpcomingJobs() {
  const [jobs, setJobs] = useState<any[]>([]);

  const loadJobs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');

      const parsedJobs = await response.json();

      // Filter for active/pending jobs
      const activeJobs = parsedJobs
        .filter((job: any) => job.status !== "Completado")
        .slice(0, 5)
        .map((job: any) => ({
          ...job,
          date: job.date ? new Date(job.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Pendiente de fecha",
          location: `${job.fieldName || 'Campo N/A'} - ${job.lotName || 'Lote N/A'}`
        }));

      setJobs(activeJobs);
    } catch (error) {
      console.error('Error fetching upcoming jobs:', error);
      // Fallback or empty state could go here
      setJobs([]);
    }
  };

  useEffect(() => {
    loadJobs();

    const handleJobCreated = () => {
      loadJobs();
    };

    window.addEventListener('job-created', handleJobCreated);
    return () => {
      window.removeEventListener('job-created', handleJobCreated);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Calendar className="h-5 w-5 text-emerald-600" /> Próximos Trabajos
        </h3>
        <Link to="/jobs" className="text-sm font-semibold text-emerald-600 hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x min-h-[160px]">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <Link
              key={job.id || Math.random()}
              to={`/jobs/${String(job.id).replace('#', '')}`}
              className={`snap-center shrink-0 w-[280px] rounded-2xl border border-slate-100 p-4 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${job.status === 'En Proceso'
                ? 'bg-gradient-to-br from-amber-50 to-white'
                : 'bg-gradient-to-br from-slate-50 to-white'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${job.status === 'En Proceso' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {job.status}
                </span>
                <span className="text-xs font-semibold text-slate-400">{`#AG-${job.id}`}</span>
              </div>

              <h4 className="font-bold text-slate-900 mb-1 truncate">{job.service}</h4>
              <p className="text-xs text-slate-500 mb-3 truncate">{job.client}</p>

              <div className="space-y-2 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{job.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{job.location}</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-10 px-6 rounded-3xl border-2 border-dashed border-slate-100 bg-white">
            <Calendar className="h-8 w-8 mb-6 text-slate-300" />
            <h4 className="text-slate-900 font-bold text-lg mb-2 text-center">No hay trabajos programados</h4>
            <p className="text-slate-500 text-sm text-center max-w-[320px] mb-8 leading-relaxed">
              Tu agenda está despejada por ahora...
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
