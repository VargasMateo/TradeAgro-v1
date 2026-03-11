import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, Plus, MoreHorizontal, Mail, Phone, MapPin, ArrowLeft, Save, Trash2, X, Edit, MessageCircle } from "lucide-react";
import { getColorForClient } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";

interface ClientField {
  name: string;
  location: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  lat?: number;
  lng?: number;
  fields?: (string | ClientField)[];
}

const initialClients: Client[] = [
  {
    id: 1,
    name: "AgroExport S.A.",
    email: "contacto@agroexport.com",
    phone: "+54 9 11 1234-5678",
    initials: "AE",
    color: "bg-emerald-100 text-emerald-700",
    lat: -34.6037,
    lng: -58.3816,
    fields: ['Lote 24, Sector Norte', 'Lote 15, Sector Sur']
  },
  {
    id: 2,
    name: "Finca La Estela",
    email: "admin@laestela.com",
    phone: "+54 9 351 9876-5432",
    initials: "FL",
    color: "bg-blue-100 text-blue-700",
    lat: -31.4201,
    lng: -64.1888,
    fields: ['Campo Principal', 'Anexo 1']
  },
  {
    id: 3,
    name: "Juan Pérez",
    email: "juan.perez@email.com",
    phone: "+54 9 341 5555-4444",
    initials: "JP",
    color: "bg-amber-100 text-amber-700",
    lat: -31.6107,
    lng: -60.6973,
    fields: ['El Ombú', 'La Esperanza']
  },
  {
    id: 4,
    name: "Cooperativa Sur",
    email: "info@coopsur.org.ar",
    phone: "+54 9 299 1111-2222",
    initials: "CS",
    color: "bg-indigo-100 text-indigo-700",
    lat: -38.9516,
    lng: -68.0591,
    fields: []
  },
  {
    id: 5,
    name: "Los Alamos",
    email: "gerencia@losalamos.com",
    phone: "+54 9 261 3333-9999",
    initials: "LA",
    color: "bg-rose-100 text-rose-700",
    lat: -32.8895,
    lng: -68.8458,
    fields: []
  }
];

export default function ClientsPage() {
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    fields: ClientField[];
  }>({
    name: '',
    email: '',
    phone: '',
    fields: []
  });

  useEffect(() => {
    const loadClients = () => {
      const storedClients = localStorage.getItem("clients");
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      } else {
        localStorage.setItem("clients", JSON.stringify(initialClients));
      }
    };

    loadClients();

    // Check for openForm state
    if (location.state && (location.state as any).openForm) {
      handleAddNew();
      // Clear state to prevent reopening on refresh (optional, but good practice)
      window.history.replaceState({}, document.title);
    }

    window.addEventListener('clients-updated', loadClients);
    return () => window.removeEventListener('clients-updated', loadClients);
  }, [location]);

  const saveToLocalStorage = (newClients: Client[]) => {
    localStorage.setItem("clients", JSON.stringify(newClients));
    setClients(newClients);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      fields: []
    });
    setView('form');
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      fields: (client.fields || []).map(f => typeof f === 'string' ? { name: f, location: '' } : { name: f.name || '', location: f.location || '' })
    });
    setView('form');
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este cliente?')) {
      const newClients = clients.filter(c => c.id !== id);
      saveToLocalStorage(newClients);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    if (editingClient) {
      // Update existing
      const updatedClients = clients.map(c => {
        if (c.id === editingClient.id) {
          return {
            ...c,
            ...formData,
            initials: formData.name.substring(0, 2).toUpperCase()
          };
        }
        return c;
      });
      saveToLocalStorage(updatedClients);
    } else {
      // Create new
      const newClient: Client = {
        id: Date.now(),
        ...formData,
        initials: formData.name.substring(0, 2).toUpperCase(),
        color: "bg-emerald-100 text-emerald-700", // Default color
        lat: -31.4201 + (Math.random() - 0.5) * 2, // Random lat around Cordoba for new clients
        lng: -64.1888 + (Math.random() - 0.5) * 2,  // Random lng around Cordoba for new clients
        fields: formData.fields
      };
      saveToLocalStorage([newClient, ...clients]);
    }
    
    setView('list');
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhoneNumberForWhatsApp = (phone: string) => {
    if (!phone) return '';
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Gestión de Clientes
          </h1>
          <p className="text-sm text-slate-500 md:text-lg">
            Administre su cartera de clientes y contactos.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-64"
            />
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => (
          <MagneticEffect key={client.id} className="rounded-2xl">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 h-full">
              <div className="mb-6 flex items-start justify-between">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <img
                  src={`https://ui-avatars.com/api/?name=${client.name}&background=${getColorForClient(client.name)}&color=fff&bold=true&size=128`}
                  alt={client.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex gap-1">
                <a 
                  href={`https://wa.me/${formatPhoneNumberForWhatsApp(client.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-slate-400 hover:bg-[#25D366]/10 hover:text-[#25D366]"
                  title="Contactar por WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <button 
                  onClick={() => handleEdit(client)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-emerald-600"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(client.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{client.name}</h3>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{client.phone}</span>
              </div>
            </div>
            </div>
          </MagneticEffect>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No se encontraron clientes</h3>
            <p className="text-slate-500">Intente con otra búsqueda o agregue un nuevo cliente.</p>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {view === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button 
                onClick={() => setView('list')} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre Completo / Razón Social</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: AgroExport S.A."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contacto@ejemplo.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
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
                    <label className="text-sm font-semibold text-slate-700">Campos</label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fields: [...prev.fields, { name: '', location: '' }] }))}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar Campo
                    </button>
                  </div>
                  
                  {formData.fields.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No hay campos agregados.</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.fields.map((field, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => {
                                const newFields = [...formData.fields];
                                newFields[index].name = e.target.value;
                                setFormData(prev => ({ ...prev, fields: newFields }));
                              }}
                              placeholder="Nombre del campo"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={field.location}
                              onChange={(e) => {
                                const newFields = [...formData.fields];
                                newFields[index].location = e.target.value;
                                setFormData(prev => ({ ...prev, fields: newFields }));
                              }}
                              placeholder="Ubicación"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = formData.fields.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, fields: newFields }));
                            }}
                            className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                onClick={() => setView('list')}
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
      )}
    </div>
  );
}
