import React, { useState, useEffect } from 'react';
import { X, Search, Database, Sun, Check, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '../lib/api';

interface StationsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  onSave: (clientId: number, allowedStations: string[] | null) => Promise<void>;
}

export default function StationsConfigModal({ isOpen, onClose, client, onSave }: StationsConfigModalProps) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (!isOpen || !client) return;

    const fetchDevices = async () => {
      setLoading(true);
      try {
        const res = await authenticatedFetch('/backend/weather-stations/devices');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            setDevices(json.data);
          }
        }
      } catch (error) {
        console.error('Error fetching devices for config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // Initialize selection
    if (client.allowedStations === null || client.allowedStations === undefined) {
      setSelectAll(true);
      setSelectedIds([]);
    } else {
      setSelectAll(false);
      setSelectedIds(Array.isArray(client.allowedStations) ? client.allowedStations : []);
    }
    setSearch('');
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.dId.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDevice = (dId: string) => {
    if (selectAll) {
      // If "select all" was on, and they uncheck one, we must transition to a specific list
      // consisting of all devices EXCEPT the one they unchecked.
      const allIds = devices.map(d => d.dId).filter(id => id !== dId);
      setSelectedIds(allIds);
      setSelectAll(false);
    } else {
      setSelectedIds(prev => 
        prev.includes(dId) ? prev.filter(id => id !== dId) : [...prev, dId]
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const valueToSave = selectAll ? null : selectedIds;
      await onSave(client.userId || client.id, valueToSave);
      onClose();
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[85vh] max-h-[700px] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Equipos Permitidos</h2>
            <p className="text-sm font-medium text-slate-500">
              Cliente: <span className="font-bold text-slate-700">{client.businessName || client.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar central o monitor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm font-semibold outline-none transition-all focus:border-[#0A6C35] focus:ring-1 focus:ring-[#0A6C35]"
            />
          </div>
          
          <div className="mt-4 flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="selectAll"
              checked={selectAll}
              onChange={(e) => {
                setSelectAll(e.target.checked);
                if (e.target.checked) setSelectedIds([]);
              }}
              className="h-4 w-4 rounded border-slate-300 text-[#0A6C35] focus:ring-[#0A6C35]"
            />
            <label htmlFor="selectAll" className="text-sm font-bold text-slate-700 cursor-pointer">
              Permitir acceso a TODOS los equipos (incluyendo futuros)
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
          {loading ? (
            <div className="flex py-12 justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#0A6C35]" />
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              No se encontraron equipos
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDevices.map(device => {
                const isSprayMonitor = device.name.toLowerCase().includes('monitor de pulverizaci') || device.name.toLowerCase().includes('pulveriz');
                const Icon = isSprayMonitor ? Database : Sun;
                const iconColor = isSprayMonitor ? 'text-sky-500' : 'text-amber-500';
                const isChecked = selectAll || selectedIds.includes(device.dId);

                return (
                  <label 
                    key={device.dId}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                      isChecked 
                        ? 'border-emerald-200 bg-emerald-50/50' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 leading-none mb-1">
                          {device.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          ID: {device.dId}
                        </span>
                      </div>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      isChecked 
                        ? 'border-[#0A6C35] bg-[#0A6C35] text-white' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    {/* Hidden input to make it a real checkbox */}
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isChecked}
                      onChange={() => toggleDevice(device.dId)}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#0A6C35] px-6 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
