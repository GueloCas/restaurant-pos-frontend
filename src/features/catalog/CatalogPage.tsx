import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { changeProductAvailability, fetchCatalog, type Catalog, type Product } from './service';
import { hasPermission } from '../../lib/permissions';
import { ProductForm } from './ProductForm';
import { CategoryForm } from './CategoryForm';
import { catalogError } from './model';
import { Link } from 'react-router-dom';
import { ProductGroupsForm } from '../modifiers/ProductGroupsForm';

const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL');

export function CatalogPage() {
  const { profile } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [editor, setEditor] = useState<{ kind: 'product'; product?: Product } | { kind: 'category' } | { kind: 'groups'; product: Product } | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const busy = useRef(false);
  const canManage = hasPermission(profile?.role, 'manageCatalog');
  const canChangeAvailability = hasPermission(profile?.role, 'changeAvailability');
  const tenantId = profile?.tenant_id;

  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();
    void fetchCatalog(tenantId, controller.signal).then(data => {
      if (!controller.signal.aborted) setCatalog(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('No pudimos cargar la carta. Revisa tu conexión e inténtalo nuevamente.');
    });
    return () => controller.abort();
  }, [tenantId, request]);

  const refresh = () => { setCatalog(null); setError(''); setRequest(value => value + 1); };
  const saved = (message: string) => { setEditor(null); setNotice(message); setActionError(''); refresh(); };
  const toggleAvailability = async (product: Product) => {
    if (!tenantId || busy.current) return;
    busy.current = true; setToggling(product.id); setActionError(''); setNotice('');
    try { await changeProductAvailability(tenantId, product); setNotice(`${product.name}: ${product.is_available === true ? 'no disponible' : 'disponible'}.`); refresh(); }
    catch (failure) { setActionError(catalogError(failure)); }
    finally { busy.current = false; setToggling(null); }
  };
  const clearFilters = () => { setQuery(''); setCategory(''); setOnlyAvailable(false); };
  const search = normalize(query.trim());
  const filtered = catalog?.products.filter(product => (!category || product.category_id === category) && (!onlyAvailable || product.is_available === true) && normalize(product.name).includes(search)) ?? [];
  const available = catalog?.products.filter(product => product.is_available === true).length ?? 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">La carta de tu restaurante</p><h1 className="m-0 text-3xl tracking-tight sm:text-4xl">Catálogo</h1><p className="mt-3 text-sm text-muted">Consulta productos, precios y disponibilidad.</p></div>
        <div className="flex flex-wrap gap-3">
          <Link to="/catalogo/opciones" className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft">Acompañamientos y extras</Link>
          {canManage && <><button type="button" onClick={() => setEditor({ kind: 'category' })} disabled={!catalog || toggling !== null} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50">Categorías</button><button type="button" onClick={() => setEditor({ kind: 'product' })} disabled={!catalog || !catalog.categories.length || toggling !== null} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">Nuevo producto</button></>}
          <button type="button" onClick={() => { setActionError(''); refresh(); }} disabled={(!catalog && !error) || toggling !== null || editor !== null} className="min-h-11 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60">Actualizar carta</button>
        </div>
      </div>
      {notice && <p role="status" className="mb-6 rounded-xl bg-primary-soft p-4 text-sm text-primary">{notice}</p>}
      {actionError && <p role="alert" className="mb-6 rounded-xl bg-danger-soft p-4 text-sm text-danger">{actionError}</p>}
      {canManage && catalog && !catalog.categories.length && <p className="mb-6 rounded-xl bg-info-soft p-4 text-sm text-info">Crea tu primera categoría para comenzar a agregar productos.</p>}
      {error ? <section role="alert" className="rounded-2xl border border-danger/20 bg-surface p-8"><h2 className="text-lg">No pudimos cargar el catálogo</h2><p className="mb-5 text-sm text-muted">{error}</p><button type="button" onClick={refresh} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">Reintentar</button></section>
        : !catalog ? <div role="status" className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">Cargando la carta…</div>
          : catalog.products.length === 0 ? <section className="rounded-2xl border border-border bg-surface p-10 text-center"><h2 className="text-xl">Tu carta aún no tiene productos</h2><p className="text-sm text-muted">Los productos aparecerán aquí cuando el administrador los incorpore.</p></section>
            : <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[['Productos', catalog.products.length], ['Disponibles', available], ['Categorías', catalog.categories.length]].map(([label, count]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p></div>)}
              </div>
              <section aria-label="Filtros del catálogo" className="mb-6 rounded-2xl border border-border bg-surface p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="product-search" className="mb-2 block text-sm font-medium">Buscar producto</label><input id="product-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Por ejemplo, hamburguesa" className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-primary" /></div>
                  <div><label htmlFor="category" className="mb-2 block text-sm font-medium">Categoría</label><select id="category" value={category} onChange={event => setCategory(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm"><option value="">Todas las categorías</option>{catalog.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                </div>
                <label className="mt-4 flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm text-muted"><input type="checkbox" checked={onlyAvailable} onChange={event => setOnlyAvailable(event.target.checked)} className="size-4 accent-primary" />Solo disponibles</label>
              </section>
              <p role="status" className="mb-4 text-sm text-muted">{filtered.length} de {catalog.products.length} productos</p>
              {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-lg">No hay coincidencias</h2><p className="mb-4 text-sm text-muted">Prueba con otro nombre o cambia los filtros.</p><button type="button" onClick={clearFilters} className="min-h-11 cursor-pointer rounded-xl bg-primary-soft px-4 py-2 text-sm font-medium text-primary">Limpiar filtros</button></div>
                : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(product => <article key={product.id} className="flex flex-col rounded-2xl border border-border bg-surface p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-2"><p className="text-xs text-muted">{catalog.categories.find(item => item.id === product.category_id)?.name ?? 'Sin categoría'}</p><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_available === true ? 'bg-primary-soft text-primary' : 'bg-warning-soft text-warning'}`}>{product.is_available === true ? 'Disponible' : 'No disponible'}</span></div><h2 className="mb-5 grow text-lg">{product.name}</h2><p className="border-t border-border pt-4 text-xl font-semibold tabular-nums">{currency.format(product.price)}<span className="ml-2 text-xs font-normal text-muted">CLP</span></p><div className="mt-4 flex flex-wrap gap-2">{canManage && <button type="button" disabled={toggling !== null} onClick={() => { setActionError(''); setEditor({ kind: 'product', product }); }} className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50">Editar</button>}{canManage && <button type="button" disabled={toggling !== null} onClick={() => setEditor({ kind: 'groups', product })} className="min-h-11 cursor-pointer rounded-xl border border-border px-3 py-2 text-sm font-medium text-primary disabled:opacity-50">Opciones</button>}{canChangeAvailability && <button type="button" disabled={toggling !== null} onClick={() => void toggleAvailability(product)} className="min-h-11 cursor-pointer rounded-xl bg-background px-3 py-2 text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-50">{toggling === product.id ? 'Guardando…' : product.is_available === true ? 'Marcar no disponible' : 'Marcar disponible'}</button>}</div></article>)}</div>}
            </>}
      {canManage && tenantId && catalog && editor?.kind === 'product' && <ProductForm tenantId={tenantId} categories={catalog.categories} product={editor.product} onClose={() => setEditor(null)} onSaved={() => saved('Producto guardado en la carta.')} />}
      {canManage && tenantId && catalog && editor?.kind === 'category' && <CategoryForm tenantId={tenantId} categories={catalog.categories} onClose={() => setEditor(null)} onSaved={() => saved('Categoría guardada en la carta.')} />}
      {canManage && tenantId && editor?.kind === 'groups' && <ProductGroupsForm tenantId={tenantId} product={editor.product} onClose={() => setEditor(null)} onSaved={() => saved('Grupos del producto guardados.')} />}
    </>
  );
}
