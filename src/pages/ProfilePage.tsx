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
  location: string;
  description: string;
  avatarUrl: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Admin User",
  email: "admin@tradeagro.com",
  role: "Administrador General",
  location: "Buenos Aires, Argentina",
  description: "Responsable de la gestión operativa y supervisión de maquinaria agrícola. Especialista en optimización de recursos y logística de campo.",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile({
          name: parsed.name || DEFAULT_PROFILE.name,
          email: parsed.email || DEFAULT_PROFILE.email,
          role: parsed.role || DEFAULT_PROFILE.role,
          location: parsed.location || DEFAULT_PROFILE.location,
          description: parsed.description || DEFAULT_PROFILE.description,
          avatarUrl: parsed.avatarUrl || DEFAULT_PROFILE.avatarUrl
        });
      } catch (e) {
        console.error("Failed to parse profile from local storage", e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    localStorage.setItem("userProfile", JSON.stringify(profile));
    window.dispatchEvent(new Event("profile-updated"));
    setIsEditing(false);
    setIsLoading(false);
  };

  const handleCancel = () => {
    // Revert changes by reloading from local storage or default
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      setProfile(DEFAULT_PROFILE);
    }
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
                <p className="text-sm font-medium text-emerald-600">{profile.role}</p>
              </div>

              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>TradeAgro Inc.</span>
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
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Rol / Cargo</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ubicación</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Biografía / Descripción</label>
                <textarea
                  rows={4}
                  disabled={!isEditing}
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
