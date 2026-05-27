const env = window.__PIRATE_ENV__ || {};
const SUPABASE_URL = env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || '';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
var sb = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Missing Supabase config. Local: copy .env.example → .env, then run npm run build. ' +
    'Vercel: set SUPABASE_URL and SUPABASE_ANON_KEY in Environment Variables and redeploy.'
  );
} else if (!window.supabase?.createClient) {
  console.error('Supabase SDK failed to load. Check your network or the CDN script in index.html.');
} else {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  window.sb = sb;
}
