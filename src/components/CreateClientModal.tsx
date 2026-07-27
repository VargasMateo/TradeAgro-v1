import React, { useState, useEffect } from "react";
import { X, Plus, Save, Trash2, ChevronDown, CheckCircle2, AlertCircle, Database, Copy, Sun, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Client, ClientField } from "../types/client";
import { authenticatedFetch } from "../lib/api";
import StationsConfigModal from "./StationsConfigModal";

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
    notificationEmails: string;
    isTest: boolean;
    hasStations: boolean;
    hasSprayMonitor: boolean;
    allowedStations?: string[] | null;
    fields: ClientField[];
  }>({
    name: initialName,
    businessName: '',
    cuit: '',
    ivaCondition: 'Responsable Inscripto',
    email: '',
    phone: '',
    notificationEmails: '',
    isTest: false,
    hasStations: true,
    hasSprayMonitor: true,
    allowedStations: null,
    fields: [{ name: '', lat: undefined, lng: undefined, lots: [''] }]
  });

  const [errors, setErrors] = useState<{
    name?: string;
    businessName?: string;
    cuit?: string;
    ivaCondition?: string;
    email?: string;
    phone?: string;
    notificationEmails?: string;
    fields?: string;
    fieldErrors?: Record<number, { lat?: string; lng?: string }>;
  }>({});

  const [isConfiguringStations, setIsConfiguringStations] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const [associatedClients, setAssociatedClients] = useState<any[]>([]);
  const [loadingAssociated, setLoadingAssociated] = useState(false);
  const [fetchingAssociated, setFetchingAssociated] = useState(false);
  const [newAssociatedForm, setNewAssociatedForm] = useState({ name: '', email: '' });
  const [associatedError, setAssociatedError] = useState('');

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
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [setupLink, setSetupLink] = useState('');

  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState('');

  const [userRole] = useState(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        return profile.role || 'client';
      } catch (e) {
        return 'client';
      }
    }
    return 'client';
  });

  const isAdmin = userRole === 'admin';
  const isProfesional = userRole === 'profesional';
  const canManageStations = isAdmin || isProfesional;

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
        const fetchDevices = async () => {
          try {
            const res = await authenticatedFetch('/backend/weather-stations/devices');
            if (res.ok) {
              const json = await res.json();
              if (json.status === 'success' && Array.isArray(json.data)) {
                setDevices(json.data);
              }
            }
          } catch (error) {
            console.error('Error fetching devices:', error);
          }
        };
        fetchDevices();
      } else {
        document.body.style.overflow = 'unset';
      }

    const fetchAssociatedClients = async () => {
      if (!editingClient || editingClient.clientRole === 'associated') return;
      setFetchingAssociated(true);
      try {
        const res = await authenticatedFetch('/backend/clients');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            const associated = json.filter((c: any) => c.clientRole === 'associated' && c.ownerId === editingClient.id);
            setAssociatedClients(associated);
          }
        }
      } catch (err) {
        console.error('Error fetching associated clients:', err);
      } finally {
        setFetchingAssociated(false);
      }
    };

    if (editingClient) {
      fetchAssociatedClients();
      const initialEmails = editingClient.notificationEmails
        ? editingClient.notificationEmails.split(/[,;\s]+/).map(e => e.trim()).filter(e => e !== '')
        : [];
      setEmailChips(initialEmails);

      setFormData({
        name: editingClient.name || '',
        businessName: editingClient.businessName || '',
        cuit: editingClient.cuit || '',
        ivaCondition: editingClient.ivaCondition || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        notificationEmails: editingClient.notificationEmails || '',
        isTest: !!editingClient.isTest,
        hasStations: !!editingClient.hasStations,
        hasSprayMonitor: !!editingClient.hasSprayMonitor,
        allowedStations: editingClient.allowedStations,
        fields: (editingClient.fields || []).map(f => ({
          name: f.name || '',
          lat: f.lat,
          lng: f.lng,
          lots: Array.isArray(f.lots) ? f.lots : ['']
        }))
      });
    } else {
      setEmailChips([]);
      setFormData({
        name: initialName,
        businessName: '',
        cuit: '',
        ivaCondition: 'Responsable Inscripto',
        email: '',
        phone: '',
        notificationEmails: '',
        isTest: false,
        hasStations: true,
        hasSprayMonitor: true,
        allowedStations: null,
        fields: [{ name: '', lat: undefined, lng: undefined, lots: [''] }]
      });
    }
    setStep('form');
    setCreatedId(null);
    setErrors({});
    setNewAssociatedForm({ name: '', email: '' });
    setAssociatedError('');
  }, [editingClient, initialName, isOpen]);

  const addChip = (value: string) => {
    const cleanValue = value.replace(/[,;\s]/g, '').trim();
    if (!cleanValue) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanValue)) {
      setErrors(prev => ({ ...prev, notificationEmails: 'Formato de email inválido' }));
      return;
    }

    if (emailChips.includes(cleanValue)) {
      setErrors(prev => ({ ...prev, notificationEmails: 'Este correo ya fue agregado' }));
      return;
    }

    const updatedChips = [...emailChips, cleanValue];
    setEmailChips(updatedChips);
    setFormData(prev => ({ ...prev, notificationEmails: updatedChips.join(', ') }));
    setChipInput('');
    setErrors(prev => ({ ...prev, notificationEmails: undefined }));
  };

  const removeChip = (indexToRemove: number) => {
    const updatedChips = emailChips.filter((_, idx) => idx !== indexToRemove);
    setEmailChips(updatedChips);
    setFormData(prev => ({ ...prev, notificationEmails: updatedChips.join(', ') }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'phone') {
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

    if (formData.phone.trim() && !/^\d{8,20}$/.test(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido (solo números)';
    }

    if (formData.notificationEmails && formData.notificationEmails.trim()) {
      const emailList = formData.notificationEmails.split(/[,;\s]+/).map(e => e.trim()).filter(e => e !== '');
      const invalidEmails = emailList.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (invalidEmails.length > 0) {
        newErrors.notificationEmails = `Contiene correos inválidos: ${invalidEmails.join(', ')}`;
      }
    }

    if (formData.fields.length === 0) {
      newErrors.fields = 'Debe agregar al menos un campo';
    } else {
      const fieldErrors = formData.fields.some(f => !f.name.trim() || f.lots.length === 0 || f.lots.some(l => !l.trim()));
      if (fieldErrors) {
        newErrors.fields = 'Todos los campos y lotes deben tener un nombre';
      }
      const fieldErrorsMap: Record<number, { lat?: string; lng?: string }> = {};
      formData.fields.forEach((f, idx) => {
        let latErr, lngErr;
        if (f.lat) {
          const lat = parseFloat(f.lat as any);
          if (isNaN(lat) || lat < -90 || lat > 90) latErr = 'Formato incorrecto. Ej: -31.4201';
        }
        if (f.lng) {
          const lng = parseFloat(f.lng as any);
          if (isNaN(lng) || lng < -180 || lng > 180) lngErr = 'Formato incorrecto. Ej: -64.1888';
        }
        if (latErr || lngErr) {
          fieldErrorsMap[idx] = { lat: latErr, lng: lngErr };
        }
      });
      if (Object.keys(fieldErrorsMap).length > 0) {
        newErrors.fieldErrors = fieldErrorsMap;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Get logged in user ID for audit
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

      // Prepare data for backend
      const payload = {
        displayName: formData.name,
        businessName: formData.businessName,
        cuit: formData.cuit,
        ivaCondition: formData.ivaCondition || 'Responsable Inscripto',
        email: formData.email,
        phoneNumber: formData.phone,
        notificationEmails: formData.notificationEmails || null,
        isTest: formData.isTest,
        hasStations: formData.hasStations,
        hasSprayMonitor: formData.hasSprayMonitor,
        allowedStations: formData.allowedStations,
        createdBy: currentUserId,
        fields: formData.fields.map(f => ({
          id: f.id,
          name: f.name,
          lat: f.lat,
          lng: f.lng,
          lots: f.lots
        }))
      };

      const url = editingClient ? `/backend/clients/${editingClient.id}` : '/backend/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method: method,
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
      console.error('Error saving client:', err);
      let errorMessage = err.message || 'Ocurrió un error inesperado al guardar.';

      if (errorMessage.includes('Duplicate entry')) {
        if (errorMessage.includes('email')) {
          errorMessage = 'Ya existe un cliente registrado con este correo electrónico.';
        } else if (errorMessage.includes('cuit')) {
          errorMessage = 'Ya existe un cliente registrado con este CUIT.';
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

  const handleCreateAssociatedClient = async () => {
    if (!editingClient) return;
    if (!newAssociatedForm.name.trim() || !newAssociatedForm.email.trim()) {
      setAssociatedError('Nombre y correo son obligatorios');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAssociatedForm.email)) {
      setAssociatedError('El formato del email no es válido');
      return;
    }

    setLoadingAssociated(true);
    setAssociatedError('');

    try {
      let currentUserId = 0;
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          currentUserId = profile.id || 0;
        } catch (e) {}
      }

      const payload = {
        displayName: newAssociatedForm.name,
        email: newAssociatedForm.email,
        businessName: '',
        cuit: '',
        ivaCondition: 'Responsable Inscripto', // fallback
        phoneNumber: '',
        isTest: editingClient.isTest || false,
        clientRole: 'associated',
        ownerId: editingClient.id,
        createdBy: currentUserId,
        fields: []
      };

      const res = await authenticatedFetch('/backend/clients', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setNewAssociatedForm({ name: '', email: '' });
        // Refetch associated clients
        const refetchRes = await authenticatedFetch('/backend/clients');
        if (refetchRes.ok) {
          const json = await refetchRes.json();
          if (Array.isArray(json)) {
            const associated = json.filter((c: any) => c.clientRole === 'associated' && c.ownerId === editingClient.id);
            setAssociatedClients(associated);
          }
        }
      } else {
        const errorMsg = data.error || data.details || 'Error al crear cuenta asociada';
        if (errorMsg.includes('Duplicate entry')) {
          setAssociatedError('El correo electrónico ya está en uso por otra cuenta.');
        } else {
          setAssociatedError(errorMsg);
        }
      }
    } catch (err: any) {
      setAssociatedError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoadingAssociated(false);
    }
  };

  const handleDeleteAssociatedClient = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cuenta asociada?')) return;
    
    setLoadingAssociated(true);
    setAssociatedError('');
    
    try {
      const res = await authenticatedFetch(`/backend/clients/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        // Refetch associated clients
        const refetchRes = await authenticatedFetch('/backend/clients');
        if (refetchRes.ok) {
          const json = await refetchRes.json();
          if (Array.isArray(json)) {
            const associated = json.filter((c: any) => c.clientRole === 'associated' && c.ownerId === editingClient?.id);
            setAssociatedClients(associated);
          }
        }
      } else {
        setAssociatedError(data.error || 'Error al eliminar cuenta asociada');
      }
    } catch (err: any) {
      setAssociatedError(err.message || 'Ocurrió un error al eliminar');
    } finally {
      setLoadingAssociated(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'form' ? (
            <div className="space-y-8">
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
                        "w-full appearance-none rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 cursor-pointer",
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
                    placeholder="Ej: 1155551234"
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2",
                      errors.phone
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    )}
                  />
                  {errors.phone && (
                    <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {errors.phone}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Correos de Notificación Adicionales
                  </label>
                  <div className={cn(
                    "flex flex-wrap gap-2 w-full rounded-xl border bg-slate-50 px-3 py-2 text-slate-700 focus-within:ring-2 focus-within:bg-white transition-all",
                    errors.notificationEmails
                      ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-500/20"
                      : "border-slate-200 focus-within:border-emerald-500 focus-within:ring-emerald-500/20"
                  )}>
                    {emailChips.map((chip, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                      >
                        <span>{chip}</span>
                        <button
                          type="button"
                          onClick={() => removeChip(index)}
                          className="text-emerald-500 hover:text-emerald-800 transition-colors rounded-full hover:bg-emerald-100/50 p-0.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <input
                      type="text"
                      value={chipInput}
                      onChange={(e) => {
                        setChipInput(e.target.value);
                        if (errors.notificationEmails) {
                          setErrors(prev => ({ ...prev, notificationEmails: undefined }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === ';') {
                          e.preventDefault();
                          addChip(chipInput);
                        } else if (e.key === 'Backspace' && !chipInput && emailChips.length > 0) {
                          removeChip(emailChips.length - 1);
                        }
                      }}
                      onBlur={() => {
                        if (chipInput) {
                          addChip(chipInput);
                        }
                      }}
                      placeholder={emailChips.length === 0 ? "Ej: admon@agro.com (presiona Enter o Coma para agregar)" : "Agregar correo..."}
                      className="flex-1 bg-transparent min-w-[150px] outline-none text-slate-700 placeholder:text-slate-400 text-sm py-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 ml-1">
                    Direcciones de correo adicionales que recibirán copias de las notificaciones de órdenes de trabajo (creación y finalización). Presiona Enter, Coma o Espacio para agregar cada correo.
                  </p>
                  {errors.notificationEmails && (
                    <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {errors.notificationEmails}
                    </p>
                  )}
                </div>
              </div>

              {canManageStations && (
                <div className="space-y-3">
                  {isAdmin && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/20 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="checkbox"
                        id="isTest"
                        checked={formData.isTest}
                        onChange={(e) => setFormData(prev => ({ ...prev, isTest: e.target.checked }))}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="isTest" className="text-sm font-bold text-slate-900 cursor-pointer block">
                          Marcar como Usuario de Prueba (Test User)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Los usuarios de prueba y sus órdenes asociadas solo serán visibles para administradores.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#0A6C35] mt-0.5">
                        <Sun className="h-5 w-5" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900 block leading-tight mb-1">
                          Equipos y Centrales Permitidas
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Configure a qué equipos tiene acceso el cliente.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {formData.allowedStations === null ? (
                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                              <span>Todos los equipos</span>
                            </div>
                          ) : formData.allowedStations.length === 0 ? (
                            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-500 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                              <span>Ningún equipo asignado</span>
                            </div>
                          ) : (
                            formData.allowedStations.map(dId => {
                              const device = devices.find(d => d.dId === dId);
                              const name = device ? device.name : dId;
                              return (
                                <div key={dId} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                  <span className="max-w-[200px] truncate" title={name}>{name}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setIsConfiguringStations(true); }}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-[#0A6C35] bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              )}

              {/* Fields Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    Campos <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, fields: [...prev.fields, { name: '', lat: undefined, lng: undefined, lots: [''] }] }))}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
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
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
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
                              className={cn(
                                "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 no-spinner",
                                errors.fieldErrors?.[fIndex]?.lat
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                              )}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            />
                            {errors.fieldErrors?.[fIndex]?.lat && (
                              <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {errors.fieldErrors[fIndex].lat}
                              </p>
                            )}
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
                              className={cn(
                                "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 no-spinner",
                                errors.fieldErrors?.[fIndex]?.lng
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                              )}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            />
                            {errors.fieldErrors?.[fIndex]?.lng && (
                              <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {errors.fieldErrors[fIndex].lng}
                              </p>
                            )}
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
                              className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
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
                                    className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
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

              {/* Associated Clients Section (Only for owner clients in edit mode) */}
              {editingClient && editingClient.clientRole !== 'associated' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Cuentas Asociadas
                    </label>
                  </div>
                  
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30 space-y-4">
                    {fetchingAssociated ? (
                      <div className="text-xs text-slate-500 text-center py-2">Cargando...</div>
                    ) : (
                      <>
                        {associatedClients.length > 0 ? (
                          <div className="space-y-2">
                            {associatedClients.map((assoc, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg">
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">{assoc.displayName}</div>
                                  <div className="text-[10px] text-slate-500">{assoc.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                                    Asociado
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAssociatedClient(assoc.id)}
                                    className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                                    title="Eliminar cuenta asociada"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 text-center py-2">No hay cuentas asociadas</div>
                        )}
                        
                        <div className="border-t border-slate-200 pt-3 mt-3">
                          <div className="flex gap-2 flex-col sm:flex-row items-end">
                            <div className="w-full sm:w-1/3">
                              <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Nombre <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={newAssociatedForm.name}
                                onChange={(e) => setNewAssociatedForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nombre"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                              />
                            </div>
                            <div className="w-full sm:w-1/3">
                              <label className="text-[10px] font-bold text-slate-500 ml-1 mb-1 block uppercase">Email <span className="text-red-500">*</span></label>
                              <input
                                type="email"
                                value={newAssociatedForm.email}
                                onChange={(e) => setNewAssociatedForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Email"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateAssociatedClient}
                              disabled={loadingAssociated}
                              className="w-full sm:w-auto rounded-xl bg-[#2e7d32] px-4 py-2 text-xs font-bold text-white hover:bg-[#1b5e20] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/50 disabled:opacity-50 transition-colors h-[38px] flex items-center justify-center gap-2 min-w-[80px]"
                            >
                              {loadingAssociated ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Agregar"
                              )}
                            </button>
                          </div>
                          {associatedError && (
                            <div className="mt-2 text-xs text-red-500 font-medium">
                              {associatedError}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SUCCESS STEP */
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-300">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                {editingClient ? '¡Actualización Exitosa!' : '¡Registro Exitoso!'}
              </h3>
              <p className="mb-2 text-slate-500 max-w-[320px]">
                {editingClient
                  ? 'Los datos del cliente y sus campos han sido actualizados correctamente.'
                  : `El cliente y sus ${formData.fields.length} campos han sido guardados exitosamente en el sistema.`}
              </p>
              {!editingClient && invitedEmail && (
                <div className={`mb-6 w-full flex flex-col gap-2`}>
                  <div className={`rounded-xl px-4 py-3 text-xs font-medium ${inviteEmailSent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {inviteEmailSent
                      ? <><span className="font-bold">📧 Email enviado</span> a <span className="font-semibold">{invitedEmail}</span> para que configure su contraseña.</>
                      : <><span className="font-bold">⚠️ Email no configurado.</span> Copie el siguiente enlace y envíeselo al cliente para que configure su cuenta:</>}
                  </div>
                  {!inviteEmailSent && setupLink && (
                    <div className="relative group animate-in slide-in-from-top-2 duration-300">
                      <input
                        type="text"
                        readOnly
                        value={setupLink}
                        className="w-full bg-slate-50 text-slate-500 font-mono text-[10px] sm:text-xs py-2 px-3 pr-10 border border-slate-200 rounded-lg outline-none cursor-pointer"
                        onClick={(e) => {
                          e.currentTarget.select();
                          navigator.clipboard.writeText(setupLink);
                        }}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(setupLink)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 bg-white rounded-md border border-slate-200 shadow-sm transition-colors"
                        title="Copiar enlace"
                      >
                        <Copy className="w-3.5 h-3.5 cursor-pointer" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex w-full gap-3">
                <button
                  onClick={() => {
                    const clientData: Client = {
                      id: editingClient?.id || createdId || 0,
                      ...formData,
                      initials: formData.name.substring(0, 2).toUpperCase(),
                      color: "bg-emerald-100 text-emerald-700",
                      ivaCondition: formData.ivaCondition as any,
                      fields: formData.fields,
                      createdAt: new Date().toISOString(),
                      createdBy: 0
                    };
                    onSave(clientData);
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
              {isSaving ? 'GUARDANDO...' : (editingClient ? 'GUARDAR CAMBIOS' : 'GUARDAR CLIENTE')}
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

      <StationsConfigModal
        isOpen={isConfiguringStations}
        onClose={() => setIsConfiguringStations(false)}
        client={{ id: -1, name: formData.name, businessName: formData.businessName, allowedStations: formData.allowedStations }}
        onSave={async (_, allowedStations) => {
          // If we have selected at least one station, or null (all), we assume they should have the menu tabs.
          // In a fully granular system, the backend/frontend would decide this based on the devices array contents.
          // For now, we set them to true if allowedStations is not empty, to keep the sidebar tabs visible.
          const shouldEnable = allowedStations === null || allowedStations.length > 0;
          setFormData(prev => ({
            ...prev,
            allowedStations,
            hasStations: shouldEnable,
            hasSprayMonitor: shouldEnable
          }));
        }}
      />
    </div>
  );
}
