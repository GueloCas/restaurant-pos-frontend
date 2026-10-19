import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { validCatalogName, validCatalogPrice } from '../catalog/model';
import { saveGroup, saveOption, type Group, type Option } from './service';
import { modifierError, validSelectionLimits } from './model';

export type ModifierEditor = { kind: 'group'; group?: Group } | { kind: 'option'; group: Group; option?: Option };
export function ModifierForm({ tenantId, editor, onClose, onSaved }: { tenantId: string; editor: ModifierEditor; onClose: () => void; onSaved: () => void }) {
  const previous = editor.kind === 'group' ? editor.group : editor.option;
  const [id] = useState(() => previous?.id ?? crypto.randomUUID());
  const [name, setName] = useState(previous?.name ?? '');
  const [min, setMin] = useState(String(editor.kind === 'group' ? editor.group?.min_selections ?? 0 : 0));
  const [max, setMax] = useState(String(editor.kind === 'group' ? editor.group?.max_selections ?? 1 : 1));
  const [price, setPrice] = useState(String(editor.kind === 'option' ? editor.option?.extra_price ?? 0 : 0));
  const [available, setAvailable] = useState(editor.kind === 'option' && editor.option ? editor.option.is_available === true : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const valid = validCatalogName(name) && (editor.kind === 'group' ? min.trim() !== '' && max.trim() !== '' && validSelectionLimits(Number(min), Number(max)) : price.trim() !== '' && validCatalogPrice(Number(price)));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      if (editor.kind === 'group') await saveGroup(tenantId, id, { name, min_selections: Number(min), max_selections: Number(max) }, editor.group);
      else await saveOption(tenantId, id, editor.group.id, { name, extra_price: Number(price), is_available: available }, editor.option);
      onSaved();
    } catch (failure) { setError(modifierError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal title={editor.kind === 'group' ? previous ? 'Editar grupo' : 'Nuevo grupo' : previous ? 'Editar opción' : `Nueva opción · ${editor.group.name}`} busy={saving} onClose={onClose}>
    <form onSubmit={submit}><fieldset disabled={saving} className="space-y-5"><div><label htmlFor="modifier-name" className="mb-2 block text-sm font-medium">Nombre</label><input id="modifier-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>
      {editor.kind === 'group' ? <><div className="grid grid-cols-2 gap-4"><div><label htmlFor="modifier-min" className="mb-2 block text-sm font-medium">Mínimo a elegir</label><input id="modifier-min" type="number" min="0" max="99" step="1" required value={min} onChange={event => setMin(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div><div><label htmlFor="modifier-max" className="mb-2 block text-sm font-medium">Máximo a elegir</label><input id="modifier-max" type="number" min="1" max="99" step="1" required value={max} onChange={event => setMax(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div></div><p className="text-xs text-muted">Mínimo 0: grupo opcional. Mínimo 1 o más: elección obligatoria. El máximo debe ser igual o mayor al mínimo.</p></>
        : <><div><label htmlFor="modifier-price" className="mb-2 block text-sm font-medium">Precio adicional por unidad (CLP)</label><input id="modifier-price" type="number" min="0" max="1000000000" step="1" required value={price} onChange={event => setPrice(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={available} onChange={event => setAvailable(event.target.checked)} className="size-4 accent-primary" />Opción disponible</label></>}
      <p className="rounded-xl bg-background p-3 text-xs text-muted">Los cambios se aplican a los productos que comparten este grupo. Revisa las selecciones de los pedidos pendientes antes de enviarlos.</p>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || !valid} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button></div>
    </fieldset></form>
  </Modal>;
}
