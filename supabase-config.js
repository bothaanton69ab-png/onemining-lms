// ONE MINING TRAINING LMS - SHARED CODEBASE (all sites)
// One Supabase project; each site reads its own isolated app_data_* table.

var SUPABASE_URL = 'https://aibtkbfgqluztlpohxhu.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYnRrYmZncWx1enRscG9oeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA2MDYsImV4cCI6MjA5MDg0NjYwNn0.x2WB2BP9soaMx2ibBiy0WHUlUe0TyBKUhDCvqYNzVsc';

// TENANT is detected automatically from the web address, so ONE set of
// files serves every site with no per-site editing:
//   thutse-mining-lms.vercel.app        -> app_data_thutse
//   malekaskraal-vanadium-lms.vercel.app -> app_data_malekaskraal
//   anything else (demo)                 -> app_data_demo
var TENANT_TABLE, TENANT_LABEL;
(function(){
  var h = (location.hostname || '').toLowerCase();
  if (h.indexOf('thutse') !== -1)            { TENANT_TABLE = 'app_data_thutse';       TENANT_LABEL = 'THUTSE'; }
  else if (h.indexOf('malekaskraal') !== -1) { TENANT_TABLE = 'app_data_malekaskraal'; TENANT_LABEL = 'MALEKASKRAAL'; }
  else                                       { TENANT_TABLE = 'app_data_demo';          TENANT_LABEL = 'DEMO'; }
})();

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
