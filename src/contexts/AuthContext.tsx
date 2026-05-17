import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: string;
  full_name: string;
  email: string;
  department?: string;
  business_unit?: string;
  avatar_url?: string;
  created_at?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  signInWithAzure: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    const fallbackProfile: Profile = {
      id: userId,
      email,
      full_name: email.split('@')[0],
      role: 'submitter',
    };

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setProfile(fallbackProfile);
        return;
      }

      if (profileData) {
        setProfile(profileData);
        return;
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError);
        setProfile(fallbackProfile);
        return;
      }

      setProfile(newProfile || fallbackProfile);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      setProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Handle the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        if (isMounted) {
          if (session?.user) {
            console.log('User found in session:', session.user.email);
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email || '');
          } else {
            console.log('No session found');
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (isMounted) {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed for:', session.user.email);
          setUser(session.user);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithAzure = async () => {
    try {
      console.log('Starting Azure sign in...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email openid profile offline_access',
        }
      });
      
      if (error) {
        console.error('Azure sign in error:', error);
        throw error;
      }
      
      console.log('Redirecting to Azure...', data);
      // The redirect happens automatically
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    // Clear any stored data
    localStorage.clear();
    window.location.href = '/';
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || '');
    }
  };

  const userRole = profile?.role || 'submitter';
  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        loading,
        isAdmin,
        signOut,
        signInWithAzure,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
