import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { authenticatedFetch } from '../lib/api';
import CreateDemoAccountModal from '../components/CreateDemoAccountModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

interface DemoPadronEntry {
  id: number;
  cuit: string;
  razonSocial: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DemoAccountsPage() {
  const [entries, setEntries] = useState<DemoPadronEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DemoPadronEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<DemoPadronEntry | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/backend/demo-padron');
      const data = await response.json();
      if (data.success) {
        setEntries(data.data);
      } else {
        setError(data.error || 'Error al cargar el padrón');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleToggleActive = async (entry: DemoPadronEntry) => {
    setTogglingId(entry.id);
    try {
      const response = await authenticatedFetch(`/backend/demo-padron/${entry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !entry.isActive }),
      });
      const data = await response.json();
      if (data.success) {
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isActive: !e.isActive } : e));
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    try {
      const response = await authenticatedFetch(`/backend/demo-padron/${deletingEntry.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setEntries(prev => prev.filter(e => e.id !== deletingEntry.id));
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    } finally {
      setDeletingEntry(null);
    }
  };

  const handleSave = async (formData: { cuit: string; razonSocial: string; isActive: boolean; expiresAt: string | null }) => {
    try {
      if (editingEntry) {
        // Update
        const response = await authenticatedFetch(`/backend/demo-padron/${editingEntry.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (data.success) {
          setEntries(prev => prev.map(e => e.id === editingEntry.id ? data.data : e));
          setIsModalOpen(false);
          setEditingEntry(null);
          return { success: true };
        }
        return { success: false, error: data.error };
      } else {
        // Create
        const response = await authenticatedFetch('/backend/demo-padron', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (data.success) {
          setEntries(prev => [data.data, ...prev]);
          setIsModalOpen(false);
          return { success: true };
        }
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusInfo = (entry: DemoPadronEntry) => {
    if (!entry.isActive) {
      return { label: 'Desactivado', color: 'text-slate-500 bg-slate-100', icon: XCircle };
    }
    if (isExpired(entry.expiresAt)) {
      return { label: 'Expirado', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    }
    return { label: 'Activo', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
           ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCuit = (cuit: string) => {
    if (cuit.length === 11) {
      return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
    }
    return cuit;
  };

  const filteredEntries = entries.filter(entry => {
    const term = searchTerm.toLowerCase();
    return entry.cuit.includes(term) || entry.razonSocial.toLowerCase().includes(term);
  });

  const TableSkeleton = () => (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">CUIT</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Razón Social</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Activo</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Vencimiento</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Alta</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-100 rounded-full" /></td>
                <td className="px-6 py-4"><div className="h-6 w-11 bg-slate-100 rounded-full" /></td>
                <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <div className="h-8 w-8 bg-slate-50 rounded-lg" />
                    <div className="h-8 w-8 bg-slate-50 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton */}
      <div className="lg:hidden divide-y divide-slate-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 space-y-3 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-11 bg-slate-100 rounded-full" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-slate-50 rounded-lg" />
                <div className="h-8 w-8 bg-slate-50 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Stats
  const totalEntries = entries.length;
  const activeEntries = entries.filter(e => e.isActive && !isExpired(e.expiresAt)).length;
  const expiredEntries = entries.filter(e => isExpired(e.expiresAt)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas Demo</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión del padrón de acceso para la cuenta demo</p>
        </div>
        <button
          onClick={() => {
            setEditingEntry(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#1b5e20] hover:shadow-lg hover:shadow-[#2e7d32]/20 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Agregar cuenta
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <span className="text-lg font-bold text-slate-700">{totalEntries}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-sm font-bold text-slate-700">Cuentas registradas</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <span className="text-lg font-bold text-emerald-700">{activeEntries}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Activas</p>
              <p className="text-sm font-bold text-emerald-700">Con acceso habilitado</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <span className="text-lg font-bold text-red-600">{expiredEntries}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Expiradas</p>
              <p className="text-sm font-bold text-red-600">Acceso vencido</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por CUIT o razón social..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">
            {entries.length === 0 ? 'No hay cuentas demo registradas' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">CUIT</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Razón Social</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Activo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Vencimiento</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Alta</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const status = getStatusInfo(entry);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-800">{formatCuit(entry.cuit)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">{entry.razonSocial}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(entry)}
                          disabled={togglingId === entry.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            entry.isActive ? 'bg-[#2e7d32]' : 'bg-slate-300'
                          } ${togglingId === entry.id ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              entry.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${isExpired(entry.expiresAt) ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                          {entry.expiresAt ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(entry.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin vencimiento</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">{formatDate(entry.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingEntry(entry)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredEntries.map((entry) => {
              const status = getStatusInfo(entry);
              const StatusIcon = status.icon;
              return (
                <div key={entry.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold text-slate-800">{formatCuit(entry.cuit)}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{entry.razonSocial}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleActive(entry)}
                        disabled={togglingId === entry.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          entry.isActive ? 'bg-[#2e7d32]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            entry.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      {entry.expiresAt && (
                        <span className={`text-xs flex items-center gap-1 ${isExpired(entry.expiresAt) ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                          <Clock className="h-3 w-3" />
                          {formatDate(entry.expiresAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingEntry(entry);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingEntry(entry)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <CreateDemoAccountModal
          entry={editingEntry}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmationModal
        isOpen={!!deletingEntry}
        title="Eliminar cuenta demo"
        description={deletingEntry ? `¿Estás seguro de que querés eliminar el acceso demo para "${deletingEntry.razonSocial}" (CUIT: ${formatCuit(deletingEntry.cuit)})?` : ''}
        onConfirm={handleDelete}
        onClose={() => setDeletingEntry(null)}
      />
    </div>
  );
}
