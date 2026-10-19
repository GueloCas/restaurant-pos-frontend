import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import { roleLabels, type Role } from '../../lib/permissions';

export function InviteEmployee({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('WAITER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('invite-employee', { body: { email: email.trim(), name: name.trim(), role } });
      if (failure || data?.code !== 'INVITED') {
        let code = data?.code;
        if (failure && 'context' in failure && failure.context instanceof Response) {
          try { code = (await failure.context.json()).code; } catch { /* Keep the generic message for network errors. */ }
        }
        setError(code === 'PROFILE_NOT_CONFIRMED' ? 'Se envió el correo, pero no pudimos asignar el acceso al restaurante. Contacta al responsable de la configuración antes de volver a invitar.' : code === 'FORBIDDEN' ? 'Solo un administrador puede invitar empleados.' : 'No pudimos confirmar la invitación. Revisa si el correo ya tiene una cuenta o recibió la invitación antes de reintentar.');
        return;
      }
      onInvited();
    } catch { setError('No pudimos confirmar el envío. Revisa la conexión y el correo del empleado antes de reintentar.'); }
    finally { setBusy(false); }
  }
  const field = 'mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2';
  return <Modal title="Invitar empleado" busy={busy} onClose={onClose}><form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-muted">El empleado recibirá un enlace para definir su contraseña y acceder al restaurante.</p>
    <label className="block text-sm">Nombre<input autoFocus required maxLength={100} disabled={busy} value={name} onChange={event => setName(event.target.value)} className={field} /></label>
    <label className="block text-sm">Correo electrónico<input type="email" required maxLength={254} disabled={busy} value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>
    <label className="block text-sm">Rol<select disabled={busy} value={role} onChange={event => setRole(event.target.value as Role)} className={field}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {role === 'ADMIN' && <p className="text-sm text-warning">Esta persona podrá administrar empleados, precios y configuración del restaurante.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy || !name.trim()} className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enviando invitación…' : 'Enviar invitación'}</button>
  </form></Modal>;
}
