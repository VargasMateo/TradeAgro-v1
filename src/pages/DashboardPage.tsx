import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  UserPlus,
  MapPin,
  Zap,
  UserCheck,
  Clock,
  Calendar,
  BarChart3
} from "lucide-react";
import { cn } from "../lib/utils";
import Map from "../components/Map";
import UpcomingWorkOrders from "../components/UpcomingWorkOrders";
import MagneticEffect from "../components/MagneticEffect";



export default function DashboardPage({ userRole = 'profesional' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const [clients, setClients] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoadingWorkOrders, setIsLoadingWorkOrders] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true);
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching clients on dashboard:', error);
        setClients([]);
      } finally {
        setIsLoadingClients(false);
      }
    };

    const fetchWorkOrders = async () => {
      setIsLoadingWorkOrders(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/work-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch work orders');
        const data = await response.json();
        setWorkOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching work orders on dashboard:', error);
      } finally {
        setIsLoadingWorkOrders(false);
      }
    };

    const loadProfile = () => {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          const nameToUse = profile.displayName || profile.name || (userRole === 'admin' ? "Admin" : "Usuario");
          // Extract first name
          const firstName = nameToUse.split(' ')[0];
          setUserName(firstName);
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }
    };

    fetchClients();
    fetchWorkOrders();
    loadProfile();

    window.addEventListener("profile-updated", loadProfile);
    window.addEventListener("clients-updated", fetchClients);
    window.addEventListener("job-created", fetchWorkOrders);
    return () => {
      window.removeEventListener("profile-updated", loadProfile);
      window.removeEventListener("clients-updated", fetchClients);
      window.removeEventListener("job-created", fetchWorkOrders);
    };
  }, []);

  // Obtener la fecha actual formateada
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = today.toLocaleDateString('es-ES', options);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Determine el saludo según la hora
  const hour = today.getHours();
  let greeting = "Buenos días";
  if (hour >= 12 && hour < 20) {
    greeting = "Buenas tardes";
  } else if (hour >= 20 || hour < 6) {
    greeting = "Buenas noches";
  }

  const SkeletonStats = () => (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm flex flex-col justify-between h-full min-h-[110px] lg:h-32 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 bg-slate-100 rounded-lg"></div>
      </div>
      <div className="mt-2 space-y-2">
        <div className="h-3 w-20 bg-slate-50 rounded"></div>
        <div className="h-8 w-12 bg-slate-100 rounded"></div>
      </div>
    </div>
  );

  const SkeletonMap = () => (
    <div className="space-y-4 lg:col-span-2 order-5 animate-pulse">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <MapPin className="h-5 w-5 text-emerald-600" /> Mapa de Clientes
      </h3>
      <div className="h-[400px] w-full rounded-2xl bg-slate-100 border border-slate-200" />
    </div>
  );

  // Calculate real stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const ordersThisMonth = workOrders.filter(wo => {
    if (!wo.date) return false;
    const d = new Date(wo.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const ordersPending = workOrders.filter(wo => wo.status !== 'Completado').length;

  const dynamicStats = [
    {
      label: "Órdenes este mes",
      value: ordersThisMonth.toString(),
      icon: Clock,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Órdenes por hacer",
      value: ordersPending.toString(),
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const hasAnyWorkOrders = workOrders.length > 0;

  return (
    <div className="animate-in fade-in duration-500 grid grid-cols-1 gap-y-6 gap-x-8 lg:grid-cols-2">
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
        <div className={cn("space-y-4 order-2", userRole === 'admin' ? "lg:col-span-2" : "lg:col-span-1")}>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Zap className="h-5 w-5 text-emerald-600" /> Acciones Rápidas
          </h3>
          <div className={cn(
            "grid grid-cols-1 gap-3 sm:gap-4",
            userRole === 'admin' ? "sm:grid-cols-3" : "sm:grid-cols-2"
          )}>
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
            {userRole === 'admin' && (
              <MagneticEffect className="rounded-2xl">
                <Link
                  to="?newProfesional=true"
                  className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-transform hover:bg-slate-50 active:scale-[0.98] cursor-pointer lg:h-32 lg:gap-3"
                >
                  <div className="rounded-full bg-emerald-50 p-1.5 lg:p-2">
                    <UserCheck className="h-5 w-5 text-emerald-600 lg:h-6 lg:w-6" />
                  </div>
                  <span className="text-sm font-semibold lg:text-base">Crear Profesional</span>
                </Link>
              </MagneticEffect>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid - Hidden for admin, visible for profesional if there is data or loading */}
      {userRole === 'profesional' && (isLoadingWorkOrders || hasAnyWorkOrders) && (
        <div className="space-y-4 order-3 lg:col-span-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <BarChart3 className="h-5 w-5 text-emerald-600" /> Resumen de Órdenes
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
            {isLoadingWorkOrders ? (
              <>
                <SkeletonStats />
                <SkeletonStats />
              </>
            ) : dynamicStats.map((stat, i) => (
              <div key={i} className="h-full">
                <MagneticEffect className="rounded-2xl">
                  <div
                    className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm flex flex-col justify-between h-full min-h-[110px] lg:h-32"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
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
      )}

      {/* Upcoming Jobs Section - Hidden if no work orders AND not loading */}
      {(isLoadingWorkOrders || hasAnyWorkOrders) && (
        <div className="order-4 lg:col-span-2">
          <UpcomingWorkOrders data={workOrders} isLoading={isLoadingWorkOrders} />
        </div>
      )}

      {/* Map & Weather - Only for profesional and admin and if there are markers or loading */}
      {(userRole === 'profesional' || userRole === 'admin') && (() => {
        if (isLoadingClients) return <SkeletonMap />;

        const mapMarkers = clients.flatMap(client =>
          (client.fields || [])
            .filter((f: any) => f.lat != null && f.lng != null)
            .map((field: any) => ({
              position: [field.lat, field.lng] as [number, number],
              popupContent: (
                <div className="text-center p-1">
                  <p className="text-xs font-bold text-slate-900 mb-0.5">{client.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{field.name}</p>
                </div>
              )
            }))
        );

        const totalFields = clients.reduce((acc, client) => acc + (client.fields?.length || 0), 0);

        if (mapMarkers.length === 0 && !isLoadingClients) return null;

        return (
          <div className="space-y-4 order-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-emerald-600" /> Mapa de Clientes
            </h3>
            <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm z-0">
              <Map markers={mapMarkers} />
              <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm pointer-events-none border border-slate-100 transition-opacity">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {totalFields} {totalFields === 1 ? 'Campo Registrado' : 'Campos Registrados'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
