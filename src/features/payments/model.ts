export function paymentError(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  if (message.includes('NO_OPEN_CASH_SHIFT')) return 'Abre un turno en Caja antes de registrar el cobro.';
  if (message.includes('ORDER_CHANGED')) return 'El pedido o los pagos cambiaron. Actualiza la mesa y revisa el importe antes de cobrar.';
  if (message.includes('UNSENT_ITEMS')) return 'Hay productos pendientes de enviar. Envía las comandas antes de solicitar la cuenta o cobrar.';
  if (message.includes('INSUFFICIENT_CASH')) return 'El efectivo recibido no alcanza para cubrir el saldo.';
  if (message.includes('EMPTY_ORDER')) return 'El pedido no tiene productos para cobrar.';
  if (message.includes('ORDER_NOT_OPEN')) return 'Este pedido ya no está abierto. Actualiza la mesa para revisar su estado.';
  if (message.includes('REQUEST_CONFLICT')) return 'Este intento ya tiene un registro distinto. Actualiza la mesa antes de continuar.';
  return 'No pudimos confirmar la operación. Actualiza la mesa para revisar su estado. Puedes reintentar el mismo cobro sin duplicarlo.';
}
export function validPesos(value: number) { return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000_000; }
