import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xoywidliuqqtkurgxdla.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveXdpZGxpdXFxdGt1cmd4ZGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzUwODMsImV4cCI6MjA4MzgxMTA4M30.C9z-qm14LNfZYa_JA4Wapapwe7PR2Wc_IK8k4gq7MX0";

export const supabase = createClient(supabaseUrl, supabaseKey);
// Force Vercel to see new keys: 1