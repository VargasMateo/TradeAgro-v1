import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle2, User, PlusCircle, X, MapPin, Layers, Briefcase, Calendar, RefreshCw } from 'lucide-react';
import { Client, Field } from '../types/database';
import { motion, AnimatePresence } from 'framer-motion';

export default function DbTestPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [isCreatingField, setIsCreatingField] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<'clientes' | 'campos' | 'trabajos' | 'global' | null>(null);
  
  const [dialog, setDialog] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setClients(data);
      setStatus('connected');
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorStatus(err.message);
      setStatus('error');
    }
  };

  const fetchFields = async () => {
    try {
      const response = await fetch('/api/fields');
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      }
    } catch (err) {
      console.error('Fetch fields error:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Fetch jobs error:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setStatus('loading');
      await Promise.all([fetchClients(), fetchFields(), fetchJobs()]);
    };
    init();
  }, []);

  const createMockField = async (clientId: string) => {
    setIsCreatingField(clientId);
    try {
      const mockField = {
        clientId,
        name: `Campo ${['Norte', 'Sur', 'Este', 'Oeste'][Math.floor(Math.random() * 4)]} ${Math.floor(Math.random() * 100)}`,
        lat: -37.3 + (Math.random() * 0.1),
        long: -59.1 + (Math.random() * 0.1),
        lotNames: ['Lote A1', 'Lote B2']
      };

      const response = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockField)
      });

      const data = await response.json();
      if (data.success) {
        setDialog({ show: true, type: 'success', title: 'Campo Creado', message: 'Campo asociado.' });
        await fetchFields();
      } else {
        throw new Error(data.details || data.error);
      }
    } catch (err: any) {
      setDialog({ show: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsCreatingField(null);
    }
  };
  
  const resetDatabase = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      let endpoint = '';
      if (resetTarget === 'global') {
        endpoint = '/api/test/reset-database';
      } else {
        endpoint = `/api/test/reset-${resetTarget === 'clientes' ? 'clients' : resetTarget === 'campos' ? 'fields' : 'jobs'}`;
      }

      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: resetTarget === 'global' ? 'Sistema Reiniciado' : 'Tabla Limpia',
          message: resetTarget === 'global' ? 'Base de datos recreada y seeds cargados.' : `Registros de ${resetTarget} eliminados.`
        });
        await Promise.all([fetchClients(), fetchFields(), fetchJobs()]);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setDialog({ show: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsResetting(false);
      setResetTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-[2rem] shadow-xl ${
              status === 'connected' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'
            }`}>
              <Database className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de DB</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
                Entorno de Pruebas • {status === 'connected' ? 'En Línea' : 'Error'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setResetTarget('global')}
              className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-rose-600 px-8 py-4 font-black text-white shadow-xl shadow-rose-200 transition-all hover:bg-rose-700 active:scale-95"
            >
              <RefreshCw className="h-5 w-5 animate-spin-slow group-hover:animate-spin" />
              <span className="text-xs uppercase tracking-widest">Reiniciar Todo el Sistema</span>
            </button>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Section: Clientes */}
          <section className="flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-emerald-600" />
                <h2 className="font-black text-slate-900 uppercase tracking-widest">Clientes</h2>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg">
                  {clients.length}
                </span>
              </div>
              <button 
                onClick={() => setResetTarget('clientes')}
                className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
              >
                RESETEAR
              </button>
            </div>
            
            <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {clients.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <User className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">Sin Clientes</p>
                </div>
              ) : (
                clients.map(client => (
                  <div key={client.id} className="p-5 rounded-3xl bg-emerald-50/50 hover:bg-white border border-emerald-100/50 shadow-sm transition-all group">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-slate-800 text-sm leading-tight group-hover:text-emerald-700 transition-colors capitalize">{client.displayName}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1 font-mono uppercase truncate">{client.id}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section: Campos */}
          <section className="flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-blue-600" />
                <h2 className="font-black text-slate-900 uppercase tracking-widest">Campos</h2>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg">
                  {fields.length}
                </span>
              </div>
              <button 
                onClick={() => setResetTarget('campos')}
                className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
              >
                RESETEAR
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {fields.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <MapPin className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">Sin Campos</p>
                </div>
              ) : (
                fields.map(field => {
                  const clientAssoc = clients.find(c => c.id === field.clientId);
                  return (
                  <div key={field.id} className="p-5 rounded-3xl bg-blue-50/30 hover:bg-white border border-blue-100/50 shadow-sm transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-extrabold text-slate-800 text-sm leading-tight group-hover:text-blue-700 transition-colors truncate">{field.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <p className="text-[11px] text-slate-500 font-medium truncate capitalize">
                            {clientAssoc ? clientAssoc.displayName : 'Cliente Desconocido'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </section>

          {/* Section: Trabajos */}
          <section className="flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-amber-600" />
                <h2 className="font-black text-slate-900 uppercase tracking-widest">Trabajos</h2>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-lg">
                  {jobs.length}
                </span>
              </div>
              <button 
                onClick={() => setResetTarget('trabajos')}
                className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
              >
                RESETEAR
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {jobs.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <Briefcase className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">Sin Trabajos</p>
                </div>
              ) : (
                jobs.map(job => {
                  const clientAssoc = clients.find(c => c.id === job.clientId);
                  return (
                  <div key={job.id} className="p-5 rounded-3xl bg-amber-50/30 hover:bg-white border border-amber-100/50 shadow-sm transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-extrabold text-slate-800 text-sm leading-tight group-hover:text-amber-700 transition-colors truncate">
                          {job.jobCode || `Job #${job.id}`} - {job.title || job.service}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <p className="text-[11px] text-slate-500 font-medium truncate capitalize">
                            {clientAssoc ? clientAssoc.displayName : `CL: ${job.clientId}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 uppercase tracking-widest">
                        {job.status || 'Pendiente'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold ml-auto flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {job.date ? new Date(job.date).toLocaleDateString('es-AR') : '-'}
                      </span>
                    </div>
                  </div>
                )})
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Confirmation Dialogs Mapping */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
              <div className="h-20 w-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 underline decoration-rose-500 decoration-4">¿Estas seguro?</h2>
              <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
                {resetTarget === 'global' 
                  ? 'Vas a borrar TODA la base de datos (usuarios, clientes, trabajos) y volver a cargar los SEEDS originales.' 
                  : <>Vas a eliminar <span className="text-rose-600">TODOS</span> los registros de la tabla <span className="uppercase text-slate-900">{resetTarget}</span>. Esta acción no se puede deshacer.</>
                }
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setResetTarget(null)} className="py-4 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Cancelar</button>
                <button 
                  onClick={resetDatabase} 
                  disabled={isResetting}
                  className="py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200 transition-all active:scale-95 text-xs tracking-widest"
                >
                  {isResetting ? 'BORRANDO...' : 'SÍ, BORRAR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {dialog.show && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
              <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${dialog.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {dialog.type === 'success' ? <CheckCircle2 className="h-10 w-10" /> : <X className="h-10 w-10" />}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">{dialog.title}</h2>
              <p className="text-slate-500 font-bold text-sm mb-8">{dialog.message}</p>
              <button 
                onClick={() => setDialog({ ...dialog, show: false })} 
                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${dialog.type === 'success' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
