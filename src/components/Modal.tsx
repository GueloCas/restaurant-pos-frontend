import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Modal({ title, children, busy = false, onClose }: { title: string; children: ReactNode; busy?: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} aria-labelledby={headingId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-foreground/40 sm:p-8">
    <div className="mb-6 flex items-center justify-between gap-4"><h2 id={headingId} className="m-0 text-xl">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar ventana" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-xl text-muted hover:bg-background disabled:opacity-50">×</button></div>
    {children}
  </dialog>;
}
