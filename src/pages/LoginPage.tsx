import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Shield, Briefcase, User } from 'lucide-react';

import logo from '../assets/logo.png';

interface LoginPageProps {
  onLogin: (role: 'profesional' | 'client' | 'admin') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userProfile", JSON.stringify(data.user));
        window.dispatchEvent(new Event("profile-updated"));
        onLogin(data.user.role);
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Acceso Rápido (Temporal)</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@tradeagro.com', 'admin123')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-purple-100 bg-purple-50/50 p-2 text-purple-700 transition-all hover:bg-purple-100 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('profesional@tradeagro.com', 'prof123')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 text-emerald-700 transition-all hover:bg-emerald-100 cursor-pointer"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Prof.</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('cliente@tradeagro.com', 'client123')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2 text-blue-700 transition-all hover:bg-blue-100 cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Client</span>
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center">
              <p className="text-xs font-medium text-slate-400">
                ¿No tienes cuenta? <span className="text-emerald-600 hover:underline cursor-pointer">Contactar soporte</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
