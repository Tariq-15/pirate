const SUPABASE_URL = 'https://yoaajumphmteyllvwcyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYWFqdW1waG10ZXlsbHZ3Y3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjkzODIsImV4cCI6MjA5NTQ0NTM4Mn0.sJvgqKWtZqtqtcEdL7Z82TbvCmyH7_aU23npttt_zb8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});
