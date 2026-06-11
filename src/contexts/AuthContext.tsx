import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type UserRole = 'admin' | 'approver' | 'submitter' | null

interface Profile {
  id: string
  email: string | null
  full_name?: string | null
  department?: string | null
  business_unit?: string | null
  role: UserRole
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  userRole: UserRole
  isAdmin: boolean
  isApprover: boolean
  isSubmitter: boolean
  loading: boolean
  signOut: () => Promise<void>
  signInWithAzure: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const loadProfile = async (userId: string): Promise<void> => {
    try {
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[loadProfile] Supabase error:', error.message)
        toast.error('Failed to load your profile. Please refresh.')
        return
      }

      if (data) {
        setProfile(data as Profile)
        setUserRole(data.role as UserRole)
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            email: user?.email,
            role: 'submitter',
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0]
          }])
          .select('*')
          .single()

        if (insertError) {
          console.error('[loadProfile] Failed to create profile:', insertError.message)
        } else if (newProfile) {
          setProfile(newProfile as Profile)
          setUserRole('submitter')
        }
      }
    } catch (err) {
      console.error('[loadProfile] Unexpected error:', err)
      toast.error('An unexpected error occurred loading your profile.')
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    await loadProfile(user.id)
  }

  const signInWithAzure = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err) {
      console.error('[signInWithAzure] error:', err)
      toast.error('Sign-in failed. Please try again.')
    }
  }

  const handleSession = async (session: Session | null) => {
    
    if (session?.user) {
      
      setUser(session.user)
      await loadProfile(session.user.id)
    } else {
      setUser(null)
      setProfile(null)
      setUserRole(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    let mounted = true

    const initializeAuth = async () => {
      try {
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          if (mounted) setLoading(false)
          return
        }
        
        if (mounted && session) {
          await handleSession(session)
        } else if (mounted) {
          setLoading(false)
        }

        // IMPORTANT: never await Supabase calls inside onAuthStateChange — the
        // callback holds the auth lock, and any query inside it waits for that
        // same lock. This deadlocks on TOKEN_REFRESHED and hangs every later
        // query in the app. Defer DB work with setTimeout so the callback
        // returns and releases the lock first.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return

            if (event === 'SIGNED_OUT') {
              setUser(null)
              setProfile(null)
              setUserRole(null)
              setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
              if (session?.user) {
                setUser(session.user)
                const userId = session.user.id
                setTimeout(() => {
                  if (!mounted) return
                  loadProfile(userId).finally(() => {
                    if (mounted) setLoading(false)
                  })
                }, 0)
              }
            }
          }
        )
        
        return () => {
          mounted = false
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error('[initializeAuth] Unexpected error:', err)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setUserRole(null)
    } catch (err) {
      console.error('[signOut] error:', err)
      toast.error('Sign-out failed. Please try again.')
    }
  }

  const isAdmin = userRole === 'admin'
  const isApprover = userRole === 'approver'
  const isSubmitter = userRole === 'submitter'

  const value = {
    user,
    profile,
    userRole,
    isAdmin,
    isApprover,
    isSubmitter,
    loading,
    signOut,
    signInWithAzure,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
