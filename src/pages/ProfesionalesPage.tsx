import React, { useState, useEffect } from "react";
import { Search, Mail, Phone, Plus, Edit2, Trash2 } from "lucide-react";
import { getColorForClient } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import CreateProfesionalModal from "../components/CreateProfesionalModal";
import { Profesional } from "../types/database";

export default function ProfesionalesPage({ userRole = 'client' }: { userRole?: 'profesional' | 'client' | 'admin' }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfesional, setEditingProfesional] = useState<Profesional | null>(null);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profesionalToDelete, setProfesionalToDelete] = useState<Profesional | null>(null);

  const loadProfesionales = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profesionales');
      const data = await response.json();
      setProfesionales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading profesionales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfesionales();
    window.addEventListener('profesionales-updated', loadProfesionales);
    return () => window.removeEventListener('profesionales-updated', loadProfesionales);
  }, []);

  const filteredProfesionales = profesionales.filter(prof =>
    prof.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prof.specialty || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhoneNumberForWhatsApp = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const handleOpenModal = (profesional?: Profesional) => {
    setEditingProfesional(profesional || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProfesional(null);
  };

  const handleSave = () => {
    loadProfesionales();
    handleCloseModal();
  };

  const handleDelete = (profesional: Profesional) => {
    setProfesionalToDelete(profesional);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (profesionalToDelete) {
      try {
        const response = await fetch(`/api/profesionales/${profesionalToDelete.id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          loadProfesionales();
          setIsDeleteModalOpen(false);
          setProfesionalToDelete(null);
        }
      } catch (error) {
        console.error('Error deleting profesional:', error);
      }
    }
  };

  const ProfessionalSkeleton = () => (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse h-full">
      <div className="mb-6 flex items-start justify-between">
        <div className="h-16 w-16 rounded-full bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-50" />
          <div className="h-8 w-8 rounded-lg bg-slate-50" />
        </div>
      </div>
      <div className="mb-6 space-y-2">
        <div className="h-6 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-50 rounded" />
      </div>
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-slate-100" />
          <div className="h-4 w-40 bg-slate-50 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-slate-100" />
          <div className="h-4 w-32 bg-slate-50 rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Profesionales
          </h1>
          <p className="text-sm text-slate-500 md:text-lg">
            Directorio de profesionales asignados a sus campos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar profesional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-64"
            />
          </div>
          {userRole === 'admin' && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nuevo Profesional
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <ProfessionalSkeleton />
            <ProfessionalSkeleton />
            <ProfessionalSkeleton />
          </>
        ) : filteredProfesionales.map((prof) => (
          <div key={prof.id} className="h-full">
            <MagneticEffect className="rounded-2xl">
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 h-full">
                <div className="mb-6 flex items-start justify-between">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                    <img
                      src={`https://ui-avatars.com/api/?name=${prof.displayName}&background=${getColorForClient(prof.displayName)}&color=fff&bold=true&size=128`}
                      alt={prof.displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    {userRole === 'admin' && (
                      <>
                        <button
                          onClick={() => handleOpenModal(prof)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prof)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {prof.phone && (
                      <a
                        href={`https://wa.me/${formatPhoneNumberForWhatsApp(prof.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                        title="Contactar por WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{prof.displayName}</h3>
                  <p className="text-sm font-medium text-emerald-600 mt-1">{prof.specialty || 'Profesional'}</p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{prof.email}</span>
                  </div>
                  {prof.phone && (
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{prof.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </MagneticEffect>
          </div>
        ))}

        {!isLoading && filteredProfesionales.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No se encontraron profesionales</h3>
            <p className="text-slate-500">Intente con otra búsqueda.</p>
          </div>
        )}
      </div>

      <CreateProfesionalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingProfesional={editingProfesional}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProfesionalToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Profesional"
        description={`¿Estás seguro de que deseas eliminar a "${profesionalToDelete?.displayName}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
