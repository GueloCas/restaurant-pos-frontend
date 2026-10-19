import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../lib/services/auth';
import { useAuth } from '../context/auth-context';
import { Brand } from '../components/Brand';

export const Login = () => {
  const { session, loading: sessionLoading, authError, retryAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (sessionLoading) return <main className="grid min-h-svh place-items-center px-6"><p role="status" className="text-muted">Verificando sesión…</p></main>;
  if (session) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await authService.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrorMsg(error.code === 'invalid_credentials'
          ? 'El correo o la contraseña no son correctos.'
          : error.code === 'email_not_confirmed'
            ? 'Confirma tu correo electrónico antes de ingresar.'
            : 'No pudimos iniciar sesión. Revisa tus datos e inténtalo nuevamente.');
      }
    } catch {
      setErrorMsg('No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-svh lg:grid lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 xl:p-16 lg:flex">
        <Brand inverse />
        <div className="relative z-10 max-w-lg py-20">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-white/70">Tu restaurante, en orden</p>
          <h1 className="m-0 text-5xl font-semibold leading-tight tracking-tight text-white xl:text-6xl">Un buen servicio<br />empieza aquí.</h1>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-white/75">Un espacio para organizar el día a día de tu restaurante.</p>
        </div>
        <p className="relative z-10 text-sm text-white/60">Simple. Claro. Hecho para tu equipo.</p>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-40 size-[480px] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 size-[350px] rounded-full border border-white/10" />
      </section>
      <section className="flex min-h-svh flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="lg:hidden"><Brand /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <span className="mb-6 w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">Bienvenido a restaurant-pos</span>
          <h2 className="mb-2 text-3xl tracking-tight">Inicia sesión</h2>
          <p className="mb-8 text-sm leading-relaxed text-muted">Ingresa con la cuenta de tu restaurante para acceder al panel.</p>
          <form onSubmit={handleLogin} aria-busy={loading} className="space-y-5">
            {authError && <div role="alert" className="rounded-xl bg-warning-soft p-3 text-sm text-warning"><p>{authError}</p><button type="button" onClick={retryAuth} className="mt-2 cursor-pointer font-medium underline">Reintentar</button></div>}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="username" placeholder="nombre@restaurante.cl" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm transition placeholder:text-muted/65 focus:border-primary disabled:opacity-60" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="w-full rounded-xl border border-border bg-surface py-3 pl-4 pr-24 text-sm transition placeholder:text-muted/65 focus:border-primary disabled:opacity-60" />
                <button type="button" aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-1 right-2 cursor-pointer rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary-soft">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            {errorMsg && <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="min-h-12 w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover active:bg-primary-active disabled:cursor-wait disabled:opacity-60">{loading ? 'Ingresando…' : 'Ingresar al panel →'}</button>
          </form>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted">¿Necesitas una cuenta o ayuda para ingresar?<br />Contacta al administrador de tu restaurante.</p>
        </div>
        <p className="text-center text-xs text-muted">restaurant-pos · Gestión de restaurantes</p>
      </section>
    </main>
  );
};
