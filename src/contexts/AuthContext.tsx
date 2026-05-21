import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
      console.log('📥 Loading profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('❌ Profile fetch error:', error)
        return
      }

      if (data) {
        console.log('✅ Profile loaded:', { email: data.email, role: data.role })
        setProfile(data as Profile)
        setUserRole(data.role as UserRole)
      } else {
        console.warn('⚠️ No profile found for user:', userId)
        // Optional: Create profile here if trigger is not working
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
        
        if (!insertError && newProfile) {
          console.log('✅ Created new profile:', newProfile)
          setProfile(newProfile as Profile)
          setUserRole('submitter')
        }
      }
    } catch (err) {
      console.error('❌ Profile load exception:', err)
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    console.log('🔄 Refreshing profile for user:', user.id)
    await loadProfile(user.id)
  }

  const signInWithAzure = async () => {
    try {
      console.log('🔐 Signing in with Azure...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err) {
      console.error('❌ Azure sign in error:', err)
    }
  }

  const handleSession = async (session: any) => {
    console.log('📋 Handling session for:', session?.user?.email)
    
    if (session?.user) {
      console.log('👤 Current Supabase User:', {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata
      })
      
      setUser(session.user)
      await loadProfile(session.user.id)
    } else {
      console.log('🚫 No session - clearing user data')
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
        console.log('🚀 Initializing auth...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          if (mounted) setLoading(false)
          return
        }

        console.log('📡 Initial session:', session?.user?.email || 'No session')
        
        if (mounted && session) {
          await handleSession(session)
        } else if (mounted) {
          setLoading(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth event:', event, 'user:', session?.user?.email)
            if (!mounted) return
            
            if (event === 'SIGNED_OUT') {
              setUser(null)
              setProfile(null)
              setUserRole(null)
              setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
              if (session?.user) {
                setUser(session.user)
                await loadProfile(session.user.id)
                if (mounted) setLoading(false)
              }
            }
          }
        )
        
        return () => {
          mounted = false
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...')
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setUserRole(null)
    } catch (err) {
      console.error('❌ Error signing out:', err)
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

  console.log('🏁 AuthProvider state - loading:', loading, 'user:', user?.email, 'role:', userRole)

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
