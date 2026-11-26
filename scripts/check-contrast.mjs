#!/usr/bin/env node
// WCAG contrast check for the design tokens, dark (default) and light. Exits 1 on any failing pair.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const [baseSrc, lightSrc = ''] = css.split(":root[data-theme='light']");

const parse = (src) => Object.fromEntries([...src.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const themes = { dark: parse(baseSrc), light: { ...parse(baseSrc), ...parse(lightSrc) } };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]. Text: 4.5 (body text aims higher). Graphics that carry meaning: 3.
const pairs = [
  ['fg', 'bg', 7], ['fg', 'surface', 7],
  ['mut', 'bg', 4.5], ['mut', 'surface', 4.5],
  ['accent', 'bg', 4.5], ['accent', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent2', 'surface', 3], ['accent3', 'surface', 3],
];

let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg, min] of pairs) {
    if (!t[fg] || !t[bg]) { console.error(`${name}: missing token ${fg} or ${bg}`); failed++; continue; }
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`);
  }
}
process.exit(failed ? 1 : 0);
