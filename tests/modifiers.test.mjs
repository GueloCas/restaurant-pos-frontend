import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/modifiers/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { validSelectionLimits, modifierError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('selection limits support optional and required groups', () => {
  assert.equal(validSelectionLimits(0, 1), true);
  assert.equal(validSelectionLimits(1, 1), true);
  assert.equal(validSelectionLimits(2, 3), true);
  assert.equal(validSelectionLimits(0, 99), true);
});
test('selection limits reject impossible, fractional and excessive counts', () => {
  for (const [min, max] of [[-1, 1], [2, 1], [0, 0], [0.5, 1], [0, 1.5], [0, 100], [NaN, 1], [0, Infinity]]) assert.equal(validSelectionLimits(min, max), false);
});
test('modifier messages distinguish stale configuration and insufficient options', () => {
  assert.match(modifierError({ message: 'CATALOG_CHANGED' }), /configuración cambió/);
  assert.match(modifierError({ message: 'INSUFFICIENT_OPTIONS' }), /opciones disponibles/);
  assert.match(modifierError({ code: '42501' }), /rol/);
  assert.equal(modifierError({ message: 'private database error' }).includes('private database'), false);
});
