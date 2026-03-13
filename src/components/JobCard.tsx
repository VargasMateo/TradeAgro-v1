import React from "react";
import { 
  Calendar, 
  MapPin, 
  Tractor, 
  Droplets, 
  Wheat, 
  Sprout, 
  Activity,
  ArrowRight,
  TrendingUp,
  Tag
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface JobCardProps {
  job: any;
  userRole?: string;
  key?: React.Key;
}

const iconMap: any = {
  Sprout,
  Droplets,
  Wheat,
  Activity,
  Tractor,
};

export default function JobCard({ job, userRole }: JobCardProps) {
  const IconComponent = iconMap[job.iconName] || Tractor;

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
      job.status === "En Proceso" && "ring-1 ring-amber-200/50 bg-gradient-to-br from-amber-50/30 to-white",
      job.status === "Pendiente" && "bg-gradient-to-br from-slate-50/30 to-white",
      job.status === "Completado" && "ring-1 ring-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-white"
    )}>
      {/* Upper Section: Type & Status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 duration-300",
            job.color === "emerald" && "bg-emerald-50 text-emerald-600",
            job.color === "blue" && "bg-blue-50 text-blue-600",
            job.color === "orange" && "bg-orange-50 text-orange-600",
            job.color === "indigo" && "bg-indigo-50 text-indigo-600"
          )}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {job.jobCode || `#AG-${job.id}`}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-slate-500">
                {job.date ? new Date(job.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '-'}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 line-clamp-1">
              {job.title || job.service}
            </h3>
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm",
          job.status === "En Proceso" && "bg-amber-100 text-amber-700",
          job.status === "Pendiente" && "bg-slate-100 text-slate-600",
          job.status === "Completado" && "bg-emerald-100 text-emerald-700"
        )}>
          {job.status}
        </span>
      </div>

      {/* Main Info Grid */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50/80 p-3 transition-colors group-hover:bg-white border border-transparent group-hover:border-slate-100">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <MapPin className="h-3 w-3" /> UBICACIÓN
          </p>
          <p className="text-xs font-bold text-slate-800 line-clamp-1">
            {job.fieldName || (job.location && job.location.split(' - ')[0]) || '-'}
          </p>
          <p className="text-[10px] font-medium text-slate-500">
            Lote: <span className="text-slate-700">{job.lotName || (job.location && job.location.split(' - ')[1]) || '-'}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50/80 p-3 transition-colors group-hover:bg-white border border-transparent group-hover:border-slate-100">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <TrendingUp className="h-3 w-3" /> SUPERFICIE
          </p>
          <p className="text-xs font-bold text-slate-800">
            {job.hectares || '0'} <span className="text-[10px] font-medium text-slate-500">HA</span>
          </p>
          <p className="text-[10px] font-medium text-slate-500">
            Campaña: <span className="text-slate-700">{job.campaign || '-'}</span>
          </p>
        </div>
      </div>

      {/* Footer Section: Client & Professional */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Cliente</p>
          <p className="text-xs font-bold text-slate-700">{job.client}</p>
        </div>
        
        <div className="flex items-center gap-2 text-right">
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Operador</p>
            <p className="text-xs font-bold text-slate-700">{job.operator}</p>
          </div>
          <img
            src={job.operatorImage || `https://ui-avatars.com/api/?name=${job.operator}&background=random`}
            alt={job.operator}
            className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 shadow-sm"
          />
        </div>
      </div>

      {/* Action Overlay */}
      <Link 
        to={`/jobs/${String(job.id).replace('#', '')}`}
        className="absolute inset-0 z-10"
        aria-label="Ver detalles"
      />
      
      {/* Decorative arrow that appears on hover */}
      <div className="absolute top-4 right-4 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </div>
    </div>
  );
}
