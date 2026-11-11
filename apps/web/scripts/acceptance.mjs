/**
 * Opt-in real Clerk development / Supabase / application acceptance test.
 * Run from apps/web with Node >=22:
 * TRDE_ACCEPTANCE_TESTS=1 TRDE_ACCEPTANCE_BASE_URL=http://localhost:8787 \
 *   node --env-file=.env.local scripts/acceptance.mjs
 * Creates only marked test users, never impersonates an existing user. Test
 * addresses suppress email delivery. Secrets and JWTs are never printed.
 * Set TRDE_ACCEPTANCE_KEEP_FIXTURES=1 to keep isolated accounts for browser QA;
 * their IDs/emails/session IDs are saved in a mode-0600 temporary state file.
 * Set TRDE_ACCEPTANCE_REUSE=1 to verify the same fixtures against another host.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const env = process.env;
if (env.TRDE_ACCEPTANCE_TESTS !== '1') throw new Error('Set TRDE_ACCEPTANCE_TESTS=1 to authorize isolated test fixtures.');
if (!env.CLERK_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Acceptance tests require a Clerk development key.');
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing backend configuration.');
const base = new URL(env.TRDE_ACCEPTANCE_BASE_URL ?? 'http://localhost:8787');
if (!['localhost', '127.0.0.1'].includes(base.hostname) && !base.hostname.endsWith('.workers.dev')) throw new Error('Use the authorized localhost or workers.dev app.');
const stateFile = env.TRDE_ACCEPTANCE_STATE_FILE ?? join(tmpdir(), 'trde-e2e-acceptance.json');
let state = { runId: randomUUID(), users: [] };
let stage = 'prepare';
let ownsStateFile = false;
const results = [];
function passed(name) { results.push(name); console.log(`PASS ${name}`); }
async function saveState(exclusive = false) { await writeFile(stateFile, JSON.stringify(state), { mode: 0o600, flag: exclusive ? 'wx' : 'w' }); }
async function clerk(path, method = 'GET', body) {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    method, headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok) {
    const codes = (payload.errors ?? []).map(error => `${error.code}:${error.meta?.param_name ?? error.meta?.param_names ?? ''}`).join(',');
    throw new Error(`Clerk status ${response.status} (${codes})`);
  }
  return payload;
}
async function db(table, method, body, query = '') {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    let code = '';
    try { code = (await response.json()).code ?? ''; } catch {}
    throw new Error(`Database ${table} status ${response.status} (${code})`);
  }
}
async function token(user) { return (await clerk(`/sessions/${user.sessionId}/tokens`, 'POST', {})).jwt; }
async function request(path, user, body, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (user) headers.Authorization = `Bearer ${await token(user)}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(new URL(path, base), { method: body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual' });
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  return { status: response.status, payload, headers: response.headers };
}
function expectStatus(result, expected) {
  if (result.status !== expected) throw new Error(`Application status ${result.status}; expected ${expected}`);
  return result.payload;
}
async function prepare() {
  if (env.TRDE_ACCEPTANCE_REUSE === '1') {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
    for (const user of state.users) {
      const actual = await clerk(`/users/${user.id}`);
      assert.equal(actual.private_metadata?.trdeAcceptanceRun, state.runId);
    }
    ownsStateFile = true;
    return;
  }
  // Preserve previous fixtures: explicitly reuse them or choose a different state file.
  await saveState(true);
  ownsStateFile = true;
  for (const suffix of ['a', 'b']) {
    const email = `trde-acceptance-${state.runId.slice(0, 12)}-${suffix}+clerk_test@example.com`;
    const user = await clerk('/users', 'POST', {
      email_address: [email], username: `trde_test_${state.runId.slice(0, 8)}_${suffix}`, first_name: 'TRDE Acceptance Test', last_name: suffix.toUpperCase(),
      skip_password_requirement: true, private_metadata: { trdeAcceptanceRun: state.runId },
    });
    const entry = { id: user.id, email, sessionId: null };
    state.users.push(entry);
    await saveState();
    const session = await clerk('/sessions', 'POST', { user_id: user.id });
    entry.sessionId = session.id;
    await saveState();
    await db('profiles', 'POST', { user_id: user.id, email, display_name: 'TRDE isolated acceptance test' }, 'on_conflict=user_id');
    await db('entitlements', 'POST', { user_id: user.id, plan: 'pro', status: 'comped', source: 'manual', override_enabled: false, current_period_end: new Date(Date.now() + 86400000).toISOString(), notes: `Temporary acceptance fixture ${state.runId}` }, 'on_conflict=user_id');
  }
}
async function cleanup() {
  for (const user of state.users) {
    const actual = await clerk(`/users/${user.id}`);
    if (actual.private_metadata?.trdeAcceptanceRun !== state.runId) throw new Error('Refusing cleanup of unmarked user');
    if (user.sessionId) await clerk(`/sessions/${user.sessionId}/revoke`, 'POST');
    for (const table of ['trade_journals', 'trades', 'todos', 'entitlements', 'profiles']) await db(table, 'DELETE', undefined, `user_id=eq.${encodeURIComponent(user.id)}`);
    await clerk(`/users/${user.id}`, 'DELETE');
  }
  await unlink(stateFile);
}
try {
  await prepare();
  passed('isolated Clerk test users and comped fixtures prepared');
  console.log(`Private fixture state: ${stateFile}`);
  if (env.TRDE_ACCEPTANCE_PREPARE_ONLY !== '1') {
    const [owner, other] = state.users;
    stage = 'signed-out authorization';
    expectStatus(await request('/api/data/trades'), 401);
    expectStatus(await request('/api/data/trades', null, undefined, { 'x-clerk-user-id': owner.id }), 401);
    expectStatus(await request('/api/data/trades', null, undefined, { Authorization: 'Bearer invalid-token' }), 401);
    passed('signed-out, invalid token, and forged identity rejected');
    stage = 'verified Clerk session';
    const access = expectStatus(await request('/api/auth/check-access', owner), 200);
    assert.equal(access.userId, owner.id); assert.equal(access.hasAccess, true); assert.equal(access.isAdmin, false);
    const entitlement = expectStatus(await request('/api/entitlements/current', owner, undefined, { Cookie: `admin_session_dev=admin_forged; admin_session=${owner.id}` }), 200);
    assert.equal(entitlement.isAdmin, false);
    expectStatus(await request('/api/admin/search', owner), 403);
    passed('real Clerk session accepted with Pro access; forged admin cookies cannot grant admin');
    stage = 'trade save/read/edit';
    const timestamp = Date.now();
    const shared = {
      createdAt: timestamp, updatedAt: timestamp, tradeDate: '2026-11-09', entryTime: timestamp, exitTime: timestamp + 60000,
      direction: 'LONG', quantity: 1, feesUsd: 0, plannedRiskUsd: 0, resultUsd: 0, resultR: 0, outcome: 'BREAKEVEN', grade: 'A+',
      strategyId: '', strategyVersionId: '', session: 'NEW_YORK', marketRegime: 'TREND_UP', marketHoursTag: 'RTH_OPEN',
      setupTags: ['ORB'], newsTags: ['NONE'], mistakes: [], notes: 'TRDE acceptance before edit', attachments: [{ id: 'test-image', type: 'image', uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', caption: 'Test fixture' }],
      reviewFlag: false, collections: [], managementStyle: 'INTRADAY',
      disciplineFlags: { respectedDailyLossLimit: true, respectedMaxTrades: true, respectedMaxContracts: true, hadStopDefined: true, followedEntryRules: true, followedExitRules: true, journalCompleted: false },
    };
    const futures = { ...shared, id: `acceptance-futures-${state.runId}`, assetClass: 'FUTURES', instrumentRoot: 'MNQ', contractSymbol: 'MNQZ6', entryPrice: 0, exitPrice: 0, tickSize: .25, tickValueUsd: .5, pointsPnL: 0, ticksPnL: 0, rthEth: 'RTH' };
    const options = { ...shared, id: `acceptance-options-${state.runId}`, assetClass: 'OPTIONS', underlying: 'SPY', expiration: '2026-11-09', dte: 0, strike: 0, optionType: 'PUT', entryPremium: 0, exitPremium: 0, netPremiumPnLUsd: 0, contractMultiplier: 100 };
    const edge = { ...futures, id: `acceptance-edge-${state.runId}`, grade: 'B-', marketRegime: 'RANGE', notes: '[EDGE Simulation] Acceptance test' };
    const trades = [futures, options, edge];
    expectStatus(await request('/api/data/trades', owner, { trades }), 200);
    let read = expectStatus(await request('/api/data/trades', owner), 200).trades;
    for (const trade of trades) assert.deepEqual(read.find(row => row.id === trade.id), trade);
    const edited = trades.map(trade => ({ ...trade, updatedAt: timestamp + 1, notes: `${trade.notes} — reviewed after refresh` }));
    expectStatus(await request('/api/data/trades', owner, { trades: edited }), 200);
    read = expectStatus(await request('/api/data/trades', owner), 200).trades;
    for (const trade of edited) assert.deepEqual(read.find(row => row.id === trade.id), trade);
    passed('futures, options, EDGE save/read/edit preserve zeros, attachments, grades and timestamps');
    stage = 'trade ownership and validation';
    expectStatus(await request('/api/data/trades', owner, { trades: [{ ...futures, quantity: 0 }] }), 400);
    expectStatus(await request('/api/data/trades', other, { trades: [{ ...futures, notes: 'Unauthorized overwrite' }] }), 409);
    const othersRead = expectStatus(await request('/api/data/trades', other, undefined, { 'x-clerk-user-id': owner.id }), 200).trades;
    assert.equal(othersRead.some(trade => trade.id === futures.id), false);
    expectStatus(await request('/api/data/trades', other, { trades: [], deletedIds: [futures.id] }), 200);
    assert.equal(expectStatus(await request('/api/data/trades', owner), 200).trades.find(trade => trade.id === futures.id).notes, edited[0].notes);
    passed('malformed trade rejected; cross-user read, edit, delete and header spoof cannot touch owner records');
    stage = 'journal save/read/edit';
    const journal = { tradeId: futures.id, preTrade: { thesis: 'Acceptance thesis', invalidation: 'Test invalidation', confidence: 3, mood: { label: 'calm', intensity: 3 }, checklist: { stopPlanned: true, sizeWithinRules: true, entryMatchesStrategy: true, newsChecked: true } }, postTrade: { whatWentWell: 'Fixture', whatToImprove: 'Fixture', executionNotes: 'Saved before refresh', emotion: { label: 'calm', intensity: 3 }, ruleBreakExplanation: '', attachments: [] } };
    expectStatus(await request('/api/data/journals', owner, { journals: [journal] }), 200);
    let journals = expectStatus(await request('/api/data/journals', owner), 200).journals;
    assert.deepEqual(journals.find(row => row.tradeId === futures.id), journal);
    journal.postTrade.executionNotes = 'Reviewed after refresh';
    expectStatus(await request('/api/data/journals', owner, { journals: [journal] }), 200);
    journals = expectStatus(await request('/api/data/journals', owner), 200).journals;
    assert.deepEqual(journals.find(row => row.tradeId === futures.id), journal);
    expectStatus(await request('/api/data/journals', other, { journals: [journal] }), 400);
    assert.equal(expectStatus(await request('/api/data/journals', other), 200).journals.length, 0);
    passed('journal save/read/edit persists and foreign trade references are rejected');
    stage = 'nontrade ownership';
    const todo = { id: `acceptance-todo-${state.runId}`, title: 'Acceptance test', category: 'OTHER', completed: false, createdAt: timestamp };
    expectStatus(await request('/api/data/todos', owner, { todos: [todo] }), 200);
    expectStatus(await request('/api/data/todos', other, { todos: [{ ...todo, title: 'Unauthorized overwrite' }] }), 409);
    passed('nontrade record ID takeover rejected');
    stage = 'migration ownership';
    const migrated = { ...futures, id: `acceptance-migrated-${state.runId}`, notes: 'Imported acceptance fixture' };
    expectStatus(await request('/api/data/migrate', owner, { data: { trades: [migrated] } }), 200);
    assert.deepEqual(expectStatus(await request('/api/data/trades', owner), 200).trades.find(row => row.id === migrated.id), migrated);
    expectStatus(await request('/api/data/migrate', other, { data: { trades: [{ ...migrated, notes: 'Unauthorized migration overwrite' }] } }), 409);
    passed('migration uses the validated trade contract and rejects cross-user IDs');
    stage = 'demo guard';
    await db('entitlements', 'PATCH', { status: 'demo' }, `user_id=eq.${encodeURIComponent(other.id)}`);
    expectStatus(await request('/api/data/trades', other, { trades: [{ ...futures, id: `acceptance-demo-${state.runId}` }] }), 403);
    await db('entitlements', 'PATCH', { status: 'comped' }, `user_id=eq.${encodeURIComponent(other.id)}`);
    passed('demo account cannot save trades');
    console.log(`ACCEPTANCE PASS: ${results.length} groups on ${base.origin}`);
  }
} catch (error) {
  console.error(`ACCEPTANCE FAIL at ${stage}: ${error instanceof assert.AssertionError ? 'response did not match expected data' : error.message}`);
  process.exitCode = 1;
} finally {
  if (ownsStateFile && env.TRDE_ACCEPTANCE_KEEP_FIXTURES !== '1' && env.TRDE_ACCEPTANCE_PREPARE_ONLY !== '1') {
    try { await cleanup(); console.log('Test fixtures removed'); } catch { console.error('Fixture cleanup incomplete; private state retained for follow-up'); process.exitCode = 1; }
  }
}
