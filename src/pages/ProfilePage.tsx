import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Camera,
  Save,
  X,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  // Polymorphic fields
  businessName?: string;
  cuit?: string;
  ivaCondition?: string;
  phoneNumber?: string;
  specialty?: string;
}

interface ProfilePageProps {
  userRole?: 'profesional' | 'client' | 'admin';
}

export default function ProfilePage({ userRole = 'profesional' }: ProfilePageProps) {
  const getDefaultProfile = (): UserProfile => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.displayName || parsed.name || "Usuario",
          email: parsed.email || "",
          role: parsed.role || userRole,
          avatarUrl: parsed.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsed.displayName || parsed.name || 'U')}&background=059669&color=fff&size=256`,
          businessName: parsed.businessName,
          cuit: parsed.cuit,
          ivaCondition: parsed.ivaCondition,
          phoneNumber: parsed.phoneNumber,
          specialty: parsed.specialty
        };
      } catch (e) { /* fall through */ }
    }
    return { name: "Usuario", email: "", role: userRole, avatarUrl: `https://ui-avatars.com/api/?name=U&background=059669&color=fff&size=256` };
  };

  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const userId = storedUser.id;

      if (!userId) throw new Error('No user ID found for update');

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          ...profile,
          displayName: profile.name, // Mapping
          phoneNumber: profile.phoneNumber
        })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("userProfile", JSON.stringify(data.user));
        window.dispatchEvent(new Event("profile-updated"));
        setIsEditing(false);
      } else {
        throw new Error(data.error || 'Error al actualizar perfil');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfile(getDefaultProfile());
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
        <p className="mt-2 text-slate-500">Gestiona tu información personal y preferencias de cuenta.</p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Avatar & Quick Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-emerald-700">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>
            <div className="px-6 pb-6">
              <div className="relative -mt-16 mb-4 flex justify-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100"
                    >
                      <Camera className="h-8 w-8" />
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              </div>

              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>{profile.businessName || profile.specialty || "TradeAgro Staff"}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Edit Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold text-slate-900">Información Personal</h3>
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 cursor-pointer"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Role-specific fields */}
              {profile.role === 'client' && (
                <div className="space-y-6 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Datos de Cliente</h4>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Razón Social</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.businessName || ''}
                        onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">CUIT</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.cuit || ''}
                        onChange={(e) => setProfile({ ...profile, cuit: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Condición IVA</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.ivaCondition || ''}
                        onChange={(e) => setProfile({ ...profile, ivaCondition: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Teléfono</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.phoneNumber || ''}
                        onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {profile.role === 'profesional' && (
                <div className="space-y-6 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Datos de Profesional</h4>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Especialidad</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.specialty || ''}
                        onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Teléfono</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={profile.phoneNumber || ''}
                        onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
