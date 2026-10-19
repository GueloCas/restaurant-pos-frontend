import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { hasPermission, roleLabels, type Permission } from '../lib/permissions';

const modules = [
  { number: '01', title: 'Mesas', description: 'Consulta las mesas y solicita la cuenta.', permission: 'viewTables' },
  { number: '02', title: 'Pedidos', description: 'Crea pedidos y acompaña cada servicio.', permission: 'createOrders' },
  { number: '03', title: 'Catálogo', description: 'Consulta los productos y categorías de la carta.', permission: 'viewCatalog' },
  { number: '04', title: 'Caja', description: 'Registra cobros y consulta el historial de pagos.', permission: 'collectPayments' },
  { number: '05', title: 'Empleados', description: 'Administra los nombres y roles de tu equipo.', permission: 'manageStaff' },
] satisfies { number: string; title: string; description: string; permission: Permission }[];

const capabilities = [
  { permission: 'editOwnOrders', title: 'Crear y editar tus pedidos' },
  { permission: 'editOtherOrders', title: 'Supervisar pedidos de otros empleados' },
  { permission: 'cancelSentItems', title: 'Anular líneas enviadas con motivo' },
  { permission: 'collectPayments', title: 'Registrar pagos y cerrar pedidos' },
  { permission: 'changeAvailability', title: 'Cambiar la disponibilidad de productos' },
  { permission: 'manageCatalog', title: 'Administrar carta y precios' },
  { permission: 'manageStaff', title: 'Administrar empleados y roles' },
  { permission: 'refundPayments', title: 'Realizar devoluciones de pagos' },
] satisfies { permission: Permission; title: string }[];

export const Dashboard = () => {
  const { profile, user } = useAuth();
  const name = profile?.full_name?.trim() || user?.email || 'Tu cuenta';
  const visibleModules = modules.filter(module => hasPermission(profile?.role, module.permission));
  const visibleCapabilities = capabilities.filter(item => hasPermission(profile?.role, item.permission));
  const date = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' }).format(new Date());

  return (<>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">Panel principal</p>
            <h1 className="m-0 text-3xl tracking-tight sm:text-4xl">Hola, {name}.</h1>
            <p className="mt-3 text-sm text-muted">Bienvenido al espacio de trabajo de tu restaurante.</p>
          </div>
          <p className="text-sm capitalize text-muted">{date}</p>
        </div>
        <section aria-labelledby="account-title" className="mb-10 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-semibold text-primary">{name.slice(0, 1).toUpperCase()}</span>
            <div><h2 id="account-title" className="mb-0 text-lg">Tu cuenta</h2><p className="text-sm text-muted">Información de tu acceso actual</p></div>
          </div>
          <dl className="grid gap-6 border-t border-border pt-6 sm:grid-cols-3">
            <div><dt className="text-xs text-muted">Correo electrónico</dt><dd className="mt-2 break-all text-sm font-medium">{user?.email || 'No disponible'}</dd></div>
            <div><dt className="text-xs text-muted">Rol</dt><dd className="mt-2 text-sm font-medium">{profile ? roleLabels[profile.role] || 'Sin rol asignado' : 'Perfil no disponible'}</dd></div>
            <div><dt className="text-xs text-muted">Sesión</dt><dd className="mt-2 flex items-center gap-2 text-sm font-medium text-primary"><span aria-hidden="true" className="size-2 rounded-full bg-primary" />Activa</dd></div>
          </dl>
          {!profile && <p role="status" className="mt-5 rounded-lg bg-warning-soft p-3 text-sm text-warning">Tu perfil aún no está disponible. Si el mensaje persiste, contacta al administrador.</p>}
        </section>
        <section aria-labelledby="modules-title">

          <div className="mb-5"><h2 id="modules-title" className="mb-1 text-xl">Tu operación, en un solo lugar</h2><p className="text-sm text-muted">Accede a los módulos disponibles para tu rol.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleModules.map(module => <article key={module.title} className="rounded-2xl border border-border bg-surface p-5"><div className="mb-6 flex items-center justify-between"><span aria-hidden="true" className="text-sm font-semibold tabular-nums text-primary">{module.number}</span><span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted">{['Catálogo', 'Mesas', 'Pedidos', 'Caja', 'Empleados'].includes(module.title) ? 'Disponible' : 'Próximamente'}</span></div><h3 className="mb-2 text-base">{module.title}</h3><p className="text-sm leading-relaxed text-muted">{module.description}</p>{module.title === 'Empleados' && <Link to="/empleados" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft">Ver empleados →</Link>}{module.title === 'Pedidos' && <Link to="/mesas" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft">Tomar pedido →</Link>}{module.title === 'Caja' && <Link to="/caja" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft">Ir a caja →</Link>}{module.title === 'Mesas' && <Link to="/mesas" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft">Ver mesas →</Link>}{module.title === 'Catálogo' && <Link to="/catalogo" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-soft">Ver catálogo →</Link>}</article>)}
          </div>
        </section>
        <section aria-labelledby="permissions-title" className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 id="permissions-title" className="text-lg">Tu acceso de trabajo</h2>
          <p className="mb-5 text-sm text-muted">Funciones de tu rol que estarán disponibles a medida que habilitemos los módulos.</p>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {visibleCapabilities.map(item => <li key={item.permission} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span>{item.title}</li>)}
          </ul>
          {profile?.role === 'WAITER' && <p className="mt-5 border-t border-border pt-4 text-sm text-muted">Puedes consultar los pedidos abiertos del restaurante y editar únicamente los tuyos.</p>}
          {profile?.role === 'CASHIER' && <p className="mt-5 border-t border-border pt-4 text-sm text-muted">Supervisas la operación diaria. Los precios, empleados, configuración y devoluciones están a cargo del administrador.</p>}
        </section>
  </>);
};
