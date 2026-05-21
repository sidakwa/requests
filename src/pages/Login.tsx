import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Login() {
  const { signInWithAzure, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    await signInWithAzure()
    // The page will redirect, so we don't need to setIsLoading(false) here
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <CardTitle className="text-2xl">Funding Portal</CardTitle>
          <CardDescription>Sign in with your SEACOM Microsoft account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSignIn} 
            disabled={isLoading || loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {(isLoading || loading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to Microsoft...
              </>
            ) : (
              'Sign in with Microsoft (SEACOM)'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
