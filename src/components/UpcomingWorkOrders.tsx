import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, MapPin, ArrowRight } from "lucide-react";

export default function UpcomingWorkOrders() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/work-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');

      const parsedWorkOrders = await response.json();

      // Filter for active/pending work orders
      const activeWorkOrders = parsedWorkOrders
        .filter((workOrder: any) => workOrder.status !== "Completado")
        .slice(0, 5)
        .map((workOrder: any) => ({
          ...workOrder,
          date: workOrder.date ? new Date(workOrder.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Pendiente de fecha",
          location: `${workOrder.fieldName || 'Campo N/A'} - ${workOrder.lotName || 'Lote N/A'}`
        }));

      setWorkOrders(activeWorkOrders);
    } catch (error) {
      console.error('Error fetching upcoming work orders:', error);
      setWorkOrders([]);
    } finally {
      setIsLoading(false);
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
              to={`/work-orders/${String(workOrder.id).replace('#', '')}`}
              className="snap-center shrink-0 w-[280px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${workOrder.status === 'En Proceso' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {workOrder.status}
                </span>
                <span className="text-xs font-semibold text-slate-400">{`#AG-${workOrder.id}`}</span>
              </div>

              <h4 className="font-bold text-slate-900 mb-1 truncate">{workOrder.service}</h4>
              <p className="text-xs text-slate-500 mb-3 truncate">{workOrder.client}</p>

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
