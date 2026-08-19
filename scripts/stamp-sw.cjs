// scripts/stamp-sw.js
//
// Stamps dist/sw.js with a unique CACHE_VERSION at build time.
//
// The service worker is cache-first for .js, and its cache name is derived
// from CACHE_VERSION. That constant used to be bumped by hand ("bump every
// time you deploy"), which is exactly the kind of step that gets forgotten —
// and when it is, returning users keep running an old bundle indefinitely.
// Stamping it here means every deploy purges the previous caches.

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'dist', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('[stamp-sw] dist/sw.js not found — did the export run?');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const source = fs.readFileSync(swPath, 'utf8');

const updated = source.replace(
  /const CACHE_VERSION = ['"][^'"]*['"];/,
  `const CACHE_VERSION = 'build-${stamp}';`
);

if (updated === source) {
  console.error('[stamp-sw] CACHE_VERSION line not found — service worker caching may go stale');
  process.exit(1);
}

fs.writeFileSync(swPath, updated);
console.log(`[stamp-sw] CACHE_VERSION set to build-${stamp}`);
