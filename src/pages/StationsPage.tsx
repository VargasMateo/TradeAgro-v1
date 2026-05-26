import React, { useState, useEffect } from "react";
import {
  Thermometer,
  ThermometerSun,
  Droplets,
  Wind,
  Gauge,
  Battery,
  Signal,
  MapPin,
  Clock,
  Cloud,
  Activity
} from "lucide-react";
import { authenticatedFetch } from "../lib/api";

interface WeatherDevice {
  name: string;
  dId: string;
  templateName?: string;
}

interface SensorData {
  _id: string;
  userId: string;
  dId: string;
  variable: string;
  time: number;
  value: {
    temp1min: number;
    temp1max: number;
    temp1avg: number;
    hum1min: number;
    hum1max: number;
    hum1avg: number;
    presmin: number;
    presmax: number;
    presavg: number;
    velmin: number;
    velmax: number;
    velavg: number;
    dirmin: number;
    dirmax: number;
    diravg: number;
    dir: number;
    dirq: string;
    rafaga: number;
    rafaga_dir: number;
    rafaga_dirq: string;
    dt: number;
    dtq: string;
    dtc: string;
    cond: string;
    label: string;
    color: string;
    bat: number;
    sen_cel: number;
    lat: number;
    lng: number;
    [key: string]: any;
  };
}

// Approximation of Magnus formula for Dew Point
const calculateDewPoint = (temp: number | undefined, hum: number | undefined) => {
  if (temp === undefined || hum === undefined) return undefined;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100.0);
  return (b * alpha) / (a - alpha);
};

const formatNumber = (num: number | undefined, decimals = 1, fallback = '--') => {
  if (num === undefined || num === null || isNaN(num)) return fallback;
  return num.toFixed(decimals);
};

const StationSkeleton = () => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 col-span-1 md:col-span-3">
        {/* Metric Cards x4 */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-span-1 flex flex-col justify-center rounded-2xl bg-white border border-slate-100 p-6 shadow-sm relative overflow-hidden h-52">
            <div className="relative z-10 flex flex-col items-center text-center w-full animate-pulse">
              <div className="h-12 w-32 bg-slate-100 rounded-xl mb-3" />
              <div className="h-4 w-24 bg-slate-50 rounded mb-4" />
              <div className="h-4 w-20 bg-slate-50 rounded mb-1.5" />
              <div className="h-4 w-20 bg-slate-50 rounded" />
            </div>
          </div>
        ))}

        {/* Dew Point */}
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center rounded-2xl bg-white border border-slate-100 p-6 shadow-sm relative overflow-hidden h-48">
          <div className="relative z-10 flex flex-col items-center text-center animate-pulse">
            <div className="h-12 w-32 bg-slate-100 rounded-xl mb-3" />
            <div className="h-4 w-32 bg-slate-50 rounded mb-4" />
            <div className="flex gap-6">
              <div className="h-4 w-20 bg-slate-50 rounded" />
              <div className="h-4 w-20 bg-slate-50 rounded" />
            </div>
          </div>
        </div>

        {/* Delta T */}
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center rounded-2xl bg-white border border-slate-100 p-6 shadow-sm relative overflow-hidden h-48">
          <div className="relative z-10 flex flex-col items-center text-center animate-pulse">
            <div className="h-16 w-40 bg-slate-100 rounded-xl mb-3" />
            <div className="h-4 w-24 bg-slate-50 rounded mb-4" />
            <div className="h-8 w-32 bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 h-14 w-full rounded-xl bg-white border border-slate-100 shadow-sm animate-pulse col-span-1 md:col-span-3" />
    </div>
  </>
);

export default function StationsPage() {
  const [devices, setDevices] = useState<WeatherDevice[]>([]);
  const [selectedDid, setSelectedDid] = useState<string>("");
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch devices list on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch('/backend/weather-stations/devices');
        if (!res.ok) throw new Error('Failed to fetch devices');
        const json = await res.json();
        
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          setDevices(json.data);
          setSelectedDid(json.data[0].dId);
        } else {
          throw new Error('No weather devices found');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error fetching devices');
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // 2. Fetch sensor data when selected station changes
  useEffect(() => {
    if (!selectedDid) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch(`/backend/weather-stations?dId=${selectedDid}`);
        if (!res.ok) throw new Error('Failed to fetch sensor data');
        const json = await res.json();
        
        if (json.status === 'success' && json.data && json.data.length > 0) {
          setData(json.data[0]);
          setError(null);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDid]);

  const val = data?.value;
  const lastUpdate = data ? new Date(data.time).toLocaleString('es-AR') : null;

  const dpCurrent = val ? formatNumber(calculateDewPoint(val.temp1avg, val.hum1avg), 1) : '--';
  const dpMin = val ? formatNumber(calculateDewPoint(val.temp1min, val.hum1min), 1) : '--';
  const dpMax = val ? formatNumber(calculateDewPoint(val.temp1max, val.hum1max), 1) : '--';

  // Parse colors. Convert API color to RGB/rgba if needed or just use it directly.
  const deltaColor = val?.color || "#808080";
  const deltaLabel = val?.label || "N/D";

  const selectedDeviceName = devices.find(d => d.dId === selectedDid)?.name || "Nodo Celular";

  return (
    <div className="animate-in fade-in duration-500 pb-10 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Cloud className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Estación {selectedDeviceName}
            </h1>
          </div>
          <div className="text-sm text-slate-500 md:text-lg flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4" /> 
            {lastUpdate ? (
              <span className="flex items-center gap-2">
                Actualizado: {lastUpdate}
                {loading && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </span>
            ) : (
              <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
            )}
          </div>
        </div>

        {/* Station Selector Dropdown */}
        {devices.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full md:w-auto md:min-w-[280px]">
            <label htmlFor="station-selector" className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Seleccionar Central
            </label>
            <div className="relative">
              <select
                id="station-selector"
                value={selectedDid}
                onChange={(e) => setSelectedDid(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-3 pr-10 rounded-xl shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer text-sm"
              >
                {devices.map((device) => (
                  <option key={device.dId} value={device.dId}>
                    {device.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && !data ? (
        <StationSkeleton />
      ) : error && !data ? (
        <div className="flex h-64 items-center justify-center">
          <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : data && val ? (
        <div key={selectedDid} className={`transition-all duration-300 ease-in-out ${loading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 col-span-1 md:col-span-3">
          
          {/* Temperature */}
          <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-sky-50 border border-sky-100 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-10">
              <Thermometer className="h-24 w-24 text-sky-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-5xl font-black text-sky-900">{formatNumber(val.temp1avg, 1)}°C</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-sky-600/80">TEMPERATURA</p>
              <div className="mt-3 flex flex-col text-sm font-bold gap-0.5">
                <span className="text-sky-700">Min: {formatNumber(val.temp1min, 1)}°C</span>
                <span className="text-rose-600">Max: {formatNumber(val.temp1max, 1)}°C</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '40ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-5">
              <Droplets className="h-24 w-24 text-sky-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-5xl font-black">{formatNumber(val.hum1avg, 1)}%</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">HUMEDAD</p>
              <div className="mt-3 flex flex-col text-sm font-bold gap-0.5">
                <span className="text-sky-600">Min: {formatNumber(val.hum1min, 1)}%</span>
                <span className="text-rose-600">Max: {formatNumber(val.hum1max, 1)}%</span>
              </div>
            </div>
          </div>

          {/* Pressure */}
          <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-5">
              <Gauge className="h-24 w-24 text-slate-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-5xl font-black">{formatNumber(val.presavg, 1)}</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">PRESIÓN (hPa)</p>
              <div className="mt-3 flex flex-col text-sm font-bold gap-0.5">
                <span className="text-sky-600">Min: {formatNumber(val.presmin, 1)}</span>
                <span className="text-rose-600">Max: {formatNumber(val.presmax, 1)}</span>
              </div>
            </div>
          </div>

          {/* Wind */}
          <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-5">
              <Wind className="h-24 w-24 text-sky-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-5xl font-black">{formatNumber(val.velavg, 1)} <span className="text-3xl">km/h</span></h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">VIENTO {val.dirq || '--'}</p>
              <div className="mt-3 flex flex-col text-sm font-bold gap-0.5">
                <span className="text-sky-600">Min: {formatNumber(val.velmin, 1)}</span>
                <span className="text-rose-600">Max: {formatNumber(val.velmax, 1)}</span>
              </div>
            </div>
          </div>

          {/* Dew Point */}
          <div className="col-span-1 md:col-span-2 flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '160ms' }}>
             <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-5">
              <ThermometerSun className="h-24 w-24 text-amber-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-5xl font-black">{dpCurrent}°C</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">PUNTO DE ROCÍO</p>
              <div className="mt-3 flex flex-row gap-6 text-sm font-bold">
                <span className="text-sky-600">Min: {dpMin}°C</span>
                <span className="text-rose-600">Max: {dpMax}°C</span>
              </div>
            </div>
          </div>

          {/* Delta T */}
          <div 
            className="col-span-1 md:col-span-2 flex flex-col justify-center rounded-2xl p-6 shadow-sm relative overflow-hidden animate-fade-in-up"
            style={{ 
              backgroundColor: deltaColor !== "#808080" ? `${deltaColor}15` : "#F8FAFC",
              border: `2px solid ${deltaColor !== "#808080" ? deltaColor : "#E2E8F0"}`,
              animationDelay: '200ms'
            }}
          >
            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-10">
              <Thermometer className="h-24 w-24" style={{ color: deltaColor !== "#808080" ? deltaColor : "#64748B" }} />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-6xl font-black" style={{ color: deltaColor !== "#808080" ? deltaColor : "#334155" }}>{formatNumber(val.dt, 1)}°C</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">DELTA T</p>
              <div className="mt-4 flex items-center gap-2 rounded-full px-4 py-1.5 font-bold text-white shadow-sm" style={{ backgroundColor: deltaColor }}>
                <Activity className="h-4 w-4" />
                {deltaLabel}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white border border-slate-200 p-4 px-8 text-sm font-bold text-slate-700 shadow-sm animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2">
            <Battery className="h-5 w-5 text-slate-400" />
            Batería: {formatNumber(val.bat, 1)}%
          </div>
          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <Signal className="h-5 w-5 text-slate-400" />
            Señal Celular: {val.sen_cel ?? '--'}%
          </div>
          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            Lat: {formatNumber(val.lat, 4)}
          </div>
          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            Lng: {formatNumber(val.lng, 4)}
          </div>
        </div>
        </div>
        </div>
      ) : null}

    </div>
  );
}
