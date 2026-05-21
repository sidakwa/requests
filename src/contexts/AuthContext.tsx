import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, signInWithAzure as azureSignIn } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  role: string
  full_name: string
  email: string
  department?: string
  business_unit?: string
  avatar_url?: string
  created_at?: string
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  userRole: string
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  signInWithAzure: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error)
        return
      }

      // Profile is created by the DB trigger on first login — no client-side insert needed
      if (data) {
        setProfile(data)
      } else {
        console.warn('No profile found for user:', userId)
      }
    } catch (err) {
      console.error('Profile load error:', err)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (isMounted) {
          if (session?.user) {
            setUser(session.user)
            await loadProfile(session.user.id)
          }
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      if (event === 'INITIAL_SESSION') return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
        if (isMounted) setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        if (isMounted) setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/'
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  const userRole = profile?.role || 'submitter'
  const isAdmin = userRole === 'admin'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userRole,
      loading,
      isAdmin,
      signOut: handleSignOut,
      signInWithAzure: azureSignIn,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider')
  return context
}
