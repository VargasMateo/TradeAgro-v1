import React, { useState, useEffect } from "react";
import { X, Plus, Save, Trash2, ChevronDown, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { Client, ClientField } from "../types/client";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  editingClient?: Client | null;
  initialName?: string;
}

export default function CreateClientModal({
  isOpen,
  onClose,
  onSave,
  editingClient,
  initialName = ''
}: CreateClientModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    businessName: string;
    cuit: string;
    ivaCondition: 'Responsable Inscripto' | 'Monotributista' | '';
    email: string;
    phone: string;
    fields: ClientField[];
  }>({
    name: initialName,
    businessName: '',
    cuit: '',
    ivaCondition: 'Responsable Inscripto',
    email: '',
    phone: '',
    fields: [{ name: '', lat: undefined, lng: undefined, lots: [''] }]
  });

  const [errors, setErrors] = useState<{
    name?: string;
    businessName?: string;
    cuit?: string;
    ivaCondition?: string;
    email?: string;
    fields?: string;
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
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        businessName: editingClient.businessName || '',
        cuit: editingClient.cuit || '',
        ivaCondition: editingClient.ivaCondition || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        fields: (editingClient.fields || []).map(f => ({
          name: f.name || '',
          lat: f.lat,
          lng: f.lng,
          lots: Array.isArray(f.lots) ? f.lots : ['']
        }))
      });
    } else {
      setFormData({
        name: initialName,
        businessName: '',
        cuit: '',
        ivaCondition: 'Responsable Inscripto',
        email: '',
        phone: '',
        fields: [{ name: '', lat: undefined, lng: undefined, lots: [''] }]
      });
    }
    setErrors({});
  }, [editingClient, initialName, isOpen]);

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

  const ivaMapping: Record<string, string> = {
    'Responsable Inscripto': 'RI',
    'Monotributista': 'MT'
  };

  const handleSave = async () => {
    const newErrors: typeof errors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'La razón social es obligatoria';
    }

    if (!formData.cuit.trim()) {
      newErrors.cuit = 'El CUIT es obligatorio';
    } else if (!/^\d{11}$/.test(formData.cuit.replace(/-/g, '').replace(/\s/g, ''))) {
      newErrors.cuit = 'CUIT inválido (11 dígitos)';
    }

    if (!formData.ivaCondition) {
      newErrors.ivaCondition = 'La condición de IVA es obligatoria';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (formData.fields.length === 0) {
      newErrors.fields = 'Debe agregar al menos un campo';
    } else {
      const fieldErrors = formData.fields.some(f => !f.name.trim() || f.lots.length === 0 || f.lots.some(l => !l.trim()));
      if (fieldErrors) {
        newErrors.fields = 'Todos los campos y lotes deben tener un nombre';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Get logged in user email for audit
      let currentUserEmail = 'Admin';
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          currentUserEmail = profile.email || 'Admin';
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }

      // Prepare data for backend
      const payload = {
        displayName: formData.name,
        businessName: formData.businessName,
        cuit: formData.cuit,
        ivaCondition: ivaMapping[formData.ivaCondition] || 'RI',
        email: formData.email,
        phoneNumber: formData.phone,
        createdBy: currentUserEmail,
        fields: formData.fields.map(f => ({
          name: f.name,
          lat: f.lat,
          lng: f.lng,
          lots: f.lots
        }))
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: 'Registro Exitoso',
          message: `El cliente y sus ${formData.fields.length} campos han sido guardados en la base de datos.`
        });
        
        // Finalize state
        const clientData: Client = {
          id: data.id,
          ...formData,
          ivaCondition: formData.ivaCondition as 'Responsable Inscripto' | 'Monotributista',
          initials: formData.name.substring(0, 2).toUpperCase(),
          color: editingClient?.color || "bg-emerald-100 text-emerald-700",
          fields: formData.fields,
          createdAt: data.createdAt,
          createdBy: payload.createdBy
        };
        
        // Local state update via parent if needed
        onSave(clientData);
        window.dispatchEvent(new Event('clients-updated'));
      } else {
        throw new Error(data.details || data.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving client:', err);
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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez"
                  className={cn(
                    "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                    errors.name 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  )}
                />
                {errors.name && (
                  <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Ej: AgroExport S.A."
                  className={cn(
                    "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                    errors.businessName 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  )}
                />
                {errors.businessName && (
                  <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.businessName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  CUIT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleInputChange}
                  maxLength={11}
                  placeholder="20123456789"
                  className={cn(
                    "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                    errors.cuit 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                      : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  )}
                />
                {errors.cuit && (
                  <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.cuit}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Condición de IVA <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="ivaCondition"
                    value={formData.ivaCondition}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, ivaCondition: value as any }));
                      if (errors.ivaCondition) {
                        setErrors(prev => ({ ...prev, ivaCondition: undefined }));
                      }
                    }}
                    className={cn(
                      "w-full appearance-none rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                      errors.ivaCondition 
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    )}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.ivaCondition && (
                  <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.ivaCondition}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+54 9 ..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Campos <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, fields: [...prev.fields, { name: '', lat: undefined, lng: undefined, lots: [''] }] }))}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="h-3 w-3" />
                  Agregar Campo
                </button>
              </div>

              {errors.fields && (
                <p className="text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                  {errors.fields}
                </p>
              )}

              {formData.fields.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No hay campos agregados.</p>
              ) : (
                <div className="space-y-6">
                  {formData.fields.map((field, fIndex) => (
                    <div key={fIndex} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Campo #{fIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = formData.fields.filter((_, i) => i !== fIndex);
                            setFormData(prev => ({ ...prev, fields: newFields }));
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Nombre del Campo <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const newFields = [...formData.fields];
                              newFields[fIndex].name = e.target.value;
                              setFormData(prev => ({ ...prev, fields: newFields }));
                            }}
                            placeholder="Ej: Lote San Juan"
                            className={cn(
                              "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2",
                              errors.fields && !field.name.trim() ? "border-red-300 ring-red-500/10" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            )}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Latitud</label>
                          <input
                            type="number"
                            value={field.lat || ''}
                            onChange={(e) => {
                              const newFields = [...formData.fields];
                              newFields[fIndex].lat = e.target.value ? parseFloat(e.target.value) : undefined;
                              setFormData(prev => ({ ...prev, fields: newFields }));
                            }}
                            placeholder="-31.4201"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Longitud</label>
                          <input
                            type="number"
                            value={field.lng || ''}
                            onChange={(e) => {
                              const newFields = [...formData.fields];
                              newFields[fIndex].lng = e.target.value ? parseFloat(e.target.value) : undefined;
                              setFormData(prev => ({ ...prev, fields: newFields }));
                            }}
                            placeholder="-64.1888"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>

                      <div className="pl-4 border-l-2 border-emerald-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Lotes <span className="text-red-500">*</span></label>
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = [...formData.fields];
                              newFields[fIndex].lots = [...newFields[fIndex].lots, ''];
                              setFormData(prev => ({ ...prev, fields: newFields }));
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                          >
                            <Plus className="h-3 w-3" />
                            AGREGAR LOTE
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {field.lots.map((lot, lIndex) => (
                            <div key={lIndex} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={lot}
                                onChange={(e) => {
                                  const newFields = [...formData.fields];
                                  newFields[fIndex].lots[lIndex] = e.target.value;
                                  setFormData(prev => ({ ...prev, fields: newFields }));
                                }}
                                placeholder={`Lote #${lIndex + 1}`}
                                className={cn(
                                  "w-full rounded-lg border bg-white/50 px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2",
                                  errors.fields && !lot.trim() ? "border-red-300 ring-red-500/10" : "border-slate-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                                )}
                              />
                              {field.lots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFields = [...formData.fields];
                                    newFields[fIndex].lots = newFields[fIndex].lots.filter((_, i) => i !== lIndex);
                                    setFormData(prev => ({ ...prev, fields: newFields }));
                                  }}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            {isSaving ? 'GUARDANDO...' : 'GUARDAR CLIENTE'}
          </button>
        </div>
      </div>

      {/* Premium Success/Error Dialog */}
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
                  dialog.type === 'success' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-red-600 shadow-red-200'
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
