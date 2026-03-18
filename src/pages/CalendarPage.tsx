import { useState, useEffect, useMemo, Fragment } from "react";
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addDays,
  startOfToday
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ChevronDown } from "lucide-react";
import { cn, getColorForClient } from "../lib/utils";
import { Link, useNavigate } from "react-router-dom";

export default function CalendarPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  const loadJobs = () => {
    const storedJobs = localStorage.getItem("jobs");
    if (storedJobs) {
      const parsed = JSON.parse(storedJobs);
      // Asignamos fechas a los órdenes para la demostración si no tienen
      const jobsWithDates = parsed.map((job: any, index: number) => {
        if (!job.date) {
          // Distribuir los órdenes a lo largo de la semana actual
          const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index % 7);
          return { ...job, date: date.toISOString() };
        }
        return job;
      });
      setJobs(jobsWithDates);
    }
  };

  useEffect(() => {
    loadJobs();
    
    const loadClients = () => {
      const storedClients = localStorage.getItem('clients');
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      }
    };
    loadClients();

    const handleJobCreated = () => {
      loadJobs();
    };

    window.addEventListener('job-created', handleJobCreated);
    window.addEventListener('clients-updated', loadClients);
    return () => {
      window.removeEventListener('job-created', handleJobCreated);
      window.removeEventListener('clients-updated', loadClients);
    };
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(startOfToday());

  const toggleClient = (clientName: string) => {
    setExpandedClients(prev => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  // Agrupar órdenes por Cliente + Campo(Location)
  const groupedClients = useMemo(() => {
    const grouped: Record<string, { clientName: string; fields: Record<string, { location: string; jobs: any[] }>; allJobs: any[] }> = {};
    
    // Primero, agregar los clientes y sus campos
    clients.forEach(client => {
      grouped[client.name] = { clientName: client.name, fields: {}, allJobs: [] };
      if (client.fields && Array.isArray(client.fields)) {
        client.fields.forEach((f: any) => {
          const loc = typeof f === 'string' ? f : f.name;
          grouped[client.name].fields[loc] = { location: loc, jobs: [] };
        });
      }
    });

    // Luego, agregar los órdenes a los grupos correspondientes
    jobs.forEach(job => {
      const clientName = job.client || "Cliente Desconocido";
      const location = job.location || "Sin asignar";
      
      if (!grouped[clientName]) {
        grouped[clientName] = { clientName, fields: {}, allJobs: [] };
      }
      
      if (!grouped[clientName].fields[location]) {
        grouped[clientName].fields[location] = { location, jobs: [] };
      }
      
      grouped[clientName].fields[location].jobs.push(job);
      grouped[clientName].allJobs.push(job);
    });

    return Object.values(grouped);
  }, [jobs, clients]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          <button onClick={prevWeek} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            HOY
          </button>
          <button onClick={nextWeek} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="h-5 w-px bg-slate-200 mx-1"></div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM, yyyy", { locale: es })}
            <CalendarIcon className="h-4 w-4 text-[#2e7d32]" />
          </button>
        </div>

        <div className="text-lg font-bold text-slate-800 capitalize hidden md:block">
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </div>

        {(userRole === 'profesional' || userRole === 'admin') && (
          <Link
            to="?newJob=true"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 w-full md:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Turno
          </Link>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
        <div className="min-w-full md:min-w-[900px] h-full flex flex-col overflow-auto">
          {/* Grid Header */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] md:grid-cols-[220px_repeat(7,1fr)] border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
            <div className="p-2 md:p-4 border-r border-slate-200 flex items-center justify-center bg-white sticky left-0 z-40">
              <span className="text-[10px] md:text-xs font-bold uppercase text-slate-400 text-center tracking-wider">
                <span className="hidden md:inline">Cliente / Campo</span>
                <span className="md:hidden">Cli/Cam</span>
              </span>
            </div>
            {daysInWeek.map((day, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-1 md:p-3 text-center border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center",
                  isToday(day) ? "bg-emerald-50/30" : ""
                )}
              >
                <div className="text-[10px] md:text-xs font-semibold capitalize text-slate-500">
                  <span className="md:hidden">{format(day, "EEEEE", { locale: es })}</span>
                  <span className="hidden md:inline">{format(day, "EEE", { locale: es })}</span>
                </div>
                <div className={cn(
                  "mt-0.5 md:mt-1 text-sm md:text-lg font-bold h-7 w-7 md:h-9 md:w-9 flex items-center justify-center rounded-full transition-all",
                  isToday(day) ? "bg-[#2e7d32] text-white shadow-sm" : "text-slate-800 hover:bg-slate-100"
                )}>
                  {format(day, "dd")}
                </div>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 divide-y divide-slate-100 bg-slate-50/30">
            {groupedClients.map((clientGroup, clientIndex) => {
              const fieldKeys = Object.keys(clientGroup.fields);
              const hasMultipleFields = fieldKeys.length > 1;
              const isExpanded = expandedClients[clientGroup.clientName];
              
              return (
                <Fragment key={clientIndex}>
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] md:grid-cols-[220px_repeat(7,1fr)] group border-b border-slate-100 last:border-b-0">
                    {/* Row Header (Client) */}
                    <div 
                      className={cn(
                        "p-1 md:p-4 border-r border-slate-200 bg-white flex flex-col justify-center items-center md:items-start transition-colors group-hover:bg-slate-50 sticky left-0 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]",
                        hasMultipleFields ? "cursor-pointer" : ""
                      )}
                      onClick={() => hasMultipleFields && toggleClient(clientGroup.clientName)}
                    >
                      <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-3 w-full">
                        <div className="h-7 w-7 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${clientGroup.clientName}&background=${getColorForClient(clientGroup.clientName)}&color=fff&bold=true`} 
                            alt={clientGroup.clientName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="overflow-hidden text-center md:text-left w-full flex items-center justify-between">
                          <div className="overflow-hidden">
                            <span className="block text-[10px] md:text-sm font-bold text-slate-900 truncate leading-tight">{clientGroup.clientName}</span>
                            <span className="hidden md:block text-[11px] font-medium text-slate-500 truncate mt-0.5">
                              {hasMultipleFields ? `${fieldKeys.length} campos` : (fieldKeys[0] || 'Sin campos')}
                            </span>
                          </div>
                          {hasMultipleFields && (
                            <div className="hidden md:block text-slate-400 shrink-0 ml-1">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Days Cells for Client Row */}
                    {daysInWeek.map((day, dayIndex) => {
                      const dayJobs = clientGroup.allJobs.filter(job => {
                        if (!job.date) return false;
                        return isSameDay(new Date(job.date), day);
                      });

                      return (
                        <div 
                          key={dayIndex} 
                          onClick={() => {
                            if (userRole === 'profesional' || userRole === 'admin') {
                              const dateStr = format(day, "yyyy-MM-dd");
                              const clientStr = encodeURIComponent(clientGroup.clientName);
                              navigate(`?newJob=true&date=${dateStr}&client=${clientStr}`);
                            }
                          }}
                          className={cn(
                            "p-1 md:p-2 border-r border-slate-100 last:border-r-0 h-24 md:h-32 overflow-y-auto transition-colors custom-scrollbar relative group/cell",
                            isToday(day) ? "bg-emerald-50/20" : "bg-white",
                            (userRole === 'profesional' || userRole === 'admin') ? "hover:bg-slate-50/80 cursor-pointer" : ""
                          )}
                        >
                          {isToday(day) && (
                            <div className="absolute inset-y-0 left-0 w-0.5 bg-[#2e7d32]/30 pointer-events-none" />
                          )}
                          <div className="flex flex-col gap-1.5">
                            {dayJobs.map((job, jobIndex) => (
                              <div 
                                key={jobIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/work-orders/${(job.id || '').replace('#', '')}`);
                                }}
                                className="bg-white border border-slate-200 rounded-lg p-1.5 md:p-2 text-[9px] md:text-xs shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-emerald-200 group/job relative overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-full my-1 ml-0.5" />
                                <div className="pl-2">
                                  <div className="font-bold truncate text-slate-900 leading-tight">{job.service}</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className={cn(
                                      "h-1.5 w-1.5 rounded-full shrink-0",
                                      job.status === "Completado" ? "bg-emerald-500" : 
                                      job.status === "En Proceso" ? "bg-amber-500" : "bg-slate-400"
                                    )} />
                                    <span className="truncate text-[8px] md:text-[10px] text-slate-500 font-medium">
                                      {job.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sub-rows for fields if expanded */}
                  {hasMultipleFields && isExpanded && fieldKeys.map((fieldKey, fieldIndex) => {
                    const field = clientGroup.fields[fieldKey];
                    return (
                      <div key={`${clientIndex}-${fieldIndex}`} className="grid grid-cols-[80px_repeat(7,1fr)] md:grid-cols-[220px_repeat(7,1fr)] group border-b border-slate-50 bg-slate-50/50">
                        {/* Sub-row Header */}
                        <div className="p-1 md:p-4 border-r border-slate-200 flex flex-col justify-center items-center md:items-start pl-2 md:pl-12 sticky left-0 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-slate-50/80">
                          <div className="flex items-center gap-2 w-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 hidden md:block shrink-0"></div>
                            <span className="block text-[9px] md:text-xs font-medium text-slate-700 truncate leading-tight">{field.location}</span>
                          </div>
                        </div>

                        {/* Days Cells for Sub-row */}
                        {daysInWeek.map((day, dayIndex) => {
                          const dayJobs = field.jobs.filter(job => {
                            if (!job.date) return false;
                            return isSameDay(new Date(job.date), day);
                          });

                          return (
                            <div 
                              key={dayIndex} 
                              onClick={() => {
                                if (userRole === 'profesional' || userRole === 'admin') {
                                  const dateStr = format(day, "yyyy-MM-dd");
                                  const clientStr = encodeURIComponent(clientGroup.clientName);
                                  const fieldStr = encodeURIComponent(field.location);
                                  navigate(`?newJob=true&date=${dateStr}&client=${clientStr}&field=${fieldStr}`);
                                }
                              }}
                              className={cn(
                                "p-1 md:p-2 border-r border-slate-100 last:border-r-0 h-20 md:h-28 overflow-y-auto transition-colors custom-scrollbar relative group/cell",
                                isToday(day) ? "bg-emerald-50/10" : "bg-slate-50/30",
                                (userRole === 'profesional' || userRole === 'admin') ? "hover:bg-slate-100/80 cursor-pointer" : ""
                              )}
                            >
                              {isToday(day) && (
                                <div className="absolute inset-y-0 left-0 w-0.5 bg-[#2e7d32]/20 pointer-events-none" />
                              )}
                              <div className="flex flex-col gap-1.5">
                                {dayJobs.map((job, jobIndex) => (
                                  <div 
                                    key={jobIndex}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/work-orders/${(job.id || '').replace('#', '')}`);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg p-1.5 md:p-2 text-[9px] md:text-xs shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-emerald-200 group/job relative overflow-hidden"
                                  >
                                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-full my-1 ml-0.5" />
                                    <div className="pl-2">
                                      <div className="font-bold truncate text-slate-900 leading-tight">{job.service}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
            
            {groupedClients.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No hay clientes o campos registrados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
