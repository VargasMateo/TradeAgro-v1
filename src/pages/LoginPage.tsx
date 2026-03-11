import React, { useState } from 'react';
import { Tractor, ArrowRight, Briefcase, User, Shield } from 'lucide-react';

import logo from '../assets/logo.png';

interface LoginPageProps {
  onLogin: (role: 'profesional' | 'cliente' | 'superadmin') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent, role: 'profesional' | 'cliente' | 'superadmin') => {
    e.preventDefault();

    // Save mock user data based on role
    import('../lib/mockUsers').then(({ MOCK_USERS }) => {
      localStorage.setItem("userProfile", JSON.stringify(MOCK_USERS[role]));
      window.dispatchEvent(new Event("profile-updated"));
      onLogin(role);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      {/* Decorative Background Stripes - Mimicking the logo */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-1/4 -bottom-1/4 w-[150%] h-[150%] opacity-[0.08]">
          <div className="absolute bottom-[20%] left-0 w-full h-[15%] bg-[#2e7d32] rounded-[100%] rotate-[-15deg] transform-gpu shadow-[0_0_40px_rgba(46,125,50,0.2)]"></div>
          <div className="absolute bottom-[40%] left-0 w-full h-[12%] bg-[#2e7d32] rounded-[100%] rotate-[-12deg] transform-gpu shadow-[0_0_30px_rgba(46,125,50,0.2)]"></div>
          <div className="absolute bottom-[60%] left-0 w-full h-[10%] bg-[#2e7d32] rounded-[100%] rotate-[-10deg] transform-gpu shadow-[0_0_20px_rgba(46,125,50,0.2)]"></div>
        </div>
        
        {/* Subtle accent circles */}
        <div className="absolute -top-64 -right-64 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-2xl backdrop-blur-md z-10 transition-all">
        <div className="bg-white p-8 pb-4 text-center border-b border-slate-100">
          <div className="mx-auto mb-2 flex h-32 w-full items-center justify-center">
            <img src={logo} alt="TradeAgro Logo" className="h-full w-auto object-contain" />
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Panel de Administración</p>
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
