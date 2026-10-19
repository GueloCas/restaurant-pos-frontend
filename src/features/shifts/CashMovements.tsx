import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/auth-context';
import { Modal } from '../../components/Modal';
import { validPesos } from '../payments/model';
import { shiftError } from './model';
import { fetchMovements, recordMovement } from './service';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });
const button = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50';
export function MovementForm({ shiftId, kind, expected, onClose, onSaved }: { shiftId: string; kind: 'IN' | 'OUT'; expected: number; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ id: string; fingerprint: string } | null>(null);
  const lock = useRef(false);
  const value = Number(amount);
  const valid = amount.trim() !== '' && validPesos(value) && value > 0 && reason.trim().length >= 3 && (kind !== 'OUT' || value <= expected);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !valid || !confirmed) return;
    lock.current = true; setBusy(true); setError('');
    const fingerprint = JSON.stringify([shiftId, kind, value, reason.trim()]);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { id: crypto.randomUUID(), fingerprint };
    try { await recordMovement({ id: attempt.current.id, shiftId, kind, amount: value, reason, expected }); onSaved(); }
    catch (failure) { setError(shiftError(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  const field = 'mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2';
  return <Modal title={kind === 'IN' ? 'Ingreso de efectivo' : 'Retiro de efectivo'} busy={busy} onClose={onClose}><form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-muted">Efectivo esperado disponible: {money.format(expected)}. Este movimiento modifica el efectivo del turno y queda registrado con tu nombre y su motivo.</p>
    <label className="block text-sm">Importe (CLP)<input autoFocus required type="number" min="1" max={kind === 'OUT' ? Math.max(0, expected) : 1000000000000} step="1" disabled={busy} value={amount} onChange={event => setAmount(event.target.value)} className={field} /></label>
    <label className="block text-sm">Motivo<textarea required minLength={3} maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} placeholder={kind === 'IN' ? 'Ej.: fondo adicional para vuelto' : 'Ej.: compra de insumos o retiro de seguridad'} className={field} /></label>
    {valid && <p className="text-sm font-medium">Efectivo esperado después: {money.format(expected + (kind === 'IN' ? value : -value))}</p>}
    <label className="flex gap-3 text-sm"><input type="checkbox" required disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo que el efectivo fue {kind === 'IN' ? 'ingresado a' : 'retirado de'} la caja.</label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy || !valid || !confirmed} className={button}>{busy ? 'Registrando…' : kind === 'IN' ? 'Registrar ingreso' : 'Registrar retiro'}</button>
  </form></Modal>;
}
export function MovementList({ shiftId }: { shiftId: string }) {
  const { profile } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMovements>> | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const tenantId = profile?.tenant_id;
  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void fetchMovements(tenantId, shiftId, page, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [tenantId, shiftId, page, revision]);
  function changePage(next: number) { setData(null); setError(false); setPage(next); }
  return <section aria-label="Ingresos y retiros del turno" className="mt-6 border-t border-border pt-5"><h3 className="text-base">Ingresos y retiros de efectivo</h3>
    {error ? <div role="alert"><p className="mt-3 text-sm text-danger">No pudimos cargar los movimientos.</p><button className={button + ' mt-3'} onClick={() => { setError(false); setRevision(value => value + 1); }}>Reintentar</button></div> : !data ? <p role="status" className="mt-3 text-sm text-muted">Cargando movimientos…</p> : <>
      {data.rows.length ? <ul className="mt-3 divide-y divide-border">{data.rows.map(item => <li key={item.id} className="py-4"><div className="flex justify-between gap-4 text-sm font-medium"><p>{item.kind === 'IN' ? 'Ingreso' : 'Retiro'}</p><p className="tabular-nums">{item.kind === 'IN' ? '+' : '−'}{money.format(item.amount)}</p></div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason}</p><p className="mt-2 text-xs text-muted">{date.format(new Date(item.created_at))} · {item.recorded_by_name}</p></li>)}</ul> : <p className="mt-3 text-sm text-muted">Este turno no tiene ingresos ni retiros registrados.</p>}
      {data.count > 20 && <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={page === 0} className={button} onClick={() => changePage(page - 1)}>Anterior</button><p className="text-xs text-muted">Página {page + 1} de {Math.ceil(data.count / 20)}</p><button disabled={(page + 1) * 20 >= data.count} className={button} onClick={() => changePage(page + 1)}>Siguiente</button></div>}
    </>}
  </section>;
}
