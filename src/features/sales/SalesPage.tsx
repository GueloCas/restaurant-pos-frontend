import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/auth-context';
import { hasPermission } from '../../lib/permissions';
import { RefundForm } from './RefundForm';
import { methods } from '../payments/service';
import { chileToday, validSalesRange } from './model';
import { fetchSales, fetchSaleDetail, type SalesHistory, type SaleDetail } from './service';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });
const button = 'min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50';
const method = (value: string) => methods[value as keyof typeof methods] ?? value;

function Detail({ orderId, onClose, onRefunded }: { orderId: string; onClose: () => void; onRefunded: () => void }) {
  const { profile } = useAuth();
  const [refund, setRefund] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [data, setData] = useState<SaleDetail | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchSaleDetail(orderId, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [orderId, revision]);
  return <Modal title="Detalle del pedido cobrado" onClose={onClose} busy={busy}>
    {notice && <p role="status" className="mb-4 rounded-xl bg-primary-soft p-3 text-sm text-primary">{notice}</p>}
    {error ? <div role="alert"><p className="mb-4 text-sm text-danger">No pudimos cargar el detalle.</p><button className={button} onClick={() => { setError(false); setRevision(value => value + 1); }}>Reintentar</button></div> : !data ? <p role="status" className="text-sm text-muted">Cargando detalle…</p> : <>
      <p className="mb-4 break-all text-xs text-muted">Pedido {data.id} · {data.status === 'CLOSED' ? 'Cerrado' : data.status === 'OPEN' ? 'Abierto' : 'Anulado'}</p>
      <ul className="divide-y divide-border">{data.items.map(item => <li key={item.id} className="py-4"><div className="flex justify-between gap-4"><p className={item.cancelled_at ? 'text-sm text-muted line-through' : 'text-sm font-medium'}>{item.quantity} × {item.name}</p><p className="shrink-0 text-sm tabular-nums">{item.cancelled_at ? 'Anulado' : money.format(item.quantity * (item.unit_price + item.extras.reduce((sum, extra) => sum + extra.extra_price, 0)))}</p></div>{item.extras.map((extra, index) => <p key={index} className="mt-1 text-xs text-muted">{extra.name} (+{money.format(extra.extra_price)})</p>)}{item.notes && <p className="mt-2 text-xs text-muted">{item.notes}</p>}</li>)}</ul>
      <dl className="my-5 space-y-2 border-t border-border pt-4 text-sm">{[['Consumo', data.subtotal], ['Propina', data.tip], ['Total del pedido', data.total]].map(([label, amount]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money.format(Number(amount))}</dd></div>)}</dl>
      <h3 className="mb-3 text-base">Pagos del pedido</h3><ul className="space-y-4">{data.payments.map(payment => <li key={payment.id} className="rounded-xl bg-background p-3 text-sm"><p>{method(payment.method)} · {payment.status === 'REFUNDED' ? 'Devuelto' : 'Completado'} · {money.format(payment.amount)}</p><p className="mt-1 text-xs text-muted">{date.format(new Date(payment.created_at))}</p>{payment.cash_received !== null && <p className="mt-2 text-xs text-muted">Recibido: {money.format(payment.cash_received)} · Vuelto: {money.format(payment.change ?? 0)}</p>}</li>)}</ul>
      {data.refunds.map(record => <p key={record.payment_id} className="mt-4 rounded-xl bg-warning-soft p-3 text-sm">Devolución del pago {record.payment_id.slice(0, 8)} · {date.format(new Date(record.created_at))}<span className="mt-2 block">Motivo: {record.reason}</span></p>)}
      {hasPermission(profile?.role, 'refundPayments') && data.status === 'CLOSED' && <div className="mt-5 space-y-3">{data.payments.filter(payment => payment.status === 'COMPLETED').map(payment => <div key={payment.id}>{refund === payment.id ? <RefundForm paymentId={payment.id} amount={payment.amount} onBusy={setBusy} onCancel={() => setRefund(null)} onSaved={() => { setRefund(null); setNotice('Devolución registrada.'); setData(null); setRevision(value => value + 1); onRefunded(); }} /> : <button disabled={refund !== null || busy} className={button} onClick={() => { setNotice(''); setRefund(payment.id); }}>Registrar devolución · {method(payment.method)} · {money.format(payment.amount)}</button>}</div>)}</div>}
      <p className="mt-5 text-xs text-muted">Los importes corresponden al pedido registrado. Los nombres de productos se muestran según el catálogo actual.</p>
    </>}
  </Modal>;
}

export function SalesPage() {
  const [from, setFrom] = useState(chileToday);
  const [to, setTo] = useState(chileToday);
  const [query, setQuery] = useState(() => ({ from: chileToday(), to: chileToday(), page: 0, revision: 0 }));
  const [data, setData] = useState<SalesHistory | null>(null);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchSales(query.from, query.to, query.page, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(() => { if (!controller.signal.aborted) setError('No pudimos cargar el historial. Comprueba tu conexión y tu acceso.'); });
    return () => controller.abort();
  }, [query]);
  function apply(event: FormEvent) {
    event.preventDefault();
    if (!validSalesRange(from, to)) { setValidation('Selecciona fechas válidas, en orden y con un máximo de 367 días.'); return; }
    setValidation(''); setError(''); setData(null);
    setQuery(value => ({ from, to, page: 0, revision: value.revision + 1 }));
  }
  function page(value: number) { setData(null); setError(''); setQuery(current => ({ ...current, page: value })); }
  return <>
    <div className="mb-8"><p className="mb-2 text-xs uppercase tracking-widest text-primary">Consulta de cobros</p><h1 className="text-3xl">Historial de ventas</h1><p className="mt-3 text-sm text-muted">Cobros por fecha de pago, en horario de Chile. Cada registro corresponde a un pago.</p></div>
    <form onSubmit={apply} className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-5"><label className="text-sm">Desde<input type="date" required value={from} onChange={event => setFrom(event.target.value)} className="mt-2 block min-h-11 rounded-xl border border-border px-3" /></label><label className="text-sm">Hasta<input type="date" required value={to} onChange={event => setTo(event.target.value)} className="mt-2 block min-h-11 rounded-xl border border-border px-3" /></label><button className={button}>Consultar</button>{validation && <p role="alert" className="w-full text-sm text-danger">{validation}</p>}</form>
    {error ? <div role="alert" className="rounded-xl bg-danger-soft p-5 text-sm text-danger"><p>{error}</p><button className={button + ' mt-4'} onClick={() => { setError(''); setQuery(value => ({ ...value, revision: value.revision + 1 })); }}>Reintentar</button></div> : !data ? <p role="status" className="py-12 text-center text-sm text-muted">Cargando historial…</p> : <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{[['Cobrado vigente (incluye propina)', data.collected], ['Propinas vigentes', data.tips], ['Pagos devueltos', data.refunded]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5"><p className="text-xs text-muted">{label}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{money.format(Number(value))}</p></div>)}</div>
      <p className="mb-5 text-xs text-muted">Período consultado: {query.from} al {query.to}. Las devoluciones se agrupan por la fecha del pago original. Los totales abarcan todo el período.</p>
      <section aria-label="Pagos del período" className="divide-y divide-border rounded-2xl border border-border bg-surface px-5">{data.rows.length ? data.rows.map(sale => <article key={sale.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h2 className="text-base">Mesa {sale.table_number ?? 'Sin número'} <span className="text-xs font-normal text-muted">{sale.zone}</span></h2><p className="mt-1 text-sm text-muted">{date.format(new Date(sale.created_at))} · {method(sale.payment_method)}</p><p className="mt-1 text-xs text-muted">Pago {sale.id.slice(0, 8)} · {sale.status === 'REFUNDED' ? 'Devuelto' : 'Completado'}</p></div><div className="flex items-center gap-4"><p className="text-lg font-semibold tabular-nums">{money.format(sale.amount)}</p><button className={button} onClick={() => setSelected(sale.order_id)}>Ver pedido</button></div></article>) : <p className="py-10 text-sm text-muted">No hay pagos en este período.</p>}</section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">{data.count} pagos · Página {query.page + 1} de {Math.max(1, Math.ceil(data.count / 20))}</p><div className="flex gap-3"><button disabled={query.page === 0} className={button} onClick={() => page(query.page - 1)}>Anterior</button><button disabled={(query.page + 1) * 20 >= data.count} className={button} onClick={() => page(query.page + 1)}>Siguiente</button></div></div>
    </>}
    {selected && <Detail key={selected} orderId={selected} onClose={() => setSelected(null)} onRefunded={() => { setData(null); setError(''); setQuery(value => ({ ...value, revision: value.revision + 1 })); }} />}
  </>;
}
