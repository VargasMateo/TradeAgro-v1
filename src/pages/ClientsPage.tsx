import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, Plus, Trash2, Edit, Copy, Check, Sun, Mail, Database, RefreshCw } from "lucide-react";
import { getColorForClient } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";
import CreateClientModal from "../components/CreateClientModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import StationsConfigModal from "../components/StationsConfigModal";
import { Client, ClientField } from "../types/client";
import { authenticatedFetch } from "../lib/api";

export default function ClientsPage({ userRole = 'client' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [configuringStationsFor, setConfiguringStationsFor] = useState<Client | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [resendSuccessId, setResendSuccessId] = useState<number | null>(null);

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

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/backend/clients');
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    window.addEventListener('clients-updated', fetchClients);
    return () => window.removeEventListener('clients-updated', fetchClients);
  }, [location]);

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
      fields: [{ name: '', lat: undefined, lng: undefined, lots: [''] }]
    });
    setView('form');
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      fields: (client.fields || []).map(f => ({
        name: f.name || '',
        lat: f.lat,
        lng: f.lng,
        lots: Array.isArray(f.lots) ? f.lots : ['']
      }))
    });
    setView('form');
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleCopyPhone = (id: number, phone: string) => {
    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
    navigator.clipboard.writeText(cleanPhone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const response = await authenticatedFetch(`/backend/clients/${clientToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchClients();
        setIsDeleteModalOpen(false);
        setClientToDelete(null);
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };
  const handleSaveDirect = (clientData: Client) => {
    // Refresh list via event
    fetchClients();
  };

  const handleResendInvite = async (client: Client) => {
    setResendingInviteId(client.id);
    try {
      const response = await authenticatedFetch('/backend/auth/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.id }),
      });
      const data = await response.json();
      if (data.success) {
        setResendSuccessId(client.id);
        setTimeout(() => setResendSuccessId(null), 3000);
      } else {
        alert(data.error || 'Error al reenviar la invitación');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      alert('Error al reenviar la invitación');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleSaveStationsConfig = async (clientId: number, allowedStations: string[] | null) => {
    try {
      const response = await authenticatedFetch(`/backend/clients/${clientId}/allowed-stations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedStations }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      setClients(clients.map(c => c.id === clientId ? { ...c, allowedStations: data.allowedStations } : c));
    } catch (error) {
      console.error('Error updating allowed stations:', error);
      alert('Error al actualizar los equipos permitidos');
    }
  };

  const filteredClients = clients.filter(client =>
    (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ClientSkeleton = () => (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse h-full">
      <div className="mb-6 flex items-start justify-between">
        <div className="h-16 w-16 rounded-full bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-50" />
          <div className="h-8 w-8 rounded-lg bg-slate-50" />
        </div>
      </div>
      <div className="mb-6 space-y-3">
        <div className="h-6 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-50 rounded" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-20 bg-slate-100 rounded-md" />
          <div className="h-5 w-24 bg-emerald-50 rounded-md" />
        </div>
      </div>
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-slate-100" />
          <div className="h-4 w-40 bg-slate-50 rounded" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-slate-100" />
            <div className="h-4 w-32 bg-slate-50 rounded" />
          </div>
          <div className="h-8 w-24 bg-[#25D366]/20 rounded-xl" />
        </div>
      </div>
    </div>
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
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <ClientSkeleton />
            <ClientSkeleton />
            <ClientSkeleton />
            <ClientSkeleton />
            <ClientSkeleton />
            <ClientSkeleton />
          </>
        ) : filteredClients.map((client) => (
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
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(client)}
                        className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client)}
                        className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {client.phone && (
                        <a
                          href={`https://wa.me/${formatPhoneNumberForWhatsApp(client.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                          title="WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 transition-colors hover:border-emerald-200 group/phone">
                        <span>+{client.phone.replace(/^\+/, '')}</span>
                        <button
                          onClick={() => handleCopyPhone(client.id, client.phone)}
                          className="cursor-pointer text-slate-300 hover:text-emerald-600 transition-colors p-0.5 rounded active:scale-90"
                          title="Copiar"
                        >
                          {copiedId === client.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors capitalize text-nowrap truncate">
                      {client.name}
                    </h3>
                    {client.isTest && (
                      <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 border border-rose-100 shrink-0">
                        TEST
                      </span>
                    )}
                  </div>
                  {client.businessName && (
                    <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{client.businessName}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                      CUIT: {client.cuit}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                      {client.ivaCondition}
                    </span>
                  </div>
                  {client.setupPending && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100 animate-pulse shrink-0">
                        Pendiente
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResendInvite(client); }}
                        disabled={resendingInviteId === client.id || resendSuccessId === client.id}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold shrink-0 cursor-pointer transition-all duration-200 shadow-sm ${
                          resendSuccessId === client.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#2e7d32] text-white hover:bg-[#256b29] hover:shadow-md active:scale-95'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                        title="Reenviar email de invitación"
                      >
                        {resendSuccessId === client.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            Enviado
                          </>
                        ) : resendingInviteId === client.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Reenviar invitación
                          </>
                        )}
                      </button>
                      {client.phone && (
                        <a
                          href={`https://wa.me/${formatPhoneNumberForWhatsApp(client.phone)}?text=${encodeURIComponent(`Hola ${client.name}, te hemos enviado un correo de invitación a ${client.email} para acceder a tu cuenta en TradeAgro. Por favor revisa tu bandeja de entrada o spam para configurar tu contraseña.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold shrink-0 cursor-pointer transition-all duration-200 shadow-sm bg-[#25D366] text-white hover:bg-[#128C7E] hover:shadow-md active:scale-95"
                          title="Enviar aviso por WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          Avisar
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.notificationEmails && client.notificationEmails.trim() && (
                    <div className="mt-2 pl-7 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Destinatarios adicionales:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {client.notificationEmails
                          .split(/[,;\s]+/)
                          .map((e: string) => e.trim())
                          .filter((e: string) => e)
                          .map((email: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[220px]"
                              title={email}
                            >
                              <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{email}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {(userRole === 'admin' || userRole === 'profesional') && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfiguringStationsFor(client); }}
                        className="text-xs font-semibold text-[#0A6C35] hover:underline cursor-pointer"
                      >
                        Configurar centrales habilitadas
                      </button>
                    </div>
                  </div>
                )}
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

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setClientToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description={`¿Está seguro que desea eliminar a ${clientToDelete?.businessName || clientToDelete?.name}? Esta acción no se puede deshacer.`}
      />

      <StationsConfigModal
        isOpen={!!configuringStationsFor}
        onClose={() => setConfiguringStationsFor(null)}
        client={configuringStationsFor}
        onSave={handleSaveStationsConfig}
      />
    </div>
  );
}
