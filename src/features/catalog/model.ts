export function validCatalogName(name: string) { return name.trim().length > 0 && name.trim().length <= 100; }
export function validCatalogPrice(price: number) { return Number.isSafeInteger(price) && price >= 0 && price <= 1_000_000_000; }
export function validCategoryOrder(order: number) { return Number.isSafeInteger(order) && order >= 0 && order <= 2_147_483_647; }
export function catalogError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'PGRST116') return 'El registro cambió o ya no está disponible. Actualiza la carta antes de volver a editarlo.';
  if (code === '42501') return 'Tu cuenta no tiene permiso para realizar este cambio.';
  if (code === '23503') return 'La categoría ya no está disponible. Actualiza la carta y vuelve a seleccionarla.';
  if (code === '23505') return 'Este registro ya existe con otros datos. Actualiza la carta antes de continuar.';
  return 'No pudimos confirmar el cambio. Puedes reintentar el mismo guardado o cerrar y actualizar la carta para verificarlo.';
}
