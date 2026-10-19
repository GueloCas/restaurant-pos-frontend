import { supabase } from '../../lib/supabase';
export interface ShiftTotals {
  cash_in?: number; cash_out?: number; movement_count?: number;
  expected_cash: number; collected: number; refunded: number; tips: number; refunded_tips: number;
  methods: { method: string; collected: number; refunded: number; tips: number; refunded_tips: number; payments: number }[];
}
export interface CashMovement { id: string; kind: 'IN' | 'OUT'; amount: number; reason: string; recorded_by_name: string; created_at: string }
export async function fetchMovements(tenantId: string, shiftId: string, page: number, signal: AbortSignal) {
  const { data, count, error } = await supabase.from('cash_movements').select('id,kind,amount,reason,recorded_by_name,created_at', { count: 'exact' }).eq('tenant_id', tenantId).eq('cash_shift_id', shiftId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19).abortSignal(signal);
  if (error) throw error;
  return { rows: (data ?? []) as CashMovement[], count: count ?? 0 };
}
export async function recordMovement(input: { id: string; shiftId: string; kind: 'IN' | 'OUT'; amount: number; reason: string; expected: number }) {
  const { data, error } = await supabase.rpc('record_cash_movement', { p_id: input.id, p_shift_id: input.shiftId, p_kind: input.kind, p_amount: input.amount, p_reason: input.reason.trim(), p_expected: input.expected });
  if (error) throw error;
  if (data !== input.id) throw new Error('Invalid movement response');
}
export interface CashShift {
  id: string; status: string; opening_cash: number; opened_by_name: string; created_at: string;
  closed_by_name: string | null; closed_at: string | null; counted_cash: number | null;
  expected_cash: number | null; difference: number | null; notes: string | null; closing_totals: ShiftTotals | null;
}
export interface ShiftState { active: (CashShift & { totals: ShiftTotals }) | null; open_orders: number; history: CashShift[] }
export async function fetchShifts(signal: AbortSignal): Promise<ShiftState> {
  const { data, error } = await supabase.rpc('cash_shift_state').abortSignal(signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.history)) throw new Error('Invalid cash shift response');
  return data;
}
export async function openShift(id: string, cash: number) {
  const { data, error } = await supabase.rpc('open_cash_shift', { p_id: id, p_cash: cash });
  if (error) throw error;
  if (data !== id) throw new Error('Invalid cash shift response');
}
export async function closeShift(id: string, counted: number, expected: number, notes: string) {
  const { data, error } = await supabase.rpc('close_cash_shift', { p_id: id, p_counted: counted, p_expected: expected, p_notes: notes.trim() });
  if (error) throw error;
  if (data !== id) throw new Error('Invalid cash shift response');
}
