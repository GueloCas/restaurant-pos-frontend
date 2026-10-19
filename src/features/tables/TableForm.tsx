import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { saveDiningTable, type DiningTable } from './service';
import { tableError, validTableFields } from './model';

export function TableForm({ table, zones, onClose, onSaved }: { table?: DiningTable; zones: string[]; onClose: () => void; onSaved: () => void }) {
  const [id] = useState(() => table?.id ?? crypto.randomUUID());
  const [number, setNumber] = useState(table?.table_number ?? '');
  const [zone, setZone] = useState(table?.zone ?? zones.find(value => value === 'Salón') ?? zones[0] ?? 'Salón');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const valid = validTableFields(number, zone);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    const selectedZone = zones.find(value => value.toLocaleLowerCase('es-CL') === zone.trim().toLocaleLowerCase('es-CL')) ?? zone.trim();
    try { await saveDiningTable(id, number, selectedZone, table); onSaved(); }
    catch (failure) { setError(tableError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal title={table ? 'Editar mesa' : 'Nueva mesa'} busy={saving} onClose={onClose}>
    <form onSubmit={submit}><fieldset disabled={saving} className="space-y-5">
      <div><label htmlFor="table-number" className="mb-2 block text-sm font-medium">Número o identificador</label><input id="table-number" value={number} onChange={event => setNumber(event.target.value)} required maxLength={20} placeholder="Por ejemplo, 5 o T3" className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /><p className="mt-2 text-xs text-muted">Debe ser único dentro del restaurante.</p></div>
      <div><label htmlFor="table-zone-name" className="mb-2 block text-sm font-medium">Zona</label><input id="table-zone-name" list="existing-table-zones" value={zone} onChange={event => setZone(event.target.value)} required maxLength={60} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /><datalist id="existing-table-zones">{zones.map(value => <option key={value} value={value} />)}</datalist><p className="mt-2 text-xs text-muted">Elige una zona existente o escribe una nueva, como Terraza o Segundo piso.</p></div>
      <p className="rounded-xl bg-background p-4 text-sm text-muted">{table ? 'El número y la zona se pueden cambiar cuando la mesa esté disponible y no tenga pedidos abiertos.' : 'La mesa se creará disponible para iniciar un servicio.'}</p>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={saving || !valid} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar mesa'}</button></div>
    </fieldset></form>
  </Modal>;
}
