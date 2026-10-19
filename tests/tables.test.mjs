import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/tables/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { validTableFields, tableError, tableState } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('table identifiers and zones require bounded nonempty names', () => {
  assert.equal(validTableFields('  T1  ', 'Terraza'), true);
  assert.equal(validTableFields('x'.repeat(20), 'x'.repeat(60)), true);
  for (const [number, zone] of [['', 'Salón'], ['  ', 'Salón'], ['1', ' '], ['x'.repeat(21), 'Salón'], ['1', 'x'.repeat(61)]]) assert.equal(validTableFields(number, zone), false);
});
test('table errors explain active service, duplicate identifiers and stale edits', () => {
  assert.match(tableError({ message: 'TABLE_IN_USE' }), /mesa está en uso/);
  assert.match(tableError({ code: '23505' }), /Ya existe una mesa/);
  assert.match(tableError({ message: 'TABLE_CHANGED' }), /mesa cambió/);
  assert.match(tableError({ code: '42501' }), /no tiene permiso/);
});
test('table status labels handle unexpected values safely', () => {
  assert.equal(tableState('AVAILABLE').label, 'Disponible');
  assert.equal(tableState('BILL_REQUESTED').label, 'Cuenta solicitada');
  assert.equal(tableState('UNKNOWN').label, 'Estado no reconocido');
});
