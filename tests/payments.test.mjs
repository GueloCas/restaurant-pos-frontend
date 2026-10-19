import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/payments/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { validPesos, paymentError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('CLP validation accepts zero and whole amounts, rejects fractions and invalid values', () => {
  for (const value of [0, 100, 1000000000000]) assert.equal(validPesos(value), true);
  for (const value of [-1, 0.5, NaN, Infinity, -Infinity, 1000000000001]) assert.equal(validPesos(value), false);
});
test('payment errors give actionable messages for stale balances and unsent items', () => {
  assert.match(paymentError({ message: 'ORDER_CHANGED' }), /Actualiza la mesa/);
  assert.match(paymentError({ message: 'UNSENT_ITEMS' }), /Envía las comandas/);
  assert.match(paymentError({ message: 'INSUFFICIENT_CASH' }), /no alcanza/);
  assert.match(paymentError({ message: 'ORDER_NOT_OPEN' }), /ya no está abierto/);
});
test('unknown errors do not reveal database messages or promise an unconfirmed payment', () => {
  const message = paymentError({ message: 'private database exception' });
  assert.equal(message.includes('private database'), false);
  assert.match(message, /No pudimos confirmar/);
  assert.equal(paymentError(null), message);
});
