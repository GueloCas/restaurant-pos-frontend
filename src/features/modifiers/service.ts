import { supabase } from '../../lib/supabase';

export interface Group { id: string; name: string; min_selections: number; max_selections: number }
export interface Option { id: string; group_id: string; name: string; extra_price: number; is_available: boolean | null }
export async function fetchModifiers(tenantId: string, signal: AbortSignal) {
  const [groups, options, links] = await Promise.all([
    supabase.from('modifier_groups').select('id, name, min_selections, max_selections').eq('tenant_id', tenantId).order('name').abortSignal(signal),
    supabase.from('modifiers').select('id, group_id, name, extra_price, is_available').eq('tenant_id', tenantId).order('name').abortSignal(signal),
    supabase.from('product_modifier_groups').select('product_id, modifier_group_id, sort_order').eq('tenant_id', tenantId).order('sort_order').abortSignal(signal),
  ]);
  for (const result of [groups, options, links]) if (result.error) throw result.error;
  return { groups: (groups.data ?? []) as Group[], options: (options.data ?? []) as Option[], links: links.data ?? [] };
}

type Values = Record<string, string | number | boolean | null>;
async function saveRecord(table: 'modifier_groups' | 'modifiers', tenantId: string, id: string, input: Values, previous?: Values) {
  let result;
  if (previous) {
    let query = supabase.from(table).update(input).eq('tenant_id', tenantId).eq('id', id);
    for (const [key, value] of Object.entries(previous)) query = value === null ? query.is(key, null) : query.eq(key, value);
    result = await query.select('id').single();
  } else result = await supabase.from(table).insert({ ...input, id, tenant_id: tenantId }).select('id').single();
  if (!result.error) return;
  if (result.error.code === '23505' || result.error.code === 'PGRST116') {
    const check = await supabase.from(table).select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle();
    if (!check.error && check.data && Object.entries(input).every(([key, value]) => check.data[key] === value)) return;
  }
  throw result.error;
}
export function saveGroup(tenantId: string, id: string, input: { name: string; min_selections: number; max_selections: number }, previous?: Group) {
  return saveRecord('modifier_groups', tenantId, id, { ...input, name: input.name.trim() }, previous ? { name: previous.name, min_selections: previous.min_selections, max_selections: previous.max_selections } : undefined);
}
export function saveOption(tenantId: string, id: string, groupId: string, input: { name: string; extra_price: number; is_available: boolean }, previous?: Option) {
  return saveRecord('modifiers', tenantId, id, { ...input, name: input.name.trim(), group_id: groupId }, previous ? { name: previous.name, extra_price: previous.extra_price, is_available: previous.is_available, group_id: previous.group_id } : undefined);
}
export function toggleOption(tenantId: string, option: Option) {
  return saveRecord('modifiers', tenantId, option.id, { is_available: option.is_available !== true }, { is_available: option.is_available });
}
export async function assignGroups(productId: string, groupIds: string[], previous: string[]) {
  const { error } = await supabase.rpc('set_product_modifier_groups', { p_product_id: productId, p_group_ids: groupIds, p_expected_group_ids: previous });
  if (error) throw error;
}
