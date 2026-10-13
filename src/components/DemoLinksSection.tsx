import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Link2, Check, Trash2, RefreshCw, Pencil, AlertCircle, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { authenticatedFetch } from '../lib/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface DemoLink {
  id: number;
  name: string;
  expiresAt: string;
  isActive: boolean;
  accessCount: number;
  lastAccessAt: string | null;
  createdAt: string;
  accessLink: string;
}

const QUICK_DAYS = [7, 15, 30];

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalInput(d);
};

const formatDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const getStatus = (l: DemoLink) => {
  if (!l.isActive) return { label: 'Cortado', color: 'text-slate-500 bg-slate-100', icon: XCircle };
  if (new Date(l.expiresAt) < new Date()) return { label: 'Vencido', color: 'text-red-600 bg-red-50', icon: AlertCircle };
  return { label: 'Activo', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 };
};

function LinkFormModal({ link, onClose, onSave }: {
  link: DemoLink | null;
  onClose: () => void;
  onSave: (data: { name: string; expiresAt: string }) => Promise<string | null>;
}) {
  const [name, setName] = useState(link?.name || '');
  const [expiresAt, setExpiresAt] = useState(link ? toLocalInput(new Date(link.expiresAt)) : addDays(7));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Ingresá un nombre o etiqueta');
    if (!expiresAt) return setError('El vencimiento es obligatorio');
    if (new Date(expiresAt) <= new Date()) return setError('El vencimiento debe ser una fecha futura');
    setSaving(true);
    const err = await onSave({ name: name.trim(), expiresAt: new Date(expiresAt).toISOString() });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="relative w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer">
          <X className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{link ? 'Editar link' : 'Nuevo link de estaciones'}</h2>
          <p className="mt-1 text-sm text-slate-500">Da acceso solo a las estaciones meteorológicas.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Nombre o etiqueta <span className="text-red-500">*</span></label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez - Coop. X"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Vencimiento <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {QUICK_DAYS.map((d) => {
              const selected = expiresAt.slice(0, 10) === addDays(d).slice(0, 10);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpiresAt(addDays(d))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  {d} días
                </button>
              );
            })}
          </div>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1b5e20] disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {link ? 'Guardar' : 'Crear link'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DemoLinksSection() {
  const [links, setLinks] = useState<DemoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; link: DemoLink | null }>({ open: false, link: null });
  const [deleting, setDeleting] = useState<DemoLink | null>(null);
  const [regenerating, setRegenerating] = useState<DemoLink | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/backend/demo-links');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al cargar');
      setLinks(json.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Error al cargar los links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const replaceLink = (updated: DemoLink) => setLinks(prev => prev.map(l => (l.id === updated.id ? updated : l)));

  const handleSave = async (data: { name: string; expiresAt: string }): Promise<string | null> => {
    try {
      const editing = modal.link;
      const res = await authenticatedFetch(editing ? `/backend/demo-links/${editing.id}` : '/backend/demo-links', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) return json.error || 'Error al guardar';
      if (editing) replaceLink(json.data);
      else setLinks(prev => [json.data, ...prev]);
      setModal({ open: false, link: null });
      return null;
    } catch {
      return 'Error de conexión';
    }
  };

  const handleToggle = async (l: DemoLink) => {
    const res = await authenticatedFetch(`/backend/demo-links/${l.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !l.isActive }),
    });
    const json = await res.json();
    if (json.success) replaceLink(json.data);
  };

  const handleCopy = async (l: DemoLink) => {
    try {
      await navigator.clipboard.writeText(l.accessLink);
    } catch {
      window.prompt('Copiá el link de acceso:', l.accessLink);
    }
    setCopiedId(l.id);
    setTimeout(() => setCopiedId(prev => (prev === l.id ? null : prev)), 2000);
  };

  const handleRegenerate = async () => {
    if (!regenerating) return;
    setBusy(true);
    try {
      const res = await authenticatedFetch(`/backend/demo-links/${regenerating.id}/regenerate`, { method: 'POST' });
      const json = await res.json();
      if (json.success) replaceLink(json.data);
    } finally {
      setBusy(false);
      setRegenerating(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await authenticatedFetch(`/backend/demo-links/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setLinks(prev => prev.filter(l => l.id !== deleting.id));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const activeCount = links.filter(l => l.isActive && new Date(l.expiresAt) > new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Links de estaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Un link por persona, solo para ver estaciones meteorológicas. {links.length > 0 && `${activeCount} activos de ${links.length}.`}
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, link: null })}
          className="flex items-center gap-2 rounded-xl bg-[#2e7d32] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#1b5e20] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo link
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : links.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          Todavía no creaste ningún link. Tocá <b>Nuevo link</b> para generar el primero.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {links.map((l) => {
            const status = getStatus(l);
            const StatusIcon = status.icon;
            return (
              <div key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{l.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
                      <StatusIcon className="h-3 w-3" /> {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Vence {formatDate(l.expiresAt)} · Creado {formatDate(l.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.accessCount} {l.accessCount === 1 ? 'ingreso' : 'ingresos'}
                    {l.lastAccessAt && ` · último ${formatDate(l.lastAccessAt)}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(l)}
                    title={l.isActive ? 'Cortar acceso' : 'Reactivar'}
                    className={`relative mr-2 inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${l.isActive ? 'bg-[#2e7d32]' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${l.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <button onClick={() => handleCopy(l)} title="Copiar link" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer">
                    {copiedId === l.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setModal({ open: true, link: l })} title="Editar nombre o vencimiento" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setRegenerating(l)} title="Regenerar link" className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 cursor-pointer">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleting(l)} title="Eliminar" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.open && (
        <LinkFormModal link={modal.link} onClose={() => setModal({ open: false, link: null })} onSave={handleSave} />
      )}

      <DeleteConfirmationModal
        isOpen={!!regenerating}
        onClose={() => setRegenerating(null)}
        onConfirm={handleRegenerate}
        title="Regenerar link"
        description={`Se genera un link nuevo para "${regenerating?.name}". El link anterior deja de funcionar.`}
        confirmText="Regenerar"
        isLoading={busy}
      />
      <DeleteConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar link"
        description={`Se elimina "${deleting?.name}" y su link deja de funcionar para siempre.`}
        isLoading={busy}
      />
    </div>
  );
}
