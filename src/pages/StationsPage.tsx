import { useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Calendar,
  MapPin,
  Search,
  Filter,
  CloudLightning,
  CloudDrizzle,
  CloudSun,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";

// Weather Configuration Map
const weatherConfig: any = {
  "Despejado": {
    icon: Sun,
    color: "bg-sky-500",
    iconColor: "text-yellow-300",
    gradient: "from-sky-400 to-sky-600"
  },
  "Soleado": {
    icon: Sun,
    color: "bg-blue-500",
    iconColor: "text-yellow-300",
    gradient: "from-blue-400 to-blue-600"
  },
  "Parc. Nublado": {
    icon: CloudSun,
    color: "bg-indigo-500",
    iconColor: "text-yellow-200",
    gradient: "from-indigo-400 to-indigo-600"
  },
  "Nublado": {
    icon: Cloud,
    color: "bg-slate-500",
    iconColor: "text-slate-200",
    gradient: "from-slate-400 to-slate-600"
  },
  "Lluvia": {
    icon: CloudRain,
    color: "bg-cyan-700",
    iconColor: "text-cyan-200",
    gradient: "from-cyan-600 to-cyan-800"
  },
  "Tormentas": {
    icon: CloudLightning,
    color: "bg-violet-800",
    iconColor: "text-yellow-400",
    gradient: "from-violet-700 to-violet-900"
  },
  "Llovizna": {
    icon: CloudDrizzle,
    color: "bg-teal-600",
    iconColor: "text-teal-200",
    gradient: "from-teal-500 to-teal-700"
  },
  "Ventoso": {
    icon: Wind,
    color: "bg-emerald-600",
    iconColor: "text-emerald-200",
    gradient: "from-emerald-500 to-emerald-700"
  },
  "Caluroso": {
    icon: Sun,
    color: "bg-orange-500",
    iconColor: "text-yellow-100",
    gradient: "from-orange-400 to-orange-600"
  }
};

// Mock Data for Stations/Fields
const stations = [
  {
    id: 1,
    client: "AgroExport S.A.",
    field: "Campo Norte",
    location: "Pergamino, Buenos Aires",
    weather: {
      today: { temp: 24, condition: "Despejado", humidity: 45, wind: "12 km/h", precip: "0%", uv: "Alto" },
      tomorrow: { temp: 22, condition: "Parc. Nublado", humidity: 55, wind: "15 km/h", precip: "10%", uv: "Medio" },
      next: { temp: 18, condition: "Lluvia", humidity: 82, wind: "22 km/h", precip: "90%", uv: "Bajo" },
    }
  },
  {
    id: 2,
    client: "Finca La Estela",
    field: "Lote Los Olivos",
    location: "Mendoza, Argentina",
    weather: {
      today: { temp: 28, condition: "Soleado", humidity: 30, wind: "8 km/h", precip: "0%", uv: "Muy Alto" },
      tomorrow: { temp: 29, condition: "Caluroso", humidity: 28, wind: "10 km/h", precip: "0%", uv: "Muy Alto" },
      next: { temp: 26, condition: "Ventoso", humidity: 35, wind: "35 km/h", precip: "5%", uv: "Alto" },
    }
  },
  {
    id: 3,
    client: "Juan Pérez",
    field: "Sector Río",
    location: "Rosario, Santa Fe",
    weather: {
      today: { temp: 21, condition: "Nublado", humidity: 65, wind: "18 km/h", precip: "20%", uv: "Bajo" },
      tomorrow: { temp: 19, condition: "Tormentas", humidity: 88, wind: "25 km/h", precip: "80%", uv: "Bajo" },
      next: { temp: 20, condition: "Llovizna", humidity: 75, wind: "15 km/h", precip: "40%", uv: "Bajo" },
    }
  },
  {
    id: 4,
    client: "Cooperativa Sur",
    field: "Parcela 4B",
    location: "Balcarce, Buenos Aires",
    weather: {
      today: { temp: 18, condition: "Ventoso", humidity: 50, wind: "28 km/h", precip: "10%", uv: "Medio" },
      tomorrow: { temp: 16, condition: "Nublado", humidity: 55, wind: "20 km/h", precip: "15%", uv: "Bajo" },
      next: { temp: 17, condition: "Despejado", humidity: 48, wind: "12 km/h", precip: "0%", uv: "Medio" },
    }
  },
  {
    id: 5,
    client: "Los Alamos",
    field: "Viñedo Principal",
    location: "San Rafael, Mendoza",
    weather: {
      today: { temp: 26, condition: "Despejado", humidity: 35, wind: "5 km/h", precip: "0%", uv: "Alto" },
      tomorrow: { temp: 27, condition: "Soleado", humidity: 32, wind: "8 km/h", precip: "0%", uv: "Alto" },
      next: { temp: 25, condition: "Parc. Nublado", humidity: 40, wind: "12 km/h", precip: "0%", uv: "Medio" },
    }
  },
  {
    id: 6,
    client: "Campo Verde",
    field: "Lote Maíz",
    location: "Venado Tuerto, Santa Fe",
    weather: {
      today: { temp: 23, condition: "Parc. Nublado", humidity: 60, wind: "14 km/h", precip: "5%", uv: "Medio" },
      tomorrow: { temp: 25, condition: "Despejado", humidity: 55, wind: "16 km/h", precip: "0%", uv: "Alto" },
      next: { temp: 28, condition: "Caluroso", humidity: 50, wind: "20 km/h", precip: "0%", uv: "Muy Alto" },
    }
  }
];

// Helper to generate days
const generateDays = (count: number) => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    let label = '';
    if (i === 0) label = 'Hoy';
    else if (i === 1) label = 'Mañana';
    else if (i === 2) label = 'Pasado';
    else {
      // Format: "Lun", "Mar", etc.
      label = date.toLocaleDateString('es-ES', { weekday: 'short' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    days.push({
      key: date.toISOString().split('T')[0], // YYYY-MM-DD
      label,
      date: dateStr,
      index: i
    });
  }
  return days;
};

export default function StationsPage() {
  const [days] = useState(() => generateDays(14)); // Generate 14 days
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [scrollIndex, setScrollIndex] = useState(0);

  const VISIBLE_DAYS = 3; // Number of days visible at once

  const handlePrev = () => {
    setScrollIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setScrollIndex(prev => Math.min(days.length - VISIBLE_DAYS, prev + 1));
  };

  const visibleDays = days.slice(scrollIndex, scrollIndex + VISIBLE_DAYS);

  return (
    <div className="animate-in fade-in duration-500 space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Estaciones Meteorológicas
          </h1>
          <p className="text-sm text-slate-500 md:text-lg">
            Monitoreo climático en tiempo real de sus campos.
          </p>
        </div>

        {/* Day Filter / Slider */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={handlePrev}
            disabled={scrollIndex === 0}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1 overflow-hidden">
            {visibleDays.map((day) => (
              <button
                key={day.key}
                onClick={() => setSelectedDayIndex(day.index)}
                className={cn(
                  "flex w-24 flex-col items-center rounded-lg px-2 py-2 text-sm font-medium transition-all cursor-pointer",
                  selectedDayIndex === day.index
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                )}
              >
                <span className="leading-none">{day.label}</span>
                <span className="mt-1 text-[10px] opacity-70">{day.date}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={scrollIndex >= days.length - VISIBLE_DAYS}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por campo, cliente o ubicación..."
          className="w-full rounded-2xl border-none bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {stations.map((station) => {
          // Logic to cycle through mock data for extended days
          const mockKeys = ['today', 'tomorrow', 'next'];
          const key = selectedDayIndex < 3
            ? mockKeys[selectedDayIndex]
            : mockKeys[selectedDayIndex % 3];

          const weather = (station.weather as any)[key];
          const config = weatherConfig[weather.condition] || weatherConfig["Despejado"];
          const WeatherIcon = config.icon;

          return (
            <div key={station.id} className="h-full">
              <MagneticEffect className="rounded-[2rem]">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] p-8 text-white shadow-lg transition-all hover:shadow-xl bg-gradient-to-br h-full",
                  config.gradient
                )}
              >
                {/* Background Pattern */}
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-110"></div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 opacity-90">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">{station.location}</span>
                      </div>
                      <h3 className="mt-1 text-xl font-bold">{station.field}</h3>
                      <p className="text-sm opacity-75">{station.client}</p>
                    </div>
                    <WeatherIcon className={cn("h-14 w-14 drop-shadow-lg", config.iconColor)} />
                  </div>

                  {/* Main Temp */}
                  <div className="mt-8">
                    <h2 className="text-6xl font-bold tracking-tighter">
                      {weather.temp}°C
                    </h2>
                    <p className="mt-2 text-lg font-medium opacity-90">
                      {weather.condition} • Humedad {weather.humidity}%
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        VIENTO
                      </p>
                      <p className="mt-1 text-lg font-bold">{weather.wind}</p>
                    </div>
                    <div className="text-center border-l border-white/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        PRECIP.
                      </p>
                      <p className="mt-1 text-lg font-bold">{weather.precip}</p>
                    </div>
                    <div className="text-center border-l border-white/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        UV
                      </p>
                      <p className="mt-1 text-lg font-bold">{weather.uv}</p>
                    </div>
                  </div>
                </div>
              </div>
              </MagneticEffect>
            </div>
          );
        })}
      </div>
    </div>
  );
}
