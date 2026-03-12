import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle2, User, PlusCircle, X, MapPin, Layers } from 'lucide-react';
import { Client, Field } from '../types/database';
import { motion, AnimatePresence } from 'framer-motion';

export default function DbTestPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingField, setIsCreatingField] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<'clientes' | 'campos' | 'trabajos' | null>(null);
  
  // Custom Dialog State
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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

  const createMockClient = async () => {
    setIsCreating(true);
    try {
      const mockData = {
        displayName: `Empresa Test ${Math.floor(Math.random() * 1000)}`,
        businessName: 'Test Business Name S.A.',
        cuit: '20123456789',
        ivaCondition: 'RI',
        email: 'test@tradeagro.com',
        phoneNumber: '2494123456',
        createdBy: 'Admin Test'
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockData)
      });
      
      const data = await response.json();
      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: 'Cliente Creado',
          message: `Se ha guardado exitosamente el registro con ID: ${data.id}`
        });
        await fetchClients();
      } else {
        throw new Error(data.details || data.error || 'Failed to create client');
      }
    } catch (err: any) {
      setDialog({
        show: true,
        type: 'error',
        title: 'Error de Base de Datos',
        message: err.message
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createMockField = async (clientId: string) => {
    setIsCreatingField(clientId);
    try {
      // Coordinates around Tandil, AR (-37.3217, -59.1332)
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
        setDialog({
          show: true,
          type: 'success',
          title: 'Campo Creado',
          message: `Nuevo campo asociado al cliente ${clientId}`
        });
        await fetchFields();
      } else {
        throw new Error(data.details || data.error);
      }
    } catch (err: any) {
      setDialog({
        show: true,
        type: 'error',
        title: 'Error Creando Campo',
        message: err.message
      });
    } finally {
      setIsCreatingField(null);
    }
  };
  
  const resetDatabase = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const endpoint = `/api/test/reset-${resetTarget === 'clientes' ? 'clients' : resetTarget === 'campos' ? 'fields' : 'jobs'}`;
      const response = await fetch(endpoint, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        setDialog({
          show: true,
          type: 'success',
          title: 'Tabla Limpia',
          message: `Se han eliminado todos los registros de la tabla ${resetTarget}.`
        });
        if (resetTarget === 'clientes') await fetchClients();
        if (resetTarget === 'campos') await fetchFields();
      } else {
        throw new Error(data.error || 'Failed to reset table');
      }
    } catch (err: any) {
      setDialog({
        show: true,
        type: 'error',
        title: 'Error de Reset',
        message: err.message
      });
    } finally {
      setIsResetting(false);
      setResetTarget(null);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchFields();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-20">
      {/* Header Section */}
      {/* ... previous content remains mostly same but I'll update it for brevity or just replace fully if needed ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl shadow-lg shadow-emerald-100 ${
            status === 'loading' ? 'bg-slate-100 text-slate-400' :
            status === 'connected' ? 'bg-emerald-600 text-white' :
            'bg-rose-100 text-rose-600'
          }`}>
            <Database className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Database Test</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full animate-pulse ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                {status === 'loading' ? 'Conectando...' :
                 status === 'connected' ? 'Conectado a tradebis_paralelo38' :
                 'Error de Conexión'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setResetTarget('clientes')}
              disabled={isResetting || status !== 'connected'}
              className="flex items-center gap-2 hover:bg-white hover:text-rose-600 text-slate-500 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span className="text-xs">Clientes</span>
            </button>
            <button
              onClick={() => setResetTarget('campos')}
              disabled={isResetting || status !== 'connected'}
              className="flex items-center gap-2 hover:bg-white hover:text-rose-600 text-slate-500 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span className="text-xs">Campos</span>
            </button>
            <button
              onClick={() => setResetTarget('trabajos')}
              disabled={isResetting || status !== 'connected'}
              className="flex items-center gap-2 hover:bg-white hover:text-rose-600 text-slate-500 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span className="text-xs">Trabajos</span>
            </button>
          </div>

          <button
            onClick={createMockClient}
            disabled={isCreating || status !== 'connected'}
            className="group relative flex items-center gap-3 bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {isCreating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              <PlusCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
            )}
            <span>Crear Cliente Mock</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {clients.map((client) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={client.id}
              className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Creado por: {client.createdBy}
                  </span>
                  <span className="text-[9px] text-slate-300">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight">{client.displayName}</h3>
                <p className="text-xs text-slate-400 truncate mb-4">{client.businessName}</p>

                <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">CUIT</span>
                    <span className="text-slate-700 font-bold">{client.cuit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Condición IVA</span>
                    <span className="text-slate-700 font-bold">{client.ivaCondition}</span>
                  </div>
                </div>

                {/* Campos Section */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Layers className="h-4 w-4 text-emerald-500" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Campos</span>
                    </div>
                    <button
                      onClick={() => createMockField(client.id)}
                      disabled={isCreatingField === client.id}
                      className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                    >
                      {isCreatingField === client.id ? (
                        <div className="animate-spin h-3 w-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {fields.filter(f => f.clientId === client.id).length > 0 ? (
                      fields.filter(f => f.clientId === client.id).map(field => (
                        <div key={field.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                          <MapPin className="h-3 w-3 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-bold text-slate-700">{field.name}</p>
                            <p className="text-[9px] text-slate-400">
                              Lat: {field.lat?.toFixed(4)}, Long: {field.long?.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-300 italic py-2">Sin campos asociados</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {status === 'loading' && clients.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Sincronizando con la base de datos...</p>
          </div>
        )}

        {status === 'connected' && clients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">Base de datos conectada, pero no hay registros en tbl_clientes.</p>
          </div>
        )}
      </div>

      {/* Custom Dialog Overlay */}
      <AnimatePresence>
        {dialog.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className={`p-8 text-center ${
                dialog.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'
              }`}>
                <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                  dialog.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {dialog.type === 'success' ? <CheckCircle2 className="h-10 w-10" /> : <X className="h-10 w-10" />}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{dialog.title}</h2>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {dialog.message}
                </p>
              </div>
              <div className="p-6 bg-white flex justify-center">
                <button
                  onClick={() => setDialog({ ...dialog, show: false })}
                  className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 ${
                    dialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  }`}
                >
                  ENTENDIDO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="h-24 w-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertCircle className="h-12 w-12" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">¿Borrar {resetTarget}?</h2>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                Esta acción eliminará <span className="text-rose-600 font-bold underline">TODOS</span> los registros de la tabla <span className="uppercase font-black text-slate-900">{resetTarget}</span> de forma permanente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setResetTarget(null)}
                  className="py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={resetDatabase}
                  disabled={isResetting}
                  className="py-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95"
                >
                  {isResetting ? 'BORRANDO...' : 'SÍ, BORRAR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
