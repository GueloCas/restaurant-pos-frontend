export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg font-semibold ${inverse ? 'bg-white/15 text-white' : 'bg-primary text-white'}`}>r.</span>
      <span className={`text-lg font-semibold tracking-tight ${inverse ? 'text-white' : 'text-foreground'}`}>restaurant<span className={inverse ? 'text-white/65' : 'text-muted'}> / pos</span></span>
    </div>
  );
}
