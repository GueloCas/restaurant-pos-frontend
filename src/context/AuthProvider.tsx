import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authService } from '../lib/services/auth';
import { AuthContext } from './auth-context';
import { isProfile, type Profile } from '../lib/permissions';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const synchronize = async (nextSession: Session | null, ticket: number) => {
      const current = () => active && revision.current === ticket;
      if (!current()) return;
      setSession(nextSession);
      setProfile(null);
      setAuthError(null);
      setLoading(true);
      try {
        if (!nextSession) return;
        const { data, error } = await authService.getProfile(nextSession.user.id);
        if (!current()) return;
        if (error) throw error;
        if (!isProfile(data, nextSession.user.id)) {
          setAuthError('Tu cuenta no tiene un perfil válido asociado a un restaurante. Contacta al administrador.');
          return;
        }
        setProfile(data);
      } catch {
        if (current()) setAuthError('No pudimos cargar tu perfil. Revisa tu conexión y vuelve a intentarlo.');
      } finally {
        if (current()) setLoading(false);
      }
    };

    const { data: { subscription } } = authService.onAuthStateChange((_event, nextSession) => {
      eventReceived = true;
      const ticket = ++revision.current;
      setLoading(true);
      setProfile(null);
      setSession(nextSession);
      // Query profiles outside the synchronous Auth callback to avoid locking Auth.
      const timer = setTimeout(() => {
        timers.delete(timer);
        void synchronize(nextSession, ticket);
      }, 0);
      timers.add(timer);
    });

    const ticket = revision.current;
    void authService.getSession().then(({ data, error }) => {
      if (!active || eventReceived || revision.current !== ticket) return;
      if (error) throw error;
      return synchronize(data.session, ++revision.current);
    }).catch(() => {
      if (!active || eventReceived || revision.current !== ticket) return;
      setSession(null);
      setProfile(null);
      setAuthError('No pudimos recuperar tu sesión. Vuelve a intentarlo.');
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [reload]);

  const retryAuth = () => {
    ++revision.current;
    setLoading(true);
    setAuthError(null);
    setReload(value => value + 1);
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    if (error) throw error;
    ++revision.current;
    setSession(null);
    setProfile(null);
    setAuthError(null);
    setLoading(false);
  };

  return <AuthContext.Provider value={{ user: session?.user ?? null, profile, session, loading, authError, retryAuth, signOut }}>{children}</AuthContext.Provider>;
};
