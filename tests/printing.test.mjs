import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/printing/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { printItems, printItemTotal } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const food = { id: 'food', destination: 'KITCHEN', quantity: 2, unit_price: 1000, extras: [{ name: 'Extra', extra_price: 200 }] };
const drink = { id: 'drink', destination: 'BAR', quantity: 1, unit_price: 500, extras: [] };
test('receipt scopes include all items or only matching kitchen/bar destinations', () => {
  const order = { items: [food, drink] };
  assert.deepEqual(printItems(order, 'ALL'), [food, drink]);
  assert.deepEqual(printItems(order, 'KITCHEN'), [food]);
  assert.deepEqual(printItems(order, 'BAR'), [drink]);
  assert.deepEqual(printItems({ items: [food] }, 'BAR'), []);
});
test('receipt totals multiply snapshot product and extras prices by quantity', () => {
  assert.equal(printItemTotal(food), 2400);
  assert.equal(printItemTotal(drink), 500);
});
