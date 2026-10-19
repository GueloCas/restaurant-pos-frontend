import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/invite-employee/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/, '')
  .replace('export async function handleInvite', 'async function handleInvite')
  .replace('Deno.serve(handleInvite);', '');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });

function handler({ authenticated = true, role = 'ADMIN', inviteError = null, profileError = null } = {}) {
  const calls = [];
  const admin = {
    auth: {
      getUser: async () => ({ data: { user: authenticated ? { id: 'actor' } : null }, error: null }),
      admin: { inviteUserByEmail: async (...args) => { calls.push(['invite', ...args]); return { data: { user: { id: 'new-user' } }, error: inviteError }; } },
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role, tenant_id: 'server-tenant' }, error: null }) }) }),
      insert: async row => { calls.push(['profile', row]); return { error: profileError }; },
    }),
  };
  const run = new Function('createClient', 'Deno', outputText + ';return handleInvite;')(
    () => admin, { env: { get: key => key === 'APP_ORIGIN' ? 'https://pos.example' : 'test' } },
  );
  return { run, calls };
}
const request = body => new Request('https://edge.example', { method: 'POST', headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const valid = { email: 'person@example.com', name: 'Empleado', role: 'WAITER', tenant_id: 'attacker-tenant', redirectTo: 'https://attacker.example' };

test('invitation denies unauthenticated users and non-admin staff before sending', async () => {
  for (const options of [{ authenticated: false }, { role: 'WAITER' }, { role: 'CASHIER' }]) {
    const { run, calls } = handler(options);
    assert.ok([401, 403].includes((await run(request(valid))).status));
    assert.equal(calls.length, 0);
  }
});
test('invitation validates input before sending', async () => {
  for (const body of [{ ...valid, email: 'bad' }, { ...valid, name: ' ' }, { ...valid, role: 'OWNER' }]) {
    const { run, calls } = handler();
    assert.equal((await run(request(body))).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('tenant and invitation destination come from the server; profile uses insert only', async () => {
  const { run, calls } = handler();
  assert.equal((await run(request(valid))).status, 200);
  assert.equal(calls[0][2].redirectTo, 'https://pos.example/aceptar-invitacion');
  assert.equal(calls[1][1].tenant_id, 'server-tenant');
  assert.equal(calls[1][1].id, 'new-user');
});
test('failed mail never creates a profile and profile errors never report success', async () => {
  const mail = handler({ inviteError: new Error('Mail failure') });
  assert.equal((await mail.run(request(valid))).status, 409);
  assert.equal(mail.calls.length, 1);
  const profile = handler({ profileError: new Error('Conflict') });
  const response = await profile.run(request(valid));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).code, 'PROFILE_NOT_CONFIRMED');
});
