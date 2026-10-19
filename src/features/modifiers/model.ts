export function validSelectionLimits(min: number, max: number) {
  return Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= 1 && min <= max && max <= 99;
}
export function modifierError(error: unknown) {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  if (String(row.message).includes('CATALOG_CHANGED') || row.code === 'PGRST116') return 'La configuración cambió. Cierra esta ventana y actualiza las opciones antes de editar nuevamente.';
  if (String(row.message).includes('INSUFFICIENT_OPTIONS')) return 'Un grupo obligatorio no tiene suficientes opciones disponibles. Agrega o habilita sus opciones antes de asignarlo.';
  if (row.code === '42501') return 'Tu rol no permite cambiar esta configuración.';
  if (row.code === '23514') return 'Revisa los límites de selección y los precios adicionales.';
  return 'No pudimos confirmar el cambio. Reintenta el mismo guardado o actualiza la vista para verificar el resultado.';
}
