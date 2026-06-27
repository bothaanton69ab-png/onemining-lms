// ONE MINING TRAINING DEMO - SUPABASE CONNECTION
// ======================================
// This is the DEMO build. It connects to the same Supabase project as the
// live LMS, but reads/writes an ISOLATED table: "app_data_demo".
// (The table name is set in app.js — see sb.from('app_data_demo').)
// Live production data in the "app_data" table is NOT touched by this demo.
// ======================================

var SUPABASE_URL = 'https://aibtkbfgqluztlpohxhu.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYnRrYmZncWx1enRscG9oeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA2MDYsImV4cCI6MjA5MDg0NjYwNn0.x2WB2BP9soaMx2ibBiy0WHUlUe0TyBKUhDCvqYNzVsc';

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
