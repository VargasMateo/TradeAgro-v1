import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
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
  LayoutGrid,
  List,
  ClipboardList
} from "lucide-react";
import { cn } from "../lib/utils";
import WorkOrderCard from "../components/WorkOrderCard";
import { WorkOrder } from "../types/database";

// Initial jobs are now fetched from the database

const iconMap: any = {
  Sprout,
  Droplets,
  Wheat,
  Activity,
  Tractor,
};

const tabs = ["Todos", "Pendientes", "En Proceso", "Completados"];

export default function WorkOrdersPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const [activeTab, setActiveTab] = useState("Todos");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

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

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/'); // Redirect to login if no token
        return;
      }

      const response = await fetch('/api/work-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        navigate('/'); // Token expired or invalid
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch work orders');
      const data = await response.json();
      setWorkOrders(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Listen for new jobs created from the modal
    const handleJobCreated = () => {
      fetchJobs();
    };

    window.addEventListener('job-created', handleJobCreated);
    return () => window.removeEventListener('job-created', handleJobCreated);
  }, []);

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
    id: Array.from(new Set(workOrders.map(j => `#AG-${j.id}`))),
    date: Array.from(new Set(workOrders.map(j => j.date ? new Date(j.date).toLocaleDateString('es-AR') : ''))),
    client: Array.from(new Set(workOrders.map(j => (j as any).client))),
    location: Array.from(new Set(workOrders.map(j => (j as any).location))),
    service: Array.from(new Set(workOrders.map(j => j.service))),
    operator: Array.from(new Set(workOrders.map(j => (j as any).operator))),
  };


  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Activity;
  };

  const filteredOrders = workOrders.filter((order) => {
    // Tab filter
    if (activeTab === "Pendientes" && order.status !== "Pendiente") return false;
    if (activeTab === "En Proceso" && order.status !== "En Proceso") return false;
    if (activeTab === "Completados" && order.status !== "Completado") return false;

    // Popup filters
    if (filters.id && !(`#AG-${order.id}`.toLowerCase().includes(filters.id.toLowerCase()))) return false;
    if (filters.date && !(order.date && new Date(order.date).toLocaleDateString('es-AR').toLowerCase().includes(filters.date.toLowerCase()))) return false;
    if (filters.client && !((order as any).client || '').toLowerCase().includes(filters.client.toLowerCase())) return false;
    if (filters.location && !((order as any).location || '').toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.service && !(order.service || '').toLowerCase().includes(filters.service.toLowerCase())) return false;
    if (filters.operator && !((order as any).operator || '').toLowerCase().includes(filters.operator.toLowerCase())) return false;
    if (filters.status && order.status !== filters.status) return false;

    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;

  const WorkOrderCardSkeleton = () => (
    <div className="flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-50 rounded" />
            <div className="h-5 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-50" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-2xl bg-slate-50/80" />
        <div className="h-16 rounded-2xl bg-slate-50/80" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="space-y-1">
          <div className="h-2 w-10 bg-slate-50 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <div className="h-2 w-10 bg-slate-50 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded text-right" />
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );

  const JobTableSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 rounded" /></td>
          <td className="px-8 py-6"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
          {(userRole === 'profesional' || userRole === 'admin') && (
            <td className="px-8 py-6">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-50 rounded" />
              </div>
            </td>
          )}
          <td className="px-8 py-6">
            <div className="space-y-1">
              <div className="h-4 w-12 bg-slate-100 rounded" />
              <div className="h-3 w-16 bg-slate-50 rounded" />
            </div>
          </td>
          <td className="px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100" />
              <div className="h-4 w-24 bg-slate-50 rounded" />
            </div>
          </td>
          <td className="px-8 py-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-100" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
          </td>
          <td className="px-8 py-6"><div className="h-6 w-20 bg-slate-100 rounded-full" /></td>
          <td className="px-8 py-6"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-slate-50 rounded-lg" /><div className="h-8 w-8 bg-slate-50 rounded-lg" /></div></td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end md:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Órdenes de Trabajo
          </h1>
          <p className="text-sm text-slate-500 md:text-lg">
            Supervisión en tiempo real de operaciones agrícolas.
          </p>
        </div>
        <div className="flex gap-3 relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors cursor-pointer md:flex-none",
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
                  <label className="text-xs font-semibold text-slate-500">ID Orden</label>
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

                {(userRole === 'profesional' || userRole === 'admin') && (
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
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 rounded-lg bg-[#2e7d32] px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {(userRole === 'profesional' || userRole === 'admin') && (
            <Link
              to="?newJob=true"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 md:flex-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nuevo Trabajo
            </Link>
          )}
        </div>
      </div>

      {/* Tabs & View Toggle */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-8">
        {/* Tabs */}
        <div className="scrollbar-hide flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100/50 p-1 md:w-fit md:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer md:flex-none md:px-6 md:text-sm",
                activeTab === tab
                  ? "bg-white text-[#2e7d32] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="hidden items-center gap-1 rounded-2xl bg-slate-100/50 p-1 md:flex">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer",
              viewMode === 'grid' ? "bg-white text-[#2e7d32] shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
            title="Vista Cuadrícula"
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer",
              viewMode === 'table' ? "bg-white text-[#2e7d32] shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
            title="Vista Lista"
          >
            <List className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Mobile Card View (Always Grid) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          <>
            <WorkOrderCardSkeleton />
            <WorkOrderCardSkeleton />
            <WorkOrderCardSkeleton />
          </>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-100">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-red-800">Error al cargar órdenes</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center border border-dashed border-slate-200">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">No se encontraron órdenes</h3>
            <p className="text-xs text-slate-500 mt-1">Intenta ajustar los filtros o crea una nueva.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <WorkOrderCard key={order.id} job={order as any} userRole={userRole} />
          ))
        )}
      </div>

      {/* Desktop Views */}
      <div className="hidden md:block">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <WorkOrderCardSkeleton />
              <WorkOrderCardSkeleton />
              <WorkOrderCardSkeleton />
              <WorkOrderCardSkeleton />
              <WorkOrderCardSkeleton />
              <WorkOrderCardSkeleton />
            </div>
          ) : (
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">ID Orden</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                      {(userRole === 'profesional' || userRole === 'admin') && (
                        <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Cliente & Ubicación</th>
                      )}
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Superficie</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Servicio</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Profesional</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                      <th className="px-8 py-5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <JobTableSkeleton />
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] bg-white border border-red-100 shadow-sm">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <p className="text-base font-semibold text-slate-900">No pudimos obtener la información</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button
              onClick={fetchJobs}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] bg-white border border-dashed border-slate-200 shadow-sm">
            <ClipboardList className="h-12 w-12 text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Sin resultados</h3>
            <p className="text-slate-500 text-sm max-w-xs text-center">
              No hay órdenes que coincidan con los criterios seleccionados.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <WorkOrderCard key={order.id} job={order as any} userRole={userRole} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              {/* Existing Table Code will go here, I'll update it in next chunk */}
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      ID Orden
                    </th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Fecha
                    </th>
                    {(userRole === 'profesional' || userRole === 'admin') && (
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Cliente & Ubicación
                      </th>
                    )}
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Superficie
                    </th>
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
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/work-orders/${order.uuid || order.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-400 group-hover:text-[#2e7d32] transition-colors">
                          {`#AG-${order.id}`}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm text-slate-500">
                          {order.date ? new Date(order.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                        </span>
                      </td>
                      {(userRole === 'profesional' || userRole === 'admin') && (
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {(order as any).client}
                            </span>
                            <span className="text-xs text-slate-400">
                              {order.fieldName || (order as any).location?.split(' - ')[0]} - {order.lotName || (order as any).location?.split(' - ')[1]}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {order.hectares || '0'} HA
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">
                            {order.campaign || '2023/24'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              (order as any).color === "emerald" && "bg-emerald-50 text-emerald-600",
                              (order as any).color === "blue" && "bg-blue-50 text-blue-600",
                              (order as any).color === "orange" && "bg-orange-50 text-orange-600",
                              (order as any).color === "indigo" && "bg-indigo-50 text-indigo-600"
                            )}
                          >
                            {(() => {
                              const iconName = (order as any).iconName || (order.service === 'Cosecha' ? 'Wheat' : 'Tractor');
                              const IconComponent = iconMap[iconName] || Tractor;
                              return <IconComponent className="h-4 w-4" />;
                            })()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {order.service}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <img
                            src={(order as any).operatorImage || `https://ui-avatars.com/api/?name=${(order as any).operator}&background=random`}
                            alt={(order as any).operator}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-sm text-slate-600">
                            {(order as any).operator}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                            order.status === "En Proceso" &&
                            "border-amber-100 bg-amber-50 text-amber-600",
                            order.status === "Pendiente" &&
                            "border-slate-200 bg-slate-100 text-slate-500",
                            order.status === "Completado" &&
                            "border-emerald-100 bg-emerald-50 text-emerald-600"
                          )}
                        >
                          <span
                            className={cn(
                              "mr-2 h-1.5 w-1.5 rounded-full",
                              order.status === "En Proceso" && "bg-amber-500",
                              order.status === "Pendiente" && "bg-slate-400",
                              order.status === "Completado" && "bg-emerald-500"
                            )}
                          ></span>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(userRole === 'profesional' || userRole === 'admin') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchParams({ editJob: String(order.uuid || order.id) });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); /* handle delete */ }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                title="Borrar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${order.uuid || order.id}`); }}
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
                Mostrando <span className="font-semibold text-slate-700">1-{filteredOrders.length}</span>{" "}
                de <span className="font-semibold text-slate-700">{filteredOrders.length}</span> órdenes
              </p>
              <div className="flex items-center gap-1">
                <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2e7d32] text-sm font-bold text-white shadow-sm">
                  1
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
