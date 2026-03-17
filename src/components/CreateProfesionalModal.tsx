import React, { useState, useEffect } from "react";
import { X, Plus, Save, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Profesional } from "../types/database";

interface CreateProfesionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profesional: Profesional) => void;
  editingProfesional?: Profesional | null;
}

export default function CreateProfesionalModal({
  isOpen,
  onClose,
  onSave,
  editingProfesional
}: CreateProfesionalModalProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    specialty: ''
  });

  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    specialty?: string;
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
    if (editingProfesional) {
      setFormData({
        displayName: editingProfesional.displayName || '',
        email: editingProfesional.email || '',
        phone: editingProfesional.phoneNumber || '',
        specialty: editingProfesional.specialty || ''
      });
    } else {
      setFormData({
        displayName: '',
        email: '',
        phone: '',
        specialty: ''
      });
    }
    setErrors({});
  }, [editingProfesional, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (!formData.specialty.trim()) {
      newErrors.specialty = 'La especialidad es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      let currentUserId = 0;
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          currentUserId = profile.id || 0;
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }

      const payload = {
        ...formData,
        createdBy: currentUserId
      };

      const url = editingProfesional ? `/api/profesionales/${editingProfesional.id}` : '/api/profesionales';
      const method = editingProfesional ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: editingProfesional ? 'Actualización Exitosa' : 'Registro Exitoso',
          message: editingProfesional
            ? `Los datos del profesional han sido actualizados.`
            : `El profesional ha sido guardado correctamente en la base de datos.`
        });

        const profData: Profesional = {
          id: data.id || editingProfesional?.id,
          ...formData,
          createdBy: payload.createdBy,
          createdAt: data.createdAt || editingProfesional?.createdAt || new Date().toISOString()
        };

        onSave(profData);
        window.dispatchEvent(new Event('profesionales-updated'));
      } else {
        throw new Error(data.details || data.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving profesional:', err);
      setDialog({
        show: true,
        type: 'error',
        title: 'Error de Guardado',
        message: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingProfesional ? 'Editar Profesional' : 'Nuevo Profesional'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Ej: Juan Pérez"
                className={cn(
                  "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                  errors.displayName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                )}
              />
              {errors.displayName && (
                <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {errors.displayName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Especialidad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleInputChange}
                placeholder="Ej: Ingeniero Agrónomo"
                className={cn(
                  "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                  errors.specialty
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                )}
              />
              {errors.specialty && (
                <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {errors.specialty}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contacto@ejemplo.com"
                className={cn(
                  "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                )}
              />
              {errors.email && (
                <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Teléfono (WhatsApp)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+54 9 ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-100 p-6 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:grayscale disabled:scale-100"
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
            {isSaving ? 'GUARDANDO...' : (editingProfesional ? 'GUARDAR CAMBIOS' : 'GUARDAR PROFESIONAL')}
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
              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${dialog.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
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
                className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] ${dialog.type === 'success' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-red-600 shadow-red-200'
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
