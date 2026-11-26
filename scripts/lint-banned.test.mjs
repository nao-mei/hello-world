// Proves the lint blocks a term. Uses a throwaway dummy term only; no real terms ever appear here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./lint-banned.mjs', import.meta.url));
const DUMMY = 'zzdummybannedtermzz';

function run(args, env) {
  return spawnSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  });
}

test('blocks a banned term and does not echo it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  writeFileSync(join(dir, 'a.html'), `<p>hello ${DUMMY} world</p>`);
  const r = run(['--dir', dir], { BANNED_TERMS: DUMMY });
  assert.equal(r.status, 1);
  assert.ok(!r.stderr.includes(DUMMY));
});

test('catches light obfuscation and filenames', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  writeFileSync(join(dir, 'z.z.dummy.txt'), 'zz-dummy bannedterm zz');
  const r = run(['--dir', dir], { BANNED_TERMS: DUMMY });
  assert.equal(r.status, 1);
});

test('passes clean content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  writeFileSync(join(dir, 'a.txt'), 'nothing to see');
  assert.equal(run(['--dir', dir], { BANNED_TERMS: DUMMY }).status, 0);
});

test('fails closed with no source', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  assert.equal(run(['--dir', dir], {}).status, 2);
});
