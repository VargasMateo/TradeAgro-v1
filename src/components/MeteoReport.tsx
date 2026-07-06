import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Thermometer,
  Wind,
  Calendar,
  MapPin,
  Download,
  Loader2,
  ChevronDown,
  BarChart3,
  FileText,
  Droplets,
} from "lucide-react";
import { authenticatedFetch } from "../lib/api";
import { useReactToPrint } from 'react-to-print';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────

interface WeatherDevice {
  name: string;
  dId: string;
  templateName?: string;
}

interface SensorRecord {
  _id: string;
  dId: string;
  variable: string;
  time: number;
  value: {
    temp1min?: number;
    temp1max?: number;
    temp1avg?: number;
    hum1min?: number;
    hum1max?: number;
    hum1avg?: number;
    presmin?: number;
    presmax?: number;
    presavg?: number;
    velmin?: number;
    velmax?: number;
    velavg?: number;
    dirmin?: number;
    dirmax?: number;
    diravg?: number;
    dir?: number;
    dirq?: string;
    rafaga?: number;
    rafaga_dir?: number;
    rafaga_dirq?: string;
    dt?: number;
    dtq?: string;
    dtc?: string;
    cond?: string;
    label?: string;
    color?: string;
    bat?: number;
    rain?: number;
    lat?: number;
    lng?: number;
    [key: string]: any;
  };
}

interface DailySummary {
  date: string; // YYYY-MM-DD
  dateLabel: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  humMin: number;
  humMax: number;
  humAvg: number;
  windMin: number;
  windMax: number;
  windAvg: number;
  gustMax: number;
  rainTotal: number;
  dtValues: number[];
  dtAvg: number;
  dtHoursOptimal: number; // hours with DT between 2-8
  hoursBelow0: number;
  hoursBelow3: number;
  windDirections: { dir: number; vel: number }[];
  recordCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (n: number | undefined | null, d = 1, fallback = '--') => {
  if (n === undefined || n === null || isNaN(n)) return fallback;
  return n.toFixed(d);
};

const calculateDeltaT = (temp: number | undefined | null, hum: number | undefined | null): number | null => {
  if (temp === undefined || temp === null || hum === undefined || hum === null || hum <= 0) return null;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100.0);
  const dewPoint = (b * alpha) / (a - alpha);
  return temp - dewPoint;
};

const WIND_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const degreeToCardinal = (deg: number): string => {
  const index = Math.round(deg / 22.5) % 16;
  return WIND_DIRECTIONS[index];
};

// Estimate recording interval from data (~30s per record, 120 records/hr)
const RECORDS_PER_HOUR = 120;
const HOURS_PER_RECORD = 1 / RECORDS_PER_HOUR;

// ── Data Processing ────────────────────────────────────────────────

function processDailyData(records: SensorRecord[], startDate: string, endDate: string): DailySummary[] {
  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  return days.map(day => {
    const dayRecords = records.filter(r => isSameDay(new Date(r.time), day));

    const temps = dayRecords.map(r => r.value.temp1avg).filter((v): v is number => v !== undefined && v !== null);
    const tempsMin = dayRecords.map(r => r.value.temp1min).filter((v): v is number => v !== undefined && v !== null);
    const tempsMax = dayRecords.map(r => r.value.temp1max).filter((v): v is number => v !== undefined && v !== null);
    const hums = dayRecords.map(r => r.value.hum1avg).filter((v): v is number => v !== undefined && v !== null && v > 0);
    const vels = dayRecords.map(r => r.value.velavg).filter((v): v is number => v !== undefined && v !== null);
    const gusts = dayRecords.map(r => r.value.rafaga ?? r.value.velmax).filter((v): v is number => v !== undefined && v !== null);

    const allTemps = [...temps, ...tempsMin, ...tempsMax];

    // Hours with temp ≤0 and ≤3
    const hoursBelow0 = dayRecords.filter(r => {
      const t = r.value.temp1avg ?? r.value.temp1min;
      return t !== undefined && t !== null && t <= 0;
    }).length * HOURS_PER_RECORD;

    const hoursBelow3 = dayRecords.filter(r => {
      const t = r.value.temp1avg ?? r.value.temp1min;
      return t !== undefined && t !== null && t <= 3;
    }).length * HOURS_PER_RECORD;

    // Delta T calculations
    const dtValues = dayRecords
      .map(r => calculateDeltaT(r.value.temp1avg, r.value.hum1avg))
      .filter((v): v is number => v !== null && !isNaN(v));

    const dtHoursOptimal = dayRecords.filter(r => {
      const dt = calculateDeltaT(r.value.temp1avg, r.value.hum1avg);
      return dt !== null && dt >= 2 && dt <= 8;
    }).length * HOURS_PER_RECORD;

    // Wind directions
    const windDirections = dayRecords
      .filter(r => r.value.diravg !== undefined && r.value.velavg !== undefined)
      .map(r => ({ dir: r.value.diravg!, vel: r.value.velavg! }));

    // Rain
    const rains = dayRecords.map(r => r.value.rain).filter((v): v is number => v !== undefined && v !== null);
    const rainTotal = rains.reduce((sum, v) => sum + v, 0);

    return {
      date: format(day, 'yyyy-MM-dd'),
      dateLabel: format(day, 'dd/MM', { locale: es }),
      tempMin: tempsMin.length > 0 ? Math.min(...tempsMin) : (temps.length > 0 ? Math.min(...temps) : 0),
      tempMax: tempsMax.length > 0 ? Math.max(...tempsMax) : (temps.length > 0 ? Math.max(...temps) : 0),
      tempAvg: temps.length > 0 ? temps.reduce((s, v) => s + v, 0) / temps.length : 0,
      humMin: hums.length > 0 ? Math.min(...hums) : 0,
      humMax: hums.length > 0 ? Math.max(...hums) : 0,
      humAvg: hums.length > 0 ? hums.reduce((s, v) => s + v, 0) / hums.length : 0,
      windMin: vels.length > 0 ? Math.min(...vels) : 0,
      windMax: vels.length > 0 ? Math.max(...vels) : 0,
      windAvg: vels.length > 0 ? vels.reduce((s, v) => s + v, 0) / vels.length : 0,
      gustMax: gusts.length > 0 ? Math.max(...gusts) : 0,
      rainTotal,
      dtValues,
      dtAvg: dtValues.length > 0 ? dtValues.reduce((s, v) => s + v, 0) / dtValues.length : 0,
      dtHoursOptimal,
      hoursBelow0,
      hoursBelow3,
      windDirections,
      recordCount: dayRecords.length,
    };
  }).filter(d => d.recordCount > 0);
}

function getWedgePath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) {
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad = (endAngle - 90) * Math.PI / 180;
  
  const x1_inner = cx + rInner * Math.cos(startRad);
  const y1_inner = cy + rInner * Math.sin(startRad);
  const x2_inner = cx + rInner * Math.cos(endRad);
  const y2_inner = cy + rInner * Math.sin(endRad);
  
  const x1_outer = cx + rOuter * Math.cos(startRad);
  const y1_outer = cy + rOuter * Math.sin(startRad);
  const x2_outer = cx + rOuter * Math.cos(endRad);
  const y2_outer = cy + rOuter * Math.sin(endRad);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  
  if (rInner === 0) {
    return `M ${cx} ${cy} L ${x1_outer} ${y1_outer} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2_outer} ${y2_outer} Z`;
  }
  
  return `M ${x1_inner} ${y1_inner} L ${x1_outer} ${y1_outer} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2_outer} ${y2_outer} L ${x2_inner} ${y2_inner} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x1_inner} ${y1_inner} Z`;
}

// ── Wind Rose Component ────────────────────────────────────────────

function WindRose({ data }: { data: DailySummary[] }) {
  const allDirs = data.flatMap(d => d.windDirections);
  if (allDirs.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Sin datos de dirección de viento</div>;
  }

  const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const total = allDirs.length;

  const sectors = DIRECTIONS.map((label, i) => {
    // 8 sectors, each 45 degrees. N is 0.
    const minDeg = i * 45 - 22.5;
    const maxDeg = i * 45 + 22.5;
    const matching = allDirs.filter(d => {
      let deg = d.dir % 360;
      if (i === 0) return deg >= 337.5 || deg < 22.5;
      return deg >= minDeg && deg < maxDeg;
    });

    // Count by velocity buckets
    const b1 = matching.filter(d => d.vel < 5).length;
    const b2 = matching.filter(d => d.vel >= 5 && d.vel < 10).length;
    const b3 = matching.filter(d => d.vel >= 10 && d.vel < 15).length;
    const b4 = matching.filter(d => d.vel >= 15 && d.vel < 20).length;
    const b5 = matching.filter(d => d.vel >= 20).length;

    // Percentages of the TOTAL records, not just this sector's records
    return {
      label,
      totalCount: matching.length,
      percentage: (matching.length / total) * 100,
      buckets: [
        { count: b1, pct: (b1 / total) * 100, color: '#d4d4d8' }, // <5 km/h
        { count: b2, pct: (b2 / total) * 100, color: '#84cc16' }, // 5-10 km/h
        { count: b3, pct: (b3 / total) * 100, color: '#4d7c0f' }, // 10-15 km/h
        { count: b4, pct: (b4 / total) * 100, color: '#f97316' }, // 15-20 km/h
        { count: b5, pct: (b5 / total) * 100, color: '#ef4444' }  // >20 km/h
      ]
    };
  });

  const maxPct = Math.max(...sectors.map(s => s.percentage), 1);
  
  // Calculate grid rings (round maxPct up to nearest nice number if wanted, but using maxPct is fine)
  // Let's create 4 rings
  const ringStep = maxPct / 4;
  const rings = [ringStep, ringStep * 2, ringStep * 3, maxPct];

  const cx = 140, cy = 140, maxR = 110;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 280 280" className="w-full max-w-[320px]">
        {/* Grid circles and crosshairs */}
        {[0, 45, 90, 135].map(deg => {
          const rad = deg * Math.PI / 180;
          return (
            <line key={deg} x1={cx - maxR * Math.cos(rad)} y1={cy - maxR * Math.sin(rad)} x2={cx + maxR * Math.cos(rad)} y2={cy + maxR * Math.sin(rad)} stroke="#f1f5f9" strokeWidth="1" />
          );
        })}
        {rings.map((ringPct, i) => {
          const r = (ringPct / maxPct) * maxR;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />
              <text x={cx + 4} y={cy - r + 4} fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
                {ringPct.toFixed(0)}%
              </text>
            </g>
          );
        })}
        
        {/* Sector wedges */}
        {sectors.map((sector, i) => {
          if (sector.totalCount === 0) return null;
          
          const startAngle = i * 45 - 20; // 40 degrees width (leaving 5 degrees gap)
          const endAngle = i * 45 + 20;
          
          let currentR = 0;
          
          return (
            <g key={sector.label}>
              {sector.buckets.map((b, bi) => {
                if (b.pct === 0) return null;
                const nextR = currentR + (b.pct / maxPct) * maxR;
                const path = getWedgePath(cx, cy, currentR, nextR, startAngle, endAngle);
                currentR = nextR; // update for next stacked bucket
                return (
                  <path key={bi} d={path} fill={b.color} stroke="white" strokeWidth="0.5" />
                );
              })}
              {/* Direction Label */}
              {(() => {
                const angle = (i * 45 - 90) * (Math.PI / 180);
                const labelR = maxR + 15;
                const lx = cx + Math.cos(angle) * labelR;
                const ly = cy + Math.sin(angle) * labelR;
                return (
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                    fill="#334155" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                    {sector.label}
                  </text>
                );
              })()}
            </g>
          );
        })}
        
        <circle cx={cx} cy={cy} r="2" fill="#334155" />
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-[#d4d4d8]" /> &lt;5 km/h</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-[#84cc16]" /> 5-10 km/h</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-[#4d7c0f]" /> 10-15 km/h</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-[#f97316]" /> 15-20 km/h</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 bg-[#ef4444]" /> &gt;20 km/h</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function MeteoReport({ selectedDevice, selectedDeviceName }: { selectedDevice: string, selectedDeviceName: string }) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rawRecords, setRawRecords] = useState<SensorRecord[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set default dates (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setEndDate(format(now, 'yyyy-MM-dd'));
    setStartDate(format(weekAgo, 'yyyy-MM-dd'));
  }, []);

  // Reset report when device changes
  useEffect(() => {
    setReportGenerated(false);
  }, [selectedDevice]);

  // Generate report
  const handleGenerate = async () => {
    if (!selectedDevice || !startDate || !endDate) {
      setError('Completá todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    setReportGenerated(false);

    try {
      const res = await authenticatedFetch(
        `/backend/weather-stations/historical?dId=${encodeURIComponent(selectedDevice)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${(await res.json()).error || 'Error desconocido'}`);
      }
      const data = await res.json();
      const records = data?.data || [];
      if (records.length === 0) {
        setError('No se encontraron datos para el rango seleccionado.');
        return;
      }
      setRawRecords(records);
      setReportGenerated(true);
    } catch (e: any) {
      setError(e.message || 'Error al generar el informe');
    } finally {
      setLoading(false);
    }
  };

  // Process data
  const dailyData = useMemo(() => {
    if (rawRecords.length === 0) return [];
    return processDailyData(rawRecords, startDate, endDate);
  }, [rawRecords, startDate, endDate]);

  // Period aggregates
  const periodSummary = useMemo(() => {
    if (dailyData.length === 0) return null;
    return {
      tempMin: Math.min(...dailyData.map(d => d.tempMin)),
      tempMax: Math.max(...dailyData.map(d => d.tempMax)),
      tempAvg: dailyData.reduce((s, d) => s + d.tempAvg, 0) / dailyData.length,
      windMin: Math.min(...dailyData.map(d => d.windMin)),
      windMax: Math.max(...dailyData.map(d => d.windMax)),
      windAvg: dailyData.reduce((s, d) => s + d.windAvg, 0) / dailyData.length,
      gustMax: Math.max(...dailyData.map(d => d.gustMax)),
      totalHoursBelow0: dailyData.reduce((s, d) => s + d.hoursBelow0, 0),
      totalHoursBelow3: dailyData.reduce((s, d) => s + d.hoursBelow3, 0),
      totalRain: dailyData.reduce((s, d) => s + d.rainTotal, 0),
      totalRecords: rawRecords.length,
    };
  }, [dailyData, rawRecords]);

  // PDF download using react-to-print
  const handleDownloadPDF = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `informe-meteo-${selectedDeviceName.replace(/[^a-z0-9]/gi, '_')}-${startDate}-${endDate}`,
    onBeforePrint: () => {
      setIsDownloading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsDownloading(false);
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      alert('Error de impresión: ' + error);
      setIsDownloading(false);
    }
  });

  // ── Conclusions ──────────────────────────────────────────────────

  const conclusions = useMemo(() => {
    if (!periodSummary || dailyData.length === 0) return '';
    const lines: string[] = [];

    // Temperature
    lines.push(`Durante el período analizado (${format(parseISO(startDate), "d 'de' MMMM", { locale: es })} al ${format(parseISO(endDate), "d 'de' MMMM 'de' yyyy", { locale: es })}), se registraron ${rawRecords.length.toLocaleString()} mediciones correspondientes a ${dailyData.length} días con datos.`);

    lines.push(`La temperatura máxima del período fue de ${fmt(periodSummary.tempMax)}°C, con una mínima absoluta de ${fmt(periodSummary.tempMin)}°C y una temperatura promedio de ${fmt(periodSummary.tempAvg)}°C.`);

    if (periodSummary.totalHoursBelow0 > 0) {
      lines.push(`Se acumularon ${fmt(periodSummary.totalHoursBelow0)} horas con temperaturas ≤0°C (heladas) y ${fmt(periodSummary.totalHoursBelow3)} horas con temperaturas ≤3°C.`);
    } else if (periodSummary.totalHoursBelow3 > 0) {
      lines.push(`No se registraron heladas (0°C), aunque se acumularon ${fmt(periodSummary.totalHoursBelow3)} horas con temperaturas ≤3°C.`);
    } else {
      lines.push(`No se registraron temperaturas por debajo de los 3°C durante el período.`);
    }

    // Wind
    lines.push(`En cuanto al viento, la velocidad máxima registrada fue de ${fmt(periodSummary.windMax)} km/h con ráfagas de hasta ${fmt(periodSummary.gustMax)} km/h. La velocidad promedio del período fue de ${fmt(periodSummary.windAvg)} km/h.`);

    // Delta T
    const totalOptimalHours = dailyData.reduce((s, d) => s + d.dtHoursOptimal, 0);
    const totalPossibleHours = dailyData.reduce((s, d) => s + d.recordCount * HOURS_PER_RECORD, 0);
    const optPct = totalPossibleHours > 0 ? (totalOptimalHours / totalPossibleHours) * 100 : 0;
    lines.push(`Respecto a las condiciones de aplicación (Delta T), se registraron ${fmt(totalOptimalHours)} horas dentro del rango óptimo (2-8), lo que representa el ${fmt(optPct, 0)}% del tiempo total monitoreado.`);

    // Rain
    if (periodSummary.totalRain > 0) {
      lines.push(`La precipitación acumulada en el período fue de ${fmt(periodSummary.totalRain)} mm.`);
    }

    return lines.join('\n\n');
  }, [periodSummary, dailyData, startDate, endDate, rawRecords]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600" />
            Informe Meteorológico
          </h1>
          <p className="text-sm text-slate-500 mt-1">Generá reportes de datos históricos de tus estaciones</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedDevice}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><BarChart3 className="h-4 w-4" /> Generar Informe</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Report */}
      {reportGenerated && dailyData.length > 0 && periodSummary && (
        <div ref={reportRef} className="bg-white shadow-lg border border-slate-200 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none" id="meteo-report-content">
          {/* Header */}
          <div className="bg-[#2e7d32] text-white p-6 sm:p-8" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">TradeAgro</h1>
                <h2 className="text-xl mt-4 font-semibold text-emerald-50">Reporte meteorológico de aplicación</h2>
                <p className="text-sm mt-1 text-emerald-100/80">Período: {format(parseISO(startDate), "dd/MM/yyyy")} al {format(parseISO(endDate), "dd/MM/yyyy")} - Central: {selectedDeviceName}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-emerald-100">Fecha de reporte: {format(new Date(), "dd/MM/yyyy")}</p>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="mt-4 inline-flex items-center gap-2 rounded bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed print:hidden backdrop-blur-sm border border-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> 
                  {isDownloading ? 'Generando...' : 'Descargar PDF'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-10 text-slate-800">
            
            {/* Resumen ejecutivo */}
            <div className="break-inside-avoid">
              <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 print:border-slate-800 print:text-black">Resumen ejecutivo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Temp. máx.</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.tempMax)} °C</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Temp. mín.</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.tempMin)} °C</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Lluvia total</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.totalRain)} mm</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Viento máx.</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.windMax)} km/h</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Ráfaga máx.</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.gustMax)} km/h</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 print:border-none print:bg-transparent print:p-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="text-sm font-semibold text-slate-500 print:text-slate-700">Temp. prom.</p>
                  <p className="text-xl font-bold text-slate-800 print:text-black">{fmt(periodSummary.tempAvg)} °C</p>
                </div>
              </div>
            </div>

            {/* Conclusiones técnicas */}
            <div className="break-inside-avoid">
              <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 print:border-slate-800 print:text-black">Conclusiones técnicas</h3>
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed text-justify print:text-black">
                {conclusions.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-3">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Gráficos principales */}
            <div className="break-inside-avoid pt-2">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Gráficos principales</h3>
              <div className="space-y-8">
                <div>
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Temperatura y Humedad</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="°C" />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number, name: string) => [`${fmt(value)}°C`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="tempMax" name="T° Máxima" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="tempAvg" name="T° Promedio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="tempMin" name="T° Mínima" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Horas en Delta T Óptimo (2-8°C)</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#64748b' } }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number) => [`${fmt(value)} hs`, 'Horas en rango óptimo']}
                      />
                      <ReferenceLine y={24} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <Bar dataKey="dtHoursOptimal" name="Hs óptimas (ΔT 2-8)">
                        {dailyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.dtHoursOptimal > 12 ? '#10b981' : entry.dtHoursOptimal > 6 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Viento y ventana operativa */}
            <div className="break-inside-avoid pt-2">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Viento y ventana operativa</h3>
              <div className="space-y-8">
                <div>
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Velocidad y ráfagas de viento</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" km/h" />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number, name: string) => [`${fmt(value)} km/h`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="windAvg" name="Viento Promedio" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="gustMax" name="Ráfagas (Máx)" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Precipitación diaria</p>
                  {periodSummary.totalRain > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" mm" />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                          formatter={(value: number) => [`${fmt(value)} mm`, 'Precipitación']}
                        />
                        <Bar dataKey="rainTotal" name="Lluvia" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg print:border-none print:text-black">
                      Sin registros de precipitación en el período
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rosa de vientos */}
            <div className="break-inside-avoid pt-2">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Rosa de vientos y dirección predominante</h3>
              <div className="flex flex-col items-center w-full">
                <WindRose data={dailyData} />
              </div>
            </div>

            {/* Semáforo diario */}
            <div className="break-inside-avoid pt-2">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Semáforo diario de condiciones de pulverización</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2e7d32] text-white print:bg-[#2e7d32]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                      <th className="text-right py-3 px-4 font-semibold">Temp. prom (°C)</th>
                      <th className="text-right py-3 px-4 font-semibold">Delta T prom</th>
                      <th className="text-right py-3 px-4 font-semibold">Hs en rango 2-8</th>
                      <th className="text-center py-3 px-4 font-semibold">Condición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map(d => {
                      const condition = d.dtHoursOptimal > 12 ? 'Óptima' : d.dtHoursOptimal > 6 ? 'Regular' : 'Mala';
                      const bgCond = d.dtHoursOptimal > 12 ? 'bg-[#c5e1a5]' : d.dtHoursOptimal > 6 ? 'bg-[#ffe082]' : 'bg-[#ffcdd2]';
                      const textCond = d.dtHoursOptimal > 12 ? 'text-green-900' : d.dtHoursOptimal > 6 ? 'text-amber-900' : 'text-red-900';
                      return (
                        <tr key={d.date} className="border-b border-slate-200 hover:bg-slate-50 print:border-slate-300">
                          <td className="py-2.5 px-4 font-medium text-slate-700 print:text-black">{d.dateLabel}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.tempAvg)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.dtAvg)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.dtHoursOptimal)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block px-3 py-1 text-xs font-bold rounded ${bgCond} ${textCond}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{condition}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-slate-500 mt-4 text-center print:text-black">
                * Condición basada en la cantidad de horas con Delta T óptimo (2 a 8 °C). Óptima &gt; 12 hs, Regular &gt; 6 hs, Mala ≤ 6 hs.
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-6 mt-8 border-t border-slate-100 print:text-black print:border-slate-300">
              Generado por TradeAgro · {format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
