import { useEffect, useRef, useState, type FormEvent } from 'react';
import { addOrderItem, changeQuantity, fetchOrderEditor, removePendingItem, sendOrderItems, markItemServed } from './service';
import { DispatchHistory } from './DispatchHistory';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
type EditorData = Awaited<ReturnType<typeof fetchOrderEditor>>;

export function OrderEditor({ tenantId, orderId, canEdit, onChanged }: { tenantId: string; orderId: string; canEdit: boolean; onChanged: (message?: string) => void }) {
  const [data, setData] = useState<EditorData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const busy = useRef(false);
  const dispatchAttempt = useRef<{ fingerprint: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchOrderEditor(tenantId, orderId, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError('No pudimos cargar los productos del pedido.');
    });
    return () => controller.abort();
  }, [tenantId, orderId, reload]);

  const perform = async (action: () => Promise<void>, success?: string, failure?: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setActionError('');
    try { await action(); onChanged(success); }
    catch { setActionError(failure ?? 'No pudimos confirmar el cambio. Actualiza la mesa para comprobar el pedido. Si agregabas un producto, puedes reintentar con las mismas opciones sin duplicarlo.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !productId) return;
    const modifierIds = [...selected].sort();
    const fingerprint = JSON.stringify({ orderId, productId, quantity, notes, modifierIds });
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    void perform(() => addOrderItem({ orderId, productId, quantity, notes, modifierIds, itemId: attempt.current!.id }));
  };
  if (loadError) return <section role="alert" className="mt-6 rounded-2xl border border-danger/20 bg-surface p-6"><p className="mb-4 text-sm text-danger">{loadError}</p><button type="button" onClick={() => { setLoadError(''); setReload(value => value + 1); }} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm text-white">Reintentar</button></section>;
  if (!data) return <p role="status" className="mt-6 p-6 text-sm text-muted">Cargando productos y opciones…</p>;
  const pendingIds = data.lines.filter(line => line.status === 'PENDING' && !line.cancelled_at).map(line => line.id).sort();
  const dispatch = () => {
    const fingerprint = JSON.stringify(pendingIds);
    if (!pendingIds.length || busy.current) return;
    if (dispatchAttempt.current?.fingerprint !== fingerprint) dispatchAttempt.current = { fingerprint, id: crypto.randomUUID() };
    void perform(() => sendOrderItems(orderId, dispatchAttempt.current!.id, pendingIds), 'Comandas guardadas en la cola de cocina y/o barra. La impresión física aún debe ser confirmada.', 'No pudimos confirmar el envío. Puedes reintentar este envío sin duplicar las comandas. Si el pedido cambió o alguna opción no está disponible, actualiza la mesa y revisa sus productos.');
  };
  const product = data.catalog.products.find(item => item.id === productId);
  const groupIds = data.links.filter(link => link.product_id === productId).map(link => link.modifier_group_id);
  const groups = groupIds.map(id => data.groups.find(group => group.id === id)).filter(group => group !== undefined);
  const selectionValid = groups.every(group => {
    const count = data.modifiers.filter(modifier => modifier.group_id === group.id && selected.includes(modifier.id)).length;
    return count >= group.min_selections && count <= group.max_selections;
  });
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const products = data.catalog.products.filter(item => (!category || item.category_id === category) && normalize(item.name).includes(normalize(search.trim())));
  const estimated = product ? quantity * (product.price + data.modifiers.filter(modifier => selected.includes(modifier.id)).reduce((sum, modifier) => sum + modifier.extra_price, 0)) : 0;
  return (
    <>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-5 text-xl">Productos del pedido</h2>
        {actionError && <p role="alert" className="mb-5 rounded-xl bg-danger-soft p-4 text-sm text-danger">{actionError}</p>}
        {canEdit && <div className="mb-6 rounded-xl bg-primary-soft p-4"><p className="mb-3 text-sm text-primary">{pendingIds.length ? `${pendingIds.length} líneas pendientes. Se enviarán según su destino en la carta.` : 'No hay productos pendientes de enviar.'}</p><button type="button" onClick={dispatch} disabled={saving || !pendingIds.length} className="min-h-12 w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Procesando…' : 'Enviar pendientes a cocina / barra'}</button></div>}
        {data.lines.length === 0 ? <p className="text-sm text-muted">El pedido está abierto. Agrega el primer producto desde la carta.</p> : <ul className="divide-y divide-border">{data.lines.map(line => {
          const extras = data.extras.filter(extra => extra.order_item_id === line.id);
          const total = line.quantity * (line.unit_price + extras.reduce((sum, extra) => sum + extra.extra_price, 0));
          return <li key={line.id} className={`py-5 first:pt-0 ${line.cancelled_at ? 'opacity-60' : ''}`}><div className="flex justify-between gap-4"><h3 className="text-sm font-semibold">{line.quantity} × {data.catalog.products.find(item => item.id === line.product_id)?.name ?? 'Producto'}</h3><p className={`shrink-0 text-sm font-semibold tabular-nums ${line.cancelled_at ? 'line-through' : ''}`}>{money.format(total)}</p></div><p className="mt-1 text-xs text-muted">{line.cancelled_at ? 'Anulado' : line.status === 'PENDING' ? 'Pendiente de enviar' : line.status === 'SENT' ? 'Enviado' : 'Servido'}</p>{extras.map(extra => <p key={extra.id} className="mt-1 text-xs text-muted">+ {extra.name}{extra.extra_price > 0 ? ` (${money.format(extra.extra_price)})` : ''}</p>)}{line.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">Nota: {line.notes}</p>}{canEdit && line.status === 'PENDING' && !line.cancelled_at && <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={saving || line.quantity <= 1} aria-label="Reducir cantidad" onClick={() => void perform(() => changeQuantity(tenantId, orderId, line.id, line.quantity - 1))} className="size-11 cursor-pointer rounded-xl border border-border disabled:opacity-40">−</button><span className="px-2 text-sm tabular-nums">{line.quantity}</span><button type="button" disabled={saving || line.quantity >= 99} aria-label="Aumentar cantidad" onClick={() => void perform(() => changeQuantity(tenantId, orderId, line.id, line.quantity + 1))} className="size-11 cursor-pointer rounded-xl border border-border disabled:opacity-40">+</button><button type="button" disabled={saving} onClick={() => void perform(() => removePendingItem(tenantId, orderId, line.id))} className="min-h-11 cursor-pointer rounded-xl px-3 text-sm text-danger disabled:opacity-40">Quitar</button></div>}{canEdit && line.status === 'SENT' && !line.cancelled_at && <button type="button" disabled={saving} onClick={() => void perform(() => markItemServed(tenantId, orderId, line.id), 'Producto marcado como servido.')} className="mt-3 min-h-11 cursor-pointer rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary disabled:opacity-40">Marcar como servido</button>}</li>;
        })}</ul>}
      </section>
      {canEdit && <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-5 text-xl">Agregar productos</h2>
        <label htmlFor="order-search" className="mb-2 block text-sm font-medium">Buscar en la carta</label><input id="order-search" type="search" value={search} onChange={event => setSearch(event.target.value)} className="mb-3 min-h-11 w-full rounded-xl border border-border px-3 text-sm" placeholder="Nombre del producto" />
        <label htmlFor="order-category" className="sr-only">Categoría</label><select id="order-category" value={category} onChange={event => setCategory(event.target.value)} className="mb-4 min-h-11 w-full rounded-xl border border-border px-3 text-sm"><option value="">Todas las categorías</option>{data.catalog.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="max-h-72 space-y-2 overflow-auto">{products.map(item => <button type="button" key={item.id} disabled={saving || item.is_available !== true} aria-pressed={item.id === productId} onClick={() => { setProductId(item.id); setSelected([]); setQuantity(1); setNotes(''); }} className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${item.id === productId ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary'}`}><span>{item.name}{item.is_available !== true && <span className="block text-xs text-muted">No disponible</span>}</span><span className="shrink-0 font-medium tabular-nums">{money.format(item.price)}</span></button>)}{products.length === 0 && <p className="py-4 text-sm text-muted">No hay productos con estos filtros.</p>}</div>
        {product && <form onSubmit={submit} className="mt-6 border-t border-border pt-5"><fieldset disabled={saving} className="space-y-5"><legend className="mb-4 text-base font-semibold">{product.name}</legend>
          {groups.map(group => <fieldset key={group.id} className="rounded-xl border border-border p-4"><legend className="px-1 text-sm font-medium">{group.name}</legend><p className="mb-3 text-xs text-muted">{group.min_selections > 0 ? `Elige al menos ${group.min_selections}` : 'Opcional'} · Máximo {group.max_selections}</p>{data.modifiers.filter(modifier => modifier.group_id === group.id).map(modifier => <label key={modifier.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={selected.includes(modifier.id)} disabled={modifier.is_available !== true || (!selected.includes(modifier.id) && group.max_selections > 1 && data.modifiers.filter(option => option.group_id === group.id && selected.includes(option.id)).length >= group.max_selections)} onChange={event => setSelected(current => event.target.checked ? [...(group.max_selections === 1 ? current.filter(id => !data.modifiers.some(option => option.id === id && option.group_id === group.id)) : current), modifier.id] : current.filter(id => id !== modifier.id))} className="size-4 accent-primary" /><span>{modifier.name}{modifier.is_available !== true ? ' · No disponible' : modifier.extra_price ? ` +${money.format(modifier.extra_price)}` : ''}</span></label>)}</fieldset>)}
          <div><label htmlFor="item-quantity" className="mb-2 block text-sm font-medium">Cantidad</label><input id="item-quantity" type="number" min="1" max="99" step="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="min-h-11 w-24 rounded-xl border border-border px-3 text-sm" /></div>
          <div><label htmlFor="item-notes" className="mb-2 block text-sm font-medium">Observaciones (opcional)</label><textarea id="item-notes" maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} rows={2} placeholder="Por ejemplo, sin sal" className="w-full rounded-xl border border-border p-3 text-sm" /></div>
          <p className="text-sm text-muted">Estimado: <span className="font-semibold tabular-nums text-foreground">{money.format(estimated)}</span></p><button type="submit" disabled={saving || !selectionValid || !Number.isInteger(quantity) || quantity < 1 || quantity > 99} className="min-h-12 w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando…' : 'Agregar al pedido'}</button>{!selectionValid && <p className="text-xs text-warning">Completa las opciones obligatorias para agregar el producto.</p>}
        </fieldset></form>}
      </section>}
    </div>
    <DispatchHistory jobs={data.jobs} />
    </>
  );
}
