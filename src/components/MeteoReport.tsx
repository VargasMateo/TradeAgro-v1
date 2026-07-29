import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Loader2,
  BarChart3,
  FileText,
} from "lucide-react";
import { authenticatedFetch } from "../lib/api";
import { useReactToPrint } from 'react-to-print';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, ComposedChart, Area, ReferenceArea
} from "recharts";
import { format, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────

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
    hum2min?: number;
    hum2max?: number;
    hum2avg?: number;
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
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humMin: number | null;
  humMax: number | null;
  humAvg: number | null;
  windMin: number | null;
  windMax: number | null;
  windAvg: number | null;
  gustMax: number | null;
  rainTotal: number | null;
  dtValues: number[];
  dtAvg: number | null;
  dtHoursOptimal: number | null; // hours with DT between 2-8
  hoursBelow0: number | null;
  hoursBelow3: number | null;
  windDirections: { dir: number; vel: number; gust: number }[];
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

// ── Data Processing ────────────────────────────────────────────────

function processDailyData(records: SensorRecord[], startDate: string, endDate: string): DailySummary[] {
  let dynamicHoursPerRecord = 1 / 120; // default 30s
  if (records.length >= 2) {
    const diffs = [];
    for (let i = 1; i < Math.min(records.length, 100); i++) {
      diffs.push(Math.abs(records[i].time - records[i - 1].time) / (1000 * 60 * 60));
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    if (median > 0) dynamicHoursPerRecord = median;
  }

  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  return days.map(day => {
    const dayRecords = records.filter(r => isSameDay(new Date(r.time), day));

    const temps = dayRecords.map(r => r.value.temp1avg).filter((v): v is number => v !== undefined && v !== null);
    const tempsMin = dayRecords.map(r => r.value.temp1min).filter((v): v is number => v !== undefined && v !== null);
    const tempsMax = dayRecords.map(r => r.value.temp1max).filter((v): v is number => v !== undefined && v !== null);
    const hums = dayRecords.map(r => r.value.hum2avg).filter((v): v is number => v !== undefined && v !== null && v > 0);
    const vels = dayRecords.map(r => r.value.velavg).filter((v): v is number => v !== undefined && v !== null);
    const gusts = dayRecords.map(r => r.value.rafaga ?? r.value.velmax).filter((v): v is number => v !== undefined && v !== null);

    const allTemps = [...temps, ...tempsMin, ...tempsMax];

    // Hours with temp ≤0 and ≤3
    const hoursBelow0 = dayRecords.filter(r => {
      const t = r.value.temp1avg ?? r.value.temp1min;
      return t !== undefined && t !== null && t <= 0;
    }).length * dynamicHoursPerRecord;

    const hoursBelow3 = dayRecords.filter(r => {
      const t = r.value.temp1avg ?? r.value.temp1min;
      return t !== undefined && t !== null && t <= 3;
    }).length * dynamicHoursPerRecord;

    // Delta T calculations
    const dtValues = dayRecords
      .map(r => calculateDeltaT(r.value.temp1avg, r.value.hum2avg))
      .filter((v): v is number => v !== null && !isNaN(v));

    const dtHoursOptimal = dayRecords.filter(r => {
      const dt = calculateDeltaT(r.value.temp1avg, r.value.hum2avg);
      const gust = r.value.rafaga ?? r.value.velmax ?? r.value.velavg ?? 0;
      return dt !== null && dt >= 2 && dt <= 8 && gust < 15;
    }).length * dynamicHoursPerRecord;

    const dtOnlyHoursOptimal = dayRecords.filter(r => {
      const dt = calculateDeltaT(r.value.temp1avg, r.value.hum2avg);
      return dt !== null && dt >= 2 && dt <= 8;
    }).length * dynamicHoursPerRecord;

    // Wind directions
    const windDirections = dayRecords
      .filter(r => r.value.diravg !== undefined && r.value.velavg !== undefined)
      .map(r => ({ 
        dir: r.value.diravg!, 
        vel: r.value.velavg!,
        gust: r.value.rafaga ?? r.value.velmax ?? r.value.velavg!
      }));

    // Rain
    const rains = dayRecords.map(r => r.value.rain).filter((v): v is number => v !== undefined && v !== null);
    const rainTotal = rains.reduce((sum, v) => sum + v, 0);

    return {
      date: format(day, 'yyyy-MM-dd'),
      dateLabel: format(day, 'dd/MM', { locale: es }),
      tempMin: tempsMin.length > 0 ? Math.min(...tempsMin) : (temps.length > 0 ? Math.min(...temps) : null),
      tempMax: tempsMax.length > 0 ? Math.max(...tempsMax) : (temps.length > 0 ? Math.max(...temps) : null),
      tempRange: [
        tempsMin.length > 0 ? Math.min(...tempsMin) : (temps.length > 0 ? Math.min(...temps) : null),
        tempsMax.length > 0 ? Math.max(...tempsMax) : (temps.length > 0 ? Math.max(...temps) : null)
      ],
      tempAvg: temps.length > 0 ? temps.reduce((s, v) => s + v, 0) / temps.length : null,
      humMin: hums.length > 0 ? Math.min(...hums) : null,
      humMax: hums.length > 0 ? Math.max(...hums) : null,
      humAvg: hums.length > 0 ? hums.reduce((s, v) => s + v, 0) / hums.length : null,
      windMin: vels.length > 0 ? Math.min(...vels) : null,
      windMax: vels.length > 0 ? Math.max(...vels) : null,
      windAvg: vels.length > 0 ? vels.reduce((s, v) => s + v, 0) / vels.length : null,
      gustMax: gusts.length > 0 ? Math.max(...gusts) : null,
      rainTotal: rainTotal > 0 ? rainTotal : (dayRecords.length > 0 ? 0 : null),
      dtValues,
      dtAvg: dtValues.length > 0 ? dtValues.reduce((s, v) => s + v, 0) / dtValues.length : null,
      dtHoursOptimal: dayRecords.length > 0 ? dtHoursOptimal : null,
      dtOnlyHoursOptimal: dayRecords.length > 0 ? dtOnlyHoursOptimal : null,
      hoursBelow0: dayRecords.length > 0 ? hoursBelow0 : null,
      hoursBelow3: dayRecords.length > 0 ? hoursBelow3 : null,
      windDirections,
      recordCount: dayRecords.length,
    };
  });
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

  // Check if user is demo
  const isDemo = useMemo(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      return !!profile.isDemo;
    } catch {
      return false;
    }
  }, []);

  // Set default dates
  useEffect(() => {
    const now = new Date();
    let start = new Date(now);
    
    if (isDemo) {
      start.setDate(now.getDate() - 7);
    } else {
      start.setDate(now.getDate() - 7);
    }
    
    setEndDate(format(now, 'yyyy-MM-dd'));
    setStartDate(format(start, 'yyyy-MM-dd'));
  }, [isDemo]);

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
    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha "Desde" no puede ser mayor a la fecha "Hasta"');
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
      
      // Sort records ascending by time so charts render left-to-right correctly
      records.sort((a: SensorRecord, b: SensorRecord) => a.time - b.time);
      
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
    
    // Filter out nulls for aggregates
    const validTempMins = dailyData.map(d => d.tempMin).filter(v => v !== null) as number[];
    const validTempMaxs = dailyData.map(d => d.tempMax).filter(v => v !== null) as number[];
    const validTempAvgs = dailyData.map(d => d.tempAvg).filter(v => v !== null) as number[];
    const validDtAvgs = dailyData.map(d => d.dtAvg).filter(v => v !== null) as number[];
    const validWindMins = dailyData.map(d => d.windMin).filter(v => v !== null) as number[];
    const validWindMaxs = dailyData.map(d => d.windMax).filter(v => v !== null) as number[];
    const validWindAvgs = dailyData.map(d => d.windAvg).filter(v => v !== null) as number[];
    const validGustMaxs = dailyData.map(d => d.gustMax).filter(v => v !== null) as number[];

    return {
      tempMin: validTempMins.length > 0 ? Math.min(...validTempMins) : null,
      tempMax: validTempMaxs.length > 0 ? Math.max(...validTempMaxs) : null,
      tempAvg: validTempAvgs.length > 0 ? validTempAvgs.reduce((s, v) => s + v, 0) / validTempAvgs.length : null,
      dtAvg: validDtAvgs.length > 0 ? validDtAvgs.reduce((s, v) => s + v, 0) / validDtAvgs.length : null,
      windMin: validWindMins.length > 0 ? Math.min(...validWindMins) : null,
      windMax: validWindMaxs.length > 0 ? Math.max(...validWindMaxs) : null,
      windAvg: validWindAvgs.length > 0 ? validWindAvgs.reduce((s, v) => s + v, 0) / validWindAvgs.length : null,
      gustMax: validGustMaxs.length > 0 ? Math.max(...validGustMaxs) : null,
      totalHoursBelow0: dailyData.reduce((s, d) => s + (d.hoursBelow0 || 0), 0),
      totalHoursBelow3: dailyData.reduce((s, d) => s + (d.hoursBelow3 || 0), 0),
      frostDays: dailyData.filter(d => (d.hoursBelow0 || 0) > 2).length,
      totalRain: dailyData.reduce((s, d) => s + (d.rainTotal || 0), 0),
      totalRecords: rawRecords.length,
      greenDays: dailyData.filter(d => (d.dtHoursOptimal || 0) >= 4).length,
    };
  }, [dailyData, rawRecords]);

  // Downsampled Delta T for chart
  const deltaTData = useMemo(() => {
    if (!startDate || !endDate) return [];
    const hourly: any[] = [];
    let currentKey = '';
    const daysWithData = new Set<string>();
    
    for (const r of rawRecords) {
      const date = new Date(r.time);
      const key = `${date.getDate()}-${date.getHours()}`;
      const dayStr = format(date, 'yyyy-MM-dd');
      
      // Take first valid record of each hour
      if (r.value.temp1avg !== undefined && r.value.hum2avg !== undefined && r.value.hum2avg > 0) {
        if (key !== currentKey) {
          const dt = calculateDeltaT(r.value.temp1avg, r.value.hum2avg);
          if (dt !== null) {
            daysWithData.add(dayStr);
            hourly.push({
              time: date.getTime(),
              dateLabel: format(date, 'yyyy-MM-dd HH:mm'),
              dateAxis: dayStr,
              dt: dt
            });
            currentKey = key;
          }
        }
      }
    }

    // Inject empty days so chart domain is complete
    const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    for (const d of allDays) {
      const dayStr = format(d, 'yyyy-MM-dd');
      if (!daysWithData.has(dayStr)) {
        hourly.push({
          time: d.getTime(),
          dateLabel: format(d, 'yyyy-MM-dd HH:mm'),
          dateAxis: dayStr,
          dt: null
        });
      }
    }

    return hourly.sort((a, b) => a.time - b.time);
  }, [rawRecords, startDate, endDate]);

  // Downsampled Wind data for chart
  const hourlyWindData = useMemo(() => {
    if (!startDate || !endDate) return [];
    const hourly: any[] = [];
    let currentKey = '';
    const daysWithData = new Set<string>();
    
    for (const r of rawRecords) {
      const date = new Date(r.time);
      const key = `${date.getDate()}-${date.getHours()}`;
      const dayStr = format(date, 'yyyy-MM-dd');
      
      if (r.value.velavg !== undefined) {
        if (key !== currentKey) {
          daysWithData.add(dayStr);
          hourly.push({
            time: date.getTime(),
            dateLabel: format(date, 'yyyy-MM-dd HH:mm'),
            dateAxis: dayStr,
            windAvg: r.value.velavg,
            gustMax: r.value.rafaga ?? r.value.velmax ?? r.value.velavg
          });
          currentKey = key;
        }
      }
    }

    // Inject empty days so chart domain is complete
    const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    for (const d of allDays) {
      const dayStr = format(d, 'yyyy-MM-dd');
      if (!daysWithData.has(dayStr)) {
        hourly.push({
          time: d.getTime(),
          dateLabel: format(d, 'yyyy-MM-dd HH:mm'),
          dateAxis: dayStr,
          windAvg: null,
          gustMax: null
        });
      }
    }

    return hourly.sort((a, b) => a.time - b.time);
  }, [rawRecords, startDate, endDate]);

  // Predominant wind calculation
  const predominantWind = useMemo(() => {
    if (dailyData.length === 0) return null;
    const allDirs = dailyData.flatMap(d => d.windDirections);
    if (allDirs.length === 0) return null;

    const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const total = allDirs.length;

    let maxCount = -1;
    let predominant = null;

    DIRECTIONS.forEach((label, i) => {
      const minDeg = i * 45 - 22.5;
      const maxDeg = i * 45 + 22.5;
      const matching = allDirs.filter(d => {
        let deg = d.dir % 360;
        if (i === 0) return deg >= 337.5 || deg < 22.5;
        return deg >= minDeg && deg < maxDeg;
      });

      if (matching.length > maxCount) {
        maxCount = matching.length;
        const vels = matching.map(m => m.vel);
        const gusts = matching.map(m => m.gust);
        
        predominant = {
          label,
          percentage: (matching.length / total) * 100,
          avgVel: vels.length > 0 ? vels.reduce((a, b) => a + b, 0) / vels.length : 0,
          maxGust: gusts.length > 0 ? Math.max(...gusts) : 0,
        };
      }
    });

    return predominant;
  }, [dailyData]);

  // PDF download using react-to-print with CSS scale transform
  const handleDownloadPDF = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `TradeAgro-Meteo-${selectedDeviceName.split(' - ')[0].replace(/[^a-z0-9]/gi, '_')}-${startDate}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      @media print {
        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #meteo-report-content {
          transform: scale(0.62);
          transform-origin: top left;
          width: 161%;
        }
      }
    `,
    onBeforePrint: () => {
      setIsDownloading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsDownloading(false);
    },
  });

  // ── Conclusions ──────────────────────────────────────────────────

  const conclusionsBullets = useMemo(() => {
    if (!periodSummary || dailyData.length === 0) return [];
    const bullets: string[] = [];

    // 1. Mejores ventanas
    const greenDays = dailyData.filter(d => d.dtHoursOptimal >= 4);
    if (greenDays.length > 0) {
      const ranges: string[] = [];
      let start = greenDays[0];
      let prev = greenDays[0];

      const formatRange = (s: DailySummary, e: DailySummary) => {
        if (s.date === e.date) return format(parseISO(s.date), 'dd/MM');
        const sDate = parseISO(s.date);
        const eDate = parseISO(e.date);
        if (sDate.getMonth() === eDate.getMonth()) {
          return `${format(sDate, 'dd')}-${format(eDate, 'dd/MM')}`;
        }
        return `${format(sDate, 'dd/MM')}-${format(eDate, 'dd/MM')}`;
      };

      for (let i = 1; i < greenDays.length; i++) {
        const curr = greenDays[i];
        const prevDate = parseISO(prev.date);
        const currDate = parseISO(curr.date);
        const diffDays = Math.round(Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
          prev = curr;
        } else {
          ranges.push(formatRange(start, prev));
          start = curr;
          prev = curr;
        }
      }
      ranges.push(formatRange(start, prev));
      
      const rangesStr = ranges.length > 1 ? ranges.slice(0, -1).join(', ') + ' y ' + ranges[ranges.length - 1] : ranges[0];
      bullets.push(`Las mejores ventanas de aplicación se concentraron en ${rangesStr}, combinando Delta T entre 2 y 8 °C con ráfagas menores a 15 km/h.`);
    } else {
      bullets.push(`No se registraron ventanas de aplicación óptimas (Delta T entre 2 y 8 °C con ráfagas menores a 15 km/h) durante el período.`);
    }

    // 2. Direccion predominante
    if (predominantWind) {
      bullets.push(`La dirección predominante del viento fue ${predominantWind.label}, con una frecuencia estimada de ${predominantWind.percentage.toFixed(0)}% del periodo, velocidad media asociada de ${predominantWind.avgVel.toFixed(1)} km/h y ráfaga máxima asociada de ${predominantWind.maxGust.toFixed(1)} km/h.`);
    }

    // 3. Horas bajo cero
    if (periodSummary.totalHoursBelow0 > 0) {
      bullets.push(`Se acumularon aproximadamente ${periodSummary.totalHoursBelow0.toFixed(1)} horas con temperatura bajo cero, lo que indica ocurrencia de condiciones frías con potencial de helada en sectores bajos.`);
    }

    // Días de heladas
    if (periodSummary.frostDays > 0) {
      bullets.push(`Se registraron ${periodSummary.frostDays} días de heladas dentro del periodo (temperatura menor a 0 °C con duración mayor a dos horas).`);
    }

    // 4. Rafagas superaron 20 km/h en X dias
    const daysWithHighGusts = dailyData.filter(d => d.gustMax > 20).length;
    if (daysWithHighGusts > 0) {
      bullets.push(`Las ráfagas superaron los 20 km/h en ${daysWithHighGusts} días del periodo, por lo que el viento fue una limitante operativa puntual para aplicaciones de calidad.`);
    }

    // 5. Recomendación general
    bullets.push(`Para aplicaciones fitosanitarias se recomienda priorizar las jornadas marcadas en verde y validar en campo al momento de aplicar, especialmente por cambios rápidos de viento y humedad.`);

    return bullets;
  }, [periodSummary, dailyData, predominantWind]);

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
        {isDemo && (
          <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 border border-amber-100">
            <p className="font-medium">En el <b>modo demostración</b> solo se pueden consultar los reportes de los últimos 7 días.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Desde</label>
            <input
              type="date"
              value={startDate}
              max={endDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isDemo}
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 ${isDemo ? 'bg-slate-100 opacity-70 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hasta</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isDemo}
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 ${isDemo ? 'bg-slate-100 opacity-70 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedDevice}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
        <div 
          ref={reportRef} 
          className="bg-white shadow-lg border border-slate-200 rounded-2xl overflow-hidden"
          id="meteo-report-content"
        >
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
              <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 print:border-slate-800 print:text-black print:mb-12">Resumen ejecutivo</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200 print:border-slate-300">
                <table className="w-full text-sm text-left">
                  <tbody>
                    {(periodSummary.tempMin !== null || periodSummary.tempMax !== null) && (
                      <tr className="border-b border-slate-200 print:border-slate-300">
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Temp. min</td>
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{fmt(periodSummary.tempMin)} °C</td>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Temp. max</td>
                        <td className="py-3 px-4 font-bold text-slate-800 print:text-black">{fmt(periodSummary.tempMax)} °C</td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-200 print:border-slate-300">
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Delta T prom.</td>
                      <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{fmt(periodSummary.dtAvg)} °C</td>
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Viento prom.</td>
                      <td className="py-3 px-4 font-bold text-slate-800 print:text-black">{fmt(periodSummary.windAvg)} km/h</td>
                    </tr>
                    <tr className="border-b border-slate-200 print:border-slate-300">
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Ráfaga max.</td>
                      <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{fmt(periodSummary.gustMax)} km/h</td>
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Dir. predominante</td>
                      <td className="py-3 px-4 font-bold text-slate-800 print:text-black">{predominantWind ? `${predominantWind.label} (${predominantWind.percentage.toFixed(0)}%)` : '--'}</td>
                    </tr>
                    <tr className="border-b border-slate-200 print:border-slate-300">
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Horas bajo 0 °C</td>
                      <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{fmt(periodSummary.totalHoursBelow0)} h</td>
                      <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Días de heladas</td>
                      <td className="py-3 px-4 font-bold text-slate-800 print:text-black">{periodSummary.frostDays}</td>
                    </tr>
                    {(periodSummary.totalRain !== null && periodSummary.totalRain > 0) ? (
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Lluvia acumulada</td>
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{fmt(periodSummary.totalRain)} mm</td>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Días verdes</td>
                        <td className="py-3 px-4 font-bold text-slate-800 print:text-black">{periodSummary.greenDays}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Días verdes</td>
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200 print:border-slate-300 print:text-black">{periodSummary.greenDays}</td>
                        <td className="py-3 px-4 bg-slate-50 border-r border-slate-200 print:bg-slate-50 print:border-slate-300" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusiones técnicas */}
            <div className="break-inside-avoid mt-8 print:mt-24">
              <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 print:border-slate-800 print:text-black print:mb-12">Conclusiones técnicas</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed print:text-black">
                {conclusionsBullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-4 print:text-black">
                Criterio de semáforo: verde = 4 h o más con Delta T 2-8 °C y ráfagas menores a 15 km/h; amarillo = ventana parcial o condición limitada; rojo = ventana insuficiente.
              </p>
            </div>

            {/* Gráficos principales */}
            <div className="pt-2 print:break-before-page">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white print:mb-16" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Gráficos principales</h3>
              <div className="space-y-12 print:space-y-32">
                
                {/* Temperatura Max y Min */}
                {(periodSummary.tempMin !== null || periodSummary.tempMax !== null) && (
                  <div className="border border-slate-200 rounded-lg p-4 bg-white print:border-none print:p-0 print:break-inside-avoid">
                    <p className="text-center text-lg font-medium mb-4 text-slate-800 print:text-black">Temperatura máxima y mínima diaria</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={dailyData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} angle={-45} textAnchor="end" tickMargin={10} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' }, offset: -5 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                          formatter={(value: number, name: string) => [`${fmt(value)}°C`, name === 'tempMax' ? 'Temp. máxima diaria' : name === 'tempMin' ? 'Temp. mínima diaria' : name]}
                          labelFormatter={(label) => `Fecha: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', top: -10 }} verticalAlign="top" 
                          payload={[
                            { value: 'Temp. máxima diaria', type: 'line', color: '#dc2626' },
                            { value: 'Temp. mínima diaria', type: 'line', color: '#2563eb' }
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                        
                        <Area type="monotone" dataKey="tempRange" stroke="none" fill="#f1f5f9" fillOpacity={0.6} />
                        <Line type="monotone" dataKey="tempMax" name="Temp. máxima diaria" stroke="#dc2626" strokeWidth={2} dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="tempMin" name="Temp. mínima diaria" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Delta T */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white print:border-none print:p-0 print:break-inside-avoid">
                  <p className="text-center text-lg font-medium mb-4 text-slate-800 print:text-black">Delta T durante el periodo</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={deltaTData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="dateAxis" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        angle={-45} 
                        textAnchor="end" 
                        tickMargin={10} 
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Delta T (°C)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' }, offset: -5 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number) => [`${fmt(value)}°C`, 'Delta T']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.dateLabel || label}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', top: -10, left: 20 }} verticalAlign="top" align="left"
                        payload={[
                          { value: 'Delta T', type: 'line', color: '#65a30d' },
                          { value: 'Rango optimo 2-8 °C', type: 'rect', color: '#dcfce7' }
                        ]}
                      />
                      <ReferenceArea y1={2} y2={8} {...{ fill: "#dcfce7", fillOpacity: 0.6 } as any} />
                      <ReferenceLine y={2} stroke="#65a30d" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine y={8} stroke="#65a30d" strokeDasharray="3 3" strokeWidth={1} />
                      
                      <Line type="monotone" dataKey="dt" name="Delta T" stroke="#65a30d" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </div>

            {/* Viento y ventana operativa */}
            <div className="pt-2 print:break-before-page">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white print:mb-16" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Viento y ventana operativa</h3>
              <div className="space-y-8 print:space-y-32">
                <div className="print:break-inside-avoid">
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Velocidad de viento y rafagas</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={hourlyWindData} margin={{ top: 15, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="dateAxis" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        angle={-45} 
                        textAnchor="end" 
                        tickMargin={10} 
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'km/h', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' }, offset: 5 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number, name: string) => [`${fmt(value)} km/h`, name]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.dateLabel || label}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="center"
                        wrapperStyle={{ width: '100%', paddingBottom: '15px' }}
                        content={() => (
                          <div className="flex justify-center w-full">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-xs text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="w-4 border-t-2 border-[#475569]"></span>
                                Velocidad promedio
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 border-t-2 border-[#22c55e] border-dashed"></span>
                                Umbral rafaga 15 km/h
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 border-t-2 border-[#d97706]"></span>
                                Rafaga
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 border-t-2 border-[#ef4444] border-dotted"></span>
                                Referencia 20 km/h
                              </div>
                            </div>
                          </div>
                        )}
                      />
                      <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="1 3" strokeWidth={1} />
                      
                      <Line type="monotone" dataKey="windAvg" name="Velocidad promedio" stroke="#475569" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="gustMax" name="Rafaga" stroke="#d97706" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="print:break-inside-avoid">
                  <p className="text-center text-sm font-semibold mb-2 text-slate-700 print:text-black">Horas con Delta T optimo y rafagas &lt; 15 km/h</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyData} margin={{ top: 15, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        angle={-45} 
                        textAnchor="end" 
                        tickMargin={10} 
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' }, offset: 5 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number) => [`${fmt(value)} h`, 'Horas']}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="left"
                        wrapperStyle={{ width: '100%', paddingBottom: '10px', left: 40 }}
                        content={() => (
                          <div className="flex text-xs text-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="w-4 border-t-2 border-[#475569] border-dashed"></span>
                              Criterio optimo: &gt;=4 h
                            </div>
                          </div>
                        )}
                      />
                      <ReferenceLine y={4} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
                      <Bar dataKey="dtHoursOptimal" name="Horas" maxBarSize={40}>
                        {dailyData.map((entry, index) => {
                          let fill = '#ef4444';
                          if (entry.dtHoursOptimal >= 4) fill = '#84cc16';
                          else if (entry.dtHoursOptimal > 0) fill = '#eab308';
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Rosa de vientos */}
            <div className="break-inside-avoid pt-2 print:break-before-page">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white print:mb-16" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Rosa de vientos y dirección predominante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 items-center w-full">
                <div className="flex flex-col items-center">
                  <WindRose data={dailyData} />
                </div>
                {predominantWind && (
                  <div className="text-sm text-slate-700 space-y-4 print:text-black mt-6 md:mt-0 print:mt-0 max-w-md">
                    <div className="space-y-1">
                      <p>Dirección predominante: {predominantWind.label}</p>
                      <p>Frecuencia: {predominantWind.percentage.toFixed(0)}% del periodo ponderado por tiempo.</p>
                      <p>Velocidad media en esa dirección: {predominantWind.avgVel.toFixed(1)} km/h.</p>
                      <p>Ráfaga máxima asociada: {predominantWind.maxGust.toFixed(1)} km/h.</p>
                    </div>
                    <p className="leading-relaxed">
                      La rosa presenta la frecuencia por punto cardinal y clasifica las velocidades promedio por rango. Los sectores más extensos representan mayor persistencia de viento desde esa dirección.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Semáforo diario */}
            <div className="pt-2 print:break-before-page">
              <h3 className="text-lg font-bold bg-[#2e7d32] text-white -mx-6 sm:-mx-8 px-6 sm:px-8 py-2 mb-6 print:bg-[#2e7d32] print:text-white print:mb-16" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Semáforo diario de condiciones de pulverización</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-slate-300 print:rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 print:bg-slate-100 print:text-black print:border-slate-300" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <tr>
                      <th className="py-3 px-4 font-semibold">Fecha</th>
                      <th className="text-right py-3 px-4 font-semibold">Horas optimas</th>
                      <th className="text-right py-3 px-4 font-semibold">Delta T opt.</th>
                      <th className="text-right py-3 px-4 font-semibold">Raf. max</th>
                      <th className="text-center py-3 px-4 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map(d => {
                      const isVerde = d.dtHoursOptimal >= 4;
                      const isAmarillo = d.dtHoursOptimal > 0 && d.dtHoursOptimal < 4;
                      const condition = isVerde ? 'Optimo' : isAmarillo ? 'Precaucion' : 'No recomendado';
                      const bgCond = isVerde ? 'bg-[#c5e1a5]' : isAmarillo ? 'bg-[#ffe082]' : 'bg-[#ffcdd2]';
                      const textCond = isVerde ? 'text-green-900' : isAmarillo ? 'text-amber-900' : 'text-red-900';
                      return (
                        <tr key={d.date} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 print:border-slate-200 print:break-inside-avoid">
                          <td className="py-2.5 px-4 font-medium text-slate-700 print:text-black">{d.dateLabel}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.dtHoursOptimal)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.dtOnlyHoursOptimal)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700 print:text-black">{fmt(d.gustMax)}</td>
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
                * Condición basada en la cantidad de horas con Delta T (2 a 8 °C) y ráfagas menores a 15 km/h. Óptima ≥ 4 hs, Regular 1-3 hs, Mala = 0 hs.
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
