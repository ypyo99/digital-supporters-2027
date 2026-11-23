import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qcbfplbeinkngxrxyamp.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYmZwbGJlaW5rbmd4cnh5YW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzI5MzgsImV4cCI6MjExMTAwODkzOH0.ccJ4BtvW-c_4nmSzw2zr1HZZzBE0R66x0Ihye_AbfCA';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
