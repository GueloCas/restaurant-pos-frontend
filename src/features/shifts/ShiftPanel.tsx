import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MovementForm, MovementList } from './CashMovements';
import { Modal } from '../../components/Modal';
import { methods } from '../payments/service';
import { validPesos } from '../payments/model';
import { shiftError } from './model';
import { fetchShifts, openShift, closeShift, type CashShift, type ShiftState, type ShiftTotals } from './service';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });
const button = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50';
const field = 'mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2';
function Totals({ totals }: { totals: ShiftTotals }) {
  return <><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Movimientos del turno por medio de pago</caption><thead><tr className="border-b border-border text-xs text-muted"><th className="py-3 pr-4">Medio</th><th className="px-2 py-3 text-right">Cobros</th><th className="px-2 py-3 text-right">Devoluciones</th><th className="py-3 pl-2 text-right">Propinas cobradas</th></tr></thead><tbody>{totals.methods.map(item => <tr key={item.method} className="border-b border-border"><th className="py-3 pr-4 font-medium">{methods[item.method as keyof typeof methods] ?? item.method}</th><td className="px-2 py-3 text-right tabular-nums">{money.format(item.collected)}</td><td className="px-2 py-3 text-right tabular-nums">{money.format(item.refunded)}</td><td className="py-3 pl-2 text-right tabular-nums">{money.format(item.tips)}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted">Ingresos de efectivo: {money.format(totals.cash_in ?? 0)} · Retiros: {money.format(totals.cash_out ?? 0)}. Los cobros incluyen propinas. Propinas devueltas en este turno: {money.format(totals.refunded_tips)}. Las devoluciones pertenecen al turno en que se registran.</p></>;
}
function CloseForm({ shift, onClose, onSaved }: { shift: CashShift & { totals: ShiftTotals }; onClose: () => void; onSaved: () => void }) {
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const amount = Number(counted);
  const valid = counted.trim() !== '' && validPesos(amount);
  const difference = amount - shift.totals.expected_cash;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !valid || !confirmed || (difference !== 0 && notes.trim().length < 3)) return;
    setBusy(true); setError('');
    try { await closeShift(shift.id, amount, shift.totals.expected_cash, notes); onSaved(); }
    catch (failure) { setError(shiftError(failure)); }
    finally { setBusy(false); }
  }
  return <Modal title="Cerrar turno de caja" busy={busy} onClose={onClose}><form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-muted">Cuenta todo el efectivo, incluyendo fondo inicial y propinas. El cierre quedará guardado y no podrá editarse.</p>
    <p className="text-lg font-semibold">Efectivo esperado: {money.format(shift.totals.expected_cash)}</p>
    <label className="block text-sm">Efectivo contado (CLP)<input autoFocus type="number" min="0" max="1000000000000" step="1" required disabled={busy} value={counted} onChange={event => setCounted(event.target.value)} className={field} /></label>
    {valid && <p role="status" className={difference === 0 ? 'text-sm text-primary' : 'text-sm text-warning'}>Diferencia: {money.format(difference)}{difference < 0 ? ' · Faltante' : difference > 0 ? ' · Sobrante' : ' · Caja cuadrada'}</p>}
    <label className="block text-sm">Observaciones {valid && difference !== 0 ? '(obligatorias por diferencia)' : '(opcionales)'}<textarea maxLength={500} required={valid && difference !== 0} minLength={valid && difference !== 0 ? 3 : undefined} disabled={busy} value={notes} onChange={event => setNotes(event.target.value)} className={field} /></label>
    <label className="flex gap-3 text-sm"><input type="checkbox" required disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo el efectivo contado y el cierre del turno compartido.</label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy || !valid || !confirmed || (difference !== 0 && notes.trim().length < 3)} className={button}>{busy ? 'Cerrando turno…' : 'Confirmar cierre'}</button>
  </form></Modal>;
}
export function ShiftPanel({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<ShiftState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [movementKind, setMovementKind] = useState<'IN' | 'OUT' | null>(null);
  const [selected, setSelected] = useState<CashShift | null>(null);
  const attempt = useRef<{ id: string; cash: number } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchShifts(controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [revision]);
  async function open(event: FormEvent) {
    event.preventDefault();
    const amount = Number(cash);
    if (busy || !cash.trim() || !validPesos(amount)) return;
    if (attempt.current?.cash !== amount) attempt.current = { id: crypto.randomUUID(), cash: amount };
    setBusy(true); setError('');
    try { await openShift(attempt.current.id, amount); onChanged(); }
    catch (failure) { setError(shiftError(failure)); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="shift-title" className="mb-8 rounded-2xl border border-border bg-surface p-6">
    <h2 id="shift-title" className="text-xl">Turno compartido</h2>
    {loadError ? <div role="alert"><p className="my-4 text-sm text-danger">No pudimos consultar el turno de caja.</p><button className={button} onClick={() => { setLoadError(false); setRevision(value => value + 1); }}>Reintentar</button></div> : !data ? <p role="status" className="mt-5 text-sm text-muted">Consultando turno…</p> : <>
      {data.active ? <><p className="mt-3 text-sm text-muted">Abierto por {data.active.opened_by_name} · {date.format(new Date(data.active.created_at))}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><p className="text-sm text-muted">Fondo inicial<span className="mt-2 block text-xl font-semibold text-foreground">{money.format(data.active.opening_cash)}</span></p><p className="text-sm text-muted">Efectivo esperado (incluye propinas)<span className="mt-2 block text-xl font-semibold text-primary">{money.format(data.active.totals.expected_cash)}</span></p></div><Totals totals={data.active.totals} /><div className="mt-5 flex flex-wrap gap-3"><button className={button} onClick={() => setMovementKind('IN')}>Ingreso de efectivo</button><button className={button} disabled={data.active.totals.expected_cash <= 0} onClick={() => setMovementKind('OUT')}>Retiro de efectivo</button></div><MovementList shiftId={data.active.id} />{movementKind && <MovementForm shiftId={data.active.id} kind={movementKind} expected={data.active.totals.expected_cash} onClose={() => setMovementKind(null)} onSaved={onChanged} />}<div className="mt-6"><button disabled={data.open_orders > 0} className={button} onClick={() => setClosing(true)}>Cerrar turno</button>{data.open_orders > 0 && <p role="status" className="mt-3 text-sm text-warning">Hay {data.open_orders} pedidos abiertos. Finalízalos antes de cerrar el turno.</p>}</div>{closing && <CloseForm shift={data.active} onClose={() => setClosing(false)} onSaved={onChanged} />}</> : <form onSubmit={open} className="mt-4 max-w-md space-y-4"><p className="text-sm text-muted">No hay un turno abierto. Abre la caja para registrar cobros y devoluciones de todo el equipo.</p><label className="block text-sm">Fondo inicial en efectivo (CLP)<input type="number" min="0" max="1000000000000" step="1" required disabled={busy} value={cash} onChange={event => setCash(event.target.value)} className={field} /></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<button disabled={busy || !cash.trim() || !validPesos(Number(cash))} className={button}>{busy ? 'Abriendo turno…' : 'Abrir turno'}</button></form>}
      <details className="mt-8 border-t border-border pt-5"><summary className="min-h-11 cursor-pointer text-sm font-medium text-primary">Últimos 20 cierres</summary>{data.history.length ? <ul className="divide-y divide-border">{data.history.map(shift => <li key={shift.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-sm">{date.format(new Date(shift.closed_at!))} · {shift.closed_by_name}</p><p className="mt-1 text-xs text-muted">Contado: {money.format(shift.counted_cash!)} · Diferencia: {money.format(shift.difference!)}</p></div><button className={button} onClick={() => setSelected(shift)}>Ver cierre</button></li>)}</ul> : <p className="mt-4 text-sm text-muted">Todavía no hay cierres guardados.</p>}</details>
      <p className="mt-5 text-xs text-muted">Los cobros anteriores a esta función conservan su historial y no se asignan a un turno retroactivamente.</p>
    </>}
    {selected && <Modal title="Cierre de caja" onClose={() => setSelected(null)}><p className="text-sm text-muted">Apertura: {date.format(new Date(selected.created_at))} · {selected.opened_by_name}</p><p className="mt-2 text-sm text-muted">Cierre: {date.format(new Date(selected.closed_at!))} · {selected.closed_by_name}</p><dl className="my-5 space-y-3 text-sm">{[['Fondo inicial', selected.opening_cash], ['Efectivo esperado', selected.expected_cash], ['Efectivo contado', selected.counted_cash], ['Diferencia', selected.difference]].map(([label, amount]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money.format(Number(amount))}</dd></div>)}</dl>{selected.closing_totals && <Totals totals={selected.closing_totals} />}<MovementList shiftId={selected.id} />{selected.notes && <p className="mt-5 text-sm">Observaciones: {selected.notes}</p>}</Modal>}
  </section>;
}
