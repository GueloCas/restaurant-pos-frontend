import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase';
import { Brand } from '../components/Brand';

export function AcceptInvitation() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) { setError('No pudimos guardar la contraseña. Usa al menos 12 caracteres y comprueba que el enlace siga vigente.'); return; }
      navigate('/dashboard', { replace: true });
    } catch { setError('No pudimos conectar. Inténtalo nuevamente.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-6 py-12"><Brand /><section className="rounded-2xl border border-border bg-surface p-6"><h1 className="text-2xl">Bienvenido al equipo</h1>
    {loading ? <p role="status" className="mt-5 text-sm text-muted">Validando invitación…</p> : !session ? <div className="mt-5 text-sm text-muted"><p>Abre el enlace de tu correo de invitación. Si venció o ya fue utilizado, contacta al administrador.</p><Link to="/login" className="mt-5 inline-block text-primary">Ir a iniciar sesión →</Link></div> : <form onSubmit={submit} className="mt-5 space-y-5">
      <p className="text-sm text-muted">Define tu contraseña para ingresar con {session.user.email}.</p>
      <label className="block text-sm">Contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-border px-3 py-3" /><span className="mt-1 block text-xs text-muted">Usa al menos 12 caracteres.</span></label>
      <label className="block text-sm">Repite la contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-border px-3 py-3" /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={busy} className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar y entrar'}</button>
    </form>}
  </section></main>;
}
