import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  UserPlus,
  Download,
  RefreshCw,
  MapPin,
  CloudRain,
  Settings,
  Tractor,
  Clock,
  Calendar,
  Zap,
  BarChart3
} from "lucide-react";
import Map from "../components/Map";
import UpcomingJobs from "../components/UpcomingJobs";
import MagneticEffect from "../components/MagneticEffect";

const stats = [
  {
    label: "Trabajos este mes",
    value: "24",
    change: "+12%",
    icon: Clock,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    changeColor: "text-emerald-600",
    changeBg: "bg-emerald-100",
  },
  {
    label: "Trabajos por hacer",
    value: "09",
    change: "-2%",
    icon: Calendar,
    color: "text-amber-600",
    bg: "bg-amber-50",
    changeColor: "text-rose-600",
    changeBg: "bg-rose-100",
  },
];

const activities = [
  {
    title: "Nuevo informe generado",
    desc: "Sector Agrícola A-12 • Por Admin",
    time: "Hace 2h",
    icon: FileText,
    bg: "bg-emerald-100",
    color: "text-emerald-600",
  },
  {
    title: "Cliente registrado",
    desc: "AgroExport S.A. • Registro exitoso",
    time: "Hace 5h",
    icon: UserPlus,
    bg: "bg-emerald-100",
    color: "text-emerald-600",
  },
  {
    title: "Alerta meteorológica",
    desc: "Estación Norte • Baja de temperatura",
    time: "Ayer",
    icon: CloudRain,
    bg: "bg-amber-100",
    color: "text-amber-600",
  },
  {
    title: "Mantenimiento de sistema",
    desc: "Base de datos optimizada",
    time: "Ayer",
    icon: Settings,
    bg: "bg-slate-100",
    color: "text-slate-600",
  },
];

export default function DashboardPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const [clients, setClients] = useState<any[]>([]);
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching clients on dashboard:', error);
        setClients([]);
      }
    };

    fetchClients();
    
    const loadProfile = () => {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          if (profile.name) {
            // Extract first name or use the full name if preferred
            const firstName = profile.name.split(' ')[0];
            setUserName(firstName);
          }
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }
    };

    loadProfile();

    window.addEventListener("profile-updated", loadProfile);
    window.addEventListener("clients-updated", fetchClients);
    return () => {
      window.removeEventListener("profile-updated", loadProfile);
      window.removeEventListener("clients-updated", fetchClients);
    };
  }, []);

  // Obtener la fecha actual formateada
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = today.toLocaleDateString('es-ES', options);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Determinar el saludo según la hora
  const hour = today.getHours();
  let greeting = "Buenos días";
  if (hour >= 12 && hour < 20) {
    greeting = "Buenas tardes";
  } else if (hour >= 20 || hour < 6) {
    greeting = "Buenas noches";
  }

  return (
    <div className="animate-in fade-in duration-500 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Greeting Card */}
      <div className="lg:col-span-2 order-first">
        <div className="rounded-2xl bg-[#2e7d32] p-6 text-white shadow-md">
          <p className="text-sm font-medium text-white/80 mb-1">{capitalizedDate}</p>
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            {greeting} {userName} <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
          </h2>
          <p className="text-sm font-medium text-white/90">Resumen rápido de tu negocio</p>
        </div>
      </div>

      {/* Quick Actions - Only for profesional and admin */}
      {(userRole === 'profesional' || userRole === 'admin') && (
        <div className="space-y-4 order-2 lg:col-span-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Zap className="h-5 w-5 text-emerald-600" /> Acciones Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MagneticEffect className="rounded-2xl">
              <Link
                to="?newJob=true"
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[#2e4a33] text-white shadow-sm transition-transform active:scale-[0.98] cursor-pointer lg:h-32 lg:gap-3"
              >
                <div className="rounded-full bg-white/20 p-1.5 lg:p-2">
                  <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <span className="text-sm font-semibold lg:text-base">Nuevo Trabajo</span>
              </Link>
            </MagneticEffect>
            <MagneticEffect className="rounded-2xl">
              <Link 
                to="?newClient=true"
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-transform hover:bg-slate-50 active:scale-[0.98] cursor-pointer lg:h-32 lg:gap-3"
              >
                <div className="rounded-full bg-slate-100 p-1.5 lg:p-2">
                  <UserPlus className="h-5 w-5 text-slate-600 lg:h-6 lg:w-6" />
                </div>
                <span className="text-sm font-semibold lg:text-base">Añadir Cliente</span>
              </Link>
            </MagneticEffect>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className={`space-y-4 order-3 ${userRole === 'client' ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <BarChart3 className="h-5 w-5 text-emerald-600" /> Resumen de Trabajos
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
          {stats.map((stat, i) => (
            <div key={i} className="h-full">
              <MagneticEffect className="rounded-2xl">
              <div
                className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm flex flex-col justify-between h-full min-h-[110px] lg:h-32"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  {stat.change && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stat.changeBg} ${stat.changeColor}`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-500 truncate">
                    {stat.label}
                  </p>
                  <h3 className="mt-0.5 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h3>
                </div>
              </div>
              </MagneticEffect>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Jobs Section */}
      <div className="order-4 lg:col-span-2">
        <UpcomingJobs />
      </div>

      {/* Map & Weather - Only for profesional and admin */}
      {(userRole === 'profesional' || userRole === 'admin') && (
        <div className="rounded-[2rem] bg-slate-100 p-6 lg:col-span-2 order-5">
          <div className="grid grid-cols-1 gap-8">
            {/* Map Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <MapPin className="h-5 w-5 text-[#2e4a33]" /> Mapa de Clientes
              </h3>
              <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm z-0">
                <Map 
                  markers={clients.filter(c => c.lat && c.lng).map(client => ({
                    position: [client.lat, client.lng],
                    popupContent: (
                      <div className="text-center">
                        <strong className="block text-sm text-slate-900">{client.name}</strong>
                        <span className="text-xs text-slate-500">
                          {client.fields && client.fields.length > 0 
                            ? (typeof client.fields[0] === 'string' ? client.fields[0] : client.fields[0].name) 
                            : 'Sin campo'}
                        </span>
                      </div>
                    )
                  }))}
                />
                <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm pointer-events-none">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                  {clients.length} Clientes Registrados
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
