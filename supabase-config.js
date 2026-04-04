// ONE MINING LMS - SUPABASE CONNECTION
// ======================================
// INSTRUCTIONS:
// 1. Log in to https://supabase.com
// 2. Open your project > Settings > API
// 3. Copy "Project URL" and paste below
// 4. Copy "anon public" key and paste below
// ======================================

var SUPABASE_URL = 'https://aibtkbfgqluztlpohxhu.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYnRrYmZncWx1enRscG9oeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA2MDYsImV4cCI6MjA5MDg0NjYwNn0.x2WB2BP9soaMx2ibBiy0WHUlUe0TyBKUhDCvqYNzVsc';

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
