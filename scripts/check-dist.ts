// Safety net: fails when the TMDB token appears anywhere in the built site.
// Runs after every `npm run build` and before every deploy. It should never
// find anything, because no app code reads the token; this proves it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');

const envFile = join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const token = (process.env.TMDB_READ_TOKEN ?? '').trim();
if (token === '') {
  console.log('check-dist: TMDB_READ_TOKEN is not set, nothing to look for.');
  process.exit(0);
}
if (!existsSync(dist)) {
  console.error('check-dist: there is no dist/ folder. Run the build first.');
  process.exit(1);
}

const names = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));

// Only file names are printed, never the token itself.
const leaks = names.filter((name) => readFileSync(name).includes(token));

if (leaks.length > 0) {
  console.error('check-dist: the TMDB token is inside the built site. Do not publish it.');
  for (const name of leaks) console.error(`  - ${relative(root, name)}`);
  process.exit(1);
}
console.log(`check-dist: ${names.length} file(s) checked, the TMDB token is in none of them.`);
