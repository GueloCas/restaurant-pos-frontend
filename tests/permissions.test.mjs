import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/permissions.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { hasPermission, isProfile } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('waiter works with own orders but cannot supervise, charge or manage', () => {
  for (const permission of ['viewTables', 'createOrders', 'editOwnOrders', 'requestBill', 'viewCatalog']) assert.equal(hasPermission('WAITER', permission), true);
  for (const permission of ['editOtherOrders', 'collectPayments', 'cancelOrders', 'cancelSentItems', 'changeAvailability', 'viewSalesHistory', 'manageCatalog', 'manageTables', 'manageStaff', 'manageRestaurant', 'refundPayments']) assert.equal(hasPermission('WAITER', permission), false);
});
test('cashier supervises operation without administrator privileges', () => {
  for (const permission of ['createOrders', 'editOtherOrders', 'collectPayments', 'cancelOrders', 'cancelSentItems', 'changeAvailability', 'viewSalesHistory']) assert.equal(hasPermission('CASHIER', permission), true);
  for (const permission of ['manageCatalog', 'manageTables', 'manageStaff', 'manageRestaurant', 'refundPayments']) assert.equal(hasPermission('CASHIER', permission), false);
});
test('administrator can manage restricted operations', () => {
  for (const permission of ['manageCatalog', 'manageTables', 'manageStaff', 'manageRestaurant', 'refundPayments', 'editOtherOrders', 'collectPayments']) assert.equal(hasPermission('ADMIN', permission), true);
});
test('missing and unknown roles deny access', () => {
  for (const role of [null, undefined, 'OWNER', 'admin', '']) assert.equal(hasPermission(role, 'collectPayments'), false);
});
test('profile validation rejects another identity, missing tenant and unknown role', () => {
  const profile = { id: 'user-1', tenant_id: 'tenant-1', full_name: 'Test', role: 'WAITER' };
  assert.equal(isProfile(profile, 'user-1'), true);
  assert.equal(isProfile(profile, 'user-2'), false);
  for (const value of [null, {}, { ...profile, tenant_id: '' }, { ...profile, tenant_id: '  ' }, { ...profile, role: 'OWNER' }, { ...profile, full_name: null }]) assert.equal(isProfile(value, 'user-1'), false);
});
