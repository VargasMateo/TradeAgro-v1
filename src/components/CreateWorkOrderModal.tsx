import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import {
  Info,
  Settings,
  FileText,
  UploadCloud,
  X,
  File as FileIcon,
  Save,
  ChevronDown,
  Calendar as CalendarIcon,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  Paperclip,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import CreateClientModal from "./CreateClientModal";
import CreateFieldModal from "./CreateFieldModal";
import CreateLotModal from "./CreateLotModal";
import CreateProfesionalModal from "./CreateProfesionalModal";
import { WorkOrder } from "../types/database";

export default function CreateWorkOrderModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isOpen = searchParams.get('newJob') === 'true' || searchParams.get('editJob') !== null;
  const editJobId = searchParams.get('editJob');
  const [step, setStep] = useState<'form' | 'summary' | 'success'>('form');

  const [clients, setClients] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'profesional' | 'client' | 'admin' | null>(null);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Fallback to localStorage if API fails
      const stored = localStorage.getItem('clients');
      if (stored) setClients(JSON.parse(stored));
    }
  };
  const fetchProfesionales = async () => {
    try {
      const response = await fetch('/api/profesionales');
      const data = await response.json();
      setProfesionales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching profesionales:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const storedProfile = localStorage.getItem("userProfile");
      const user = storedProfile ? JSON.parse(storedProfile) : null;
      const role = user?.role || 'profesional';
      setUserRole(role);

      fetchClients();
      if (role === 'admin') {
        fetchProfesionales();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (clients.length > 0) {
      localStorage.setItem('clients', JSON.stringify(clients));
    }
  }, [clients]);

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isCreateFieldModalOpen, setIsCreateFieldModalOpen] = useState(false);
  const [isCreateLotModalOpen, setIsCreateLotModalOpen] = useState(false);
  const [isCreateProfesionalModalOpen, setIsCreateProfesionalModalOpen] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false);
  const [showLotSuggestions, setShowLotSuggestions] = useState(false);
  const [showProfesionalSuggestions, setShowProfesionalSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    client: searchParams.get('client') || '',
    date: searchParams.get('date') || new Date().toLocaleDateString('en-CA'),
    title: '',
    fieldId: '',
    field: searchParams.get('field') || '',
    hectares: '',
    service: '',
    secondaryService: '',
    campaign: '25/26',
    lot: '',
    number: '',
    amount: '',
    notes: '',
    profesionalId: '',
    profesional: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationDialog, setValidationDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'success';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const clientSuggestions = clients.filter((c: any) =>
    (c.name || '').toLowerCase().includes(formData.client.toLowerCase()) ||
    (c.businessName && c.businessName.toLowerCase().includes(formData.client.toLowerCase()))
  );
  const selectedClientObj = clients.find((c: any) =>
    (formData.clientId && c.id === formData.clientId) ||
    (!formData.clientId && (
      (c.name || '').toLowerCase() === formData.client.toLowerCase() ||
      (c.businessName && c.businessName.toLowerCase() === formData.client.toLowerCase())
    ))
  );
  const availableFields = selectedClientObj ? (selectedClientObj.fields || []) : [];
  const fieldNames = availableFields.map((f: any) => f.name);
  const fieldSuggestions = Array.from(new Set(fieldNames)).filter((f: any) => f && f.toLowerCase().includes(formData.field.toLowerCase()));

  const selectedFieldObj = availableFields.find((f: any) => f.name.trim().toLowerCase() === formData.field.trim().toLowerCase());
  const lotSuggestions = selectedFieldObj ? (selectedFieldObj.lots || []).filter((l: string) => l.toLowerCase().includes(formData.lot.toLowerCase())) : [];

  useEffect(() => {
    if (errors.lot && selectedFieldObj && selectedFieldObj.lots?.some((l: string) => l.toLowerCase() === formData.lot.trim().toLowerCase())) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.lot;
        return newErrors;
      });
    }
  }, [formData.lot, selectedFieldObj, errors.lot]);

  const profesionalSuggestions = profesionales.filter((p: any) =>
    (p.displayName || '').toLowerCase().includes(formData.profesional.toLowerCase()) ||
    (p.specialty || '').toLowerCase().includes(formData.profesional.toLowerCase())
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');

      const storedProfile = localStorage.getItem("userProfile");
      const user = storedProfile ? JSON.parse(storedProfile) : null;
      const currentUserId = user?.id ? String(user.id) : '';
      const role = user?.role || 'profesional';

      if (editJobId) {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        fetch('/api/work-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(async (workOrders: WorkOrder[]) => {
            const orderToEdit = workOrders.find((w: WorkOrder) => String(w.id) === editJobId);
            if (orderToEdit) {
              // Get profesional info to populate name search
              let pName = '';
              try {
                const pRes = await fetch('/api/profesionales');
                const pData = await pRes.json();
                const foundP = Array.isArray(pData) ? pData.find(p => String(p.id) === String(orderToEdit.profesionalId)) : null;
                pName = foundP?.displayName || '';
              } catch (e) { }

              setFormData({
                clientId: orderToEdit.clientId || '',
                client: (orderToEdit as any).client || '',
                date: orderToEdit.date ? new Date(orderToEdit.date).toISOString().split('T')[0] : '',
                title: orderToEdit.title || orderToEdit.service || '',
                fieldId: orderToEdit.fieldId !== undefined && orderToEdit.fieldId !== null ? String(orderToEdit.fieldId) : '',
                field: orderToEdit.fieldName || '',
                hectares: orderToEdit.hectares !== null ? String(orderToEdit.hectares) : '',
                service: orderToEdit.service || 'Cosecha',
                secondaryService: (orderToEdit as any).secondaryService || '',
                campaign: orderToEdit.campaign || '25/26',
                lot: orderToEdit.lotName || '',
                number: (orderToEdit as any).number || '',
                amount: orderToEdit.amountUsd !== null ? String(orderToEdit.amountUsd) : '',
                notes: '', // Ya no usamos description, las observaciones van por tabla separada
                profesionalId: orderToEdit.profesionalId ? String(orderToEdit.profesionalId) : currentUserId,
                profesional: pName
              });
            }
          })
          .catch(err => console.error("Error fetch job for edit:", err));
        return;
      }

      // Default for new job
      setFormData(prev => ({
        ...prev,
        clientId: '',
        client: searchParams.get('client') || prev.client,
        date: searchParams.get('date') || new Date().toLocaleDateString('en-CA'),
        field: searchParams.get('field') || prev.field,
        profesionalId: role === 'admin' ? '' : currentUserId,
        profesional: role === 'admin' ? '' : (user?.displayName || user?.name || '')
      }));
    }
    setErrors({});
    setSelectedFiles([]);
  }, [isOpen, searchParams, editJobId]);

  const handleClose = () => {
    // Reset state
    setStep('form');
    const storedProfile = localStorage.getItem("userProfile");
    const user = storedProfile ? JSON.parse(storedProfile) : null;
    const currentUserId = user?.id ? String(user.id) : '';

    setFormData({
      clientId: '',
      client: '',
      date: new Date().toLocaleDateString('en-CA'),
      title: '',
      field: '',
      hectares: '',
      service: '',
      secondaryService: '',
      campaign: '25/26',
      lot: '',
      number: '',
      amount: '',
      notes: '',
      profesionalId: userRole === 'admin' ? '' : currentUserId,
      profesional: userRole === 'admin' ? '' : (user?.displayName || user?.name || '')
    });
    setErrors({});
    setSelectedFiles([]);
    setIsSaving(false);

    // Remove newJob and other related params from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('newJob');
    newParams.delete('editJob');
    newParams.delete('client');
    newParams.delete('date');
    newParams.delete('field');
    setSearchParams(newParams);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // If user types in the client input manually, we must clear the clientId 
      // so they are forced to pick an existing one or create a new one.
      if (name === 'client') {
        const matchingClient = clients.find(c => c.name.toLowerCase() === value.toLowerCase());
        if (matchingClient) {
          updated.clientId = matchingClient.id;
        } else {
          updated.clientId = '';
          updated.field = '';
          updated.lot = '';
        }
      }

      if (name === 'profesional') {
        const matchingP = profesionales.find(p => (p.displayName || '').toLowerCase() === value.toLowerCase());
        if (matchingP) {
          updated.profesionalId = matchingP.id;
        } else {
          updated.profesionalId = '';
        }
      }

      if (name === 'field') {
        const matchingField = availableFields.find((f: any) => f.name.toLowerCase() === value.toLowerCase());
        if (matchingField) {
          updated.fieldId = matchingField.id;
        } else {
          updated.fieldId = '';
          updated.lot = '';
        }
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = [
      { key: 'client', label: 'El cliente es obligatorio' },
      { key: 'date', label: 'La fecha es obligatoria' },
      { key: 'title', label: 'El título es obligatorio' },
      { key: 'field', label: 'El campo es obligatorio' },
      { key: 'lot', label: 'El lote es obligatorio' },
      { key: 'hectares', label: 'Las hectáreas son obligatorias' },
      { key: 'amount', label: 'El importe es obligatorio' },
      { key: 'service', label: 'El servicio es obligatorio' },
      { key: 'campaign', label: 'La campaña es obligatoria' },
      { key: 'profesionalId', label: 'El profesional es obligatorio' },
    ];

    requiredFields.forEach(field => {
      if (!formData[field.key as keyof typeof formData]?.toString().trim()) {
        newErrors[field.key] = field.label;
      }
    });

    // Special validation: ensure a valid client was selected (clientId must exist)
    if (!formData.clientId) {
      newErrors.client = 'Debe seleccionar un cliente de la lista o crear uno nuevo';
    }

    // Special validation: ensure a valid profesional was selected if admin (profesionalId must exist)
    if (userRole === 'admin' && !formData.profesionalId) {
      newErrors.profesionalId = 'Debe seleccionar un profesional de la lista o crear uno nuevo';
    }

    // Special validation: ensure a valid field was selected (fieldId must exist)
    if (!formData.fieldId) {
      newErrors.field = 'Debe seleccionar un campo de la lista o crear uno nuevo';
    }

    // Special validation: ensure a valid lot was selected (must exist in field lots)
    if (selectedFieldObj && !selectedFieldObj.lots?.some((l: string) => l.toLowerCase() === formData.lot.trim().toLowerCase())) {
      newErrors.lot = 'Debe seleccionar un lote de la lista o crear uno nuevo';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Scroll to first error
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const errorKeyToName: Record<string, string> = {
            profesionalId: 'profesional',
            clientId: 'client',
            client: 'client',
            field: 'field',
            lot: 'lot',
            hectares: 'hectares',
            amount: 'amount',
            service: 'service',
            title: 'title',
            date: 'date',
            campaign: 'campaign'
          };

          // Find the first error in the requiredFields order or from keys
          const firstErrorKey = requiredFields.find(f => newErrors[f.key])?.key || Object.keys(newErrors)[0];
          const inputName = errorKeyToName[firstErrorKey] || firstErrorKey;
          
          const errorElement = scrollContainerRef.current.querySelector(`[name="${inputName}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Optionally focus the element as well
            if (errorElement instanceof HTMLElement) {
              errorElement.focus({ preventScroll: true });
            }
          }
        }
      }, 100);
      return;
    }

    setStep('summary');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrors({});
    try {
      const isEdit = !!editJobId;
      const url = isEdit ? `/api/work-orders/${editJobId}` : '/api/work-orders';
      const method = isEdit ? 'PUT' : 'POST';

      const storedProfile = localStorage.getItem("userProfile");
      const user = storedProfile ? JSON.parse(storedProfile) : null;
      const createdBy = user?.id || null;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ ...formData, createdBy })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save job');
      }

      const result = await response.json();
      const jobId = result.id;

      // Now upload files if any
      if (selectedFiles.length > 0) {
        const formDataUpload = new FormData();
        selectedFiles.forEach(file => {
          formDataUpload.append('files', file);
        });

        const uploadRes = await fetch(`/api/work-orders/${jobId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formDataUpload
        });

        if (!uploadRes.ok) {
          console.error('Failed to upload files');
        }
      }

      console.log('Job saved successfully:', result);

      setStep('success');
    } catch (error: any) {
      console.error('Error saving job:', error);
      setErrors({ submit: error.message || 'Error al guardar el orden' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishSuccess = () => {
    handleClose();
    if (location.pathname !== '/work-orders' && location.pathname !== '/dashboard' && !location.pathname.startsWith('/work-orders/')) {
      navigate('/work-orders');
    } else {
      window.dispatchEvent(new Event('job-created'));
    }
  };

  const getIconNameForService = (service: string) => {
    switch (service) {
      case 'Cosecha': return 'Wheat';
      case 'Siembra': return 'Sprout';
      case 'Fumigación': return 'Droplets';
      case 'Fertilización': return 'Activity';
      default: return 'Tractor';
    }
  };

  const getColorForService = (service: string) => {
    switch (service) {
      case 'Cosecha': return 'orange';
      case 'Siembra': return 'emerald';
      case 'Fumigación': return 'blue';
      case 'Fertilización': return 'indigo';
      default: return 'emerald';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {step === 'form' ? (editJobId ? 'Editar Carga de Orden' : 'Nueva Carga de Orden') : (editJobId ? 'Resumen de Edición' : 'Resumen del Nuevo Orden')}
            </h2>
            <p className="text-sm text-slate-500">
              {step === 'form'
                ? (editJobId ? 'Modifique los detalles del servicio.' : 'Complete los detalles para registrar un nuevo servicio.')
                : 'Revise los detalles antes de confirmar y guardar.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {step === 'summary' && (
              <div className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 sm:block">
                Paso 2 de 2
              </div>
            )}
            <button
              onClick={handleClose}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6 pb-4">

            {/* FORM STEP */}
            <div className={step === 'form' ? 'block space-y-6' : 'hidden'}>
              {/* Datos Generales */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Info className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Datos Generales</h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {userRole === 'admin' && (
                    <div className="space-y-1.5 sm:col-span-2 relative">
                      <label className="text-sm font-semibold text-slate-700">
                        Profesional Asignado <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="profesional"
                          autoComplete="off"
                          value={formData.profesional}
                          onChange={(e) => {
                            handleInputChange(e);
                            setShowProfesionalSuggestions(true);
                          }}
                          onFocus={() => setShowProfesionalSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowProfesionalSuggestions(false), 200)}
                          placeholder="Buscar profesional..."
                          className={cn(
                            "w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2",
                            errors.profesionalId
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          )}
                        />
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                      {errors.profesionalId && (
                        <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                          {errors.profesionalId}
                        </p>
                      )}
                      <div className="absolute top-full left-0 w-full h-0 overflow-visible z-50">
                        {showProfesionalSuggestions && (profesionalSuggestions.length > 0 || !profesionales.some((p: any) => (p.displayName || '').toLowerCase() === formData.profesional.toLowerCase())) && (
                          <div className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                            {profesionalSuggestions.map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex flex-col cursor-pointer"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    profesional: p.displayName,
                                    profesionalId: p.id
                                  }));
                                  setShowProfesionalSuggestions(false);
                                }}
                              >
                                <span className="font-bold">{p.displayName}</span>
                                {p.specialty && <span className="text-[10px] text-slate-500 capitalize">{p.specialty}</span>}
                              </button>
                            ))}
                            {!profesionales.some((p: any) => (p.displayName || '').toLowerCase() === formData.profesional.toLowerCase()) && (
                              <button
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium cursor-pointer"
                                onClick={() => setIsCreateProfesionalModalOpen(true)}
                              >
                                {formData.profesional.trim() !== '' ? `+ Crear "${formData.profesional}"` : '+ Crear nuevo profesional'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-semibold text-slate-700">
                      Cliente <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="client"
                        autoComplete="off"
                        value={formData.client}
                        onChange={(e) => {
                          handleInputChange(e);
                          setShowClientSuggestions(true);
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                        placeholder="Buscar o crear cliente..."
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2",
                          errors.client
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.client && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.client}
                      </p>
                    )}
                    <div className="absolute top-full left-0 w-full h-0 overflow-visible z-50">
                      {showClientSuggestions && (clientSuggestions.length > 0 || !clients.some((c: any) => (c.name || '').toLowerCase() === formData.client.toLowerCase())) && (
                        <div className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                          {clientSuggestions.map((c: any) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex flex-col cursor-pointer"
                              onClick={() => {
                                const hasSingleField = c.fields && c.fields.length === 1;
                                const singleField = hasSingleField ? c.fields[0] : null;
                                const hasSingleLot = singleField && singleField.lots && singleField.lots.length === 1;
                                const singleLot = hasSingleLot ? singleField.lots[0] : '';
  
                                setFormData(prev => ({
                                  ...prev,
                                  client: c.name,
                                  clientId: c.id,
                                  field: singleField ? singleField.name : '',
                                  fieldId: singleField ? singleField.id : '',
                                  lot: singleLot
                                }));
                                setShowClientSuggestions(false);
                              }}
                            >
                              <span className="font-bold">{c.name}</span>
                              {c.businessName && <span className="text-[10px] text-slate-500">{c.businessName}</span>}
                            </button>
                          ))}
                          {!clients.some((c: any) => c.name.toLowerCase() === formData.client.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium cursor-pointer"
                              onClick={() => setIsCreateClientModalOpen(true)}
                            >
                              {formData.client.trim() !== '' ? `+ Crear "${formData.client}"` : '+ Crear nuevo cliente'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Fecha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-all focus:ring-2",
                          errors.date
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                      <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    {errors.date && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Título de la carga <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Ej: Cosecha de Maíz - Lote 4"
                      className={cn(
                        "w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2",
                        errors.title
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      )}
                    />
                    {errors.title && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.title}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Ubicación y Superficie */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Ubicación y Superficie</h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-semibold text-slate-700">
                      Campo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="field"
                        autoComplete="off"
                        value={formData.field}
                        onChange={(e) => {
                          handleInputChange(e);
                          setShowFieldSuggestions(true);
                        }}
                        onFocus={() => setShowFieldSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFieldSuggestions(false), 200)}
                        placeholder="Buscar o crear campo..."
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2",
                          errors.field
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.field && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.field}
                      </p>
                    )}
                    <div className="absolute top-full left-0 w-full h-0 overflow-visible z-50">
                      {showFieldSuggestions && (fieldSuggestions.length > 0 || !fieldNames.some((f: any) => f && f.toLowerCase() === formData.field.toLowerCase())) && (
                        <div className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                          {fieldSuggestions.map((f: string) => (
                            <button
                              key={f}
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer"
                              onClick={() => {
                                const foundField = selectedClientObj?.fields?.find((fieldObj: any) => fieldObj.name === f);
                                setFormData(prev => ({
                                  ...prev,
                                  field: f,
                                  fieldId: foundField?.id || ''
                                }));
                                setShowFieldSuggestions(false);
                              }}
                            >
                              {f}
                            </button>
                          ))}
                          {!fieldNames.some((f: any) => f && f.toLowerCase() === formData.field.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium cursor-pointer"
                              onClick={() => {
                                if (selectedClientObj) {
                                  setIsCreateFieldModalOpen(true);
                                } else {
                                  setValidationDialog({
                                    show: true,
                                    title: 'Selección Requerida',
                                    message: 'Por favor, seleccione un cliente primero para poder asociar el campo.',
                                    type: 'warning'
                                  });
                                }
                                setShowFieldSuggestions(false);
                              }}
                            >
                              {formData.field.trim() !== '' ? `+ Crear "${formData.field}"` : '+ Crear nuevo campo'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-semibold text-slate-700">
                      Lote <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="lot"
                        autoComplete="off"
                        value={formData.lot}
                        onChange={(e) => {
                          handleInputChange(e);
                          setShowLotSuggestions(true);
                        }}
                        onFocus={() => setShowLotSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowLotSuggestions(false), 200)}
                        placeholder="Identificador"
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2",
                          errors.lot
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="absolute top-full left-0 w-full h-0 overflow-visible z-50">
                      {showLotSuggestions && (lotSuggestions.length > 0 || (selectedFieldObj && !selectedFieldObj.lots?.some((l: string) => l.toLowerCase() === formData.lot.toLowerCase()))) && (
                        <div className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                          {lotSuggestions.map((l: string) => (
                            <button
                              key={l}
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, lot: l }));
                                setShowLotSuggestions(false);
                              }}
                            >
                              {l}
                            </button>
                          ))}
                          {selectedFieldObj && !selectedFieldObj.lots?.some((l: string) => l.toLowerCase() === formData.lot.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium cursor-pointer"
                              onClick={() => {
                                setIsCreateLotModalOpen(true);
                                setShowLotSuggestions(false);
                              }}
                            >
                              {formData.lot.trim() !== '' ? `+ Crear lote "${formData.lot}"` : '+ Crear nuevo lote'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.lot && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.lot}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Superficie y Valor */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Superficie y Valor</h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Hectáreas <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="hectares"
                        value={formData.hectares}
                        onChange={handleInputChange}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="0.00"
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          errors.hectares
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">HA</span>
                    </div>
                    {errors.hectares && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.hectares}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Importe (USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">U$S</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="0.00"
                        className={cn(
                          "w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          errors.amount
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.amount}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalles del Servicio */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Settings className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Detalles del Servicio</h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Servicio Principal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full appearance-none rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 cursor-pointer",
                          errors.service
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Cosecha">Cosecha</option>
                        <option value="Siembra">Siembra</option>
                        <option value="Fumigación">Fumigación</option>
                        <option value="Fertilización">Fertilización</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.service && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.service}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Secundario</label>
                    <input
                      type="text"
                      name="secondaryService"
                      value={formData.secondaryService}
                      onChange={handleInputChange}
                      placeholder="Opcional"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Campaña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="campaign"
                        value={formData.campaign}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full appearance-none rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 cursor-pointer",
                          errors.campaign
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        )}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="25/26">25/26</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.campaign && (
                      <p className="text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 ml-1">
                        {errors.campaign}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Observaciones y Adjuntos */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Observaciones y Adjuntos</h3>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Observaciones</label>
                    <textarea
                      rows={3}
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Agregue detalles adicionales..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    ></textarea>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Archivos Adjuntos</label>
                    <div
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 transition-colors hover:bg-slate-100 cursor-pointer relative"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="mb-2 rounded-full bg-emerald-100 p-2 text-emerald-600">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Haz clic para subir o arrastra y suelta</p>
                      <p className="mt-0.5 text-xs text-slate-500">Imágenes, PDF, etc. (Máx. 10MB)</p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 px-3 shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="truncate text-xs font-medium text-slate-600">{file.name}</span>
                              <span className="shrink-0 text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileRemove(idx);
                              }}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SUCCESS STEP */}
            <div className={step === 'success' ? 'block' : 'hidden'}>
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-slate-900">
                  ¡Trabajo Guardado!
                </h3>
                <p className="mb-8 text-slate-500 max-w-[280px]">
                  El trabajo ha sido registrado exitosamente en el sistema.
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={handleFinishSuccess}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e4a33] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    ENTENDIDO
                  </button>
                </div>
              </div>
            </div>

            {/* SUMMARY STEP */}
            <div className={step === 'summary' ? 'block space-y-6' : 'hidden'}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Todo listo para guardar</h4>
                    <p className="text-xs text-slate-500">Revise la información a continuación. Si todo es correcto, confirme para finalizar.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Summary Section 1 */}
                  <div>
                    <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Info className="h-3 w-3" /> Datos Generales
                    </h5>
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Cliente</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.client || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Fecha</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.date
                            ? new Date(formData.date + 'T00:00:00').toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })
                            : '-'
                          }
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-medium text-slate-400">Título</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.title || '-'}</p>
                      </div>
                      {userRole === 'admin' && (
                        <div className="sm:col-span-2">
                          <p className="text-[10px] font-medium text-slate-400">Profesional Asignado</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {profesionales.find(p => String(p.id) === String(formData.profesionalId))?.displayName || 'No asignado'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Section 2 */}
                  <div>
                    <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <MapPin className="h-3 w-3" /> Ubicación
                    </h5>
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Campo</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.field || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Lote</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.lot || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Hectáreas</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.hectares ? `${formData.hectares} HA` : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Section 3 */}
                  <div>
                    <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Settings className="h-3 w-3" /> Detalles del Servicio
                    </h5>
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Servicio</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.service || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Campaña</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.campaign || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400">Importe (USD)</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.amount ? `U$S ${formData.amount}` : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Section 4 - Observations */}
                  {formData.notes && formData.notes.trim() && (
                    <div>
                      <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <FileText className="h-3 w-3" /> Observaciones
                      </h5>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap italic">
                          "{formData.notes}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Section 4 - NEW: Attachments */}
                  {selectedFiles.length > 0 && (
                    <div>
                      <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Paperclip className="h-3 w-3" /> Archivos Adjuntos ({selectedFiles.length})
                      </h5>
                      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 overflow-hidden rounded-lg bg-white p-2 shadow-sm">
                            <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="flex flex-1 items-center justify-between overflow-hidden">
                              <span className="truncate text-xs font-medium text-slate-600">{file.name}</span>
                              <span className="shrink-0 text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        {step !== 'success' && (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {step === 'form' ? (
                <>
                  <div className="hidden text-sm text-slate-500 sm:block">
                    <span className="font-bold text-slate-900">Resumen:</span> {editJobId ? 'Editando' : 'Nuevo'} trabajo de {formData.service} para {formData.client || '...'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none cursor-pointer"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e4a33] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-none cursor-pointer"
                    >
                      CONTINUAR
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {Object.keys(errors).length > 0 && (
                      <p className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                        Hay campos obligatorios sin completar
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStep('form')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    ATRÁS
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e4a33] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] sm:flex-none",
                      isSaving ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] cursor-pointer"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        GUARDANDO...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        CONFIRMAR
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Show only on non-success steps */}
              {step !== 'success' && errors.submit && (
                <p className="mt-2 text-center text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                  {errors.submit}
                </p>
              )}
            </div>
          </div>
        )}

      </div>
      <CreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        initialName={formData.client}
        onSave={(newClient) => {
          setClients((prev: any) => [newClient, ...prev]);
          setFormData(prev => ({ ...prev, client: newClient.name, clientId: newClient.id }));
          setIsCreateClientModalOpen(false);
          setShowClientSuggestions(false);
        }}
      />
      <CreateProfesionalModal
        isOpen={isCreateProfesionalModalOpen}
        onClose={() => setIsCreateProfesionalModalOpen(false)}
        initialDisplayName={formData.profesional}
        onSave={(newProf) => {
          setProfesionales((prev: any) => [newProf, ...prev]);
          setFormData(prev => ({ ...prev, profesional: newProf.displayName, profesionalId: newProf.id }));
          setIsCreateProfesionalModalOpen(false);
          setShowProfesionalSuggestions(false);
        }}
      />
      {/* Create Field Modal */}
      {selectedClientObj && (
        <CreateFieldModal
          isOpen={isCreateFieldModalOpen}
          onClose={() => setIsCreateFieldModalOpen(false)}
          client={selectedClientObj}
          initialFieldName={formData.field}
          onSave={(updatedClient) => {
            setClients((prev: any) => prev.map((c: any) =>
              c.id === updatedClient.id ? updatedClient : c
            ));

            // Find the newly added field to get its ID
            const newField = updatedClient.fields?.find(
              (f: any) => f.name.toLowerCase() === formData.field.toLowerCase()
            );

            setFormData(prev => ({
              ...prev,
              field: formData.field,
              fieldId: newField?.id?.toString() || ''
            }));
            setIsCreateFieldModalOpen(false);
          }}
        />
      )}

      {/* Create Lot Modal */}
      {selectedClientObj && selectedFieldObj && (
        <CreateLotModal
          isOpen={isCreateLotModalOpen}
          onClose={() => setIsCreateLotModalOpen(false)}
          client={selectedClientObj}
          field={selectedFieldObj}
          initialLotName={formData.lot}
          onSave={(updatedClient, newLotName) => {
            setClients((prev: any) => prev.map((c: any) =>
              c.id === updatedClient.id ? updatedClient : c
            ));
            setFormData(prev => ({ ...prev, lot: newLotName }));
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.lot;
              return newErrors;
            });
            setIsCreateLotModalOpen(false);
          }}
        />
      )}

      {/* Validation Dialog */}
      <AnimatePresence>
        {validationDialog.show && (
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
              <div className={cn(
                "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl",
                validationDialog.type === 'warning' ? "bg-amber-50 text-amber-600" :
                  validationDialog.type === 'error' ? "bg-red-50 text-red-600" :
                    "bg-emerald-50 text-emerald-600"
              )}>
                <AlertCircle className="h-10 w-10" />
              </div>

              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-900">
                {validationDialog.title}
              </h3>

              <p className="mb-8 text-sm font-medium leading-relaxed text-slate-500">
                {validationDialog.message}
              </p>

              <button
                onClick={() => setValidationDialog({ ...validationDialog, show: false })}
                className={cn(
                  "w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer",
                  validationDialog.type === 'warning' ? "bg-amber-600 shadow-amber-200" :
                    validationDialog.type === 'error' ? "bg-red-600 shadow-red-200" :
                      "bg-emerald-600 shadow-emerald-200"
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
