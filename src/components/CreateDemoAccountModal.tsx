import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DemoPadronEntry {
  id: number;
  cuit: string;
  razonSocial: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateDemoAccountModalProps {
  entry: DemoPadronEntry | null;
  onSave: (data: { cuit: string; razonSocial: string; isActive: boolean; expiresAt: string | null }) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export default function CreateDemoAccountModal({ entry, onSave, onClose }: CreateDemoAccountModalProps) {
  const isEditing = !!entry;

  const [formData, setFormData] = useState({
    cuit: '',
    razonSocial: '',
    isActive: true,
    hasExpiration: false,
    expiresAt: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      // Format expiresAt for datetime-local input
      let formattedExpires = '';
      if (entry.expiresAt) {
        const d = new Date(entry.expiresAt);
        formattedExpires = d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
      }
      setFormData({
        cuit: entry.cuit,
        razonSocial: entry.razonSocial,
        isActive: !!entry.isActive,
        hasExpiration: !!entry.expiresAt,
        expiresAt: formattedExpires,
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.cuit.trim()) {
      setError('El CUIT es requerido');
      return;
    }
    if (!formData.razonSocial.trim()) {
      setError('La razón social es requerida');
      return;
    }

    setIsLoading(true);
    const result = await onSave({
      cuit: formData.cuit.replace(/[-\s]/g, ''),
      razonSocial: formData.razonSocial,
      isActive: formData.isActive,
      expiresAt: formData.hasExpiration && formData.expiresAt ? formData.expiresAt : null,
    });

    if (!result.success) {
      setError(result.error || 'Error al guardar');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? 'Editar Cuenta Demo' : 'Nueva Cuenta Demo'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* CUIT */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">CUIL / CUIT <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.cuit}
              onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
              maxLength={11}
              placeholder="20123456789"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              autoFocus
            />
          </div>

          {/* Razón Social */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Razón Social <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.razonSocial}
              onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
              placeholder="Nombre de la empresa"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Cuenta activa</p>
              <p className="text-xs text-slate-400">Permite el acceso demo con este CUIT</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                formData.isActive ? 'bg-[#2e7d32]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Expiration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Fecha de vencimiento</p>
                <p className="text-xs text-slate-400">Definir fecha límite de acceso</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, hasExpiration: !prev.hasExpiration }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  formData.hasExpiration ? 'bg-[#2e7d32]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    formData.hasExpiration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {formData.hasExpiration && (
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-[#2e7d32] px-4 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#2e7d32]/20 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              ) : isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
