import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { saveProduct, type Category, type Product } from './service';
import { catalogError, validCatalogName, validCatalogPrice } from './model';

export function ProductForm({ tenantId, categories, product, onClose, onSaved }: { tenantId: string; categories: Category[]; product?: Product; onClose: () => void; onSaved: () => void }) {
  const [id] = useState(() => product?.id ?? crypto.randomUUID());
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [available, setAvailable] = useState(product ? product.is_available === true : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const valid = validCatalogName(name) && price.trim() !== '' && validCatalogPrice(Number(price)) && categories.some(category => category.id === categoryId);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { await saveProduct(tenantId, id, { name, category_id: categoryId, price: Number(price), is_available: available }, product); onSaved(); }
    catch (failure) { setError(catalogError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal title={product ? 'Editar producto' : 'Nuevo producto'} busy={saving} onClose={onClose}>
    <form onSubmit={submit}><fieldset disabled={saving} className="space-y-5">
      <div><label htmlFor="product-name" className="mb-2 block text-sm font-medium">Nombre</label><input id="product-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>
      <div><label htmlFor="product-category" className="mb-2 block text-sm font-medium">Categoría</label><select id="product-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} required className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="" disabled>Selecciona una categoría</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{!categories.length && <p className="mt-2 text-xs text-warning">Crea una categoría antes de agregar productos.</p>}</div>
      <div><label htmlFor="product-price" className="mb-2 block text-sm font-medium">Precio (CLP)</label><input id="product-price" type="number" min="0" max="1000000000" step="1" value={price} onChange={event => setPrice(event.target.value)} required className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={available} onChange={event => setAvailable(event.target.checked)} className="size-4 accent-primary" />Disponible para pedidos</label>
      {product && <p className="text-xs leading-relaxed text-muted">Las comandas ya enviadas conservan su precio guardado.</p>}
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || !valid} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar producto'}</button></div>
    </fieldset></form>
  </Modal>;
}
