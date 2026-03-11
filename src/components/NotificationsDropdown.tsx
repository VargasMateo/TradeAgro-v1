import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  CloudRain, 
  Wrench, 
  FileText, 
  X, 
  Check,
  AlertTriangle,
  Clock
} from "lucide-react";
import { cn } from "../lib/utils";

export type NotificationType = "job" | "weather" | "maintenance" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  priority?: "high" | "medium" | "low";
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "job",
    title: "Próximo Trabajo: Siembra de Maíz",
    description: "Programado para mañana a las 08:00 AM en Lote Norte.",
    time: "Hace 2 horas",
    read: false,
    priority: "high"
  },
  {
    id: "2",
    type: "weather",
    title: "Alerta Meteorológica",
    description: "Probabilidad de lluvia del 80% para el martes. Se recomienda reprogramar la fumigación del Lote Sur.",
    time: "Hace 5 horas",
    read: false,
    priority: "high"
  },
  {
    id: "3",
    type: "maintenance",
    title: "Mantenimiento Requerido",
    description: "El Tractor John Deere 6155M requiere cambio de aceite en 50 horas de uso.",
    time: "Hace 1 día",
    read: true,
    priority: "medium"
  },
  {
    id: "4",
    type: "system",
    title: "Reporte Mensual Disponible",
    description: "El reporte de rendimiento de Febrero 2026 ha sido generado exitosamente.",
    time: "Hace 2 días",
    read: true,
    priority: "low"
  }
];

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead?: () => void;
}

export default function NotificationsDropdown({ isOpen, onClose, onMarkAllRead }: NotificationsDropdownProps) {
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "job":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "weather":
        return <CloudRain className="h-5 w-5 text-amber-500" />;
      case "maintenance":
        return <Wrench className="h-5 w-5 text-orange-500" />;
      case "system":
        return <FileText className="h-5 w-5 text-emerald-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-100";
      case "medium":
        return "bg-orange-50 text-orange-700 border-orange-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-transparent lg:hidden"
          />
          
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 right-4 top-[4.5rem] z-50 mx-auto w-auto max-w-sm origin-top sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:origin-top-right"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    2 nuevas
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={onMarkAllRead}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all"
                    title="Marcar todas como leídas"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex gap-4 rounded-xl p-3 transition-all hover:bg-slate-50",
                      !notification.read && "bg-slate-50/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm bg-white",
                      notification.type === 'weather' ? "border-amber-100" : "border-slate-100"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-semibold",
                          !notification.read ? "text-slate-900" : "text-slate-600"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      
                      <p className="text-xs leading-relaxed text-slate-500">
                        {notification.description}
                      </p>
                      
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <Clock className="h-3 w-3" />
                          {notification.time}
                        </div>
                        {notification.priority === 'high' && (
                          <span className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 border border-red-100">
                            <AlertTriangle className="h-3 w-3" />
                            Alta Prioridad
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-100 bg-slate-50/50 p-2">
                <button className="w-full rounded-xl p-2 text-center text-xs font-semibold text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
