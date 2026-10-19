import { supabase } from '../../lib/supabase';

export interface Sale {
  id: string; order_id: string; amount: number; payment_method: string;
  status: string; created_at: string; table_number: string | null; zone: string | null;
}
export interface SalesHistory { count: number; collected: number; tips: number; refunded: number; rows: Sale[] }
export interface SaleDetail {
  refunds: { payment_id: string; reason: string; created_at: string }[];
  id: string; status: string; subtotal: number; tip: number; total: number;
  items: { id: string; name: string; quantity: number; unit_price: number; notes: string | null; cancelled_at: string | null; extras: { name: string; extra_price: number }[] }[];
  payments: { id: string; amount: number; method: string; status: string; created_at: string; cash_received: number | null; change: number | null }[];
}
export async function fetchSales(from: string, to: string, page: number, signal: AbortSignal): Promise<SalesHistory> {
  const { data, error } = await supabase.rpc('sales_history', { p_from: from, p_to: to, p_page: page }).abortSignal(signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.rows)) throw new Error('Invalid sales response');
  return data;
}
export async function fetchSaleDetail(orderId: string, signal: AbortSignal): Promise<SaleDetail> {
  const { data, error } = await supabase.rpc('sale_order_detail', { p_order_id: orderId }).abortSignal(signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.payments)) throw new Error('Invalid sale detail');
  const paymentIds = (data as SaleDetail).payments.map(payment => payment.id);
  const refunds = paymentIds.length ? await supabase.from('payment_refunds').select('payment_id,reason,created_at').in('payment_id', paymentIds).abortSignal(signal) : { data: [], error: null };
  if (refunds.error) throw refunds.error;
  return { ...data, refunds: refunds.data ?? [] };
}

export async function refundPayment(paymentId: string, reason: string) {
  const { data, error } = await supabase.rpc('refund_payment', { p_payment_id: paymentId, p_reason: reason.trim() });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Invalid refund response');
}
