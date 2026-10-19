import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchPaymentContext, methods, settleOrder, type PaymentMethod, type Settlement } from './service';
import { paymentError, validPesos } from './model';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export function CheckoutPanel({ tenantId, orderId, subtotal, currentTip, onSettled }: { tenantId: string; orderId: string; subtotal: number; currentTip: number; onSettled: (payment: Settlement) => void }) {
  const [context, setContext] = useState<Awaited<ReturnType<typeof fetchPaymentContext>> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [tip, setTip] = useState(String(currentTip));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchPaymentContext(tenantId, orderId, controller.signal).then(data => {
      if (!controller.signal.aborted) setContext(data);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [tenantId, orderId, reload]);
  const tipAmount = Number(tip);
  const balance = subtotal + tipAmount - (context?.paid ?? 0);
  const cash = method === 'CASH' ? Number(received) : null;
  const valid = context && context.hasOpenShift && !context.pending && subtotal > 0 && tip.trim() !== '' && validPesos(tipAmount) && validPesos(balance) && balance > 0 && (method !== 'CASH' || (received.trim() !== '' && validPesos(cash!) && cash! >= balance));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !context || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    const input = { orderId, method, tip: tipAmount, cashReceived: cash, expectedSubtotal: subtotal, expectedPaid: context.paid };
    const fingerprint = JSON.stringify(input);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    try { const result = await settleOrder({ ...input, paymentId: attempt.current.id }); onSettled(result); }
    catch (failure) { setError(paymentError(failure)); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="checkout-title">
    <h2 id="checkout-title" className="mb-2 text-xl">Registrar cobro</h2><p className="mb-6 text-sm text-muted">Confirma el pago recibido. Al registrarlo se cerrará el pedido y la mesa quedará disponible.</p>
    {context && !context.hasOpenShift && <p role="status" className="mb-5 rounded-xl bg-warning-soft p-4 text-sm text-warning">Debes abrir un turno antes de cobrar. <Link to="/caja" className="font-semibold underline">Ir a Caja</Link></p>}
    {loadError ? <div role="alert"><p className="mb-3 text-sm text-danger">No pudimos verificar los pagos y productos del pedido.</p><button type="button" onClick={() => { setLoadError(false); setReload(value => value + 1); }} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm text-white">Reintentar</button></div>
      : !context ? <p role="status" className="text-sm text-muted">Verificando saldo…</p>
        : <form onSubmit={submit}><fieldset disabled={saving} className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5"><div><label htmlFor="payment-tip" className="mb-2 block text-sm font-medium">Propina voluntaria (CLP)</label><input id="payment-tip" type="number" min="0" max="1000000000000" step="1" required value={tip} onChange={event => setTip(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setTip('0')} className="min-h-11 cursor-pointer rounded-xl bg-background px-3 text-xs font-medium">Sin propina</button><button type="button" onClick={() => setTip(String(Math.round(subtotal * 0.1)))} className="min-h-11 cursor-pointer rounded-xl bg-primary-soft px-3 text-xs font-medium text-primary">10% · {money.format(Math.round(subtotal * 0.1))}</button></div></div>
          <div><label htmlFor="payment-method" className="mb-2 block text-sm font-medium">Medio de pago</label><select id="payment-method" value={method} onChange={event => setMethod(event.target.value as PaymentMethod)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm">{Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {method === 'CASH' && <div><label htmlFor="cash-received" className="mb-2 block text-sm font-medium">Efectivo recibido (CLP)</label><input id="cash-received" type="number" min="0" max="1000000000000" step="1" required value={received} onChange={event => setReceived(event.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 text-sm" /></div>}</div>
          <div className="rounded-xl bg-background p-5"><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Consumo</dt><dd className="tabular-nums">{money.format(subtotal)}</dd></div><div className="flex justify-between gap-4"><dt>Propina</dt><dd className="tabular-nums">{validPesos(tipAmount) ? money.format(tipAmount) : '—'}</dd></div><div className="flex justify-between gap-4"><dt>Pagado previamente</dt><dd className="tabular-nums">{money.format(context.paid)}</dd></div><div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold"><dt>Saldo a cobrar</dt><dd className="tabular-nums text-primary">{validPesos(balance) ? money.format(balance) : '—'}</dd></div>{method === 'CASH' && <div className="flex justify-between gap-4"><dt>Vuelto</dt><dd className="font-medium tabular-nums">{received.trim() !== '' && validPesos(cash!) && cash! >= balance && validPesos(balance) ? money.format(cash! - balance) : '—'}</dd></div>}</dl></div>
          <div className="md:col-span-2">{context.pending > 0 && <p role="status" className="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning">Envía los productos pendientes antes de cobrar.</p>}{error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}<button type="submit" disabled={saving || !valid} className="min-h-12 w-full cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Registrando pago…' : 'Confirmar pago y cerrar pedido'}</button></div>
        </fieldset></form>}
  </section>;
}
