import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { assignGroups, fetchModifiers } from './service';
import { modifierError } from './model';
import type { Product } from '../catalog/service';

type Data = Awaited<ReturnType<typeof fetchModifiers>>;
export function ProductGroupsForm({ tenantId, product, onClose, onSaved }: { tenantId: string; product: Product; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetchModifiers(tenantId, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setData(result); setSelected(result.links.filter(link => link.product_id === product.id).map(link => link.modifier_group_id));
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [tenantId, product.id, reload]);
  const valid = data?.groups.filter(group => selected.includes(group.id)).every(group => data.options.filter(option => option.group_id === group.id && option.is_available === true).length >= group.min_selections);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!data || !valid || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { await assignGroups(product.id, selected, data.links.filter(link => link.product_id === product.id).map(link => link.modifier_group_id)); onSaved(); }
    catch (failure) { setError(modifierError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal title={`Opciones · ${product.name}`} busy={saving} onClose={onClose}>
    {loadError ? <div role="alert"><p className="mb-4 text-sm text-danger">No pudimos consultar los grupos.</p><button type="button" onClick={() => { setLoadError(false); setReload(value => value + 1); }} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm text-white">Reintentar</button></div>
      : !data ? <p role="status" className="text-sm text-muted">Cargando opciones…</p>
        : <form onSubmit={submit}><fieldset disabled={saving} className="space-y-5"><p className="text-sm text-muted">Selecciona los grupos que se ofrecerán al agregar este producto a un pedido.</p>
          {!data.groups.length && <p className="text-sm text-muted">Aún no hay grupos. Crea uno y agrega sus opciones para comenzar.</p>}
          {data.groups.map(group => { const available = data.options.filter(option => option.group_id === group.id && option.is_available === true).length; return <label key={group.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" checked={selected.includes(group.id)} onChange={event => setSelected(current => event.target.checked ? [...current, group.id] : current.filter(id => id !== group.id))} className="mt-1 size-4 accent-primary" /><span><span className="block text-sm font-medium">{group.name}</span><span className="mt-1 block text-xs text-muted">{group.min_selections ? `Obligatorio · Mínimo ${group.min_selections}` : 'Opcional'} · Máximo {group.max_selections} · {available} disponibles</span>{available < group.min_selections && <span className="mt-1 block text-xs text-warning">Faltan opciones disponibles para asignar este grupo.</span>}</span></label>; })}
          <Link to="/catalogo/opciones" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline">Administrar grupos y opciones</Link>
          <p className="text-xs text-muted">Las comandas enviadas conservan sus opciones. Los pedidos pendientes deberán cumplir la nueva configuración antes del envío.</p>
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || !valid} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar grupos del producto'}</button></div>
        </fieldset></form>}
  </Modal>;
}
