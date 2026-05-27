const env = window.__PIRATE_ENV__ || {};
const SUPABASE_URL = env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Missing Supabase config. Copy .env.example to .env, set SUPABASE_URL and SUPABASE_ANON_KEY, then run: node scripts/sync-env.js'
  );
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});
