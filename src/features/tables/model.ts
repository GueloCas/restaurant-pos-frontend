export const tableStates = {
  AVAILABLE: { label: 'Disponible', color: 'bg-primary-soft text-primary' },
  OCCUPIED: { label: 'Ocupada', color: 'bg-info-soft text-info' },
  BILL_REQUESTED: { label: 'Cuenta solicitada', color: 'bg-warning-soft text-warning' },
};
export function tableState(status: string) {
  return tableStates[status as keyof typeof tableStates] ?? { label: 'Estado no reconocido', color: 'bg-background text-muted' };
}

export function validTableFields(number: string, zone: string) {
  return number.trim().length >= 1 && number.trim().length <= 20 && zone.trim().length >= 1 && zone.trim().length <= 60;
}
export function tableError(error: unknown) {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const message = String(row.message ?? '');
  if (message.includes('TABLE_IN_USE')) return 'La mesa está en uso. Finaliza el servicio o revisa su estado antes de cambiar el número o la zona.';
  if (message.includes('TABLE_CHANGED')) return 'La mesa cambió desde que abriste el formulario. Cierra la ventana y actualiza las mesas antes de editar nuevamente.';
  if (row.code === '23505') return 'Ya existe una mesa con ese número en tu restaurante.';
  if (row.code === '42501') return 'Tu cuenta no tiene permiso para administrar esta mesa.';
  if (message.includes('INVALID_TABLE')) return 'Revisa el número de mesa y el nombre de la zona.';
  return 'No pudimos confirmar el cambio. Puedes reintentar el mismo guardado o actualizar las mesas para verificarlo.';
}
