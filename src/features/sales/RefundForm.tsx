import { useState, type FormEvent } from 'react';
import { refundPayment } from './service';
import { shiftError } from '../shifts/model';

export function RefundForm({ paymentId, amount, onCancel, onSaved, onBusy }: { paymentId: string; amount: number; onCancel: () => void; onSaved: () => void; onBusy: (value: boolean) => void }) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !confirmed || reason.trim().length < 3) return;
    setBusy(true); onBusy(true); setError('');
    try { await refundPayment(paymentId, reason); onSaved(); }
    catch (failure) {
      const message = typeof failure === 'object' && failure !== null && 'message' in failure ? String(failure.message) : '';
      if (message.includes('NO_OPEN_CASH_SHIFT')) { setError(shiftError(failure)); return; }
      setError(message.includes('PAYMENT_ALREADY_REFUNDED') ? 'Este pago ya tiene una devolución registrada. Cancela y actualiza el detalle.' : message.includes('REFUND_UNAVAILABLE') ? 'El pago debe estar completado y el pedido cerrado para registrar su devolución.' : 'No pudimos confirmar el registro. Puedes reintentar con el mismo motivo o cancelar y actualizar el detalle para comprobarlo.');
    } finally { setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit} className="mt-5 space-y-4 rounded-xl border border-warning/30 bg-warning-soft p-4">
    <h4 className="font-semibold">Registrar devolución completa</h4>
    <p className="text-sm">Importe: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)}. Este registro no realiza movimientos bancarios y no se puede deshacer desde la aplicación.</p>
    <label className="block text-sm">Motivo<textarea autoFocus required minLength={3} maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface p-3" /></label>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" required disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />Confirmo que el importe ya fue devuelto al cliente.</label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy || !confirmed || reason.trim().length < 3} className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Registrando…' : 'Confirmar devolución'}</button><button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm disabled:opacity-50">Cancelar</button></div>
  </form>;
}
