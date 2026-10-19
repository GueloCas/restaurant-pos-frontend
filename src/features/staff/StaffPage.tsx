import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { InviteEmployee } from './InviteEmployee';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import { roleLabels, type Profile, type Role } from '../../lib/permissions';

const button = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50';
const input = 'mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2';

function StaffForm({ employee, own, onClose, onSaved }: { employee: Profile; own: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(employee.full_name);
  const [role, setRole] = useState<Role>(employee.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { error: failure } = await supabase.rpc('update_staff_profile', { p_id: employee.id, p_name: name.trim(), p_role: role, p_expected_name: employee.full_name, p_expected_role: employee.role });
      if (failure) throw failure;
      onSaved();
    } catch (failure) {
      const message = typeof failure === 'object' && failure !== null && 'message' in failure ? String(failure.message) : '';
      setError(message.includes('STAFF_CHANGED') ? 'Este empleado cambió. Cierra la ventana y actualiza el equipo antes de editar nuevamente.' : message.includes('OWN_ADMIN_ROLE') ? 'Debes conservar tu acceso de administrador.' : 'No pudimos confirmar el cambio. Actualiza el equipo o reintenta el mismo guardado.');
    } finally { setBusy(false); }
  }
  return <Modal title="Editar empleado" busy={busy} onClose={onClose}>
    <form onSubmit={save} className="space-y-5">
      <label className="block text-sm">Nombre<input autoFocus required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)} className={input} /></label>
      <label className="block text-sm">Rol<select value={role} disabled={busy || own} onChange={event => setRole(event.target.value as Role)} className={input}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="text-sm text-muted">{own ? 'Puedes editar tu nombre. Tu cuenta conservará el acceso de administrador.' : 'El cajero supervisa pedidos y cobros. El administrador también gestiona precios, mesas y empleados.'}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className={button}>Cancelar</button><button disabled={busy || !name.trim()} className={button}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </Modal>;
}

export function StaffPage() {
  const { profile, retryAuth } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const tenantId = profile?.tenant_id;
  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error: failure } = await supabase.from('profiles').select('id,tenant_id,full_name,role').eq('tenant_id', tenantId).order('full_name').abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (failure) throw failure;
        setEmployees(data ?? []);
      } catch {
        if (!controller.signal.aborted) setError('No pudimos cargar el equipo. Inténtalo nuevamente.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [tenantId, revision]);
  function refresh() { setLoading(true); setError(''); setRevision(value => value + 1); }
  const visible = employees.filter(employee => employee.full_name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  return <>
    <div className="mb-5 flex justify-end"><button className={button} onClick={() => setInviting(true)}>Invitar empleado</button></div>
    {inviting && <InviteEmployee onClose={() => setInviting(false)} onInvited={() => { setInviting(false); setNotice('Invitación enviada. El empleado recibirá un enlace para definir su contraseña.'); refresh(); }} />}
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs uppercase tracking-widest text-primary">Administración</p><h1 className="text-3xl">Empleados</h1><p className="mt-2 text-sm text-muted">Administra los nombres y roles del equipo de tu restaurante.</p></div><button disabled={loading} className={button} onClick={refresh}>Actualizar equipo</button></div>
    {notice && <p role="status" className="mb-5 rounded-xl bg-primary-soft p-4 text-sm text-primary">{notice}</p>}
    {error && <p role="alert" className="mb-5 rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
    <label className="mb-6 block max-w-md text-sm">Buscar por nombre<input type="search" value={search} onChange={event => setSearch(event.target.value)} className={input} placeholder="Nombre del empleado" /></label>
    {loading ? <p role="status" className="py-10 text-muted">Cargando equipo…</p> : !error && <section aria-label="Equipo" className="grid gap-4 sm:grid-cols-2">
      {visible.map(employee => <article key={employee.id} className="rounded-2xl border border-border bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg">{employee.full_name || 'Sin nombre'}{employee.id === profile?.id && <span className="ml-2 text-xs text-muted">(Tú)</span>}</h2><p className="mt-2 text-sm text-primary">{roleLabels[employee.role]}</p></div><button className={button} onClick={() => { setNotice(''); setSelected(employee); }}>Editar</button></div></article>)}
      {!visible.length && <p className="text-sm text-muted">No hay empleados que coincidan con la búsqueda.</p>}
    </section>}
    {selected && <StaffForm employee={selected} own={selected.id === profile?.id} onClose={() => setSelected(null)} onSaved={() => { const own = selected.id === profile?.id; setSelected(null); setNotice('Datos del empleado actualizados.'); refresh(); if (own) retryAuth(); }} />}
  </>;
}
