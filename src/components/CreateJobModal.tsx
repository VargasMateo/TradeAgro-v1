import { useState, ChangeEvent, useEffect } from "react";
import {
  Info,
  Settings,
  FileText,
  UploadCloud,
  X,
  File as FileIcon,
  Image as ImageIcon,
  Save,
  ChevronDown,
  Calendar as CalendarIcon,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  DollarSign
} from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import CreateClientModal from "./CreateClientModal";
import { Client } from "../types/client";

export default function CreateJobModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isOpen = searchParams.get('newJob') === 'true' || searchParams.get('editJob') !== null;
  const editJobId = searchParams.get('editJob');
  const [step, setStep] = useState<'form' | 'summary'>('form');

  const [clients, setClients] = useState(() => {
    const stored = localStorage.getItem('clients');
    return stored ? JSON.parse(stored) : [
      { id: '1', name: 'AgroExport S.A.', fields: ['Lote 24, Sector Norte', 'Lote 15, Sector Sur'] },
      { id: '2', name: 'Finca La Estela', fields: ['Campo Principal', 'Anexo 1'] },
      { id: '3', name: 'Juan Pérez', fields: ['El Ombú', 'La Esperanza'] },
    ];
  });

  useEffect(() => {
    localStorage.setItem('clients', JSON.stringify(clients));
  }, [clients]);

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    client: searchParams.get('client') || '',
    date: searchParams.get('date') || '',
    title: '',
    field: searchParams.get('field') || '',
    hectares: '',
    service: 'Cosecha',
    secondaryService: '',
    campaign: '2023/24',
    lot: '',
    number: '',
    amount: '',
    notes: ''
  });

  const clientSuggestions = clients.filter((c: any) => c.name.toLowerCase().includes(formData.client.toLowerCase()));
  const selectedClientObj = clients.find((c: any) => c.name === formData.client);
  const availableFields = selectedClientObj
    ? (selectedClientObj.fields || [])
    : clients.flatMap((c: any) => c.fields || []);
  const fieldNames = availableFields.map((f: any) => typeof f === 'string' ? f : f.name);
  const fieldSuggestions = Array.from(new Set(fieldNames)).filter((f: any) => f && f.toLowerCase().includes(formData.field.toLowerCase()));

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');

      if (editJobId) {
        const storedJobs = localStorage.getItem("jobs");
        if (storedJobs) {
          const jobs = JSON.parse(storedJobs);
          const jobToEdit = jobs.find((j: any) => (j.id || '').replace('#', '') === editJobId);
          if (jobToEdit) {
            // Try to parse location into field and lot
            const locationParts = jobToEdit.location.split(' - ');
            const field = locationParts[0] || '';
            const lot = locationParts[1] || '';

            setFormData({
              client: jobToEdit.client || '',
              date: jobToEdit.date || '',
              title: jobToEdit.title || jobToEdit.service || '',
              field: field || '',
              hectares: jobToEdit.hectares || '',
              service: jobToEdit.service || 'Cosecha',
              secondaryService: jobToEdit.secondaryService || '',
              campaign: jobToEdit.campaign || '2023/24',
              lot: lot || '',
              number: jobToEdit.number || '',
              amount: jobToEdit.amount || '',
              notes: jobToEdit.notes || ''
            });
            return;
          }
        }
      }

      // Default for new job
      setFormData(prev => ({
        ...prev,
        client: searchParams.get('client') || prev.client,
        date: searchParams.get('date') || prev.date,
        field: searchParams.get('field') || prev.field,
      }));
    }
  }, [isOpen, searchParams, editJobId]);

  const handleClose = () => {
    // Remove newJob and other related params from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('newJob');
    newParams.delete('editJob');
    newParams.delete('client');
    newParams.delete('date');
    newParams.delete('field');
    setSearchParams(newParams);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    const storedJobs = localStorage.getItem("jobs");
    let jobs = storedJobs ? JSON.parse(storedJobs) : [];

    if (editJobId) {
      // Update existing job
      jobs = jobs.map((job: any) => {
        if ((job.id || '').replace('#', '') === editJobId) {
          return {
            ...job,
            client: formData.client || "Cliente Desconocido",
            location: formData.field ? `${formData.field} - ${formData.lot || 'Sin Lote'}` : "Ubicación pendiente",
            service: formData.service,
            date: formData.date || job.date,
            iconName: getIconNameForService(formData.service),
            color: getColorForService(formData.service),
          };
        }
        return job;
      });
    } else {
      // Create new job object
      const newJob = {
        id: `#AG-${Math.floor(Math.random() * 9000) + 1000}`,
        client: formData.client || "Cliente Desconocido",
        location: formData.field ? `${formData.field} - ${formData.lot || 'Sin Lote'}` : "Ubicación pendiente",
        service: formData.service,
        date: formData.date || "Hoy, 08:00 AM",
        operator: "Asignación Pendiente", // Placeholder
        status: "Pendiente",
        iconName: getIconNameForService(formData.service),
        color: getColorForService(formData.service),
      };
      jobs = [newJob, ...jobs];
    }

    // Save to localStorage
    localStorage.setItem("jobs", JSON.stringify(jobs));

    // Simulate API call delay
    setTimeout(() => {
      handleClose();
      // If we are not on jobs page, maybe we want to navigate there, or just stay and let the user see the success.
      // For now, let's just close the modal.
      if (location.pathname !== '/jobs' && location.pathname !== '/calendar' && !location.pathname.startsWith('/jobs/')) {
        navigate('/jobs');
      } else {
        // Dispatch an event so that the jobs list can update if we are on the jobs page
        window.dispatchEvent(new Event('job-created'));
      }
    }, 500);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {step === 'form' ? (editJobId ? 'Editar Carga de Trabajo' : 'Nueva Carga de Trabajo') : (editJobId ? 'Resumen de Edición' : 'Resumen del Nuevo Trabajo')}
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
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-semibold text-slate-700">Cliente</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="client"
                        value={formData.client}
                        onChange={(e) => {
                          handleInputChange(e);
                          setShowClientSuggestions(true);
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                        placeholder="Buscar o crear cliente..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {showClientSuggestions && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                        {clientSuggestions.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, client: c.name }));
                              setShowClientSuggestions(false);
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                        {!clients.some((c: any) => c.name.toLowerCase() === formData.client.toLowerCase()) && formData.client.trim() !== '' && (
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium"
                            onClick={() => setIsCreateClientModalOpen(true)}
                          >
                            + Crear "{formData.client}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Fecha</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Título de la carga</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Ej: Cosecha de Maíz - Lote 4"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
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
                    <label className="text-sm font-semibold text-slate-700">Campo</label>
                    <input
                      type="text"
                      name="field"
                      value={formData.field}
                      onChange={(e) => {
                        handleInputChange(e);
                        setShowFieldSuggestions(true);
                      }}
                      onFocus={() => setShowFieldSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowFieldSuggestions(false), 200)}
                      placeholder="Buscar o crear campo..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {showFieldSuggestions && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                        {fieldSuggestions.map((f: string) => (
                          <button
                            key={f}
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, field: f }));
                              setShowFieldSuggestions(false);
                            }}
                          >
                            {f}
                          </button>
                        ))}
                        {!fieldNames.some((f: any) => f && f.toLowerCase() === formData.field.toLowerCase()) && formData.field.trim() !== '' && (
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium"
                            onClick={() => {
                              if (window.confirm(`¿Deseas crear el nuevo campo "${formData.field}"${selectedClientObj ? ` para el cliente ${selectedClientObj.name}` : ''}?`)) {
                                if (selectedClientObj) {
                                  setClients((prev: any) => prev.map((c: any) => c.id === selectedClientObj.id ? { ...c, fields: [...c.fields, { name: formData.field, location: '' }] } : c));
                                }
                                setShowFieldSuggestions(false);
                              } else {
                                setFormData(prev => ({ ...prev, field: '' }));
                              }
                            }}
                          >
                            + Crear "{formData.field}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lote</label>
                    <input
                      type="text"
                      name="lot"
                      value={formData.lot}
                      onChange={handleInputChange}
                      placeholder="Identificador"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
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
                    <label className="text-sm font-semibold text-slate-700">Hectáreas</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="hectares"
                        value={formData.hectares}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">HA</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Importe (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">U$S</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
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
                    <label className="text-sm font-semibold text-slate-700">Servicio Principal</label>
                    <div className="relative">
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleInputChange}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="Cosecha">Cosecha</option>
                        <option value="Siembra">Siembra</option>
                        <option value="Fumigación">Fumigación</option>
                        <option value="Fertilización">Fertilización</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
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
                    <label className="text-sm font-semibold text-slate-700">Campaña</label>
                    <div className="relative">
                      <select
                        name="campaign"
                        value={formData.campaign}
                        onChange={handleInputChange}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="2023/24">2023/24</option>
                        <option value="2022/23">2022/23</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
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
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 transition-colors hover:bg-slate-100">
                      <div className="mb-2 rounded-full bg-emerald-100 p-2 text-emerald-600">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Haz clic para subir o arrastra y suelta</p>
                      <p className="mt-0.5 text-xs text-slate-500">PDF, JPG, PNG, MP4, XLSX (Máx. 50MB)</p>
                    </div>
                  </div>
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
                        <p className="text-sm font-semibold text-slate-900">{formData.date || '-'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-medium text-slate-400">Título</p>
                        <p className="text-sm font-semibold text-slate-900">{formData.title || '-'}</p>
                      </div>
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
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
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
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={() => setStep('summary')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e4a33] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-none"
                  >
                    CONTINUAR
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('form')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  ATRÁS
                </button>
                <button
                  onClick={handleSave}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2e4a33] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-none"
                >
                  <Save className="h-4 w-4" />
                  CONFIRMAR
                </button>
              </>
            )}
          </div>
        </div>

      </div>
      <CreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        initialName={formData.client}
        onSave={(newClient) => {
          setClients((prev: any) => [newClient, ...prev]);
          setFormData(prev => ({ ...prev, client: newClient.name }));
          setIsCreateClientModalOpen(false);
          setShowClientSuggestions(false);
        }}
      />
    </div>
  );
}
