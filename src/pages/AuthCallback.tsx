import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // Give Supabase's onAuthStateChange a moment to fire and set the session
      // after its own internal code exchange completes
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        navigate('/', { replace: true })
        return
      }

      // If no session yet, listen for the SIGNED_IN event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          navigate('/', { replace: true })
        }
        if (event === 'SIGNED_OUT') {
          setError('Sign in failed. Please try again.')
        }
      })

      // Timeout fallback — if nothing fires in 10s, something is wrong
      setTimeout(() => {
        subscription.unsubscribe()
        setError('Authentication timed out. Please try again.')
      }, 10000)
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <h1 className="text-red-600 text-xl mb-2">Authentication Error</h1>
          <p className="text-red-500">{error}</p>
          <p className="text-gray-500 text-sm mt-4">
            <button onClick={() => navigate('/')} className="text-blue-500 underline">
              Back to login
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
