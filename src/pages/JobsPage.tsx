import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Filter,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Tractor,
  Droplets,
  Wheat,
  Sprout,
  Activity,
  Pencil,
  Trash2,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

const initialJobs = [
  {
    id: "#AG-8842",
    date: "12 Oct 2023",
    client: "AgroExport S.A.",
    location: "Lote 24, Sector Norte",
    service: "Siembra Maíz",
    operator: "Carlos Méndez",
    operatorImage: "https://picsum.photos/seed/carlos/100/100",
    status: "En Proceso",
    iconName: "Sprout",
    color: "emerald",
  },
  {
    id: "#AG-8841",
    date: "11 Oct 2023",
    client: "Finca La Estela",
    location: "Parcela 12",
    service: "Fumigación",
    operator: "Roberto Díaz",
    operatorImage: "https://picsum.photos/seed/roberto/100/100",
    status: "Pendiente",
    iconName: "Droplets",
    color: "blue",
  },
  {
    id: "#AG-8840",
    date: "10 Oct 2023",
    client: "Juan Pérez",
    location: "Chacra 08",
    service: "Cosecha Trigo",
    operator: "Martín Luna",
    operatorImage: "https://picsum.photos/seed/martin/100/100",
    status: "Completado",
    iconName: "Wheat",
    color: "orange",
  },
  {
    id: "#AG-8839",
    date: "09 Oct 2023",
    client: "Cooperativa Sur",
    location: "Distrito Industrial",
    service: "Fertilización",
    operator: "Sergio Torres",
    operatorImage: "https://picsum.photos/seed/sergio/100/100",
    status: "En Proceso",
    iconName: "Activity",
    color: "indigo",
  },
  {
    id: "#AG-8838",
    date: "08 Oct 2023",
    client: "Los Alamos",
    location: "Sector 5",
    service: "Riego",
    operator: "Ana García",
    operatorImage: "https://picsum.photos/seed/ana/100/100",
    status: "Completado",
    iconName: "Droplets",
    color: "blue",
  },
  {
    id: "#AG-8837",
    date: "07 Oct 2023",
    client: "Campo Verde",
    location: "Lote 10",
    service: "Siembra Soja",
    operator: "Luis Perez",
    operatorImage: "https://picsum.photos/seed/luis/100/100",
    status: "Pendiente",
    iconName: "Sprout",
    color: "emerald",
  },
];

const iconMap: any = {
  Sprout,
  Droplets,
  Wheat,
  Activity,
  Tractor,
};

const tabs = ["Todos", "Pendientes", "En Proceso", "Completados"];

export default function JobsPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'cliente' | 'superadmin' }) {
  const [activeTab, setActiveTab] = useState("Todos");
  const [jobs, setJobs] = useState(initialJobs);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    id: "",
    date: "",
    client: "",
    location: "",
    service: "",
    operator: "",
    status: "",
  });

  // Close filter popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      id: "",
      date: "",
      client: "",
      location: "",
      service: "",
      operator: "",
      status: "",
    });
  };

  // Get unique values for suggestions
  const uniqueValues = {
    id: Array.from(new Set(jobs.map(j => j.id))),
    date: Array.from(new Set(jobs.map(j => j.date))),
    client: Array.from(new Set(jobs.map(j => j.client))),
    location: Array.from(new Set(jobs.map(j => j.location))),
    service: Array.from(new Set(jobs.map(j => j.service))),
    operator: Array.from(new Set(jobs.map(j => j.operator))),
  };

  const loadJobs = () => {
    const storedJobs = localStorage.getItem("jobs");
    if (storedJobs) {
      setJobs(JSON.parse(storedJobs));
    } else {
      localStorage.setItem("jobs", JSON.stringify(initialJobs));
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

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Activity;
  };

  const filteredJobs = jobs.filter((job) => {
    // Tab filter
    if (activeTab === "Pendientes" && job.status !== "Pendiente") return false;
    if (activeTab === "En Proceso" && job.status !== "En Proceso") return false;
    if (activeTab === "Completados" && job.status !== "Completado") return false;

    // Popup filters
    if (filters.id && !job.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
    if (filters.date && !job.date.toLowerCase().includes(filters.date.toLowerCase())) return false;
    if (filters.client && !job.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.service && !job.service.toLowerCase().includes(filters.service.toLowerCase())) return false;
    if (filters.operator && !job.operator.toLowerCase().includes(filters.operator.toLowerCase())) return false;
    if (filters.status && job.status !== filters.status) return false;

    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end md:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Listado de Trabajos
          </h1>
          <p className="text-sm text-slate-500 md:text-lg">
            Supervisión en tiempo real de operaciones agrícolas.
          </p>
        </div>
        <div className="flex gap-3 relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors md:flex-none",
              activeFiltersCount > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Filter Popup */}
          {isFilterOpen && (
            <div
              ref={filterRef}
              className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Filtros Avanzados</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">ID Trabajo</label>
                  <input
                    type="text" name="id" list="id-suggestions" value={filters.id} onChange={handleFilterChange}
                    placeholder="Ej: #AG-88"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="id-suggestions">
                    {uniqueValues.id.map(val => <option key={val} value={val} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Fecha</label>
                  <input
                    type="text" name="date" list="date-suggestions" value={filters.date} onChange={handleFilterChange}
                    placeholder="Ej: 12 Oct"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="date-suggestions">
                    {uniqueValues.date.map(val => <option key={val} value={val} />)}
                  </datalist>
                </div>

                {(userRole === 'profesional' || userRole === 'superadmin') && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Cliente</label>
                      <input
                        type="text" name="client" list="client-suggestions" value={filters.client} onChange={handleFilterChange}
                        placeholder="Buscar cliente..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <datalist id="client-suggestions">
                        {uniqueValues.client.map(val => <option key={val} value={val} />)}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Ubicación</label>
                      <input
                        type="text" name="location" list="location-suggestions" value={filters.location} onChange={handleFilterChange}
                        placeholder="Buscar ubicación..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <datalist id="location-suggestions">
                        {uniqueValues.location.map(val => <option key={val} value={val} />)}
                      </datalist>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Servicio</label>
                  <input
                    type="text" name="service" list="service-suggestions" value={filters.service} onChange={handleFilterChange}
                    placeholder="Buscar servicio..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="service-suggestions">
                    {uniqueValues.service.map(val => <option key={val} value={val} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Profesional</label>
                  <input
                    type="text" name="operator" list="operator-suggestions" value={filters.operator} onChange={handleFilterChange}
                    placeholder="Buscar profesional..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="operator-suggestions">
                    {uniqueValues.operator.map(val => <option key={val} value={val} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Estado</label>
                  <select
                    name="status" value={filters.status} onChange={handleFilterChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={clearFilters}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 rounded-lg bg-[#2e7d32] px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {(userRole === 'profesional' || userRole === 'superadmin') && (
            <Link
              to="?newJob=true"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 md:flex-none"
            >
              <Plus className="h-4 w-4" />
              Nuevo Trabajo
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="scrollbar-hide mb-6 flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100/50 p-1 md:mb-8 md:w-fit md:gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all md:flex-none md:px-6 md:text-sm",
              activeTab === tab
                ? "bg-white text-[#2e7d32] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredJobs.map((job) => (
          <div key={job.id} className={cn(
            "rounded-2xl border border-slate-200 p-4 shadow-sm",
            job.status === "En Proceso" && "bg-gradient-to-br from-amber-50 to-white",
            job.status === "Pendiente" && "bg-gradient-to-br from-slate-50 to-white",
            job.status === "Completado" && "bg-gradient-to-br from-emerald-50 to-white"
          )}>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    job.color === "emerald" && "bg-emerald-50 text-emerald-600",
                    job.color === "blue" && "bg-blue-50 text-blue-600",
                    job.color === "orange" && "bg-orange-50 text-orange-600",
                    job.color === "indigo" && "bg-indigo-50 text-indigo-600"
                  )}
                >
                  {(() => {
                    const IconComponent = getIcon(job.iconName);
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{job.service}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-slate-500">{job.id}</p>
                    <span className="text-xs text-slate-300">•</span>
                    <p className="text-xs text-slate-500">{job.date || "12 Oct 2023"}</p>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
                  job.status === "En Proceso" && "bg-amber-50 text-amber-600",
                  job.status === "Pendiente" && "bg-slate-100 text-slate-500",
                  job.status === "Completado" && "bg-emerald-50 text-emerald-600"
                )}
              >
                {job.status}
              </span>
            </div>

            <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-medium text-slate-900">{job.client}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ubicación:</span>
                <span className="font-medium text-slate-900">{job.location}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Profesional:</span>
                <div className="flex items-center gap-2">
                  <img
                    src={job.operatorImage || `https://ui-avatars.com/api/?name=${job.operator}&background=random`}
                    alt={job.operator}
                    className="h-5 w-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-medium text-slate-900">{job.operator}</span>
                </div>
              </div>
            </div>

            <Link to={`/jobs/${(job.id || '').replace('#', '')}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
              Ver Detalles
            </Link>
          </div>
        ))}
      </div>

      {/* Desktop Data Table */}
      <div className="hidden overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100 md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  ID Trabajo
                </th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fecha
                </th>
                {(userRole === 'profesional' || userRole === 'superadmin') && (
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cliente & Ubicación
                  </th>
                )}
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Servicio
                </th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Profesional
                </th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Estado
                </th>
                <th className="px-8 py-5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/jobs/${(job.id || '').replace('#', '')}`)}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-400 group-hover:text-[#2e7d32] transition-colors">
                      {job.id}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm text-slate-500">
                      {job.date || "12 Oct 2023"}
                    </span>
                  </td>
                  {(userRole === 'profesional' || userRole === 'superadmin') && (
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          {job.client}
                        </span>
                        <span className="text-xs text-slate-400">
                          {job.location}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          job.color === "emerald" && "bg-emerald-50 text-emerald-600",
                          job.color === "blue" && "bg-blue-50 text-blue-600",
                          job.color === "orange" && "bg-orange-50 text-orange-600",
                          job.color === "indigo" && "bg-indigo-50 text-indigo-600"
                        )}
                      >
                        {(() => {
                          const IconComponent = getIcon(job.iconName);
                          return <IconComponent className="h-4 w-4" />;
                        })()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {job.service}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <img
                        src={job.operatorImage || `https://ui-avatars.com/api/?name=${job.operator}&background=random`}
                        alt={job.operator}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-sm text-slate-600">
                        {job.operator}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                        job.status === "En Proceso" &&
                        "border-amber-100 bg-amber-50 text-amber-600",
                        job.status === "Pendiente" &&
                        "border-slate-200 bg-slate-100 text-slate-500",
                        job.status === "Completado" &&
                        "border-emerald-100 bg-emerald-50 text-emerald-600"
                      )}
                    >
                      <span
                        className={cn(
                          "mr-2 h-1.5 w-1.5 rounded-full",
                          job.status === "En Proceso" && "bg-amber-500",
                          job.status === "Pendiente" && "bg-slate-400",
                          job.status === "Completado" && "bg-emerald-500"
                        )}
                      ></span>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(userRole === 'profesional' || userRole === 'superadmin') && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchParams({ editJob: (job.id || '').replace('#', '') });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); /* handle delete */ }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Borrar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${(job.id || '').replace('#', '')}`); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Ir"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-8 py-6">
          <p className="text-sm text-slate-400">
            Mostrando <span className="font-semibold text-slate-700">1-10</span>{" "}
            de <span className="font-semibold text-slate-700">84</span> trabajos
          </p>
          <div className="flex items-center gap-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2e7d32] text-sm font-bold text-white shadow-sm">
              1
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100">
              2
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100">
              3
            </button>
            <span className="px-2 text-slate-300">...</span>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100">
              9
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
