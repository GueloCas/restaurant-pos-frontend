import type { PrintJob } from './service';

const jobLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En cola', color: 'bg-warning-soft text-warning' },
  PRINTED: { label: 'Impreso', color: 'bg-primary-soft text-primary' },
  ERROR: { label: 'Error de impresión', color: 'bg-danger-soft text-danger' },
};
const time = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

export function DispatchHistory({ jobs }: { jobs: PrintJob[] }) {
  return (
    <section aria-labelledby="dispatch-history" className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h2 id="dispatch-history" className="mb-2 text-xl">Comandas</h2>
      <p className="mb-5 text-sm text-muted">El estado de impresión se confirma mediante el servicio de impresoras. Usa “Actualizar mesa” para consultar cambios.</p>
      {!jobs.length ? <p className="text-sm text-muted">Todavía no se enviaron comandas para este pedido.</p>
        : <ul className="divide-y divide-border">{jobs.map(job => {
          const state = jobLabels[job.status] ?? { label: 'Estado desconocido', color: 'bg-background text-muted' };
          return <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="text-sm font-medium">{job.destination === 'KITCHEN' ? 'Cocina' : 'Barra'}</h3><p className="mt-1 text-xs text-muted">{job.created_at ? time.format(new Date(job.created_at)) : 'Sin hora registrada'} · Comanda {job.id.slice(0, 8)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${state.color}`}>{state.label}</span></li>;
        })}</ul>}
    </section>
  );
}
