import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { saveCategory, type Category, type CategoryInput } from './service';
import { catalogError, validCatalogName, validCategoryOrder } from './model';

export function CategoryForm({ tenantId, categories, onClose, onSaved }: { tenantId: string; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [newId] = useState(() => crypto.randomUUID());
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [destination, setDestination] = useState<CategoryInput['print_destination']>('KITCHEN');
  const [order, setOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const previous = categories.find(category => category.id === selectedId);
  const select = (id: string) => {
    const category = categories.find(item => item.id === id);
    setSelectedId(id); setName(category?.name ?? ''); setDestination(category?.print_destination === 'BAR' ? 'BAR' : 'KITCHEN'); setOrder(String(category?.sort_order ?? 0)); setError('');
  };
  const valid = validCatalogName(name) && order.trim() !== '' && validCategoryOrder(Number(order));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { await saveCategory(tenantId, previous?.id ?? newId, { name, print_destination: destination, sort_order: Number(order) }, previous); onSaved(); }
    catch (failure) { setError(catalogError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal title="Administrar categorías" busy={saving} onClose={onClose}>
    <form onSubmit={submit}><fieldset disabled={saving} className="space-y-5">
      <div><label htmlFor="category-edit" className="mb-2 block text-sm font-medium">Categoría a editar</label><select id="category-edit" value={selectedId} onChange={event => select(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="">Crear nueva categoría</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div><label htmlFor="category-name" className="mb-2 block text-sm font-medium">Nombre</label><input id="category-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>
      <div><label htmlFor="category-destination" className="mb-2 block text-sm font-medium">Destino de las comandas</label><select id="category-destination" value={destination} onChange={event => setDestination(event.target.value as CategoryInput['print_destination'])} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="KITCHEN">Cocina</option><option value="BAR">Barra</option></select><p className="mt-2 text-xs text-muted">Se aplicará a los nuevos envíos de productos de esta categoría.</p></div>
      <div><label htmlFor="category-order" className="mb-2 block text-sm font-medium">Orden en la carta</label><input id="category-order" type="number" min="0" max="2147483647" step="1" required value={order} onChange={event => setOrder(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || !valid} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">{saving ? 'Guardando…' : previous ? 'Guardar cambios' : 'Crear categoría'}</button></div>
    </fieldset></form>
  </Modal>;
}
