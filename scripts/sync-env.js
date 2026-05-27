/**
 * Reads .env and writes js/env.local.js for the browser.
 * Usage: node scripts/sync-env.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env — copy .env.example to .env and add your Supabase values.');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const url = env.SUPABASE_URL;
const key = env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('.env must define SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const out = `// Auto-generated from .env — do not edit. Run: node scripts/sync-env.js
window.__PIRATE_ENV__ = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(key)},
};
`;

fs.writeFileSync(path.join(root, 'js', 'env.local.js'), out, 'utf8');
console.log('Wrote js/env.local.js');
