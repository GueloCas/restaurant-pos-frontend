import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { fetchTableDetail } from './service';
import { tableState } from './model';
import { hasPermission } from '../../lib/permissions';
import { openTableOrder } from '../orders/service';
import { OrderEditor } from '../orders/OrderEditor';
import { CheckoutPanel } from '../payments/CheckoutPanel';
import { requestBill } from '../payments/service';
import { paymentError } from '../payments/model';
import { ReconcileTable } from './ReconcileTable';
import { OrderPrint } from '../printing/OrderPrint';

type TableDetail = Awaited<ReturnType<typeof fetchTableDetail>>;
const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const validId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function TableDetailPage() {
  const { tableId = '' } = useParams();
  return <TableDetailContent key={tableId} tableId={tableId} />;
}
function TableDetailContent({ tableId }: { tableId: string }) {
  const { profile, user } = useAuth();
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestingBill, setRequestingBill] = useState(false);
  const [billError, setBillError] = useState('');
  const billBusy = useRef(false);
  const openingRef = useRef(false);
  const tenantId = profile?.tenant_id;
  useEffect(() => {
    if (!tenantId || !validId(tableId)) return;
    const controller = new AbortController();
    void fetchTableDetail(tenantId, tableId, controller.signal).then(data => {
      if (!controller.signal.aborted) setDetail(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('No pudimos consultar esta mesa. Revisa tu conexión e inténtalo nuevamente.');
    });
    return () => controller.abort();
  }, [tenantId, tableId, request]);
  const refresh = () => { setDetail(null); setError(''); setRequest(value => value + 1); };
  const openOrder = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setOpenError('');
    try { await openTableOrder(tableId); refresh(); }
    catch { setOpenError('No pudimos confirmar la apertura. Actualiza la mesa antes de reintentar; puede que otro empleado ya haya abierto un pedido.'); }
    finally { openingRef.current = false; setOpening(false); }
  };
  const order = detail?.order;
  const canEdit = order && (hasPermission(profile?.role, 'editOtherOrders') || (hasPermission(profile?.role, 'editOwnOrders') && order.waiter_id === user?.id));
  const askForBill = async () => {
    if (!order || billBusy.current) return;
    billBusy.current = true;
    setRequestingBill(true);
    setBillError('');
    try { await requestBill(order.id); setNotice('Cuenta solicitada. Caja puede revisar el pedido y registrar el cobro.'); refresh(); }
    catch (failure) { setBillError(paymentError(failure)); }
    finally { billBusy.current = false; setRequestingBill(false); }
  };

  return (<>
    <Link to="/mesas" className="mb-6 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary hover:underline">← Volver a mesas</Link>
    {notice && <p role="status" className="mb-6 rounded-xl bg-primary-soft p-4 text-sm text-primary">{notice}</p>}
    {!validId(tableId) || (detail && !detail.table) ? <section className="rounded-2xl border border-border bg-surface p-8"><h1 className="m-0 mb-3 text-2xl">Mesa no encontrada</h1><p className="text-sm text-muted">La mesa no existe o no pertenece a tu restaurante.</p></section>
      : error ? <section role="alert" className="rounded-2xl border border-danger/20 bg-surface p-8"><h1 className="m-0 mb-3 text-2xl">No pudimos cargar la mesa</h1><p className="mb-5 text-sm text-muted">{error}</p><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">Reintentar</button></section>
        : !detail?.table ? <p role="status" className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">Consultando mesa y pedido activo…</p>
          : <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">{detail.table.zone}</p><h1 className="m-0 text-3xl tracking-tight">Mesa {detail.table.table_number}</h1><span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-medium ${tableState(detail.table.status).color}`}>{tableState(detail.table.status).label}</span></div><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">Actualizar mesa</button></div>
            <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="mb-5 text-xl">Pedido activo</h2>
              {order ? <>
                <OrderPrint orderId={order.id} />
                <dl className="grid gap-6 sm:grid-cols-3"><div><dt className="text-xs text-muted">Subtotal</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{currency.format(order.subtotal)}</dd></div><div><dt className="text-xs text-muted">Propina</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{currency.format(order.tip_amount)}</dd></div><div><dt className="text-xs text-muted">Total</dt><dd className="mt-2 text-xl font-semibold tabular-nums text-primary">{currency.format(order.total_amount)}</dd></div></dl>
                <p className="mt-6 border-t border-border pt-5 text-sm text-muted">{order.waiter_id === user?.id ? 'Este pedido está a tu cargo.' : canEdit ? 'Tu rol permite supervisar este pedido.' : 'Este pedido está a cargo de otro empleado. Puedes consultarlo, pero no modificarlo.'}</p>
                <p className="mt-3 text-sm text-muted">Agrega productos y envía los pendientes a cocina o barra. Las líneas enviadas conservan su contenido.</p>
                {billError && <p role="alert" className="mt-4 text-sm text-danger">{billError}</p>}
                {canEdit && hasPermission(profile?.role, 'requestBill') && <button type="button" disabled={requestingBill || detail.table.status === 'BILL_REQUESTED'} onClick={askForBill} className="mt-5 min-h-11 cursor-pointer rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50">{requestingBill ? 'Solicitando…' : detail.table.status === 'BILL_REQUESTED' ? 'Cuenta solicitada' : 'Solicitar cuenta'}</button>}
              </> : <>
                <p className="text-sm text-muted">Esta mesa no tiene un pedido abierto asociado.</p>
                {detail.table.status !== 'AVAILABLE' && <p role="status" className="mt-4 rounded-xl bg-warning-soft p-4 text-sm text-warning">El estado de la mesa y sus pedidos no coinciden. Solicita al administrador que revise la mesa antes de iniciar un servicio.</p>}
                {openError && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-4 text-sm text-danger">{openError}</p>}
                {detail.table.status === 'AVAILABLE' && hasPermission(profile?.role, 'createOrders') && <button type="button" disabled={opening} onClick={openOrder} className="mt-5 min-h-12 cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-50">{opening ? 'Abriendo pedido…' : 'Abrir pedido'}</button>}
              </>}
              {order && detail.table.status === 'AVAILABLE' && <p role="status" className="mt-4 rounded-xl bg-warning-soft p-4 text-sm text-warning">Hay un pedido abierto, aunque la mesa figura como disponible. Solicita una revisión al administrador.</p>}
              {hasPermission(profile?.role, 'manageTables') && ((!order && detail.table.status !== 'AVAILABLE') || (order && detail.table.status === 'AVAILABLE')) && <ReconcileTable tableId={tableId} onSaved={message => { setNotice(message); refresh(); }} />}
            </section>
            {order && tenantId && <OrderEditor key={order.id} tenantId={tenantId} orderId={order.id} canEdit={Boolean(canEdit)} onChanged={message => { setNotice(message ?? 'Pedido actualizado.'); refresh(); }} />}
            {order && tenantId && hasPermission(profile?.role, 'collectPayments') && <CheckoutPanel key={`payment-${order.id}`} tenantId={tenantId} orderId={order.id} subtotal={order.subtotal} currentTip={order.tip_amount} onSettled={payment => { setNotice(`Pago de ${currency.format(payment.amount)} registrado. Vuelto: ${currency.format(payment.change)}. Pedido cerrado y mesa disponible.`); refresh(); }} />}
          </>}
  </>);
}
