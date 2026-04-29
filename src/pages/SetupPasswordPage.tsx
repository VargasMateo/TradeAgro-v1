import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.png';

export default function SetupPasswordPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isNew, setIsNew] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setStatus('invalid');
      setErrorMessage('No se proporcionó un token de configuración válido.');
      return;
    }
    setToken(t);
    validateToken(t);
  }, []);

  const validateToken = async (t: string) => {
    try {
      const res = await fetch(`/backend/auth/validate-token?token=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (data.valid) {
        setStatus('valid');
        setDisplayName(data.displayName);
        setEmail(data.email);
        setIsNew(data.isNew);
      } else {
        setStatus('invalid');
        setErrorMessage(data.error || 'Token inválido.');
      }
    } catch (err) {
      setStatus('invalid');
      setErrorMessage('Error de conexión con el servidor.');
    }
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: '', width: '0%' };
    if (pw.length < 6) return { label: 'Muy corta', color: 'bg-red-500', width: '20%' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;

    if (score <= 1) return { label: 'Débil', color: 'bg-orange-500', width: '40%' };
    if (score <= 2) return { label: 'Regular', color: 'bg-yellow-500', width: '60%' };
    if (score <= 3) return { label: 'Buena', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Excelente', color: 'bg-emerald-600', width: '100%' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/backend/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
      } else {
        setFormError(data.error || 'Error al configurar la contraseña.');
      }
    } catch (err) {
      setFormError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-1/4 -bottom-1/4 w-[150%] h-[150%] opacity-[0.08]">
          <div className="absolute bottom-[20%] left-0 w-full h-[15%] bg-[#2e7d32] rounded-[100%] rotate-[-15deg] transform-gpu shadow-[0_0_40px_rgba(46,125,50,0.2)]"></div>
          <div className="absolute bottom-[40%] left-0 w-full h-[12%] bg-[#2e7d32] rounded-[100%] rotate-[-12deg] transform-gpu shadow-[0_0_30px_rgba(46,125,50,0.2)]"></div>
          <div className="absolute bottom-[60%] left-0 w-full h-[10%] bg-[#2e7d32] rounded-[100%] rotate-[-10deg] transform-gpu shadow-[0_0_20px_rgba(46,125,50,0.2)]"></div>
        </div>
        <div className="absolute -top-64 -right-64 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-2xl backdrop-blur-md z-10">
        {/* Header with Logo */}
        <div className="bg-white p-8 pb-4 text-center border-b border-slate-100">
          <div className="mx-auto mb-2 flex h-24 w-full items-center justify-center">
            <img src={logo} alt="TradeAgro Logo" className="h-full w-auto object-contain" />
          </div>
        </div>

        <div className="p-8">
          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-emerald-600 mb-4" />
              <p className="text-sm text-slate-500">Validando enlace...</p>
            </div>
          )}

          {/* INVALID TOKEN STATE */}
          {status === 'invalid' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50 text-red-500">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Enlace Inválido</h2>
              <p className="mb-8 text-sm text-slate-500 max-w-[300px] leading-relaxed">
                {errorMessage}
              </p>
              <a
                href="/"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                Ir al Inicio
              </a>
            </div>
          )}

          {/* VALID TOKEN — PASSWORD FORM */}
          {status === 'valid' && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Lock className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {isNew ? 'Configure su Contraseña' : 'Restablezca su Contraseña'}
                </h2>
                <p className="text-sm text-slate-500">
                  Hola <span className="font-semibold text-slate-700">{displayName}</span>,{' '}
                  {isNew ? 'cree una contraseña para su cuenta.' : 'elija una nueva contraseña para su cuenta.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{email}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">
                        Fortaleza: <span className="text-slate-600">{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Repita la contraseña"
                      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                        confirmPassword.length > 0 && password !== confirmPassword
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs font-medium text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      Las contraseñas no coinciden
                    </p>
                  )}
                  {confirmPassword.length > 0 && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs font-medium text-emerald-600 mt-1 ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <CheckCircle2 className="h-3 w-3" /> Contraseñas coinciden
                    </p>
                  )}
                </div>

                {formError && (
                  <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || password.length < 6 || password !== confirmPassword}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5" />
                      <span>{isNew ? 'Configurar Contraseña' : 'Restablecer Contraseña'}</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">
                {isNew ? '¡Contraseña Configurada!' : '¡Contraseña Restablecida!'}
              </h2>
              <p className="mb-8 text-sm text-slate-500 max-w-[300px] leading-relaxed">
                Su contraseña ha sido {isNew ? 'configurada' : 'restablecida'} exitosamente. Ya puede iniciar sesión en TradeAgro.
              </p>
              <a
                href="/"
                className="group flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98]"
              >
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
