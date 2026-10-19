export type Role = 'ADMIN' | 'WAITER' | 'CASHIER';
export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador', WAITER: 'Mesero', CASHIER: 'Cajero',
};

// These controls describe the interface. Supabase enforces authorization.
const permissions = {
  viewTables: ['ADMIN', 'WAITER', 'CASHIER'],
  createOrders: ['ADMIN', 'WAITER', 'CASHIER'],
  editOwnOrders: ['ADMIN', 'WAITER', 'CASHIER'],
  editOtherOrders: ['ADMIN', 'CASHIER'],
  requestBill: ['ADMIN', 'WAITER', 'CASHIER'],
  viewCatalog: ['ADMIN', 'WAITER', 'CASHIER'],
  manageCatalog: ['ADMIN'],
  manageTables: ['ADMIN'],
  changeAvailability: ['ADMIN', 'CASHIER'],
  collectPayments: ['ADMIN', 'CASHIER'],
  cancelOrders: ['ADMIN', 'CASHIER'],
  cancelSentItems: ['ADMIN', 'CASHIER'],
  viewSalesHistory: ['ADMIN', 'CASHIER'],
  refundPayments: ['ADMIN'],
  manageStaff: ['ADMIN'],
  manageRestaurant: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return role != null && (permissions[permission] as readonly string[]).includes(role);
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: Role;
}

export function isProfile(value: unknown, userId: string): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return row.id === userId && typeof row.tenant_id === 'string' && row.tenant_id.trim().length > 0
    && typeof row.full_name === 'string'
    && (row.role === 'ADMIN' || row.role === 'WAITER' || row.role === 'CASHIER');
}
