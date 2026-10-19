import { supabase } from '../../lib/supabase';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number | null;
  print_destination: string;
}
export interface Product {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean | null;
}
export interface Catalog { categories: Category[]; products: Product[] }

// Explicit tenant filters complement the database's RLS policies.
export async function fetchCatalog(tenantId: string, signal: AbortSignal): Promise<Catalog> {
  const [categories, products] = await Promise.all([
    supabase.from('categories').select('id, tenant_id, name, sort_order, print_destination').eq('tenant_id', tenantId).order('sort_order', { nullsFirst: false }).order('name').abortSignal(signal),
    supabase.from('products').select('id, tenant_id, category_id, name, price, is_available').eq('tenant_id', tenantId).order('name').abortSignal(signal),
  ]);
  if (categories.error) throw categories.error;
  if (products.error) throw products.error;
  return { categories: categories.data ?? [], products: products.data ?? [] };
}

export interface ProductInput { name: string; category_id: string; price: number; is_available: boolean }
export interface CategoryInput { name: string; print_destination: 'KITCHEN' | 'BAR'; sort_order: number }

export async function saveProduct(tenantId: string, id: string, input: ProductInput, previous?: Product) {
  const row = { ...input, name: input.name.trim() };
  let result;
  if (previous) {
    let query = supabase.from('products').update(row).eq('tenant_id', tenantId).eq('id', id).eq('name', previous.name).eq('price', previous.price).eq('category_id', previous.category_id);
    query = previous.is_available === null ? query.is('is_available', null) : query.eq('is_available', previous.is_available);
    result = await query.select('id').single();
  } else result = await supabase.from('products').insert({ ...row, id, tenant_id: tenantId }).select('id').single();
  if (!result.error) return;
  // Recover a successful but unconfirmed retry, without overwriting newer edits.
  if (result.error.code === '23505' || result.error.code === 'PGRST116') {
    const check = await supabase.from('products').select('name, category_id, price, is_available').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (!check.error && check.data && check.data.name === row.name && check.data.category_id === row.category_id && check.data.price === row.price && check.data.is_available === row.is_available) return;
  }
  throw result.error;
}

export async function saveCategory(tenantId: string, id: string, input: CategoryInput, previous?: Category) {
  const row = { ...input, name: input.name.trim() };
  let result;
  if (previous) {
    let query = supabase.from('categories').update(row).eq('tenant_id', tenantId).eq('id', id).eq('name', previous.name).eq('print_destination', previous.print_destination);
    query = previous.sort_order === null ? query.is('sort_order', null) : query.eq('sort_order', previous.sort_order);
    result = await query.select('id').single();
  } else result = await supabase.from('categories').insert({ ...row, id, tenant_id: tenantId }).select('id').single();
  if (!result.error) return;
  if (result.error.code === '23505' || result.error.code === 'PGRST116') {
    const check = await supabase.from('categories').select('name, print_destination, sort_order').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (!check.error && check.data && check.data.name === row.name && check.data.print_destination === row.print_destination && check.data.sort_order === row.sort_order) return;
  }
  throw result.error;
}

export async function changeProductAvailability(tenantId: string, product: Product) {
  const available = product.is_available !== true;
  let query = supabase.from('products').update({ is_available: available }).eq('tenant_id', tenantId).eq('id', product.id);
  query = product.is_available === null ? query.is('is_available', null) : query.eq('is_available', product.is_available);
  const { error } = await query.select('id').single();
  if (!error) return;
  if (error.code === 'PGRST116') {
    const check = await supabase.from('products').select('is_available').eq('tenant_id', tenantId).eq('id', product.id).maybeSingle();
    if (!check.error && check.data?.is_available === available) return;
  }
  throw error;
}
