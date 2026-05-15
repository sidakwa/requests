import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  role: 'submitter' | 'approver' | 'manager' | 'admin'
  department?: string
  manager_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AuthStore {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  
  setProfile: (profile) => set({ profile }),
  
  setLoading: (loading) => set({ loading }),
  
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!error && data) {
      set({ profile: data })
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

// Initialize auth listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const { setUser, setProfile, fetchProfile, setLoading } = useAuthStore.getState()
  
  if (session?.user) {
    setUser(session.user)
    await fetchProfile(session.user.id)
  } else {
    setUser(null)
    setProfile(null)
  }
  setLoading(false)
})
