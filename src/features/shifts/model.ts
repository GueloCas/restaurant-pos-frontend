export function shiftError(error: unknown) {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  if (message.includes('INSUFFICIENT_SHIFT_CASH')) return 'El retiro supera el efectivo esperado disponible. Actualiza la caja y revisa el importe.';
  if (message.includes('INVALID_CASH_MOVEMENT')) return 'Ingresa un importe positivo en pesos enteros y un motivo de entre 3 y 500 caracteres.';
  if (message.includes('MOVEMENT_REQUEST_CONFLICT')) return 'Este intento ya tiene un movimiento distinto. Actualiza la caja antes de continuar.';
  if (message.includes('NO_OPEN_CASH_SHIFT')) return 'Abre un turno en Caja antes de registrar cobros o devoluciones.';
  if (message.includes('CASH_SHIFT_ALREADY_OPEN')) return 'Ya hay un turno abierto. Actualiza la caja para trabajar en el turno compartido.';
  if (message.includes('OPEN_ORDERS_PREVENT_CLOSE')) return 'Hay pedidos abiertos. Debes finalizarlos antes de cerrar el turno.';
  if (message.includes('CASH_SHIFT_CHANGED')) return 'Los movimientos cambiaron. Cierra esta ventana y actualiza la caja antes de revisar el cierre.';
  if (message.includes('CASH_SHIFT_CLOSED')) return 'El turno ya fue cerrado. Actualiza la caja para revisar el cierre.';
  if (message.includes('SHIFT_DIFFERENCE_REASON')) return 'Explica la diferencia de efectivo en las observaciones.';
  if (message.includes('INVALID_SHIFT_CASH')) return 'Ingresa un importe válido en pesos enteros y observaciones de hasta 500 caracteres.';
  if (message.includes('SHIFT_FORBIDDEN')) return 'Tu cuenta no tiene acceso a este turno.';
  return 'No pudimos confirmar la operación. Puedes reintentar con los mismos datos o actualizar la caja para comprobar su estado.';
}
