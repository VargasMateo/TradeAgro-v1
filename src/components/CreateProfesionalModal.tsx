import React, { useState, useEffect } from "react";
import { X, Plus, Save, CheckCircle2, AlertCircle, Database, Copy } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Profesional } from "../types/database";

interface CreateProfesionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profesional: Profesional) => void;
  editingProfesional?: Profesional | null;
  initialDisplayName?: string;
}

export default function CreateProfesionalModal({
  isOpen,
  onClose,
  onSave,
  editingProfesional,
  initialDisplayName = ''
}: CreateProfesionalModalProps) {
  const [formData, setFormData] = useState({
    displayName: initialDisplayName,
    email: '',
    phoneNumber: '',
    specialty: ''
  });
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [setupLink, setSetupLink] = useState('');

  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    specialty?: string;
    phoneNumber?: string;
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
        phoneNumber: editingProfesional.phoneNumber || '',
        specialty: editingProfesional.specialty || ''
      });
    } else {
      setFormData({
        displayName: initialDisplayName,
        email: '',
        phoneNumber: '',
        specialty: ''
      });
    }
    setStep('form');
    setCreatedId(null);
    setErrors({});
  }, [editingProfesional, initialDisplayName, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'phoneNumber') {
      finalValue = value.replace(/\D/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
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

    if (formData.phoneNumber.trim() && !/^\d{8,20}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Formate de teléfono inválido (solo números)';
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
        if (data.id) setCreatedId(data.id);
        if (data.emailSent !== undefined) setInviteEmailSent(data.emailSent);
        if (data.email) setInvitedEmail(data.email);
        if (data.setupLink) setSetupLink(data.setupLink);
        setStep('success');
      } else {
        throw new Error(data.details || data.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving profesional:', err);
      let errorMessage = err.message || 'Ocurrió un error inesperado al guardar.';

      if (errorMessage.includes('Duplicate entry')) {
        if (errorMessage.includes('email')) {
          errorMessage = 'Ya existe un profesional registrado con este correo electrónico.';
        } else {
          errorMessage = 'Ya existe un registro con estos datos.';
        }
      }

      setDialog({
        show: true,
        type: 'error',
        title: 'Error de Guardado',
        message: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingProfesional ? 'Editar Profesional' : 'Nuevo Profesional'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {step === 'form' ? (
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
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Ej: 1155551234"
                  className={cn(
                    "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                    errors.phoneNumber
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  )}
                />
                {errors.phoneNumber && (
                  <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* SUCCESS STEP */
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                {editingProfesional ? '¡Actualización Exitosa!' : '¡Registro Exitoso!'}
              </h3>
              <p className="mb-4 text-slate-500">
                {editingProfesional
                  ? 'Los datos del profesional han sido actualizados correctamente.'
                  : 'El profesional ha sido guardado exitosamente en el sistema.'}
              </p>
              {!editingProfesional && invitedEmail && (
                <div className={`mb-6 w-full flex flex-col gap-2`}>
                  <div className={`rounded-xl px-4 py-3 text-xs font-medium ${inviteEmailSent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {inviteEmailSent
                      ? <><span className="font-bold">Email enviado</span> a <span className="font-semibold">{invitedEmail}</span> para que configure su contraseña.</>
                      : <><span className="font-bold">⚠️ Email no configurado.</span> Copie el siguiente enlace y envíeselo al profesional para que configure su cuenta:</>}
                  </div>
                  {!inviteEmailSent && setupLink && (
                    <div className="relative group animate-in slide-in-from-top-2 duration-300">
                      <input
                        type="text"
                        readOnly
                        value={setupLink}
                        className="w-full bg-slate-50 text-slate-500 font-mono text-[10px] sm:text-xs py-2 px-3 pr-10 border border-slate-200 rounded-lg outline-none"
                        onClick={(e) => {
                          e.currentTarget.select();
                          navigator.clipboard.writeText(setupLink);
                        }}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(setupLink)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 bg-white rounded-md border border-slate-200 shadow-sm transition-colors cursor-pointer"
                        title="Copiar enlace"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex w-full gap-3">
                <button
                  onClick={() => {
                    const profData: Profesional = {
                      id: editingProfesional?.id || createdId || 0,
                      ...formData,
                      createdBy: 0, // Placeholder
                      createdAt: new Date().toISOString()
                    };
                    onSave(profData);
                    onClose();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  ENTENDIDO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'form' && (
          <div className="flex items-center justify-end gap-4 border-t border-slate-100 p-6 bg-slate-50/50 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:grayscale disabled:scale-100 cursor-pointer"
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
        )}
      </div>

      {/* Error Dialog */}
      <AnimatePresence>
        {dialog.show && dialog.type === 'error' && (
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
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                <AlertCircle className="h-10 w-10" />
              </div>

              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900">
                {dialog.title}
              </h3>

              <p className="mb-8 text-sm font-medium leading-relaxed text-slate-500">
                {dialog.message}
              </p>

              <button
                onClick={() => setDialog({ ...dialog, show: false })}
                className="w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg bg-red-600 shadow-red-200 transition-all active:scale-[0.98] cursor-pointer"
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
