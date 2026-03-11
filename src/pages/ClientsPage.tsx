import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, Plus, MoreHorizontal, Mail, Phone, MapPin, ArrowLeft, Save, Trash2, X, Edit, MessageCircle } from "lucide-react";
import { getColorForClient } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";
import CreateClientModal from "../components/CreateClientModal";
import { Client, ClientField } from "../types/client";

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

  const handleSaveDirect = (clientData: Client) => {
    if (editingClient) {
      // Update existing
      const updatedClients = clients.map(c => {
        if (c.id === editingClient.id) {
          return clientData;
        }
        return c;
      });
      saveToLocalStorage(updatedClients);
    } else {
      // Create new
      saveToLocalStorage([clientData, ...clients]);
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
          <div key={client.id} className="h-full">
            <MagneticEffect className="rounded-2xl">
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
          </div>
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

      <CreateClientModal
        isOpen={view === 'form'}
        onClose={() => setView('list')}
        onSave={handleSaveDirect}
        editingClient={editingClient}
      />
    </div>
  );
}
