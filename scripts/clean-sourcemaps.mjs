// Guaranteed production sourcemap cleanup (defense-in-depth).
//
// The Sentry Vite plugin deletes dist/**/*.js.map ONLY after a successful upload. If an upload
// failure is swallowed by `errorHandler` (build continues), those maps would otherwise remain in
// `dist/` and ship to production — violating the invariant "never expose production source maps".
// This runs unconditionally in `postbuild` and removes any leftover *.js.map. It is a safe no-op
// when none exist (dev builds and SENTRY_SKIP_BUILD builds emit no maps). Dependency-free.

import { readdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
let removed = 0;

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err?.code === 'ENOENT') return; // dir vanished mid-walk — nothing to do
    throw err; // fail closed: a real read failure must not silently pass a possibly-uncleaned tree
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.js.map')) {
      try {
        await unlink(full);
        removed += 1;
      } catch (err) {
        // Fail closed: if a production sourcemap can't be removed, fail the build rather than
        // risk shipping it (invariant: never expose production source maps).
        console.error(`[clean-sourcemaps] could not delete ${full}:`, err?.message ?? err);
        throw err;
      }
    }
  }
}

if (!existsSync(DIST)) {
  console.log('[clean-sourcemaps] no dist/ directory — nothing to clean.');
} else {
  const s = await stat(DIST);
  if (s.isDirectory()) await walk(DIST);
  console.log(
    removed > 0
      ? `[clean-sourcemaps] removed ${removed} stray .js.map file(s) from dist/.`
      : '[clean-sourcemaps] no .js.map files in dist/ (expected on success / skip paths).',
  );
}
