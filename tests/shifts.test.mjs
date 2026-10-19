import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/shifts/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { shiftError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('shift messages explain open orders, stale cash, missing shift and discrepancies', () => {
  assert.match(shiftError({ message: 'NO_OPEN_CASH_SHIFT' }), /Abre un turno/);
  assert.match(shiftError({ message: 'OPEN_ORDERS_PREVENT_CLOSE' }), /pedidos abiertos/);
  assert.match(shiftError({ message: 'CASH_SHIFT_CHANGED' }), /movimientos cambiaron/);
  assert.match(shiftError({ message: 'SHIFT_DIFFERENCE_REASON' }), /diferencia/);
});
test('shift failures do not reveal internal errors or promise unconfirmed closure', () => {
  assert.match(shiftError(new Error('internal database failure')), /No pudimos confirmar/);
  assert.doesNotMatch(shiftError(null), /internal|database/);
});
test('cash movements distinguish insufficient balance, invalid input and duplicate request conflict', () => {
  assert.match(shiftError({ message: 'INSUFFICIENT_SHIFT_CASH' }), /supera el efectivo/);
  assert.match(shiftError({ message: 'INVALID_CASH_MOVEMENT' }), /importe positivo/);
  assert.match(shiftError({ message: 'MOVEMENT_REQUEST_CONFLICT' }), /movimiento distinto/);
});
