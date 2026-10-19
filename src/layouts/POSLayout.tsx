import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useAuth } from '../context/auth-context';
import { hasPermission, roleLabels } from '../lib/permissions';

export function POSLayout() {
  const { profile, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const leave = async () => {
    setLeaving(true);
    setError('');
    try { await signOut(); }
    catch { setError('No pudimos cerrar la sesión. Inténtalo nuevamente.'); }
    finally { setLeaving(false); }
  };
  const navClass = ({ isActive }: { isActive: boolean }) => `rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-background hover:text-foreground'}`;
  return (
    <div className="min-h-svh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-surface focus:p-4">Ir al contenido</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-4">
            {profile && <span className="hidden text-xs font-medium text-muted sm:block">{roleLabels[profile.role]}</span>}
            <button type="button" onClick={leave} disabled={leaving} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:border-primary hover:bg-primary-soft hover:text-primary disabled:cursor-wait disabled:opacity-60">{leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          </div>
        </div>
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pb-4 sm:px-8">
          <NavLink to="/dashboard" end className={navClass}>Inicio</NavLink>
          {hasPermission(profile?.role, 'viewSalesHistory') && <NavLink to="/ventas" className={navClass}>Ventas</NavLink>}
          {hasPermission(profile?.role, 'manageStaff') && <NavLink to="/empleados" className={navClass}>Empleados</NavLink>}
          {hasPermission(profile?.role, 'viewTables') && <NavLink to="/mesas" className={navClass}>Mesas</NavLink>}
          {hasPermission(profile?.role, 'viewCatalog') && <NavLink to="/catalogo" className={navClass}>Catálogo</NavLink>}
          {hasPermission(profile?.role, 'collectPayments') && <NavLink to="/caja" className={navClass}>Caja</NavLink>}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-8 focus:outline-none sm:px-8 sm:py-12">
        {error && <p role="alert" className="mb-6 rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
        <Suspense fallback={<p role="status" className="py-12 text-center text-sm text-muted">Cargando vista…</p>}><Outlet /></Suspense>
        <footer className="mt-12 border-t border-border pt-5 text-xs text-muted">restaurant-pos · Un buen servicio empieza aquí.</footer>
      </main>
    </div>
  );
}
