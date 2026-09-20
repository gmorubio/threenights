// Checks every file in /movies against the format rules.
// Run with `npm run validate`. Exits with code 1 when something is wrong.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll } from '../src/lib/validate.ts';

const folder = join(import.meta.dirname, '..', 'movies');
const names = readdirSync(folder).filter((name) => name.endsWith('.json')).sort();

const parseErrors = new Map<string, string>();
const files = names.map((name) => {
  const slug = name.replace(/\.json$/, '');
  try {
    return { slug, content: JSON.parse(readFileSync(join(folder, name), 'utf8')) as unknown };
  } catch (error) {
    parseErrors.set(slug, error instanceof Error ? error.message : String(error));
    return { slug, content: undefined };
  }
});

let failed = 0;
for (const result of validateAll(files)) {
  const parseError = parseErrors.get(result.slug);
  const errors = parseError ? [`Invalid JSON: ${parseError}`] : result.errors;
  if (errors.length === 0) {
    console.log(`  ok    ${result.slug}.json`);
    continue;
  }
  failed += 1;
  console.log(`  FAIL  ${result.slug}.json`);
  for (const message of errors) console.log(`          - ${message}`);
}

console.log(
  failed === 0
    ? `\n${names.length} movie file(s) valid.`
    : `\n${failed} of ${names.length} movie file(s) have errors.`,
);
process.exit(failed === 0 ? 0 : 1);
