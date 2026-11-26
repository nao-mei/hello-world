#!/usr/bin/env node
// Banned-terms lint. The list is NEVER stored in this repo.
// Sources (first found wins): BANNED_TERMS_FILE (path) or BANNED_TERMS (newline-separated, e.g. CI secret).
// Modes: default = tracked + untracked files; --staged = staged blobs; --dir <path> = scan a directory (e.g. dist);
//        --message <file> = scan a commit message file.
// Output never prints the matched term, only file:line and the term's index.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function loadTerms() {
  const file = process.env.BANNED_TERMS_FILE;
  let raw;
  if (file) {
    if (!existsSync(file)) fail(`BANNED_TERMS_FILE is set but the file does not exist.`);
    raw = readFileSync(file, 'utf8');
  } else if (process.env.BANNED_TERMS) {
    raw = process.env.BANNED_TERMS;
  } else {
    fail('No banned-terms source found (set BANNED_TERMS_FILE or BANNED_TERMS). Failing closed.');
  }
  const terms = raw.split(/\r?\n/).map((t) => t.trim()).filter((t) => t && !t.startsWith('#'));
  if (terms.length === 0) fail('Banned-terms source is empty. Failing closed.');
  return terms;
}

function fail(msg) {
  console.error(`lint-banned: ${msg}`);
  process.exit(2);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Case-insensitive, word-bounded; tolerates separators between characters (e.g. "a.c m-e") as light obfuscation.
function toRegex(term) {
  const chars = [...term.replace(/[\s._-]+/g, '')].map(escape);
  return new RegExp(`(?<![\\p{L}\\p{N}])${chars.join('[\\s._\\-]*')}(?![\\p{L}\\p{N}])`, 'iu');
}

const terms = loadTerms();
const patterns = terms.map(toRegex);
let hits = 0;

function scanText(label, text) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    patterns.forEach((re, idx) => {
      if (re.test(line)) {
        hits++;
        console.error(`BANNED  ${label}:${i + 1}  (term #${idx + 1})`);
      }
    });
  });
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

function scanFile(path, buf) {
  scanText(`[name] ${path}`, path); // filenames count too
  if (!isBinary(buf)) scanText(path, buf.toString('utf8'));
}

const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 28 });

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (value('--message')) {
  scanText('commit-message', readFileSync(value('--message'), 'utf8'));
} else if (value('--dir')) {
  const dir = value('--dir');
  if (!existsSync(dir)) fail(`Directory not found: ${dir}`);
  for (const p of walk(dir)) scanFile(p, readFileSync(p));
} else if (flag('--staged')) {
  const files = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').toString().split('\0').filter(Boolean);
  for (const f of files) scanFile(f, git('show', `:${f}`));
} else {
  const files = git('ls-files', '-co', '--exclude-standard', '-z').toString().split('\0').filter(Boolean);
  for (const f of files) if (existsSync(f)) scanFile(f, readFileSync(f));
}

if (hits > 0) {
  console.error(`lint-banned: ${hits} match(es). Fix before committing.`);
  process.exit(1);
}
console.log('lint-banned: clean');
