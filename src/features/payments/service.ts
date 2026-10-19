import { supabase } from '../../lib/supabase';

export const methods = { CASH: 'Efectivo', DEBIT: 'Débito', CREDIT: 'Crédito', TRANSFER: 'Transferencia' };
export type PaymentMethod = keyof typeof methods;
export interface Settlement { payment_id: string; amount: number; change: number; order_id: string; status: string }
export async function requestBill(orderId: string) {
  const { error } = await supabase.rpc('request_order_bill', { p_order_id: orderId });
  if (error) throw error;
}
export async function fetchPaymentContext(tenantId: string, orderId: string, signal: AbortSignal) {
  const [payments, pending, shift] = await Promise.all([
    supabase.from('payments').select('id, amount, status').eq('tenant_id', tenantId).eq('order_id', orderId).abortSignal(signal),
    supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('order_id', orderId).eq('status', 'PENDING').is('cancelled_at', null).abortSignal(signal),
    supabase.from('cash_shifts').select('id').eq('tenant_id', tenantId).eq('status', 'OPEN').abortSignal(signal).maybeSingle(),
  ]);
  if (payments.error) throw payments.error;
  if (pending.error) throw pending.error;
  if (shift.error) throw shift.error;
  return { paid: (payments.data ?? []).filter(payment => payment.status === 'COMPLETED').reduce((sum, payment) => sum + payment.amount, 0), pending: pending.count ?? 0, hasOpenShift: shift.data !== null };
}
export async function settleOrder(input: { orderId: string; paymentId: string; method: PaymentMethod; tip: number; cashReceived: number | null; expectedSubtotal: number; expectedPaid: number }): Promise<Settlement> {
  const { data, error } = await supabase.rpc('settle_order', { p_order_id: input.orderId, p_payment_id: input.paymentId, p_method: input.method, p_tip: input.tip, p_cash_received: input.cashReceived, p_expected_subtotal: input.expectedSubtotal, p_expected_paid: input.expectedPaid });
  if (error) throw error;
  if (!data || data.status !== 'CLOSED' || typeof data.amount !== 'number' || typeof data.change !== 'number') throw new Error('Invalid settlement response');
  return data;
}
export async function fetchCashier(tenantId: string, signal: AbortSignal) {
  const [orders, tables, payments] = await Promise.all([
    supabase.from('orders').select('id, table_id, subtotal, total_amount, created_at').eq('tenant_id', tenantId).eq('status', 'OPEN').order('created_at').abortSignal(signal),
    supabase.from('dining_tables').select('id, table_number, zone, status').eq('tenant_id', tenantId).abortSignal(signal),
    supabase.from('payments').select('id, order_id, amount, payment_method, status, created_at, change_amount').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20).abortSignal(signal),
  ]);
  for (const result of [orders, tables, payments]) if (result.error) throw result.error;
  return { orders: orders.data ?? [], tables: tables.data ?? [], payments: payments.data ?? [] };
}
