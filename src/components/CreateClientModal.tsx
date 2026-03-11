import React, { useState, useEffect } from "react";
import { X, Plus, Save, Trash2, ChevronDown } from "lucide-react";
import { Client, ClientField } from "../types/client";
import { cn } from "../lib/utils";

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

  const handleSave = () => {
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

    const clientData: Client = {
      id: editingClient?.id || Date.now(),
      ...formData,
      ivaCondition: formData.ivaCondition as 'Responsable Inscripto' | 'Monotributista',
      initials: formData.name.substring(0, 2).toUpperCase(),
      color: editingClient?.color || "bg-emerald-100 text-emerald-700",
      lat: editingClient?.lat || (-31.4201 + (Math.random() - 0.5) * 2),
      lng: editingClient?.lng || (-64.1888 + (Math.random() - 0.5) * 2),
      fields: formData.fields
    };

    onSave(clientData);
    onClose();
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
                  placeholder="20-12345678-9"
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
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            GUARDAR CLIENTE
          </button>
        </div>
      </div>
    </div>
  );
}
