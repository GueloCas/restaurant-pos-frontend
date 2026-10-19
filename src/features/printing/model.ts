export type PrintScope = 'ALL' | 'KITCHEN' | 'BAR';
export const printLabels: Record<PrintScope, string> = { ALL: 'Pedido completo', KITCHEN: 'Cocina', BAR: 'Barra' };
export interface PrintItem {
  id: string; name: string; destination: string | null; quantity: number; unit_price: number;
  notes: string | null; status: string; extras: { name: string; extra_price: number }[];
}
export interface PrintableOrder {
  id: string; status: string; created_at: string | null; subtotal: number; tip: number; total: number;
  table_number: string; zone: string; items: PrintItem[];
}
export function printItems(order: PrintableOrder, scope: PrintScope) {
  return order.items.filter(item => scope === 'ALL' || item.destination === scope);
}
export function printItemTotal(item: PrintItem) {
  return item.quantity * (item.unit_price + item.extras.reduce((sum, extra) => sum + extra.extra_price, 0));
}
