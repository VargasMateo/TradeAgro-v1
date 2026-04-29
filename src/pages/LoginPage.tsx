import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

import logo from '../assets/logo.png';

interface LoginPageProps {
  onLogin: (role: 'profesional' | 'client' | 'admin') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotIsLoading, setForgotIsLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!email.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }

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
        if (data.passwordNotSet) {
          setError('📧 ' + data.error);
        } else {
          setError(data.error || 'Error al iniciar sesión');
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotEmail.trim()) {
      setForgotError('Por favor, ingresa tu correo electrónico');
      return;
    }

    setForgotIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setForgotSuccess(true);
      } else {
        setForgotError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setForgotError('Error de conexión con el servidor');
    } finally {
      setForgotIsLoading(false);
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
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            {view === 'login' ? 'Panel de Administración' : 'Recuperar Contraseña'}
          </p>
        </div>

        <div className="p-8">
          {view === 'login' ? (
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
                <label className="text-sm font-semibold text-slate-700">Contraseña</label>
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setView('forgot-password');
                    }}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
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


            </form>
          ) : (
            <div className="space-y-6">
              {!forgotSuccess ? (
                <>
                  <p className="text-sm text-slate-500 text-center">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        autoFocus
                      />
                    </div>

                    {forgotError && (
                      <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        {forgotError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotIsLoading}
                      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                    >
                      {forgotIsLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <>
                          <span>Enviar Enlace</span>
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail(forgotEmail);
                        setView('login');
                        setForgotError(null);
                      }}
                      className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      VOLVER AL INICIO
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4 animate-in zoom-in-95 duration-300">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">Enlace Enviado</h3>
                  <p className="mb-8 text-sm text-slate-500 leading-relaxed">
                    Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
                  </p>
                  <button
                    onClick={() => {
                      setView('login');
                      setForgotSuccess(false);
                      setForgotEmail('');
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                  >
                    ENTENDIDO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
