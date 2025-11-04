#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Simple recursive walker */
function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const root = process.cwd();
const SRC = join(root, 'src');
const MAX = 300;
const ignore = new Set([join('src', 'types', 'supabase.generated.ts')]);

let warned = 0;
if (statSync(SRC, { throwIfNoEntry: false })) {
  for (const file of walk(SRC)) {
    if (!/(\.(ts|tsx|js|jsx))$/.test(file)) continue;
    const rel = relative(root, file);
    if (ignore.has(rel)) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    if (lines > MAX) {
      // GitHub Actions warning annotation
      console.log(
        `::warning file=${rel},line=1::File has ${lines} lines (>${MAX}). Consider splitting.`,
      );
      warned++;
    }
  }
}

console.log(`Checked file lengths: ${warned} warning(s).`);
process.exit(0);
