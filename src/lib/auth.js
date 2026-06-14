import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Subscribe to Supabase auth state. Returns { user, loading, configured }.
 * `user` is the Supabase user object (or null when logged out).
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setLoading(false)
    })

    // Listen for changes (login/logout/token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading, configured: isSupabaseConfigured }
}

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) return { data, error }

  // Create a profile row for the new user. RLS only allows the user to write
  // their own row, but the user is now authenticated so this works.
  if (data.user) {
    await supabase.from('profiles').upsert({
      user_id: data.user.id,
      username,
      updated_at: new Date().toISOString(),
    })
  }
  return { data, error }
}

export async function signOut() {
  return supabase.auth.signOut()
}
