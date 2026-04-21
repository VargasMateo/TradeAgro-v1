import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, MapPin, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { authenticatedFetch } from "../lib/api";

export default function UpcomingWorkOrders({
  data,
  isLoading: propLoading,
  userRole = 'profesional'
}: {
  data?: any[],
  isLoading?: boolean,
  userRole?: 'profesional' | 'client' | 'admin'
}) {
  const [localWorkOrders, setLocalWorkOrders] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  const rawWorkOrders = data || localWorkOrders;
  const isLoading = propLoading !== undefined ? propLoading : localLoading;

  // Ensure dates are formatted correctly even when data is passed from parent
  const workOrders = rawWorkOrders.slice(0, 5).map((wo: any) => {
    // If date is already formatted (contains letters or is not ISO), keep it
    // If it's an ISO string, format it
    const isISO = wo.date && typeof wo.date === 'string' && wo.date.includes('T');
    const formattedDate = isISO
      ? new Date(wo.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : (wo.date || "Pendiente de fecha");

    return {
      ...wo,
      date: formattedDate,
      location: wo.location || `${wo.fieldName || 'Campo N/A'} - ${wo.lotName || 'Lote N/A'}`
    };
  });

  const loadWorkOrders = async () => {
    if (data) return; // Skip if data is provided via props
    setLocalLoading(true);
    try {
      const response = await authenticatedFetch('/api/work-orders');
      if (!response.ok) throw new Error('Failed to fetch jobs');

      const parsedWorkOrders = await response.json();

      // Filter for active/pending work orders
      const activeWorkOrders = parsedWorkOrders
        .filter((workOrder: any) => workOrder.status !== "Completado")
        .slice(0, 5)
        .map((workOrder: any) => ({
          ...workOrder,
          date: workOrder.date ? new Date(workOrder.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Pendiente de fecha",
          location: `${workOrder.fieldName || 'Campo N/A'} - ${workOrder.lotName || 'Lote N/A'}`,
          operator: workOrder.professionalName || "Asignación Pendiente"
        }));

      setLocalWorkOrders(activeWorkOrders);
    } catch (error) {
      console.error('Error fetching upcoming work orders:', error);
      setLocalWorkOrders([]);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();

    const handleWorkOrderCreated = () => {
      loadWorkOrders();
    };

    window.addEventListener('job-created', handleWorkOrderCreated);
    return () => {
      window.removeEventListener('job-created', handleWorkOrderCreated);
    };
  }, []);

  const SkeletonCard = () => (
    <div className="snap-center shrink-0 w-[280px] rounded-2xl border border-slate-100 p-4 shadow-sm bg-white animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-20 bg-slate-100 rounded-full"></div>
        <div className="h-4 w-16 bg-slate-50 rounded"></div>
      </div>
      <div className="h-6 w-3/4 bg-slate-100 rounded mb-2"></div>
      <div className="h-4 w-1/2 bg-slate-50 rounded mb-4"></div>
      <div className="space-y-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-slate-100 rounded-full"></div>
          <div className="h-3 w-24 bg-slate-50 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-slate-100 rounded-full"></div>
          <div className="h-3 w-32 bg-slate-50 rounded"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ClipboardList className="h-5 w-5 text-emerald-600" /> Próximas Órdenes
        </h3>
        <Link to="/work-orders" className="text-sm font-semibold text-emerald-600 hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x min-h-[160px] -mx-4 px-4 lg:-mx-8 lg:px-8">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : workOrders.length > 0 ? (
          workOrders.map((workOrder) => (
            <Link
              key={workOrder.id || Math.random()}
              to={`/work-orders/${workOrder.uuid || String(workOrder.id).replace('#', '')}`}
              className="snap-center shrink-0 w-[280px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm transition-colors",
                  workOrder.status === 'Pendiente' && "bg-slate-50 text-slate-600 border-slate-100",
                  workOrder.status === 'En Proceso' && "bg-amber-50 text-amber-600 border-amber-100",
                  workOrder.status === 'Completado' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                  workOrder.status === 'Cancelado' && "bg-red-50 text-red-600 border-red-100"
                )}>
                  {workOrder.status}
                </span>
                <span className="text-xs font-semibold text-slate-400">{`#AG-${workOrder.id}`}</span>
              </div>

              <h4 className="font-bold text-slate-900 mb-1 truncate">{workOrder.service || workOrder.title}</h4>

              <div className="mb-3">
                {userRole === 'admin' ? (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      <span className="font-bold">Cliente:</span> {workOrder.client}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      <span className="font-bold">Profesional:</span> {workOrder.operator || "Pendiente"}
                    </p>
                  </div>
                ) : userRole === 'client' ? (
                  <p className="text-xs text-slate-500 truncate font-semibold">
                    <span className="text-slate-400 font-normal">Asignado:</span> {workOrder.operator || "Pendiente"}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 truncate font-semibold">
                    <span className="text-slate-400 font-normal">Cliente:</span> {workOrder.client}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{workOrder.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{workOrder.location}</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-10 px-6 rounded-3xl border-2 border-dashed border-slate-100 bg-white">
            <ClipboardList className="h-8 w-8 mb-6 text-slate-300" />
            <h4 className="text-slate-900 font-bold text-lg mb-2 text-center">No hay órdenes programadas</h4>
            <p className="text-slate-500 text-sm text-center max-w-[320px] mb-8 leading-relaxed">
              Tu agenda está despejada por ahora...
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
