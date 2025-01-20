const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual Supabase project URL and API key
const SUPABASE_URL = 'https://tnjctugpbfeuuthikzgr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuamN0dWdwYmZldXV0aGlremdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MTMzMjQsImV4cCI6MjA1Mjk4OTMyNH0.J_8_KdB3E7ibCKEteGPJ23J-BWMgQ-r6vhaup7uBEtw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = { supabase };
