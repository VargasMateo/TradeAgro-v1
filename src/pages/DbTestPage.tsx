import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle2, User, PlusCircle, X } from 'lucide-react';
import { Client } from '../types/database';
import { motion, AnimatePresence } from 'framer-motion';

export default function DbTestPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
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

  const createMockClient = async () => {
    setIsCreating(true);
    try {
      const mockData = {
        businessName: `Empresa Test ${Math.floor(Math.random() * 1000)}`,
        cuit: '20123456789',
        iva: 'RI',
        isActive: true
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

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-20">
      {/* Header Section */}
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
              className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <User className="h-6 w-6" />
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  client.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {client.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight">{client.businessName}</h3>
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">CUIT</span>
                  <span className="text-slate-700 font-bold">{client.cuit}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">IVA</span>
                  <span className="text-slate-700 font-bold">{client.iva}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">ID</span>
                  <span className="text-slate-400 font-mono">{client.id}</span>
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
    </div>
  );
}
