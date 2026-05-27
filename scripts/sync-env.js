/**
 * Writes js/env.local.js for the browser.
 * Local: reads .env
 * Vercel: reads SUPABASE_URL and SUPABASE_ANON_KEY from process.env
 *
 * Usage: node scripts/sync-env.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = parseEnvFile(envPath);
const url = fileEnv.SUPABASE_URL || process.env.SUPABASE_URL;
const key = fileEnv.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Missing Supabase config.\n' +
    '  Local: copy .env.example to .env and set SUPABASE_URL + SUPABASE_ANON_KEY\n' +
    '  Vercel: add those variables in Project Settings → Environment Variables, then redeploy'
  );
  process.exit(1);
}

const out = `// Auto-generated — do not edit. Run: npm run build
window.__PIRATE_ENV__ = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(key)},
};
`;

const outPath = path.join(root, 'js', 'env.local.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote js/env.local.js');
