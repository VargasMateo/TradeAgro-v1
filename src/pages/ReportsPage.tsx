import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Table,
  MoreHorizontal,
  Map,
  DollarSign,
  Activity,
  CheckCircle2,
  Eye,
  Filter,
} from "lucide-react";
import { cn } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";

const kpiData = [
  {
    title: "Hectáreas Trabajadas",
    value: "12,450",
    unit: "Ha",
    change: "+12.4%",
    icon: Map,
    color: "emerald",
    trend: "up",
  },
  {
    title: "Ingresos Totales",
    value: "458k",
    unit: "USD",
    change: "+8.2%",
    icon: DollarSign,
    color: "emerald",
    trend: "up",
  },
  {
    title: "Eficiencia Promedio",
    value: "94.2%",
    unit: "",
    change: "-2.1%",
    icon: Activity,
    color: "rose",
    trend: "down",
  },
  {
    title: "Servicios Realizados",
    value: "328",
    unit: "",
    change: "+15%",
    icon: CheckCircle2,
    color: "emerald",
    trend: "up",
  },
];

const barData = [
  { name: "AGO", value: 40 },
  { name: "SEP", value: 65 },
  { name: "OCT", value: 45 },
  { name: "NOV", value: 90 },
  { name: "DIC", value: 60 },
  { name: "ENE", value: 20 },
];

const pieData = [
  { name: "Cosecha", value: 45, color: "#2e7d32" },
  { name: "Siembra", value: 25, color: "#81c784" },
  { name: "Fumigación", value: 30, color: "#c8e6c9" },
];

const clientsData = [
  {
    initials: "AG",
    name: "AgroGlobal S.A.",
    location: "Pergamino, BA",
    surface: "2,400 Ha",
    billing: "US$ 84,200",
  },
  {
    initials: "LC",
    name: "La Campiña",
    location: "Venado Tuerto, SF",
    surface: "1,850 Ha",
    billing: "US$ 62,150",
  },
  {
    initials: "FP",
    name: "Fértil Pampa",
    location: "Balcarce, BA",
    surface: "1,200 Ha",
    billing: "US$ 45,900",
  },
  {
    initials: "SU",
    name: "Siembras Unidas",
    location: "Río Cuarto, CB",
    surface: "950 Ha",
    billing: "US$ 38,400",
  },
];

export default function ReportsPage() {
  const [timeFilter, setTimeFilter] = useState<'campana' | '6meses' | 'personalizado'>('campana');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getReferenceText = () => {
    if (timeFilter === 'campana') {
      return 'Mostrando datos de la Campaña 23/24 (Jul 2023 - Jun 2024)';
    }
    if (timeFilter === '6meses') {
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      return `Mostrando últimos 6 meses (${formatDate(sixMonthsAgo)} - ${formatDate(today)})`;
    }
    if (timeFilter === 'personalizado') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T00:00:00');
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
        };
        return `Mostrando datos desde ${formatDate(start)} hasta ${formatDate(end)}`;
      }
      return 'Seleccione un rango de fechas personalizado';
    }
    return '';
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20 md:pb-10">
      {/* Header Section */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-end">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Reportes
          </h1>
          <p className="text-sm text-slate-500 md:text-base">
            Rendimiento agrícola y financiero.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          {/* Reference Text - Desktop */}
          <div className="hidden md:inline-flex items-center rounded-md bg-[#2e7d32]/10 px-2.5 py-1 text-xs font-semibold text-[#2e7d32]">
            {getReferenceText()}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Filters */}
            <div className="flex w-full items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
              <button
                onClick={() => setTimeFilter('campana')}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-4",
                  timeFilter === 'campana' ? "bg-[#2e7d32] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Campaña 23/24
              </button>
              <button
                onClick={() => setTimeFilter('6meses')}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-4",
                  timeFilter === '6meses' ? "bg-[#2e7d32] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                6 Meses
              </button>
              <button
                onClick={() => setTimeFilter('personalizado')}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-4",
                  timeFilter === 'personalizado' ? "bg-[#2e7d32] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Personalizado
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:flex-none">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:flex-none">
                <Table className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timeFilter === 'personalizado' && (
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm animate-in slide-in-from-top-2 sm:w-auto">
              <div className="flex flex-1 flex-col">
                <label className="text-[10px] font-bold uppercase text-slate-500 px-1 mb-1">Desde</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-lg border-none bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-[#2e7d32] outline-none"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <label className="text-[10px] font-bold uppercase text-slate-500 px-1 mb-1">Hasta</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-lg border-none bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-[#2e7d32] outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reference Text - Mobile */}
      <div className="mb-6 flex justify-start md:hidden">
        <div className="inline-flex items-center rounded-md bg-[#2e7d32]/10 px-2.5 py-1 text-xs font-semibold text-[#2e7d32]">
          {getReferenceText()}
        </div>
      </div>

      {/* KPI Cards - 2 Columns on Mobile */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <div key={index} className="h-full">
            <MagneticEffect className="rounded-2xl">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all md:p-6 h-full",
                kpi.color === "emerald"
                  ? "border-emerald-100/50"
                  : "border-rose-100/50"
              )}
            >
              {/* Highlight Indicator */}
              <div className={cn(
                "absolute left-0 top-0 h-full w-1",
                kpi.color === "emerald" ? "bg-emerald-500" : "bg-rose-500"
              )} />

              <div className="mb-3 flex items-start justify-between gap-2">
                <div className={cn(
                  "flex items-center justify-center rounded-lg p-1.5 md:p-2",
                  kpi.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                )}>
                  <kpi.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <span
                  className={cn(
                    "flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold md:px-2 md:py-1 md:text-xs",
                    kpi.color === "emerald"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  )}
                >
                  {kpi.change}
                </span>
              </div>

              <p className="mb-1 truncate text-xs font-medium text-slate-500 md:text-sm">
                {kpi.title}
              </p>
              <h3 className="flex items-baseline gap-1 text-lg font-bold text-slate-900 md:text-2xl">
                {kpi.value}
                {kpi.unit && (
                  <span className="text-xs font-normal text-slate-400 md:text-sm">
                    {kpi.unit}
                  </span>
                )}
              </h3>
            </div>
            </MagneticEffect>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        {/* Bar Chart */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900 md:text-lg">
                Servicios por Campaña
              </h4>
              <p className="text-xs text-slate-500">Últimos 6 meses</p>
            </div>
            <button className="rounded-lg p-1 hover:bg-slate-100">
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <div className="h-[200px] w-full md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  dy={10}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                >
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === "NOV" ? "#2e7d32" : "#cbd5e1"}
                      fillOpacity={entry.name === "NOV" ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h4 className="mb-6 text-base font-bold text-slate-900 md:text-lg">
            Distribución
          </h4>
          <div className="flex flex-1 flex-row items-center justify-center gap-4 md:flex-col md:gap-6">
            <div className="relative h-32 w-32 md:h-48 md:w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900 md:text-2xl">328</span>
                <span className="text-[10px] uppercase text-slate-500 md:text-xs">Total</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs md:grid md:w-full md:grid-cols-2 md:gap-x-6 md:text-sm">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-slate-600">
                    {entry.name} <span className="font-medium text-slate-900">{entry.value}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Best Clients Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 md:p-6">
          <h4 className="text-base font-bold text-slate-900 md:text-lg">Mejores Clientes</h4>
          <button className="text-xs font-semibold text-[#2e7d32] hover:underline md:text-sm">
            Ver todos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:px-6 md:py-4 md:text-xs">
                  Cliente
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:table-cell md:px-6 md:py-4 md:text-xs">
                  Ubicación
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:px-6 md:py-4 md:text-xs">
                  Superficie
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:px-6 md:py-4 md:text-xs">
                  Facturación
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 md:px-6 md:py-4 md:text-xs">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientsData.map((client, index) => (
                <tr
                  key={index}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2e7d32]/10 text-[10px] font-bold text-[#2e7d32] md:h-8 md:w-8 md:text-xs">
                        {client.initials}
                      </div>
                      <span className="text-xs font-semibold text-slate-900 md:text-sm">
                        {client.name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-600 sm:table-cell md:px-6 md:py-4 md:text-sm">
                    {client.location}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-900 md:px-6 md:py-4 md:text-sm">
                    {client.surface}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-900 md:px-6 md:py-4 md:text-sm">
                    {client.billing}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right md:px-6 md:py-4">
                    <button className="text-slate-400 hover:text-[#2e7d32]">
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
