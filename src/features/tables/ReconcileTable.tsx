import { useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { reconcileDiningTable } from './service';
import { tableError, tableState } from './model';

export function ReconcileTable({ tableId, onSaved }: { tableId: string; onSaved: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const reconcile = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { const status = await reconcileDiningTable(tableId); setOpen(false); onSaved(`Estado verificado: ${tableState(status).label.toLowerCase()}.`); }
    catch (failure) { setError(tableError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <>
    <button type="button" onClick={() => { setOpen(true); setError(''); }} className="mt-4 min-h-11 cursor-pointer rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft">Revisar y corregir estado</button>
    {open && <Modal title="Revisar estado de la mesa" busy={saving} onClose={() => setOpen(false)}><p className="mb-4 text-sm text-muted">Se comprobarán los pedidos abiertos. La mesa quedará disponible si no hay ninguno, u ocupada si tiene un pedido activo. Una solicitud de cuenta vigente se conservará.</p>{error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">Cancelar</button><button type="button" disabled={saving} onClick={reconcile} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Verificando…' : 'Verificar y sincronizar'}</button></div></Modal>}
  </>;
}
