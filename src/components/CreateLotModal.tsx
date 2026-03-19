import React, { useState, useEffect } from "react";
import { X, Save, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Client, ClientField } from "../types/client";

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  field: ClientField;
  initialLotName: string;
  onSave: (updatedClient: Client, newLotName: string) => void;
}

export default function CreateLotModal({
  isOpen,
  onClose,
  client,
  field,
  initialLotName,
  onSave
}: CreateLotModalProps) {
  const [lotName, setLotName] = useState(initialLotName || '');
  const [error, setError] = useState<string | null>(null);
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
      setLotName(initialLotName || '');
      setError(null);
    }
  }, [isOpen, initialLotName]);

  const handleSave = async () => {
    if (!lotName.trim()) {
      setError('El identificador del lote es obligatorio');
      return;
    }

    if (field.lots.some(l => l.toLowerCase() === lotName.trim().toLowerCase())) {
      setError('Este lote ya existe en este campo');
      return;
    }

    setIsSaving(true);
    try {
      // Create a copy of the client's fields and update the relevant one
      const updatedFields = (client.fields || []).map(f => {
        if (f.name === field.name) {
          return { ...f, lots: [...f.lots, lotName.trim()] };
        }
        return f;
      });

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
          title: 'Lote Creado',
          message: `El lote "${lotName}" ha sido agregado exitosamente al campo "${field.name}".`
        });

        const updatedClient = {
          ...client,
          fields: data.fields || updatedFields
        };

        onSave(updatedClient, lotName.trim());
      } else {
        throw new Error(data.details || data.error || 'Error al guardar el lote');
      }
    } catch (err: any) {
      console.error('Error saving lot:', err);
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
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Nuevo Lote
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Campo: <span className="font-bold text-slate-700">{field.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 ml-1">
              Identificador del Lote <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lotName}
              onChange={(e) => {
                setLotName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej: Lote 1, Bajo, Loma..."
              className={cn(
                "w-full rounded-2xl border bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700 transition-all focus:outline-none focus:ring-4",
                error ? "border-red-300 ring-red-500/10" : "border-slate-100 focus:border-emerald-500 focus:ring-emerald-500/10"
              )}
              autoFocus
            />
            {error && (
              <p className="text-[10px] font-bold text-red-500 mt-2 ml-1 animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-8 pt-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2e4a33] py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Database className="h-5 w-5" />
              </motion.div>
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isSaving ? 'GUARDANDO...' : 'CREAR LOTE'}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            CANCELAR
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
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl text-center"
            >
              <div className={cn(
                "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl",
                dialog.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
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
                className={cn(
                "w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer",
                dialog.type === 'success' ? "bg-emerald-600 shadow-emerald-200" : "bg-red-600 shadow-red-200"
              )}
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
