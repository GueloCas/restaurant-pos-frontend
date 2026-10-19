import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { fetchCashier, methods } from './service';
import { ShiftPanel } from '../shifts/ShiftPanel';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
export function CashierPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCashier>> | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const tenantId = profile?.tenant_id;
  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void fetchCashier(tenantId, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [tenantId, reload]);
  const refresh = () => { setData(null); setError(false); setReload(value => value + 1); };
  return <>
    <ShiftPanel key={reload} onChanged={refresh} />
    <Link to="/ventas" className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Ver historial de ventas →</Link>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">Cobros y pagos</p><h1 className="m-0 text-3xl tracking-tight sm:text-4xl">Caja</h1><p className="mt-3 text-sm text-muted">Selecciona una mesa para revisar su cuenta y registrar el pago.</p></div><button type="button" disabled={!data && !error} onClick={refresh} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm disabled:opacity-50">Actualizar caja</button></div>
    {error ? <section role="alert" className="rounded-2xl border border-border bg-surface p-8"><p className="mb-4 text-sm text-danger">No pudimos cargar las cuentas y los pagos.</p><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm text-white">Reintentar</button></section>
      : !data ? <p role="status" className="py-12 text-center text-sm text-muted">Cargando caja…</p>
        : <>
          <section aria-labelledby="open-accounts"><h2 id="open-accounts" className="mb-5 text-xl">Cuentas abiertas <span className="ml-2 text-sm font-normal text-muted">{data.orders.length}</span></h2>
            {!data.orders.length ? <p className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted">No hay pedidos abiertos.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.orders.map(order => { const table = data.tables.find(item => item.id === order.table_id); return <Link key={order.id} to={`/mesas/${order.table_id}`} className="rounded-2xl border border-border bg-surface p-6 hover:border-primary"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${table?.status === 'BILL_REQUESTED' ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info'}`}>{table?.status === 'BILL_REQUESTED' ? 'Cuenta solicitada' : 'En servicio'}</span><h3 className="mb-1 mt-4 text-lg">Mesa {table?.table_number ?? 'Sin número'}</h3><p className="text-xs text-muted">{table?.zone}</p><p className="mt-4 text-xl font-semibold tabular-nums">{money.format(order.total_amount)}</p><p className="mt-1 text-xs text-muted">Total actual del pedido</p><span className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary">Revisar y cobrar →</span></Link>; })}</div>}
          </section>
          <section aria-labelledby="recent-payments" className="mt-10 rounded-2xl border border-border bg-surface p-6"><h2 id="recent-payments" className="mb-2 text-xl">Pagos recientes</h2><p className="mb-5 text-sm text-muted">Últimos 20 registros del restaurante.</p>{!data.payments.length ? <p className="text-sm text-muted">Todavía no hay pagos registrados.</p> : <ul className="divide-y divide-border">{data.payments.map(payment => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-medium">{methods[payment.payment_method as keyof typeof methods] ?? payment.payment_method} · {payment.status === 'REFUNDED' ? 'Devuelto' : 'Completado'}</p><p className="mt-1 text-xs text-muted">{payment.created_at ? date.format(new Date(payment.created_at)) : 'Sin fecha'} · Pago {payment.id.slice(0, 8)}</p></div><p className={`text-lg font-semibold tabular-nums ${payment.status === 'REFUNDED' ? 'text-muted' : 'text-primary'}`}>{money.format(payment.amount)}</p></li>)}</ul>}</section>
        </>}
  </>;
}
