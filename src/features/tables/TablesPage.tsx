import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { fetchTables, type DiningTable } from './service';
import { tableState, tableStates } from './model';
import { hasPermission } from '../../lib/permissions';
import { TableForm } from './TableForm';

export function TablesPage() {
  const { profile } = useAuth();
  const [tables, setTables] = useState<DiningTable[] | null>(null);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);
  const [zone, setZone] = useState('');
  const [status, setStatus] = useState('');
  const [editor, setEditor] = useState<DiningTable | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const canManage = hasPermission(profile?.role, 'manageTables');
  const tenantId = profile?.tenant_id;
  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void fetchTables(tenantId, controller.signal).then(data => {
      if (!controller.signal.aborted) setTables(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('No pudimos cargar las mesas. Revisa tu conexión y vuelve a intentarlo.');
    });
    return () => controller.abort();
  }, [tenantId, request]);
  const refresh = () => { setTables(null); setError(''); setRequest(value => value + 1); };
  const clear = () => { setZone(''); setStatus(''); };
  const zones = [...new Set(tables?.map(table => table.zone) ?? [])];
  const filtered = tables?.filter(table => (!zone || table.zone === zone) && (!status || table.status === status)) ?? [];

  return (<>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">El salón, de un vistazo</p><h1 className="m-0 text-3xl tracking-tight sm:text-4xl">Mesas</h1><p className="mt-3 text-sm text-muted">Consulta el estado de las mesas y su pedido activo.</p></div>
      <div className="flex flex-wrap gap-3">{canManage && <button type="button" onClick={() => setEditor('new')} disabled={!tables} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Nueva mesa</button>}<button type="button" onClick={refresh} disabled={(!tables && !error) || editor !== null} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary disabled:opacity-60">Actualizar mesas</button></div>
    </div>
    {notice && <p role="status" className="mb-6 rounded-xl bg-primary-soft p-4 text-sm text-primary">{notice}</p>}
    {error ? <section role="alert" className="rounded-2xl border border-danger/20 bg-surface p-8"><h2 className="text-lg">No pudimos cargar el salón</h2><p className="mb-5 text-sm text-muted">{error}</p><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">Reintentar</button></section>
      : !tables ? <p role="status" className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">Cargando mesas…</p>
        : tables.length === 0 ? <section className="rounded-2xl border border-border bg-surface p-10 text-center"><h2 className="text-xl">Aún no hay mesas registradas</h2><p className="text-sm text-muted">Las mesas aparecerán cuando el administrador configure el salón.</p></section>
          : <>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">{Object.entries(tableStates).map(([key, state]) => <div key={key} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5"><span className={`rounded-full px-3 py-1 text-xs font-medium ${state.color}`}>{state.label}</span><span className="text-2xl font-semibold tabular-nums">{tables.filter(table => table.status === key).length}</span></div>)}</div>
            <section aria-label="Filtros de mesas" className="mb-6 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
              <div><label htmlFor="table-zone" className="mb-2 block text-sm font-medium">Zona</label><select id="table-zone" value={zone} onChange={event => setZone(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm"><option value="">Todas las zonas</option>{zones.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><label htmlFor="table-status" className="mb-2 block text-sm font-medium">Estado</label><select id="table-status" value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm"><option value="">Todos los estados</option>{Object.entries(tableStates).map(([key, state]) => <option key={key} value={key}>{state.label}</option>)}</select></div>
            </section>
            <p role="status" className="mb-4 text-sm text-muted">{filtered.length} de {tables.length} mesas</p>
            {filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-lg">No hay mesas con estos filtros</h2><button type="button" onClick={clear} className="mt-3 min-h-11 cursor-pointer rounded-xl bg-primary-soft px-4 py-2 text-sm font-medium text-primary">Limpiar filtros</button></section>
              : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map(table => <article key={table.id} className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition hover:border-primary"><Link to={`/mesas/${table.id}`} aria-label={`Ver mesa ${table.table_number}, ${table.zone}, ${tableState(table.status).label}`} className="group block grow rounded-lg"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tableState(table.status).color}`}>{tableState(table.status).label}</span><h2 className="mb-1 mt-6 text-2xl">Mesa {table.table_number}</h2><p className="text-sm text-muted">{table.zone}</p><span className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary group-hover:underline">Ver detalle →</span></Link>{canManage && <div className="mt-3 border-t border-border pt-3"><button type="button" disabled={table.status !== 'AVAILABLE'} onClick={() => setEditor(table)} className="min-h-11 w-full cursor-pointer rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-50">Editar mesa</button>{table.status !== 'AVAILABLE' && <p className="mt-2 text-xs text-muted">Disponible para editar al finalizar el servicio.</p>}</div>}</article>)}</div>}
          </>}
    {canManage && editor && <TableForm table={editor === 'new' ? undefined : editor} zones={zones} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice('Mesa guardada.'); clear(); refresh(); }} />}
  </>);
}
