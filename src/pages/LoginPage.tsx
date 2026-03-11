import React, { useState } from 'react';
import { Tractor, ArrowRight, Briefcase, User, Shield } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'profesional' | 'cliente' | 'superadmin') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent, role: 'profesional' | 'cliente' | 'superadmin') => {
    e.preventDefault();
    // Estético: entra sin verificar
    onLogin(role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-emerald-600 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <svg viewBox="0 0 100 100" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="100" height="100" fill="white" rx="20" />
              <path d="M 10 10 L 90 10 L 90 50 Q 45 25 10 45 Z" fill="#005A9C" />
              <path d="M 5 45 Q 45 25 95 45" stroke="#0A6C35" strokeWidth="6" fill="none" />
              <path d="M 5 68 Q 50 45 95 72" stroke="#0A6C35" strokeWidth="6" fill="none" />
              <path d="M 5 92 Q 55 68 95 100" stroke="#0A6C35" strokeWidth="6" fill="none" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">TradeAgro</h1>
          <p className="mt-2 text-emerald-100">Panel de Administración</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tradeagro.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                <a href="#" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'profesional')}
                className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-emerald-600 px-2 py-3 font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 active:scale-[0.98]"
              >
                <Briefcase className="h-5 w-5" />
                <span className="text-[10px] sm:text-xs text-center">Profesional</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'cliente')}
                className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-blue-600 px-2 py-3 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 active:scale-[0.98]"
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] sm:text-xs text-center">Cliente</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'superadmin')}
                className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-purple-600 px-2 py-3 font-bold text-white transition-all hover:bg-purple-700 hover:shadow-md hover:shadow-purple-600/20 active:scale-[0.98]"
              >
                <Shield className="h-5 w-5" />
                <span className="text-[10px] sm:text-xs text-center">Superadmin</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
