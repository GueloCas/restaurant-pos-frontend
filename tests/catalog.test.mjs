import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/catalog/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { validCatalogName, validCatalogPrice, validCategoryOrder, catalogError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('catalog names reject whitespace and excessive length', () => {
  assert.equal(validCatalogName('  Café  '), true);
  assert.equal(validCatalogName(''), false);
  assert.equal(validCatalogName('   '), false);
  assert.equal(validCatalogName('x'.repeat(100)), true);
  assert.equal(validCatalogName('x'.repeat(101)), false);
});
test('catalog prices accept whole CLP amounts within range', () => {
  for (const value of [0, 2500, 1_000_000_000]) assert.equal(validCatalogPrice(value), true);
  for (const value of [-1, 0.5, NaN, Infinity, 1_000_000_001]) assert.equal(validCatalogPrice(value), false);
});
test('category sort order fits a nonnegative Postgres integer', () => {
  assert.equal(validCategoryOrder(0), true);
  assert.equal(validCategoryOrder(2_147_483_647), true);
  for (const value of [-1, 1.5, Infinity, 2_147_483_648]) assert.equal(validCategoryOrder(value), false);
});
test('catalog errors distinguish concurrent edits from denied access', () => {
  assert.match(catalogError({ code: 'PGRST116' }), /registro cambió/);
  assert.match(catalogError({ code: '42501' }), /no tiene permiso/);
  assert.match(catalogError({ code: '23503' }), /categoría/);
  assert.equal(catalogError({ message: 'private exception' }).includes('private exception'), false);
});
