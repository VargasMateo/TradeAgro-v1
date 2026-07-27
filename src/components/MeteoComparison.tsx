import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { authenticatedFetch } from "../lib/api";
import { format } from "date-fns";
import { Activity, Calendar, Thermometer, Check, AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";

interface WeatherDevice {
  name: string;
  dId: string;
}

interface MeteoComparisonProps {
  devices: WeatherDevice[];
}

export default function MeteoComparison({ devices }: MeteoComparisonProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // Default to last 3 days for comparison
    // Format YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [commonPeriod, setCommonPeriod] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleDevice = (dId: string) => {
    setSelectedDevices((prev) => {
      if (prev.includes(dId)) return prev.filter((id) => id !== dId);
      if (prev.length >= 4) {
        setErrorMsg("Puedes seleccionar hasta 4 estaciones para comparar.");
        return prev;
      }
      return [...prev, dId];
    });
  };

  const handleGenerate = async () => {
    if (selectedDevices.length === 0) {
      setErrorMsg("Selecciona al menos una estación para comparar.");
      return;
    }

    setLoading(true);
    try {
      const dStart = new Date(startDate);
      const dEnd = new Date(endDate);

      const fetchedResults = await Promise.all(
        selectedDevices.map(async (dId) => {
          const device = devices.find((d) => d.dId === dId);
          const res = await authenticatedFetch(
            `/backend/weather-stations/historical?dId=${encodeURIComponent(
              dId
            )}&startDate=${encodeURIComponent(
              startDate.split("T")[0]
            )}&endDate=${encodeURIComponent(endDate.split("T")[0])}`
          );
          const json = await res.json();

          let chartData: any[] = [];
          let absMin = Infinity;
          let absMax = -Infinity;

          if (json.data && Array.isArray(json.data)) {
            chartData = json.data
              .map((record: any) => {
                const tempMin = record.value?.temp1min;
                const tempMax = record.value?.temp1max;
                const tempAvg = record.value?.temp1avg;

                if (tempMin !== undefined && tempMin < absMin) absMin = tempMin;
                if (tempMax !== undefined && tempMax > absMax) absMax = tempMax;

                return {
                  time: record.time,
                  formattedTime: format(new Date(record.time), "dd/MM HH:mm"),
                  tempAvg,
                };
              })
              .filter((d: any) => d.tempAvg !== undefined)
              .sort((a: any, b: any) => a.time - b.time);
          }

          return {
            dId,
            name: device?.name || dId,
            data: chartData,
            min: absMin !== Infinity ? absMin : null,
            max: absMax !== -Infinity ? absMax : null,
          };
        })
      );

      setResults(fetchedResults);
      setCommonPeriod(
        `${format(dStart, "dd/MM/yyyy")} a ${format(dEnd, "dd/MM/yyyy")}`
      );
    } catch (e) {
      console.error(e);
      setErrorMsg("Error cargando datos de comparativa");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | null | undefined, decimals = 1) => {
    if (num === undefined || num === null || isNaN(num)) return "--";
    return num.toFixed(decimals);
  };

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-7 w-7 text-[#2e7d32]" />
            Comparativa de Temperatura por Localidad
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Selecciona hasta 4 localidades para analizar su comportamiento térmico en un mismo período de tiempo.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8 space-y-6">
        {/* Station Selection - Horizontal */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Estaciones ({selectedDevices.length}/4)
          </label>
          <div className="flex flex-wrap gap-3">
            {devices.map((device) => {
              const isSelected = selectedDevices.includes(device.dId);
              return (
                <button
                  key={device.dId}
                  onClick={() => handleToggleDevice(device.dId)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-green-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{device.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-green-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Pickers & Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end border-t border-slate-100 pt-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Desde</label>
            <div className="relative">
              <input
                type="date"
                value={startDate.split("T")[0]}
                onChange={(e) => setStartDate(`${e.target.value}T00:00`)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white cursor-pointer"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Hasta</label>
            <div className="relative">
              <input
                type="date"
                value={endDate.split("T")[0]}
                onChange={(e) => setEndDate(`${e.target.value}T23:59`)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white cursor-pointer"
              />
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={loading || selectedDevices.length === 0}
            className="w-full h-[46px] rounded-xl bg-[#2e7d32] text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                Generando...
              </>
            ) : (
              <>
                <Activity className="h-5 w-5" />
                Comparar Temperaturas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-sm font-bold text-slate-600 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-700" />
            Período común: <span className="text-slate-800">{commonPeriod}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((res, idx) => (
              <div
                key={res.dId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-[320px]"
              >
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 truncate pr-4 text-lg">
                    {res.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm font-semibold shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 text-xs uppercase tracking-wider">
                        Mín
                      </span>
                      <span className="text-sky-600">
                        {formatNumber(res.min)}°C
                      </span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 text-xs uppercase tracking-wider">
                        Máx
                      </span>
                      <span className="text-rose-600">
                        {formatNumber(res.max)}°C
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 w-full relative">
                  {res.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={res.data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="formattedTime"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                          tickFormatter={(val) => `${val}°C`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow:
                              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#334155",
                          }}
                          itemStyle={{ color: "#15803d", fontWeight: "900" }}
                          labelStyle={{
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="tempAvg"
                          name="Temperatura"
                          stroke="#15803d"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0, fill: "#15803d" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-semibold text-sm">
                      No hay datos de temperatura para este período.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMsg && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col p-6">
              <button
                onClick={() => setErrorMsg(null)}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm border border-amber-100">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1 pt-1">
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                    Atención
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setErrorMsg(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 sm:flex-none cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
