import { supabase } from '../../lib/supabase';
import type { PrintableOrder } from './model';
export async function fetchPrintableOrder(orderId: string, signal: AbortSignal): Promise<PrintableOrder> {
  const { data, error } = await supabase.rpc('order_print_data', { p_order_id: orderId }).abortSignal(signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.items)) throw new Error('Invalid printable order');
  return data;
}
