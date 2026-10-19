import { supabase } from '../../lib/supabase';

export interface DiningTable {
  id: string;
  tenant_id: string;
  table_number: string;
  zone: string;
  status: string;
}
export interface ActiveOrder {
  id: string;
  waiter_id: string | null;
  subtotal: number;
  total_amount: number;
  tip_amount: number;
  created_at: string | null;
}
export async function fetchTables(tenantId: string, signal: AbortSignal): Promise<DiningTable[]> {
  const { data, error } = await supabase.from('dining_tables').select('id, tenant_id, table_number, zone, status').eq('tenant_id', tenantId).order('zone').order('table_number').abortSignal(signal);
  if (error) throw error;
  return (data ?? []).sort((a, b) => a.zone.localeCompare(b.zone, 'es') || a.table_number.localeCompare(b.table_number, 'es', { numeric: true }));
}
export async function fetchTableDetail(tenantId: string, tableId: string, signal: AbortSignal): Promise<{ table: DiningTable | null; order: ActiveOrder | null }> {
  const [table, order] = await Promise.all([
    supabase.from('dining_tables').select('id, tenant_id, table_number, zone, status').eq('tenant_id', tenantId).eq('id', tableId).abortSignal(signal).maybeSingle(),
    supabase.from('orders').select('id, waiter_id, subtotal, total_amount, tip_amount, created_at').eq('tenant_id', tenantId).eq('table_id', tableId).eq('status', 'OPEN').abortSignal(signal).maybeSingle(),
  ]);
  if (table.error) throw table.error;
  if (order.error) throw order.error;
  return { table: table.data, order: order.data };
}

export async function saveDiningTable(id: string, tableNumber: string, zone: string, previous?: DiningTable) {
  const { error } = await supabase.rpc('save_dining_table', { p_table_id: id, p_table_number: tableNumber.trim(), p_zone: zone.trim(), p_expected_number: previous?.table_number ?? null, p_expected_zone: previous?.zone ?? null });
  if (error) throw error;
}
export async function reconcileDiningTable(tableId: string): Promise<string> {
  const { data, error } = await supabase.rpc('reconcile_dining_table', { p_table_id: tableId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Invalid table state');
  return data;
}
