import { createClient } from '@supabase/supabase-js'

// Configured via .env.local — see README.
// VITE_SUPABASE_URL=https://xxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJ...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
