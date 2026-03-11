import React, { useState, useEffect } from "react";
import { Search, Mail, Phone, MessageCircle, Plus, Edit2, Trash2, X } from "lucide-react";
import { getColorForClient } from "../lib/utils";
import MagneticEffect from "../components/MagneticEffect";

interface Profesional {
  id: number;
  name: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  specialty: string;
}

const initialProfesionales: Profesional[] = [
  {
    id: 1,
    name: "Carlos Rodríguez",
    email: "carlos.r@tradeagro.com",
    phone: "+54 9 11 4444-5555",
    initials: "CR",
    color: "bg-emerald-100 text-emerald-700",
    specialty: "Ingeniero Agrónomo"
  },
  {
    id: 2,
    name: "María Fernández",
    email: "maria.f@tradeagro.com",
    phone: "+54 9 351 2222-3333",
    initials: "MF",
    color: "bg-blue-100 text-blue-700",
    specialty: "Especialista en Suelos"
  },
  {
    id: 3,
    name: "Javier Gómez",
    email: "javier.g@tradeagro.com",
    phone: "+54 9 341 7777-8888",
    initials: "JG",
    color: "bg-amber-100 text-amber-700",
    specialty: "Operador de Maquinaria"
  }
];

export default function ProfesionalesPage({ userRole = 'cliente' }: { userRole?: 'profesional' | 'cliente' | 'superadmin' }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>(initialProfesionales);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfesional, setEditingProfesional] = useState<Profesional | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: ''
  });

  useEffect(() => {
    const loadProfesionales = () => {
      const stored = localStorage.getItem('profesionales');
      if (stored) {
        setProfesionales(JSON.parse(stored));
      } else {
        localStorage.setItem('profesionales', JSON.stringify(initialProfesionales));
      }
    };

    loadProfesionales();
    window.addEventListener('profesionales-updated', loadProfesionales);
    return () => window.removeEventListener('profesionales-updated', loadProfesionales);
  }, []);

  const filteredProfesionales = profesionales.filter(prof => 
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhoneNumberForWhatsApp = (phone: string) => {
    if (!phone) return '';
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  };

  const handleOpenModal = (profesional?: Profesional) => {
    if (profesional) {
      setEditingProfesional(profesional);
      setFormData({
        name: profesional.name,
        email: profesional.email,
        phone: profesional.phone,
        specialty: profesional.specialty
      });
    } else {
      setEditingProfesional(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        specialty: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProfesional(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedProfesionales;
    
    if (editingProfesional) {
      updatedProfesionales = profesionales.map(p => 
        p.id === editingProfesional.id 
          ? { ...p, ...formData, initials: formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }
          : p
      );
    } else {
      const newProfesional: Profesional = {
        id: Date.now(),
        ...formData,
        initials: formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        color: "bg-slate-100 text-slate-700" // Default color
      };
      updatedProfesionales = [...profesionales, newProfesional];
    }
    
    setProfesionales(updatedProfesionales);
    localStorage.setItem('profesionales', JSON.stringify(updatedProfesionales));
    window.dispatchEvent(new Event('profesionales-updated'));
    handleCloseModal();
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este profesional?')) {
      const updatedProfesionales = profesionales.filter(p => p.id !== id);
      setProfesionales(updatedProfesionales);
      localStorage.setItem('profesionales', JSON.stringify(updatedProfesionales));
      window.dispatchEvent(new Event('profesionales-updated'));
    }
  };

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
          {userRole === 'superadmin' && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nuevo Profesional
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfesionales.map((prof) => (
          <MagneticEffect key={prof.id} className="rounded-2xl">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 h-full">
              <div className="mb-6 flex items-start justify-between">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <img
                  src={`https://ui-avatars.com/api/?name=${prof.name}&background=${getColorForClient(prof.name)}&color=fff&bold=true&size=128`}
                  alt={prof.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                {userRole === 'superadmin' && (
                  <>
                    <button
                      onClick={() => handleOpenModal(prof)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(prof.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <a 
                  href={`https://wa.me/${formatPhoneNumberForWhatsApp(prof.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                  title="Contactar por WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{prof.name}</h3>
              <p className="text-sm font-medium text-emerald-600 mt-1">{prof.specialty}</p>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="truncate">{prof.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{prof.phone}</span>
              </div>
            </div>
          </div>
        </MagneticEffect>
        ))}
        
        {filteredProfesionales.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No se encontraron profesionales</h3>
            <p className="text-slate-500">Intente con otra búsqueda.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProfesional ? 'Editar Profesional' : 'Nuevo Profesional'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Especialidad
                </label>
                <input
                  type="text"
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ej. Ingeniero Agrónomo"
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
