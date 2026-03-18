import React, { useState, useEffect } from "react";
import { X, Plus, Save, Trash2, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Client, ClientField } from "../types/client";

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  initialFieldName: string;
  onSave: (updatedClient: Client) => void;
}

export default function CreateFieldModal({
  isOpen,
  onClose,
  client,
  initialFieldName,
  onSave
}: CreateFieldModalProps) {
  const [fieldData, setFieldData] = useState<ClientField>({
    name: initialFieldName || '',
    lat: undefined,
    lng: undefined,
    lots: ['']
  });

  const [errors, setErrors] = useState<{
    name?: string;
    lots?: string;
  }>({});

  const [isSaving, setIsSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFieldData({
        name: initialFieldName || '',
        lat: undefined,
        lng: undefined,
        lots: ['']
      });
      setErrors({});
    }
  }, [isOpen, initialFieldName]);

  const handleSave = async () => {
    const newErrors: typeof errors = {};

    if (!fieldData.name.trim()) {
      newErrors.name = 'El nombre del campo es obligatorio';
    }

    if (fieldData.lots.length === 0 || fieldData.lots.some(l => !l.trim())) {
      newErrors.lots = 'Todos los lotes deben tener un identificador';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Create a copy of the client's existing fields and add the new one
      const currentFields = client.fields || [];
      const updatedFields = [...currentFields, fieldData];

      // Prepare payload replicating what CreateClientModal sends on edit
      const payload = {
        displayName: client.name,
        businessName: client.businessName,
        cuit: client.cuit,
        ivaCondition: client.ivaCondition === 'Monotributista' ? 'MT' : 'RI',
        email: client.email,
        phoneNumber: client.phone,
        fields: updatedFields.map(f => ({
          id: f.id,
          name: f.name,
          lat: f.lat,
          lng: f.lng,
          lots: f.lots
        }))
      };

      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: 'Campo Creado',
          message: `El campo "${fieldData.name}" ha sido agregado exitosamente al cliente.`
        });

        const updatedClient = {
          ...client,
          fields: updatedFields
        };
        
        // Notify parent
        onSave(updatedClient);
      } else {
        throw new Error(data.details || data.error || 'Error al guardar el campo');
      }
    } catch (err: any) {
      console.error('Error saving field:', err);
      setDialog({
        show: true,
        type: 'error',
        title: 'Error',
        message: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Crear Nuevo Campo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Asociando a cliente: <span className="font-semibold text-slate-700">{client.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">
                  Nombre del Campo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldData.name}
                  onChange={(e) => {
                    setFieldData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Ej: Lote San Juan"
                  className={cn(
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2",
                    errors.name ? "border-red-300 ring-red-500/10" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  )}
                />
                {errors.name && (
                  <p className="text-[10px] font-medium text-red-500 mt-1 ml-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Latitud (Opcional)</label>
                <input
                  type="number"
                  value={fieldData.lat || ''}
                  onChange={(e) => {
                    setFieldData(prev => ({ ...prev, lat: e.target.value ? parseFloat(e.target.value) : undefined }));
                  }}
                  placeholder="-31.4201"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Longitud (Opcional)</label>
                <input
                  type="number"
                  value={fieldData.lng || ''}
                  onChange={(e) => {
                    setFieldData(prev => ({ ...prev, lng: e.target.value ? parseFloat(e.target.value) : undefined }));
                  }}
                  placeholder="-64.1888"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="pl-4 border-l-2 border-emerald-100 space-y-3 pt-2 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Lotes <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFieldData(prev => ({ ...prev, lots: [...prev.lots, ''] }));
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  AGREGAR LOTE
                </button>
              </div>

              {errors.lots && (
                <p className="text-[10px] font-medium text-red-500">{errors.lots}</p>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {fieldData.lots.map((lot, lIndex) => (
                  <div key={lIndex} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={lot}
                      onChange={(e) => {
                        const newLots = [...fieldData.lots];
                        newLots[lIndex] = e.target.value;
                        setFieldData(prev => ({ ...prev, lots: newLots }));
                        if (errors.lots) setErrors(prev => ({ ...prev, lots: undefined }));
                      }}
                      placeholder={`Lote #${lIndex + 1}`}
                      className={cn(
                        "w-full rounded-lg border bg-white/50 px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2",
                        errors.lots && !lot.trim() ? "border-red-300 ring-red-500/10" : "border-slate-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                      )}
                    />
                    {fieldData.lots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newLots = fieldData.lots.filter((_, i) => i !== lIndex);
                          setFieldData(prev => ({ ...prev, lots: newLots }));
                        }}
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:grayscale disabled:scale-100 cursor-pointer"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Database className="h-4 w-4" />
              </motion.div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'GUARDANDO...' : 'CREAR CAMPO'}
          </button>
        </div>
      </div>

      {/* Success/Error Dialog */}
      <AnimatePresence>
        {dialog.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl text-center"
            >
              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${
                dialog.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {dialog.type === 'success' ? (
                  <CheckCircle2 className="h-10 w-10" />
                ) : (
                  <AlertCircle className="h-10 w-10" />
                )}
              </div>

              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900">
                {dialog.title}
              </h3>

              <p className="mb-8 text-sm font-medium leading-relaxed text-slate-500">
                {dialog.message}
              </p>

              <button
                onClick={() => {
                  setDialog({ ...dialog, show: false });
                  if (dialog.type === 'success') {
                    onClose();
                  }
                }}
                className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] ${
                  dialog.type === 'success' ? 'bg-emerald-600 shadow-emerald-200 cursor-pointer' : 'bg-red-600 shadow-red-200 cursor-pointer'
                }`}
              >
                ENTENDIDO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
