import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  Activity,
  CloudRain,
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
    rain?: number;
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

const timeAgo = (timestamp: number | undefined) => {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
};

const StationSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 col-span-1 lg:col-span-2">
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

      {/* Diagnostics */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 animate-pulse">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 animate-pulse ${i === 3 ? 'sm:col-span-2' : ''}`}>
              <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-5 w-32 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Map Panel Skeleton */}
    <div className="col-span-1 h-[600px] lg:h-auto min-h-[500px]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 w-full h-full relative overflow-hidden animate-pulse">
        <div className="w-full h-full bg-slate-100 rounded-xl" />
      </div>
    </div>
  </div>
);

import Map from "../components/Map";
import MeteoReport from "../components/MeteoReport";
import MeteoComparison from "../components/MeteoComparison";

export default function StationsPage() {
  const [devices, setDevices] = useState<WeatherDevice[]>([]);
  const [selectedDid, setSelectedDid] = useState<string>("");
  const [data, setData] = useState<SensorData | null>(null);
  const [allStationsData, setAllStationsData] = useState<Record<string, SensorData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState(() => {
    const stored = localStorage.getItem("userProfile");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Diagnostic states
  const [debugToken, setDebugToken] = useState<string>("");
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string>("");

  const fetchDebugToken = async () => {
    try {
      const res = await authenticatedFetch('/backend/weather-stations/debug-token');
      if (res.ok) {
        const json = await res.json();
        setDebugToken(json.token || "No hay token activo");
      }
    } catch (e) {
      console.error('Error fetching debug token:', e);
    }
  };

  const handleResetToken = async () => {
    try {
      setDebugLoading(true);
      const res = await authenticatedFetch('/backend/weather-stations/debug-reset-token', {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        setDebugToken(json.token);
        setDebugMessage("¡Token invalidado con éxito! Cuando recargues o cambies de central, la consola del backend mostrará el intento fallido (401), se re-autenticará en MKL en milisegundos y recuperará los datos perfectamente.");
        setTimeout(() => setDebugMessage(""), 10000);
      }
    } catch (e: any) {
      console.error(e);
      alert('Error invalidando token');
    } finally {
      setDebugLoading(false);
    }
  };

// Module-level cache to prevent refetching when navigating back and forth
let globalDevicesCache: any[] | null = null;
let globalDevicesCacheTime = 0;

  // 1. Fetch devices list on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        if (globalDevicesCache && Date.now() - globalDevicesCacheTime < 5 * 60 * 1000) {
          setDevices(globalDevicesCache);
          const searchParams = new URLSearchParams(window.location.search);
          const paramDid = searchParams.get('dId');
          
          if (paramDid && globalDevicesCache.some((d: any) => d.dId === paramDid)) {
            setSelectedDid(paramDid);
          } else {
            setSelectedDid(globalDevicesCache[0].dId);
          }
          return;
        }

        setLoading(true);
        
        // Refresh user profile first
        let currentProfile = userProfile;
        try {
          const profileRes = await authenticatedFetch('/backend/auth/me');
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            if (profileJson.success && profileJson.user) {
              const updatedProfile = { ...currentProfile, ...profileJson.user };
              localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
              setUserProfile(updatedProfile);
              currentProfile = updatedProfile;
              window.dispatchEvent(new Event('profile-updated'));
            }
          }
        } catch (e) {
          console.error("Failed to refresh user profile", e);
        }

        const res = await authenticatedFetch('/backend/weather-stations/devices');
        if (!res.ok) throw new Error('Failed to fetch devices');
        const json = await res.json();
        
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          const isClient = currentProfile?.role === 'client';
          
          const filteredDevices = json.data.filter((device: WeatherDevice) => {
            const isSprayMonitor = device.name.toLowerCase().includes('monitor de pulverizaci') || device.name.toLowerCase().includes('pulveriz');
            if (isSprayMonitor && isClient && !currentProfile?.hasSprayMonitor) {
              return false;
            }
            if (isClient && Array.isArray(currentProfile?.allowedStations)) {
              if (!currentProfile.allowedStations.includes(device.dId)) {
                return false;
              }
            }
            return true;
          }).sort((a: WeatherDevice, b: WeatherDevice) => a.name.localeCompare(b.name));

          if (filteredDevices.length > 0) {
            globalDevicesCache = filteredDevices;
            globalDevicesCacheTime = Date.now();
            setDevices(filteredDevices);
            const searchParams = new URLSearchParams(window.location.search);
            const paramDid = searchParams.get('dId');
            
            if (paramDid && filteredDevices.some((d: any) => d.dId === paramDid)) {
              setSelectedDid(paramDid);
            } else {
              setSelectedDid(filteredDevices[0].dId);
            }
          } else {
            throw new Error('No hay estaciones disponibles para tu perfil');
          }
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
    fetchDebugToken();
  }, []);

  // 2. Fetch sensor data for ALL devices so we have coordinates for the map
  useEffect(() => {
    if (devices.length === 0) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const results: Record<string, SensorData> = {};
        
        // Fetch all devices in parallel
        await Promise.all(devices.map(async (device) => {
          const res = await authenticatedFetch(`/backend/weather-stations?dId=${device.dId}`);
          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data && json.data.length > 0) {
              results[device.dId] = json.data[0];
            }
          }
        }));

        setAllStationsData(results);
        setError(null);
        fetchDebugToken(); // Refresh token in UI
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [devices]);

  // 3. Update active data when selection changes
  useEffect(() => {
    if (selectedDid && allStationsData[selectedDid]) {
      setData(allStationsData[selectedDid]);
    }
  }, [selectedDid, allStationsData]);

  const val = data?.value;
  const lastUpdate = data ? new Date(data.time).toLocaleString('es-AR') : null;

  const dpCurrent = val ? formatNumber(calculateDewPoint(val.temp1avg, val.hum1avg), 1) : '--';
  const dpMin = val && val.dpMin !== undefined ? formatNumber(val.dpMin, 1) : (val ? formatNumber(calculateDewPoint(val.temp1min, val.hum1min), 1) : '--');
  const dpMax = val && val.dpMax !== undefined ? formatNumber(val.dpMax, 1) : (val ? formatNumber(calculateDewPoint(val.temp1max, val.hum1max), 1) : '--');

  // Parse colors. Map Spanish color names from the API to hex, with a keyword fallback.
  const getDeltaTColorAndLabel = () => {
    const rawLabel = val?.cond || val?.dtq || val?.label || "N/D";
    const rawColor = val?.dtc || "";
    
    console.log("[Delta T Debug] dtc (API Spanish color):", val?.dtc, "| color (API Hex color):", val?.color, "| label (dtq/label):", rawLabel);
    
    // Map Spanish color name values from MKL API to valid hex colors
    const colorMap: Record<string, string> = {
      'verde': '#10B981',       // Green
      'verde_claro': '#10B981', // Map light green to our emerald green for consistent styling
      'amarillo': '#F59E0B',    // Amber/Yellow
      'naranja': '#F97316',     // Orange
      'rojo': '#EF4444',        // Red
    };

    const cleanColorKey = rawColor.toLowerCase().trim();
    if (colorMap[cleanColorKey]) {
      return { color: colorMap[cleanColorKey], label: rawLabel };
    }

    // Fallback: keyword mapping from text labels
    const labelUpper = rawLabel.toUpperCase();
    let color = val?.color || "#808080";
    
    if (
      labelUpper.includes("OPTIMO") || 
      labelUpper.includes("ÓPTIMO") || 
      labelUpper.includes("BUENO") || 
      labelUpper.includes("EXCELENTE") || 
      labelUpper.includes("OK")
    ) {
      color = "#10B981"; // Emerald green
    } else if (
      labelUpper.includes("PRECAUCION") || 
      labelUpper.includes("PRECAUCIÓN") || 
      labelUpper.includes("MODERADO") || 
      labelUpper.includes("ALERTA")
    ) {
      color = "#F59E0B"; // Amber yellow
    } else if (
      labelUpper.includes("NO APLICAR") || 
      labelUpper.includes("CRITICO") || 
      labelUpper.includes("CRÍTICO") || 
      labelUpper.includes("PELIGRO")
    ) {
      color = "#EF4444"; // Red
    }
    
    return { color, label: rawLabel };
  };

  const { color: deltaColor, label: deltaLabel } = getDeltaTColorAndLabel();

  const selectedDevice = devices.find(d => d.dId === selectedDid);
  const selectedDeviceName = selectedDevice?.name || "Nodo Celular";

  const hasRainSupport = !!(
    selectedDevice?.name.toLowerCase().includes("pluvio") ||
    selectedDevice?.name.toLowerCase().includes("pluviometro") ||
    selectedDevice?.templateName?.toLowerCase().includes("pluvio") ||
    selectedDevice?.templateName?.toLowerCase().includes("pluviometro")
  );

  // Prepare map markers grouped by base name
  const groupedMarkers: Record<string, any[]> = {};
  
  (Object.values(allStationsData) as SensorData[])
    .filter(d => d.value?.lat && d.value?.lng)
    .forEach(d => {
      const dev = devices.find(x => x.dId === d.dId);
      const label = dev?.name || d.dId;
      const baseName = label.split(' - ')[0].trim();
      
      // Using base name as the key groups them even if coordinates vary slightly
      const key = baseName;
      if (!groupedMarkers[key]) groupedMarkers[key] = [];
      groupedMarkers[key].push({
        id: d.dId,
        position: [d.value.lat, d.value.lng] as [number, number],
        label: label,
        isSelected: d.dId === selectedDid,
      });
    });

  const mapMarkers = Object.values(groupedMarkers).map(group => {
    const isSelected = group.some(m => m.isSelected);
    const baseName = group[0].label.split(' - ')[0].trim() || group[0].label;
    
    return {
      id: group[0].id,
      position: group[0].position,
      label: baseName,
      isSelected,
      isGroup: group.length > 1,
      groupItems: group.map(g => ({
        id: g.id,
        label: g.label,
        isSelected: g.isSelected
      })),
      onClick: (childId?: string) => {
        if (childId) {
          setSelectedDid(childId);
        } else {
          setSelectedDid(group[0].id);
        }
      }
    };
  });

  return (
    <div className="animate-in fade-in duration-500 pb-10 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Estación {selectedDeviceName}
          </h1>
          <div className="text-sm text-slate-500 md:text-lg flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4" /> 
            {data?.time ? (
              <span className="flex items-center gap-2">
                Actualizado: {timeAgo(data.time)}
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
        {loading && devices.length === 0 ? (
          <div className="flex flex-col gap-1.5 w-full md:w-auto md:min-w-[280px]">
            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-11 w-full rounded-xl bg-slate-100 animate-pulse border border-slate-100" />
          </div>
        ) : devices.length > 0 ? (
          <div className="flex flex-col gap-1.5 w-full md:w-auto md:min-w-[280px]">
            <label htmlFor="station-selector" className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              Seleccionar Estación
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
        ) : null}
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
        <div className={`transition-all duration-300 ease-in-out ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 col-span-1 lg:col-span-2">
          
          {/* Temperature */}
          <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-sky-50 border border-sky-100 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-10">
              <Thermometer className="h-24 w-24 text-sky-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-4xl font-black text-sky-900">{formatNumber(val.temp1avg, 1)}°C</h2>
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
              <h2 className="text-4xl font-black">{formatNumber(val.hum1avg, 1)}%</h2>
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
              <h2 className="text-4xl font-black">{formatNumber(val.presavg, 1)}</h2>
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
              <h2 className="text-4xl font-black">{formatNumber(val.velavg, 1)} <span className="text-2xl">km/h</span></h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">VIENTO {val.dirq || '--'}</p>
              <div className="mt-3 flex flex-col text-sm font-bold gap-0.5">
                <span className="text-sky-600">Min: {formatNumber(val.velmin, 1)}</span>
                <span className="text-rose-600">Max: {formatNumber(val.velmax, 1)}</span>
              </div>
            </div>
          </div>

          {/* Rain */}
          {hasRainSupport && val.rain !== undefined && val.rain !== null && (
            <div className="col-span-1 flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '140ms' }}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-5">
                <CloudRain className="h-24 w-24 text-sky-500" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <h2 className="text-4xl font-black">{formatNumber(val.rain, 1)} <span className="text-2xl">mm</span></h2>
                <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">LLUVIA DEL DÍA</p>
                <div className="mt-3 flex flex-col text-sm font-bold gap-0.5 text-indigo-600/85">
                  <span>Acumulada desde 00:00</span>
                </div>
              </div>
            </div>
          )}

          {/* Dew Point */}
          <div className={`col-span-1 ${hasRainSupport && val.rain !== undefined && val.rain !== null ? '' : 'md:col-span-2'} flex flex-col justify-center rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-sm relative overflow-hidden animate-fade-in-up`} style={{ animationDelay: '160ms' }}>
             <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-5">
              <ThermometerSun className="h-24 w-24 text-amber-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-4xl font-black">{dpCurrent}°C</h2>
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
              <h2 className="text-5xl font-black" style={{ color: deltaColor !== "#808080" ? deltaColor : "#334155" }}>{formatNumber(val.dt, 1)}°C</h2>
              <p className="mt-1 text-sm font-bold tracking-widest text-slate-500">DELTA T</p>
              <div className="mt-4 flex items-center gap-2 rounded-full px-4 py-1.5 font-bold text-white shadow-sm" style={{ backgroundColor: deltaColor }}>
                <Activity className="h-4 w-4" />
                {deltaLabel}
              </div>
            </div>
          </div>

          {/* Diagnostics & Device Health Panel */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Diagnóstico y Conectividad de la Estación
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Battery Status */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs shrink-0">
                  <Battery className={`h-6 w-6 ${val.bat > 50 ? 'text-emerald-500' : val.bat > 20 ? 'text-amber-500' : 'text-rose-500 animate-pulse'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batería</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-black text-slate-800">{formatNumber(val.bat, 1)}%</span>
                    {/* Visual Battery Level Bar */}
                    <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block shrink-0">
                      <div 
                        className={`h-full rounded-full ${val.bat > 50 ? 'bg-emerald-500' : val.bat > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, val.bat))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signal Strength */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs shrink-0">
                  <Signal className={`h-6 w-6 ${val.sen_cel > 70 ? 'text-emerald-500' : val.sen_cel > 40 ? 'text-amber-500' : 'text-rose-500'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Señal Celular</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-lg font-black text-slate-800">{val.sen_cel ?? '--'}%</span>
                    {/* Signal Bars Visual Indicator */}
                    <div className="flex items-end gap-0.5 h-3.5 mb-1 shrink-0">
                      {[1, 2, 3, 4].map((bar) => {
                        const active = val.sen_cel >= bar * 25;
                        return (
                          <div 
                            key={bar} 
                            className={`w-1 rounded-sm transition-all ${
                              active 
                                ? val.sen_cel > 70 ? 'bg-emerald-500' : val.sen_cel > 40 ? 'bg-amber-500' : 'bg-rose-500' 
                                : 'bg-slate-200'
                            }`}
                            style={{ height: `${bar * 25}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordinates / Map Pin */}
              <div className="col-span-1 sm:col-span-2 flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs text-sky-500 shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación GPS</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 truncate">
                      Lat: {formatNumber(val.lat, 5)} <span className="text-slate-300 mx-0.5">|</span> Lng: {formatNumber(val.lng, 5)}
                    </p>
                  </div>
                </div>
                
                {/* External link to Google Maps */}
                {val.lat && val.lng && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${val.lat},${val.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-xs whitespace-nowrap ml-2"
                  >
                    Ver en Google Maps
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
        </div>
        
        {/* Map Panel */}
        <div className="col-span-1 h-[600px] lg:h-auto min-h-[500px] animate-fade-in-up" style={{ animationDelay: '280ms' }}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 w-full h-full relative overflow-hidden">
            {/* Added overlay title for the map */}
            <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-slate-100 pointer-events-none">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Mapa de Estaciones
              </h3>
            </div>
            {mapMarkers.length > 0 ? (
              <Map markers={mapMarkers} />
            ) : (
              <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                No hay coordenadas disponibles para las estaciones
              </div>
            )}
          </div>
        </div>

        </div>
        </div>
      ) : null}

      {/* Meteo Report Component */}
      {selectedDid && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <MeteoReport selectedDevice={selectedDid} selectedDeviceName={selectedDeviceName} />
        </div>
      )}

      {/* Meteo Comparison Component */}
      {devices.length > 0 && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <MeteoComparison devices={devices} />
        </div>
      )}

    </div>
  );
}
