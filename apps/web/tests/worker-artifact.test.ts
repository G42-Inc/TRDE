import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareWorker } from '../scripts/prepare-worker.mjs';

test('Worker artifacts retain public config and reject embedded private values anywhere', async () => {
  const root = mkdtempSync(join(tmpdir(), 'trde-worker-guard-'));
  try {
    const output = join(root, 'output');
    mkdirSync(join(output, 'cloudflare'), { recursive: true });
    const fixtureSecret = 'private_unit_test_secret_123';
    const config = { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: fixtureSecret };
    writeFileSync(join(root, '.env.local'), `SUPABASE_SERVICE_ROLE_KEY=${fixtureSecret}\n`);
    writeFileSync(join(output, 'cloudflare/next-env.mjs'), ['production', 'development', 'test'].map(mode => `export const ${mode} = ${JSON.stringify(config)};`).join('\n'));
    await prepareWorker(output, [root]);
    const cleaned = readFileSync(join(output, 'cloudflare/next-env.mjs'), 'utf8');
    assert.ok(cleaned.includes('https://fixture.supabase.co'));
    assert.ok(!cleaned.includes(fixtureSecret));
    assert.ok(!cleaned.includes('SUPABASE_SERVICE_ROLE_KEY'));

    writeFileSync(join(output, 'handler.mjs'), `export const accidental = ${JSON.stringify(fixtureSecret)};`);
    await assert.rejects(prepareWorker(output, [root]), (error: Error) => {
      assert.ok(error.message.includes('deployment blocked'));
      assert.ok(!error.message.includes(fixtureSecret));
      return true;
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
