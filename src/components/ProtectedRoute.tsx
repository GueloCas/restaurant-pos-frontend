import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { hasPermission, type Permission } from '../lib/permissions';
import { Brand } from './Brand';

export function ProtectedRoute({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { session, profile, loading, authError, retryAuth, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [exitError, setExitError] = useState('');
  const leave = async () => {
    setLeaving(true);
    setExitError('');
    try { await signOut(); }
    catch { setExitError('No pudimos cerrar tu sesión. Vuelve a intentarlo.'); }
    finally { setLeaving(false); }
  };
  if (loading) return <main className="grid min-h-svh place-items-center px-6"><p role="status" className="text-muted">Verificando tu acceso…</p></main>;
  if (!session && !authError) return <Navigate to="/login" replace />;
  if (authError || !profile) return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <Brand />
        <h1 className="mb-3 mt-8 text-2xl">No pudimos verificar tu acceso</h1>
        <p role="alert" className="text-sm text-muted">{authError || 'Tu cuenta necesita un perfil asociado a un restaurante. Contacta al administrador.'}</p>
        {exitError && <p role="alert" className="mt-4 text-sm text-danger">{exitError}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={leaving} onClick={retryAuth} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60">Reintentar</button>
          {session && <button type="button" disabled={leaving} onClick={leave} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-60">{leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>}
        </div>
      </section>
    </main>
  );
  if (permission && !hasPermission(profile.role, permission)) return (
    <main className="mx-auto max-w-lg px-6 py-20"><h1 className="text-2xl">No tienes acceso a esta sección</h1><p className="mb-6 text-muted">Tu rol no permite realizar esta operación.</p><Link to="/dashboard" className="font-medium text-primary underline">Volver al panel</Link></main>
  );
  return children;
}
