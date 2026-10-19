import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../components/Modal';
import { fetchPrintableOrder } from './service';
import { printItems, printItemTotal, printLabels, type PrintableOrder, type PrintScope } from './model';
import './print.css';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' });
function Receipt({ order, scope, preparedAt }: { order: PrintableOrder; scope: PrintScope; preparedAt: Date }) {
  const items = printItems(order, scope);
  return <article className="order-receipt">
    <header><p className="receipt-brand">restaurant-pos</p><h2>{printLabels[scope]}</h2><p className="receipt-table">Mesa {order.table_number}</p><p>{order.zone}</p><p>Pedido {order.id.slice(0, 8)}</p>{order.created_at && <p>Apertura: {date.format(new Date(order.created_at))}</p>}<p>Emitido: {date.format(preparedAt)}</p></header>
    <p className="receipt-notice">{order.status === 'CLOSED' ? 'PEDIDO CERRADO' : order.status === 'CANCELLED' ? 'PEDIDO ANULADO' : 'PEDIDO ABIERTO'} · COPIA MANUAL</p>
    <ul>{items.map(item => <li key={item.id}><div className="receipt-row"><strong>{item.quantity} × {item.name}</strong>{scope === 'ALL' && <span>{money.format(printItemTotal(item))}</span>}</div>{item.extras.map((extra, index) => <p className="receipt-extra" key={index}>+ {extra.name}{scope === 'ALL' && extra.extra_price > 0 ? ' (' + money.format(extra.extra_price) + ' c/u)' : ''}</p>)}{item.notes && <p className="receipt-notes">Nota: {item.notes}</p>}{item.status === 'PENDING' && <p className="receipt-pending">PENDIENTE DE ENVIAR</p>}</li>)}</ul>
    {scope === 'ALL' && <dl className="receipt-totals"><div className="receipt-row"><dt>Consumo</dt><dd>{money.format(order.subtotal)}</dd></div><div className="receipt-row"><dt>Propina</dt><dd>{money.format(order.tip)}</dd></div><div className="receipt-row receipt-total"><dt>Total</dt><dd>{money.format(order.total)}</dd></div></dl>}
    <footer><p>{scope === 'ALL' ? 'Detalle del pedido · No es documento tributario' : 'Copia del pedido para ' + printLabels[scope].toLocaleLowerCase('es')}</p><p>Esta impresión no envía ni modifica las comandas.</p></footer>
  </article>;
}
function Preview({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<PrintableOrder | null>(null);
  const [scope, setScope] = useState<PrintScope>('ALL');
  const [error, setError] = useState(false);
  const [printError, setPrintError] = useState('');
  const [revision, setRevision] = useState(0);
  const [preparedAt] = useState(() => new Date());
  useEffect(() => {
    const controller = new AbortController();
    void fetchPrintableOrder(orderId, controller.signal).then(data => { if (!controller.signal.aborted) setOrder(data); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [orderId, revision]);
  useEffect(() => {
    if (!order) return;
    const title = document.title;
    document.title = printLabels[scope] + ' - Mesa ' + order.table_number + ' - ' + order.id.slice(0, 8);
    return () => { document.title = title; };
  }, [order, scope]);
  const empty = order && !printItems(order, scope).length;
  const button = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50';
  return <Modal title="Imprimir pedido" onClose={onClose}>
    {error ? <div role="alert"><p className="mb-4 text-sm text-danger">No pudimos preparar el pedido para imprimir.</p><button className={button} onClick={() => { setError(false); setRevision(value => value + 1); }}>Reintentar</button></div> : !order ? <p role="status" className="text-sm text-muted">Preparando pedido…</p> : <>
      <label className="block text-sm">Contenido<select value={scope} onChange={event => setScope(event.target.value as PrintScope)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3">{Object.entries(printLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="my-4 text-sm text-muted">Formato de 80 mm. En el diálogo del navegador puedes imprimir o guardar como PDF. Desactiva los encabezados y pies de página del navegador para obtener un ticket limpio.</p>
      {empty ? <p role="status" className="my-5 rounded-xl bg-warning-soft p-4 text-sm text-warning">No hay productos para {scope === 'ALL' ? 'imprimir en este pedido' : printLabels[scope].toLocaleLowerCase('es')}.</p> : <div className="overflow-x-auto rounded-xl bg-background p-3"><Receipt order={order} scope={scope} preparedAt={preparedAt} /></div>}
      {printError && <p role="alert" className="mt-4 text-sm text-danger">{printError}</p>}
      <button disabled={Boolean(empty)} className={button + ' mt-5 w-full'} onClick={() => { setPrintError(''); try { window.print(); } catch { setPrintError('No pudimos abrir la impresión. Revisa la configuración de tu navegador.'); } }}>Imprimir / Guardar como PDF</button>
      {!empty && createPortal(<div id="order-print-root"><Receipt order={order} scope={scope} preparedAt={preparedAt} /></div>, document.body)}
    </>}
  </Modal>;
}
export function OrderPrint({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="mt-5 min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft">Imprimir pedido</button>{open && <Preview orderId={orderId} onClose={() => setOpen(false)} />}</>;
}
