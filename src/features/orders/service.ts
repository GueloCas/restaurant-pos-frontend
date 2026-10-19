import { supabase } from '../../lib/supabase';
import { fetchCatalog } from '../catalog/service';

export interface OrderLine { id: string; product_id: string; quantity: number; unit_price: number; notes: string | null; status: string; cancelled_at: string | null }
export interface Extra { id: string; order_item_id: string; name: string; extra_price: number }
export interface Modifier { id: string; group_id: string; name: string; extra_price: number; is_available: boolean | null }
export interface ModifierGroup { id: string; name: string; min_selections: number; max_selections: number }
export interface ModifierLink { product_id: string; modifier_group_id: string; sort_order: number | null }
export interface PrintJob { id: string; dispatch_id: string | null; destination: string; status: string; created_at: string | null }

export async function openTableOrder(tableId: string): Promise<string> {
  const { data, error } = await supabase.rpc('open_table_order', { p_table_id: tableId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Invalid order response');
  return data;
}
export async function fetchOrderEditor(tenantId: string, orderId: string, signal: AbortSignal) {
  const [catalog, lines, groups, modifiers, links, jobs] = await Promise.all([
    fetchCatalog(tenantId, signal),
    supabase.from('order_items').select('id, product_id, quantity, unit_price, notes, status, cancelled_at').eq('tenant_id', tenantId).eq('order_id', orderId).order('created_at').order('id').abortSignal(signal),
    supabase.from('modifier_groups').select('id, name, min_selections, max_selections').eq('tenant_id', tenantId).abortSignal(signal),
    supabase.from('modifiers').select('id, group_id, name, extra_price, is_available').eq('tenant_id', tenantId).order('name').abortSignal(signal),
    supabase.from('product_modifier_groups').select('product_id, modifier_group_id, sort_order').eq('tenant_id', tenantId).order('sort_order').abortSignal(signal),
    supabase.from('print_jobs').select('id, dispatch_id, destination, status, created_at').eq('tenant_id', tenantId).eq('order_id', orderId).in('destination', ['KITCHEN', 'BAR']).order('created_at', { ascending: false }).abortSignal(signal),
  ]);
  for (const result of [lines, groups, modifiers, links, jobs]) if (result.error) throw result.error;
  const items: OrderLine[] = lines.data ?? [];
  const extras = items.length ? await supabase.from('order_item_modifiers').select('id, order_item_id, name, extra_price').eq('tenant_id', tenantId).in('order_item_id', items.map(item => item.id)).abortSignal(signal) : { data: [], error: null };
  if (extras.error) throw extras.error;
  return { catalog, lines: items, extras: (extras.data ?? []) as Extra[], groups: (groups.data ?? []) as ModifierGroup[], modifiers: (modifiers.data ?? []) as Modifier[], links: (links.data ?? []) as ModifierLink[], jobs: (jobs.data ?? []) as PrintJob[] };
}

export async function sendOrderItems(orderId: string, requestId: string, itemIds: string[]) {
  const { data, error } = await supabase.rpc('send_order_items', { p_order_id: orderId, p_request_id: requestId, p_item_ids: itemIds });
  if (error) throw error;
  if (!data || typeof data.item_count !== 'number' || !Array.isArray(data.jobs)) throw new Error('Invalid dispatch response');
}

export async function markItemServed(tenantId: string, orderId: string, itemId: string) {
  const { error } = await supabase.from('order_items').update({ status: 'SERVED' }).eq('tenant_id', tenantId).eq('order_id', orderId).eq('id', itemId).eq('status', 'SENT').is('cancelled_at', null).select('id').single();
  if (error) throw error;
}
export interface NewOrderItem { orderId: string; productId: string; quantity: number; notes: string; modifierIds: string[]; itemId: string }
export async function addOrderItem(item: NewOrderItem) {
  const { error } = await supabase.rpc('add_order_item', { p_order_id: item.orderId, p_product_id: item.productId, p_quantity: item.quantity, p_notes: item.notes, p_modifier_ids: item.modifierIds, p_item_id: item.itemId });
  if (error) throw error;
}
export async function changeQuantity(tenantId: string, orderId: string, itemId: string, quantity: number) {
  const { error } = await supabase.from('order_items').update({ quantity }).eq('tenant_id', tenantId).eq('order_id', orderId).eq('id', itemId).eq('status', 'PENDING').is('cancelled_at', null).select('id').single();
  if (error) throw error;
}
export async function removePendingItem(tenantId: string, orderId: string, itemId: string) {
  const { error } = await supabase.from('order_items').delete().eq('tenant_id', tenantId).eq('order_id', orderId).eq('id', itemId).eq('status', 'PENDING').is('cancelled_at', null).select('id').single();
  if (error) throw error;
}
