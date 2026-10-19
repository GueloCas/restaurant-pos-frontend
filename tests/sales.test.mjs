import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/sales/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { chileToday, validSalesRange } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('sales dates follow Chile day rather than browser or UTC day', () => {
  assert.equal(chileToday(new Date('2026-10-19T02:30:00Z')), '2026-10-18');
  assert.equal(chileToday(new Date('2026-06-19T03:30:00Z')), '2026-06-18');
});
test('sales ranges validate calendar dates, ordering and maximum duration', () => {
  assert.equal(validSalesRange('2026-10-19', '2026-10-19'), true);
  assert.equal(validSalesRange('2024-02-29', '2024-03-01'), true);
  for (const [from, to] of [['', '2026-10-19'], ['2026-02-30', '2026-03-01'], ['2026-10-19', '2026-10-18'], ['2024-01-01', '2026-01-01']]) assert.equal(validSalesRange(from, to), false);
});
