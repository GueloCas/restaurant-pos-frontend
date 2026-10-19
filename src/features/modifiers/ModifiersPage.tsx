import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { hasPermission } from '../../lib/permissions';
import { fetchModifiers, toggleOption, type Option } from './service';
import { ModifierForm, type ModifierEditor } from './ModifierForm';
import { modifierError } from './model';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export function ModifiersPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const canManage = hasPermission(profile?.role, 'manageCatalog');
  const canChange = hasPermission(profile?.role, 'changeAvailability');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchModifiers>> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<ModifierEditor | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void fetchModifiers(tenantId, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [tenantId, reload]);
  const refresh = () => { setData(null); setLoadError(false); setError(''); setReload(value => value + 1); };
  const toggle = async (option: Option) => {
    if (!tenantId || busy.current) return;
    busy.current = true; setToggling(option.id); setError(''); setNotice('');
    try { await toggleOption(tenantId, option); setNotice(`${option.name}: ${option.is_available === true ? 'no disponible' : 'disponible'}.`); refresh(); }
    catch (failure) { setError(modifierError(failure)); }
    finally { busy.current = false; setToggling(null); }
  };
  return <>
    <Link to="/catalogo" className="mb-5 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">← Volver al catálogo</Link>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">Personaliza la carta</p><h1 className="m-0 text-3xl tracking-tight">Acompañamientos y extras</h1><p className="mt-3 text-sm text-muted">Opciones compartidas para acompañamientos, preparaciones y agregados.</p></div><div className="flex flex-wrap gap-3">{canManage && <button type="button" disabled={!data || toggling !== null} onClick={() => setEditor({ kind: 'group' })} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Nuevo grupo</button>}<button type="button" onClick={refresh} disabled={(!data && !loadError) || toggling !== null || editor !== null} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm disabled:opacity-50">Actualizar opciones</button></div></div>
    {notice && <p role="status" className="mb-6 rounded-xl bg-primary-soft p-4 text-sm text-primary">{notice}</p>}{error && <p role="alert" className="mb-6 rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
    {loadError ? <section role="alert" className="rounded-2xl border border-border bg-surface p-8"><p className="mb-4 text-sm text-danger">No pudimos cargar las opciones de la carta.</p><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm text-white">Reintentar</button></section>
      : !data ? <p role="status" className="py-12 text-center text-sm text-muted">Cargando grupos y opciones…</p>
        : !data.groups.length ? <section className="rounded-2xl border border-border bg-surface p-10 text-center"><h2 className="text-xl">Aún no hay grupos de opciones</h2><p className="text-sm text-muted">Un grupo reúne opciones como acompañamientos o variedades de bebida.</p></section>
          : <div className="space-y-6">{data.groups.map(group => { const options = data.options.filter(option => option.group_id === group.id); const available = options.filter(option => option.is_available === true).length; return <section key={group.id} className="rounded-2xl border border-border bg-surface p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h2 className="mb-1 text-xl">{group.name}</h2><p className="text-xs text-muted">{group.min_selections ? `Obligatorio · Mínimo ${group.min_selections}` : 'Opcional'} · Máximo {group.max_selections} · {data.links.filter(link => link.modifier_group_id === group.id).length} productos vinculados</p></div>{canManage && <div className="flex flex-wrap gap-2"><button type="button" disabled={toggling !== null} onClick={() => setEditor({ kind: 'group', group })} className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">Editar grupo</button><button type="button" disabled={toggling !== null} onClick={() => setEditor({ kind: 'option', group })} className="min-h-11 cursor-pointer rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary disabled:opacity-50">Nueva opción</button></div>}</div>
            {available < group.min_selections && <p role="status" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Este grupo necesita al menos {group.min_selections} opciones disponibles. Los productos vinculados no podrán completar la selección mientras falten opciones.</p>}
            {!options.length ? <p className="text-sm text-muted">Todavía no hay opciones en este grupo.</p> : <ul className="divide-y divide-border">{options.map(option => <li key={option.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><h3 className="text-sm font-medium">{option.name}</h3><p className="mt-1 text-xs text-muted">{option.extra_price ? `+${money.format(option.extra_price)} por unidad` : 'Sin recargo'} · {option.is_available === true ? 'Disponible' : 'No disponible'}</p></div><div className="flex flex-wrap gap-2">{canManage && <button type="button" disabled={toggling !== null} onClick={() => setEditor({ kind: 'option', group, option })} className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">Editar opción</button>}{canChange && <button type="button" disabled={toggling !== null} onClick={() => void toggle(option)} className="min-h-11 cursor-pointer rounded-xl bg-background px-3 py-2 text-sm text-muted disabled:opacity-50">{toggling === option.id ? 'Guardando…' : option.is_available === true ? 'Marcar no disponible' : 'Marcar disponible'}</button>}</div></li>)}</ul>}
          </section>; })}</div>}
    {canManage && tenantId && editor && <ModifierForm tenantId={tenantId} editor={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice('Configuración guardada.'); refresh(); }} />}
  </>;
}
